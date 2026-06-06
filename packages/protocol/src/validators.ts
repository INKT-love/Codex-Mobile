import { z } from "zod";
import { envelopeSchema, type ProtocolEnvelope } from "./envelope.js";
import { messagePayloadSchemas, type MessageType } from "./messages.js";

export function isKnownMessageType(type: string): type is MessageType {
  return Object.hasOwn(messagePayloadSchemas, type);
}

export function parseProtocolMessage(value: unknown): ProtocolEnvelope {
  const envelope = envelopeSchema.parse(value) as ProtocolEnvelope;

  if (!isKnownMessageType(envelope.type)) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["type"],
        message: `Unknown message type: ${envelope.type}`,
        input: envelope.type,
      },
    ]);
  }

  return {
    ...envelope,
    payload: messagePayloadSchemas[envelope.type].parse(envelope.payload),
  };
}

export function safeParseProtocolMessage(value: unknown) {
  try {
    return {
      success: true as const,
      data: parseProtocolMessage(value),
    };
  } catch (error) {
    return {
      success: false as const,
      error,
    };
  }
}
