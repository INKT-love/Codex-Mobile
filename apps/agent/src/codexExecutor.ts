import { createInterface } from "node:readline";
import type { PermissionLevel, TaskCreatePayload, TaskEvent } from "@codex-mobile/protocol";
import { discoverCodexExecutable } from "./codexDiscovery.js";
import type { AgentConfig } from "./config.js";
import { runShipGitWorkflow } from "./gitWorkflow.js";
import { spawnCommand } from "./processCommand.js";
import { projectIdToPath, resolveInsideWorkspace } from "./workspace.js";

export interface CodexExecutorHandlers {
  onEvent(event: TaskEvent): void;
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

function sandboxForPermission(permissionLevel: PermissionLevel): string {
  return permissionLevel === "Review" ? "read-only" : "workspace-write";
}

function summarizeCodexJsonLine(line: string): string {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const type = typeof parsed.type === "string" ? parsed.type : "codex.event";

    if (typeof parsed.message === "string") {
      return parsed.message;
    }

    if (typeof parsed.text === "string") {
      return parsed.text;
    }

    return type;
  } catch {
    return line;
  }
}

interface CodexJsonEvent {
  type?: string;
  text?: string;
  message?: string;
  error?: {
    message?: string;
  };
}

function parseCodexJsonLine(line: string): CodexJsonEvent | null {
  try {
    return JSON.parse(line) as CodexJsonEvent;
  } catch {
    return null;
  }
}

export async function runCodexTask(
  config: AgentConfig,
  payload: TaskCreatePayload,
  handlers: CodexExecutorHandlers,
): Promise<void> {
  if (!payload.taskId) {
    throw new Error("task.create payload is missing taskId.");
  }

  const codex = discoverCodexExecutable();

  if (!codex.path || !codex.executable) {
    handlers.onEvent(
      createTaskEvent(payload.taskId, "error", "Codex executable is not available.", {
        status: "failed",
        codex,
      }),
    );
    handlers.onEvent(
      createTaskEvent(payload.taskId, "status", "Task failed because Codex is unavailable.", {
        status: "failed",
      }),
    );
    return;
  }

  const cwd = resolveInsideWorkspace(config.workspaceRoot, projectIdToPath(payload.projectId));
  const args = [
    "exec",
    "--json",
    "--sandbox",
    sandboxForPermission(payload.permissionLevel),
    "--cd",
    cwd,
    payload.prompt,
  ];

  handlers.onEvent(
    createTaskEvent(payload.taskId, "status", "Codex task started.", {
      status: "running",
      command: codex.path,
      args,
      cwd,
    }),
  );

  let completedSuccessfully = false;

  await new Promise<void>((resolve) => {
    let terminalEventSeen = false;
    const child = spawnCommand(codex.path as string, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (child.stdout) {
      const stdout = createInterface({
        input: child.stdout,
      });

      stdout.on("line", (line) => {
        const parsed = parseCodexJsonLine(line);

        if (parsed?.type === "agent_message" && parsed.text) {
          handlers.onEvent(
            createTaskEvent(payload.taskId as string, "output", parsed.text, {
              stream: "stdout",
              codexType: parsed.type,
              raw: line,
            }),
          );
          return;
        }

        if (parsed?.type === "turn.completed") {
          terminalEventSeen = true;
          completedSuccessfully = true;
          handlers.onEvent(
            createTaskEvent(payload.taskId as string, "status", "Codex task completed.", {
              status: "completed",
              raw: line,
            }),
          );
          return;
        }

        if (parsed?.type === "turn.failed") {
          terminalEventSeen = true;
          completedSuccessfully = false;
          handlers.onEvent(
            createTaskEvent(
              payload.taskId as string,
              "status",
              parsed.error?.message ?? "Codex task failed.",
              {
                status: "failed",
                raw: line,
              },
            ),
          );
          return;
        }

        handlers.onEvent(
          createTaskEvent(payload.taskId as string, "output", summarizeCodexJsonLine(line), {
            stream: "stdout",
            codexType: parsed?.type,
            raw: line,
          }),
        );
      });
    }

    if (child.stderr) {
      const stderr = createInterface({
        input: child.stderr,
      });

      stderr.on("line", (line) => {
        handlers.onEvent(
          createTaskEvent(payload.taskId as string, "output", line, {
            stream: "stderr",
          }),
        );
      });
    }

    child.on("error", (error) => {
      handlers.onEvent(
        createTaskEvent(payload.taskId as string, "error", error.message, {
          status: "failed",
        }),
      );
    });

    child.on("close", (code, signal) => {
      if (!terminalEventSeen) {
        completedSuccessfully = code === 0;
        handlers.onEvent(
          createTaskEvent(
            payload.taskId as string,
            "status",
            code === 0 ? "Codex task completed." : "Codex task failed.",
            {
              status: code === 0 ? "completed" : "failed",
              code,
              signal,
            },
          ),
        );
      }
      resolve();
    });
  });

  if (completedSuccessfully && payload.permissionLevel === "Ship") {
    await runShipGitWorkflow(cwd, payload.taskId, payload.title, handlers);
  }
}
