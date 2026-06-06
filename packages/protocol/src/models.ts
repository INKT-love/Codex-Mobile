import { z } from "zod";

export const clientKindSchema = z.enum(["android", "agent", "server"]);
export type ClientKind = z.infer<typeof clientKindSchema>;

export const messageSourceSchema = z.union([
  clientKindSchema,
  z.string().regex(/^(android|agent|server):[A-Za-z0-9_.:-]+$/),
]);
export type MessageSource = z.infer<typeof messageSourceSchema>;

export const messageTargetSchema = z.union([
  z.literal("server"),
  z.literal("broadcast"),
  z.string().regex(/^(android|agent|server):[A-Za-z0-9_.:-]+$/),
]);
export type MessageTarget = z.infer<typeof messageTargetSchema>;

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const deviceTypeSchema = z.enum(["android", "agent"]);
export type DeviceType = z.infer<typeof deviceTypeSchema>;

export const deviceSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  deviceType: deviceTypeSchema,
  online: z.boolean(),
  capabilities: z.array(z.string().min(1)),
  lastSeenAt: isoDateTimeSchema.nullable(),
});
export type Device = z.infer<typeof deviceSchema>;

export const permissionLevelSchema = z.enum(["Review", "Edit", "Ship"]);
export type PermissionLevel = z.infer<typeof permissionLevelSchema>;

export const gitStatusSchema = z.enum(["unknown", "clean", "dirty", "notInitialized"]);
export type GitStatus = z.infer<typeof gitStatusSchema>;

export const projectSchema = z.object({
  projectId: z.string().min(1),
  displayName: z.string().min(1),
  absolutePath: z.string().min(1),
  permissionLevel: permissionLevelSchema,
  gitStatus: gitStatusSchema,
  repoProvider: z.literal("github").optional(),
  remoteCreateStatus: z.enum(["notRequested", "pending", "created", "failed"]).optional(),
  githubRepoId: z.string().min(1).optional(),
});
export type Project = z.infer<typeof projectSchema>;

export const taskStatusSchema = z.enum([
  "queued",
  "running",
  "waitingApproval",
  "completed",
  "failed",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  projectId: z.string().min(1),
  agentDeviceId: z.string().min(1),
  status: taskStatusSchema,
  permissionLevel: permissionLevelSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Task = z.infer<typeof taskSchema>;

export const taskEventKindSchema = z.enum([
  "output",
  "status",
  "error",
  "fileSummary",
  "git",
  "approval",
]);
export type TaskEventKind = z.infer<typeof taskEventKindSchema>;

export const taskEventSchema = z.object({
  eventId: z.string().min(1),
  taskId: z.string().min(1),
  kind: taskEventKindSchema,
  message: z.string(),
  createdAt: isoDateTimeSchema,
  data: z.unknown().optional(),
});
export type TaskEvent = z.infer<typeof taskEventSchema>;

export const approvalRequestSchema = z.object({
  approvalId: z.string().min(1),
  taskId: z.string().min(1),
  action: z.string().min(1),
  description: z.string().min(1),
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema.optional(),
});
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;

export const notificationIntentSchema = z.object({
  notificationId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  createdAt: isoDateTimeSchema,
});
export type NotificationIntent = z.infer<typeof notificationIntentSchema>;
