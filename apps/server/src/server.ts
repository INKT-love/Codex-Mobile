import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { createEnvelope, parseProtocolMessage } from "@codex-mobile/protocol";
import type { ServerConfig } from "./config.js";

export interface CodexMobileServer {
  listen(): Promise<void>;
  close(): Promise<void>;
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function handleHttpRequest(
  config: ServerConfig,
  request: IncomingMessage,
  response: ServerResponse,
): void {
  if (request.method === "GET" && request.url === "/health") {
    writeJson(response, 200, {
      ok: true,
      service: "codex-mobile-server",
      publicUrl: config.publicUrl,
    });
    return;
  }

  writeJson(response, 404, {
    ok: false,
    error: "not_found",
  });
}

function send(ws: WebSocket, value: unknown): void {
  ws.send(JSON.stringify(value));
}

function handleWsMessage(ws: WebSocket, raw: Buffer): void {
  let parsedInput: unknown;

  try {
    parsedInput = JSON.parse(raw.toString("utf8"));
  } catch {
    send(
      ws,
      createEnvelope({
        id: "server_error_invalid_json",
        type: "error",
        source: "server",
        target: "server",
        payload: {
          code: "invalid_json",
          message: "Message must be valid JSON.",
        },
      }),
    );
    return;
  }

  const parsed = parseProtocolMessage(parsedInput);

  if (parsed.type === "ping") {
    send(
      ws,
      createEnvelope({
        id: `pong_${parsed.id}`,
        type: "pong",
        source: "server",
        target: parsed.source,
        payload: {},
      }),
    );
    return;
  }

  send(
    ws,
    createEnvelope({
      id: `server_error_${parsed.id}`,
      type: "error",
      source: "server",
      target: parsed.source,
      payload: {
        code: "not_implemented",
        message: `Message type ${parsed.type} is not implemented yet.`,
      },
    }),
  );
}

export function createCodexMobileServer(config: ServerConfig): CodexMobileServer {
  const httpServer = createServer((request, response) => {
    handleHttpRequest(config, request, response);
  });

  const wsServer = new WebSocketServer({
    noServer: true,
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request);
    });
  });

  wsServer.on("connection", (ws) => {
    send(
      ws,
      createEnvelope({
        id: "server_welcome",
        type: "server.welcome",
        source: "server",
        target: "broadcast",
        payload: {
          service: "codex-mobile-server",
        },
      }),
    );

    ws.on("message", (raw) => {
      try {
        handleWsMessage(ws, raw as Buffer);
      } catch (error) {
        send(
          ws,
          createEnvelope({
            id: "server_error_unhandled",
            type: "error",
            source: "server",
            target: "server",
            payload: {
              code: "invalid_message",
              message: error instanceof Error ? error.message : "Invalid message.",
            },
          }),
        );
      }
    });
  });

  return {
    listen() {
      return new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(config.port, config.host, () => {
          httpServer.off("error", reject);
          resolve();
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        wsServer.close((wsError) => {
          if (wsError) {
            reject(wsError);
            return;
          }

          httpServer.close((httpError) => {
            if (httpError) {
              reject(httpError);
              return;
            }

            resolve();
          });
        });
      });
    },
  };
}
