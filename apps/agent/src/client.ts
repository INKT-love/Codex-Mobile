import WebSocket from "ws";
import {
  createEnvelope,
  parseProtocolMessage,
  type Device,
  type PairingConfirmedPayload,
  type PermissionLevel,
  type Project,
  type TaskCreatePayload,
  type TaskEvent,
} from "@codex-mobile/protocol";
import type { AgentConfig } from "./config.js";
import { runCodexTask } from "./codexExecutor.js";
import {
  createProjectFolder,
  listProjectFolders,
  projectPathToId,
  resolveInsideWorkspace,
} from "./workspace.js";

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

function createProjectModel(
  config: AgentConfig,
  folderName: string,
  permissionLevel: PermissionLevel = "Edit",
): Project {
  const absolutePath = resolveInsideWorkspace(config.workspaceRoot, folderName);

  return {
    projectId: projectPathToId(absolutePath),
    displayName: folderName,
    absolutePath,
    permissionLevel,
    gitStatus: "unknown",
    remoteCreateStatus: "notRequested",
  };
}

function createTaskEvent(taskId: string, kind: TaskEvent["kind"], message: string, data?: unknown): TaskEvent {
  return {
    eventId: `event_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    taskId,
    kind,
    message,
    createdAt: new Date().toISOString(),
    data,
  };
}

function sendTaskEvent(ws: WebSocket, config: AgentConfig & { deviceId: string }, event: TaskEvent): void {
  ws.send(
    JSON.stringify(
      createEnvelope({
        id: `agent_task_event_${event.eventId}`,
        type: "task.event",
        source: `agent:${config.deviceId}`,
        target: "server",
        payload: {
          event,
        },
      }),
    ),
  );
}

function runMockTask(
  ws: WebSocket,
  config: AgentConfig & { deviceId: string },
  payload: TaskCreatePayload,
): void {
  const taskId = payload.taskId;

  if (!taskId) {
    throw new Error("task.create payload is missing taskId.");
  }

  sendTaskEvent(
    ws,
    config,
    createTaskEvent(taskId, "status", "Task started.", {
      status: "running",
    }),
  );
  sendTaskEvent(ws, config, createTaskEvent(taskId, "output", `Received prompt: ${payload.prompt}`));
  sendTaskEvent(
    ws,
    config,
    createTaskEvent(taskId, "status", "Task completed by mock executor.", {
      status: "completed",
    }),
  );
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

    if (message.type === "project.list") {
      const projects = listProjectFolders(config.workspaceRoot).map((folderName) =>
        createProjectModel(config, folderName),
      );

      ws.send(
        JSON.stringify(
          createEnvelope({
            id: `agent_project_list_${message.id}`,
            type: "project.list",
            source: `agent:${config.deviceId}`,
            target: "server",
            payload: {
              agentDeviceId: config.deviceId,
              projects,
            },
          }),
        ),
      );
    }

    if (message.type === "project.create") {
      const payload = message.payload as {
        folderName: string;
        permissionLevel?: PermissionLevel;
      };
      createProjectFolder(config.workspaceRoot, payload.folderName);
      const project = createProjectModel(config, payload.folderName, payload.permissionLevel ?? "Edit");

      ws.send(
        JSON.stringify(
          createEnvelope({
            id: `agent_project_created_${message.id}`,
            type: "project.created",
            source: `agent:${config.deviceId}`,
            target: "server",
            payload: {
              project,
            },
          }),
        ),
      );
    }

    if (message.type === "task.create") {
      if (process.env.CODEX_MOBILE_AGENT_EXECUTOR === "mock") {
        runMockTask(ws, config, message.payload as TaskCreatePayload);
      } else {
        void runCodexTask(config, message.payload as TaskCreatePayload, {
          onEvent(event) {
            sendTaskEvent(ws, config, event);
          },
        });
      }
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
