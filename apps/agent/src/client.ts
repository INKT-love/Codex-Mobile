import WebSocket from "ws";
import {
  createEnvelope,
  parseProtocolMessage,
  type Device,
  type PairingConfirmedPayload,
} from "@codex-mobile/protocol";
import type { AgentConfig } from "./config.js";

export interface PairAgentOptions {
  config: AgentConfig;
  pairingCode: string;
}

export function pairAgent(options: PairAgentOptions): Promise<PairingConfirmedPayload> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(options.config.serverUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Pairing timed out."));
    }, 10_000);

    ws.on("message", (raw) => {
      const message = parseProtocolMessage(JSON.parse(raw.toString()));

      if (message.type === "server.welcome") {
        ws.send(
          JSON.stringify(
            createEnvelope({
              id: "agent_pairing_claim",
              type: "pairing.claim",
              source: "agent",
              target: "server",
              payload: {
                code: options.pairingCode,
                deviceName: options.config.deviceName,
                deviceType: "agent",
              },
            }),
          ),
        );
      }

      if (message.type === "pairing.confirmed") {
        clearTimeout(timer);
        ws.close();
        resolve(message.payload as PairingConfirmedPayload);
      }

      if (message.type === "error") {
        clearTimeout(timer);
        ws.close();
        reject(new Error(JSON.stringify(message.payload)));
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export function runAgent(config: Required<Pick<AgentConfig, "deviceId" | "deviceToken">> & AgentConfig): void {
  const ws = new WebSocket(config.serverUrl);

  ws.on("message", (raw) => {
    const message = parseProtocolMessage(JSON.parse(raw.toString()));

    if (message.type === "server.welcome") {
      ws.send(
        JSON.stringify(
          createEnvelope({
            id: "agent_auth_login",
            type: "auth.login",
            source: `agent:${config.deviceId}`,
            target: "server",
            payload: {
              deviceId: config.deviceId,
              token: config.deviceToken,
            },
          }),
        ),
      );
    }

    if (message.type === "auth.ok") {
      const device = (message.payload as { device: Device }).device;
      ws.send(
        JSON.stringify(
          createEnvelope({
            id: "agent_device_hello",
            type: "device.hello",
            source: `agent:${device.deviceId}`,
            target: "server",
            payload: {
              device: {
                ...device,
                capabilities: ["workspaceList", "projectCreate", "codexProcess", "git"],
              },
            },
          }),
        ),
      );
      console.log(`Agent authenticated as ${device.deviceName} (${device.deviceId})`);
    }

    if (message.type === "device.status") {
      console.log("Agent status updated.");
    }

    if (message.type === "error") {
      console.error(JSON.stringify(message.payload));
    }
  });

  ws.on("close", () => {
    console.log("Agent connection closed.");
  });

  ws.on("error", (error) => {
    console.error(error);
  });
}
