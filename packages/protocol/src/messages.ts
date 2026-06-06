import { z } from "zod";
import {
  approvalRequestSchema,
  deviceSchema,
  notificationIntentSchema,
  permissionLevelSchema,
  projectSchema,
  taskEventSchema,
  taskSchema,
} from "./models.js";

export const pairingCreatePayloadSchema = z.object({
  requestedBy: z.enum(["serverCli", "android", "agent"]),
});
export type PairingCreatePayload = z.infer<typeof pairingCreatePayloadSchema>;

export const pairingClaimPayloadSchema = z.object({
  code: z.string().min(4),
  deviceName: z.string().min(1),
  deviceType: z.enum(["android", "agent"]),
});
export type PairingClaimPayload = z.infer<typeof pairingClaimPayloadSchema>;

export const pairingConfirmedPayloadSchema = z.object({
  device: deviceSchema,
  token: z.string().min(1),
});
export type PairingConfirmedPayload = z.infer<typeof pairingConfirmedPayloadSchema>;

export const deviceHelloPayloadSchema = z.object({
  device: deviceSchema,
});
export type DeviceHelloPayload = z.infer<typeof deviceHelloPayloadSchema>;

export const deviceStatusPayloadSchema = z.object({
  device: deviceSchema,
});
export type DeviceStatusPayload = z.infer<typeof deviceStatusPayloadSchema>;

export const deviceListPayloadSchema = z.object({
  devices: z.array(deviceSchema).optional(),
});
export type DeviceListPayload = z.infer<typeof deviceListPayloadSchema>;

export const projectListPayloadSchema = z.object({
  agentDeviceId: z.string().min(1),
  projects: z.array(projectSchema).optional(),
});
export type ProjectListPayload = z.infer<typeof projectListPayloadSchema>;

export const projectCreatePayloadSchema = z.object({
  agentDeviceId: z.string().min(1),
  folderName: z.string().min(1),
  permissionLevel: permissionLevelSchema.default("Edit"),
});
export type ProjectCreatePayload = z.infer<typeof projectCreatePayloadSchema>;

export const projectCreatedPayloadSchema = z.object({
  project: projectSchema,
});
export type ProjectCreatedPayload = z.infer<typeof projectCreatedPayloadSchema>;

export const taskCreatePayloadSchema = z.object({
  taskId: z.string().min(1).optional(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  projectId: z.string().min(1),
  agentDeviceId: z.string().min(1),
  permissionLevel: permissionLevelSchema,
  attachmentIds: z.array(z.string().min(1)).default([]),
});
export type TaskCreatePayload = z.infer<typeof taskCreatePayloadSchema>;

export const taskCreatedPayloadSchema = z.object({
  task: taskSchema,
});
export type TaskCreatedPayload = z.infer<typeof taskCreatedPayloadSchema>;

export const taskStatusPayloadSchema = z.object({
  task: taskSchema,
});
export type TaskStatusPayload = z.infer<typeof taskStatusPayloadSchema>;

export const taskEventPayloadSchema = z.object({
  event: taskEventSchema,
});
export type TaskEventPayload = z.infer<typeof taskEventPayloadSchema>;

export const approvalRequestPayloadSchema = z.object({
  approval: approvalRequestSchema,
});
export type ApprovalRequestPayload = z.infer<typeof approvalRequestPayloadSchema>;

export const approvalRespondPayloadSchema = z.object({
  approvalId: z.string().min(1),
  approved: z.boolean(),
  reason: z.string().optional(),
});
export type ApprovalRespondPayload = z.infer<typeof approvalRespondPayloadSchema>;

export const notificationIntentPayloadSchema = z.object({
  notification: notificationIntentSchema,
});
export type NotificationIntentPayload = z.infer<typeof notificationIntentPayloadSchema>;

export const errorPayloadSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});
export type ErrorPayload = z.infer<typeof errorPayloadSchema>;

export const serverWelcomePayloadSchema = z.object({
  service: z.string().min(1),
});
export type ServerWelcomePayload = z.infer<typeof serverWelcomePayloadSchema>;

export const authLoginPayloadSchema = z.object({
  deviceId: z.string().min(1),
  token: z.string().min(1),
});
export type AuthLoginPayload = z.infer<typeof authLoginPayloadSchema>;

export const authOkPayloadSchema = z.object({
  device: deviceSchema,
});
export type AuthOkPayload = z.infer<typeof authOkPayloadSchema>;

export const messagePayloadSchemas = {
  "pairing.create": pairingCreatePayloadSchema,
  "pairing.claim": pairingClaimPayloadSchema,
  "pairing.confirmed": pairingConfirmedPayloadSchema,
  "device.hello": deviceHelloPayloadSchema,
  "device.status": deviceStatusPayloadSchema,
  "device.list": deviceListPayloadSchema,
  "project.list": projectListPayloadSchema,
  "project.create": projectCreatePayloadSchema,
  "project.created": projectCreatedPayloadSchema,
  "task.create": taskCreatePayloadSchema,
  "task.created": taskCreatedPayloadSchema,
  "task.status": taskStatusPayloadSchema,
  "task.event": taskEventPayloadSchema,
  "approval.request": approvalRequestPayloadSchema,
  "approval.respond": approvalRespondPayloadSchema,
  "notification.intent": notificationIntentPayloadSchema,
  "server.welcome": serverWelcomePayloadSchema,
  "auth.login": authLoginPayloadSchema,
  "auth.ok": authOkPayloadSchema,
  error: errorPayloadSchema,
  ping: z.object({}),
  pong: z.object({}),
} as const;

export type MessageType = keyof typeof messagePayloadSchemas;

export function parsePayloadForType<TType extends MessageType>(
  type: TType,
  payload: unknown,
): z.infer<(typeof messagePayloadSchemas)[TType]> {
  const schema = messagePayloadSchemas[type] as unknown as z.ZodType<
    z.infer<(typeof messagePayloadSchemas)[TType]>
  >;
  return schema.parse(payload);
}
