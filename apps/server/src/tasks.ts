import type { Task, TaskCreatePayload, TaskEvent } from "@codex-mobile/protocol";
import {
  insertTask,
  insertTaskEvent,
  updateTaskStatus,
  type DatabaseConnection,
} from "./database.js";
import { createId } from "./ids.js";

export function createTaskRecord(database: DatabaseConnection, payload: TaskCreatePayload): Task {
  const now = new Date().toISOString();
  const task: Task = {
    taskId: createId("task"),
    title: payload.title,
    prompt: payload.prompt,
    projectId: payload.projectId,
    agentDeviceId: payload.agentDeviceId,
    status: "queued",
    permissionLevel: payload.permissionLevel,
    createdAt: now,
    updatedAt: now,
  };

  insertTask(database, {
    taskId: task.taskId,
    title: task.title,
    prompt: task.prompt,
    projectId: task.projectId,
    agentDeviceId: task.agentDeviceId,
    status: task.status,
    permissionLevel: task.permissionLevel,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });

  return task;
}

export function persistTaskEvent(database: DatabaseConnection, event: TaskEvent): void {
  insertTaskEvent(database, {
    eventId: event.eventId,
    taskId: event.taskId,
    kind: event.kind,
    message: event.message,
    dataJson: event.data === undefined ? null : JSON.stringify(event.data),
    createdAt: event.createdAt,
  });

  if (event.kind === "status" && typeof event.data === "object" && event.data !== null) {
    const status = (event.data as { status?: unknown }).status;
    if (typeof status === "string") {
      updateTaskStatus(database, event.taskId, status, event.createdAt);
    }
  }
}
