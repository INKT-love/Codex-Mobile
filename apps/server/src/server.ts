import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  createEnvelope,
  parseProtocolMessage,
  parsePayloadForType,
  type Device,
} from "@codex-mobile/protocol";
import type { ServerConfig } from "./config.js";
import type { DatabaseConnection } from "./database.js";
import {
  AuthError,
  authenticateDevice,
  listKnownDevices,
  updateAuthenticatedDevice,
} from "./devices.js";
import { PairingError, claimPairingCode } from "./pairing.js";

export interface CodexMobileServer {
  listen(): Promise<void>;
  close(): Promise<void>;
}

interface ClientSession {
  device: Device | null;
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

function sendError(
  ws: WebSocket,
  id: string,
  target: string,
  code: string,
  message: string,
): void {
  send(
    ws,
    createEnvelope({
      id,
      type: "error",
      source: "server",
      target,
      payload: {
        code,
        message,
      },
    }),
  );
}

function handleWsMessage(
  database: DatabaseConnection,
  sessions: Map<WebSocket, ClientSession>,
  ws: WebSocket,
  raw: Buffer,
): void {
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

  if (parsed.type === "auth.login") {
    try {
      const payload = parsePayloadForType("auth.login", parsed.payload);
      const device = authenticateDevice(database, payload.deviceId, payload.token);
      sessions.set(ws, {
        device,
      });

      send(
        ws,
        createEnvelope({
          id: `auth_ok_${parsed.id}`,
          type: "auth.ok",
          source: "server",
          target: parsed.source,
          payload: {
            device,
          },
        }),
      );
    } catch (error) {
      sendError(
        ws,
        `server_error_${parsed.id}`,
        parsed.source,
        error instanceof AuthError ? error.code : "auth_failed",
        error instanceof Error ? error.message : "Authentication failed.",
      );
    }
    return;
  }

  if (parsed.type === "pairing.claim") {
    try {
      const result = claimPairingCode(
        database,
        parsePayloadForType("pairing.claim", parsed.payload),
      );

      send(
        ws,
        createEnvelope({
          id: `pairing_confirmed_${parsed.id}`,
          type: "pairing.confirmed",
          source: "server",
          target: parsed.source,
          payload: result,
        }),
      );
    } catch (error) {
      sendError(
        ws,
        `server_error_${parsed.id}`,
        parsed.source,
        error instanceof PairingError ? error.code : "pairing_failed",
        error instanceof Error ? error.message : "Pairing failed.",
      );
    }
    return;
  }

  const session = sessions.get(ws);
  if (!session?.device) {
    sendError(
      ws,
      `server_error_${parsed.id}`,
      parsed.source,
      "unauthenticated",
      "Authenticate with auth.login before sending this message.",
    );
    return;
  }

  if (parsed.type === "device.hello") {
    const payload = parsePayloadForType("device.hello", parsed.payload);
    const device = updateAuthenticatedDevice(
      database,
      session.device.deviceId,
      payload.device.capabilities,
    );
    session.device = device;

    send(
      ws,
      createEnvelope({
        id: `device_status_${parsed.id}`,
        type: "device.status",
        source: "server",
        target: parsed.source,
        payload: {
          device,
        },
      }),
    );
    return;
  }

  if (parsed.type === "device.list") {
    parsePayloadForType("device.list", parsed.payload);

    const onlineDeviceIds = new Set(
      Array.from(sessions.values())
        .map((value) => value.device?.deviceId)
        .filter((value): value is string => Boolean(value)),
    );

    send(
      ws,
      createEnvelope({
        id: `device_list_${parsed.id}`,
        type: "device.list",
        source: "server",
        target: parsed.source,
        payload: {
          devices: listKnownDevices(database, onlineDeviceIds),
        },
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

export function createCodexMobileServer(
  config: ServerConfig,
  database: DatabaseConnection,
): CodexMobileServer {
  const httpServer = createServer((request, response) => {
    handleHttpRequest(config, request, response);
  });

  const wsServer = new WebSocketServer({
    noServer: true,
  });
  const sessions = new Map<WebSocket, ClientSession>();

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
    sessions.set(ws, {
      device: null,
    });

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
        handleWsMessage(database, sessions, ws, raw as Buffer);
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

    ws.on("close", () => {
      sessions.delete(ws);
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
