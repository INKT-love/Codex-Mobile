export type ClientKind = "android" | "agent" | "server";

export type MessageSource = ClientKind | `${ClientKind}:${string}`;

export type MessageTarget = "server" | "broadcast" | `${ClientKind}:${string}`;

export interface ProtocolEnvelope<TType extends string = string, TPayload = unknown> {
  id: string;
  type: TType;
  version: 1;
  timestamp: string;
  source: MessageSource;
  target: MessageTarget;
  payload: TPayload;
}

export type DeviceType = "android" | "agent";

export interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  online: boolean;
  capabilities: string[];
  lastSeenAt: string | null;
}

export type PermissionLevel = "Review" | "Edit" | "Ship";

export interface Project {
  projectId: string;
  displayName: string;
  absolutePath: string;
  permissionLevel: PermissionLevel;
  gitStatus: "unknown" | "clean" | "dirty" | "notInitialized";
  repoProvider?: "github";
  remoteCreateStatus?: "notRequested" | "pending" | "created" | "failed";
  githubRepoId?: string;
}

export type TaskStatus =
  | "queued"
  | "running"
  | "waitingApproval"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task {
  taskId: string;
  title: string;
  prompt: string;
  projectId: string;
  agentDeviceId: string;
  status: TaskStatus;
  permissionLevel: PermissionLevel;
  createdAt: string;
  updatedAt: string;
}

export type TaskEventKind =
  | "output"
  | "status"
  | "error"
  | "fileSummary"
  | "git"
  | "approval";

export interface TaskEvent {
  eventId: string;
  taskId: string;
  kind: TaskEventKind;
  message: string;
  createdAt: string;
  data?: unknown;
}

export interface ApprovalRequest {
  approvalId: string;
  taskId: string;
  action: string;
  description: string;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationIntent {
  notificationId: string;
  taskId?: string;
  title: string;
  body: string;
  createdAt: string;
}

export function createEnvelope<TType extends string, TPayload>(
  input: Omit<ProtocolEnvelope<TType, TPayload>, "version" | "timestamp"> & {
    timestamp?: string;
  },
): ProtocolEnvelope<TType, TPayload> {
  return {
    ...input,
    version: 1,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}
