import { spawn } from "node:child_process";
import type { TaskEvent } from "@codex-mobile/protocol";

export interface GitWorkflowHandlers {
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

function runGit(cwd: string, args: string[]): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: string[] = [];

    child.stdout.on("data", (chunk) => chunks.push(chunk.toString()));
    child.stderr.on("data", (chunk) => chunks.push(chunk.toString()));
    child.on("error", (error) => {
      chunks.push(error.message);
      resolve({
        code: 1,
        output: chunks.join(""),
      });
    });
    child.on("close", (code) => {
      resolve({
        code,
        output: chunks.join(""),
      });
    });
  });
}

export async function runShipGitWorkflow(
  cwd: string,
  taskId: string,
  title: string,
  handlers: GitWorkflowHandlers,
): Promise<void> {
  const status = await runGit(cwd, ["status", "--porcelain"]);

  if (status.code !== 0) {
    handlers.onEvent(createTaskEvent(taskId, "git", "git status failed.", status));
    return;
  }

  if (!status.output.trim()) {
    handlers.onEvent(createTaskEvent(taskId, "git", "gitNoChanges", { status: "gitNoChanges" }));
    return;
  }

  const add = await runGit(cwd, ["add", "-A"]);
  if (add.code !== 0) {
    handlers.onEvent(createTaskEvent(taskId, "git", "git add failed.", add));
    return;
  }

  const commit = await runGit(cwd, ["commit", "-m", title]);
  if (commit.code !== 0) {
    handlers.onEvent(createTaskEvent(taskId, "git", "git commit failed.", commit));
    return;
  }

  handlers.onEvent(createTaskEvent(taskId, "git", "git commit completed.", commit));

  const push = await runGit(cwd, ["push"]);
  if (push.code !== 0) {
    handlers.onEvent(createTaskEvent(taskId, "git", "git push failed.", push));
    return;
  }

  handlers.onEvent(createTaskEvent(taskId, "git", "git push completed.", push));
}
