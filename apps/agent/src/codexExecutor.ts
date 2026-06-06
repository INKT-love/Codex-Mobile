import { createInterface } from "node:readline";
import type { PermissionLevel, TaskCreatePayload, TaskEvent } from "@codex-mobile/protocol";
import { discoverCodexExecutable } from "./codexDiscovery.js";
import type { AgentConfig } from "./config.js";
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

  await new Promise<void>((resolve) => {
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
        handlers.onEvent(
          createTaskEvent(payload.taskId as string, "output", summarizeCodexJsonLine(line), {
            stream: "stdout",
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
      resolve();
    });
  });
}
