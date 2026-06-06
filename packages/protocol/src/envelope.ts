import { z } from "zod";
import { messageSourceSchema, messageTargetSchema } from "./models.js";

export const protocolVersionSchema = z.literal(1);
export type ProtocolVersion = z.infer<typeof protocolVersionSchema>;

export const envelopeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  version: protocolVersionSchema,
  timestamp: z.string().datetime({ offset: true }),
  source: messageSourceSchema,
  target: messageTargetSchema,
  payload: z.unknown(),
});

export type ProtocolEnvelope<TType extends string = string, TPayload = unknown> = Omit<
  z.infer<typeof envelopeSchema>,
  "type" | "payload"
> & {
  type: TType;
  payload: TPayload;
};

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

export function parseEnvelope(value: unknown): ProtocolEnvelope {
  return envelopeSchema.parse(value) as ProtocolEnvelope;
}

export function safeParseEnvelope(value: unknown) {
  return envelopeSchema.safeParse(value);
}
