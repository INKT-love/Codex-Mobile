import assert from "node:assert/strict";
import test from "node:test";
import {
  createEnvelope,
  parseProtocolMessage,
  safeParseProtocolMessage,
  type TaskCreatePayload,
} from "./index.js";

test("creates a versioned envelope with timestamp", () => {
  const envelope = createEnvelope({
    id: "msg_1",
    type: "ping",
    source: "android:phone_1",
    target: "server",
    payload: {},
  });

  assert.equal(envelope.version, 1);
  assert.equal(envelope.type, "ping");
  assert.match(envelope.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("parses a valid task.create protocol message", () => {
  const payload: TaskCreatePayload = {
    title: "Add README",
    prompt: "Create a useful README.",
    projectId: "project_1",
    agentDeviceId: "agent_1",
    permissionLevel: "Ship",
    attachmentIds: [],
  };

  const parsed = parseProtocolMessage(
    createEnvelope({
      id: "msg_2",
      type: "task.create",
      source: "android:phone_1",
      target: "agent:agent_1",
      payload,
    }),
  );

  assert.equal(parsed.type, "task.create");
  assert.deepEqual(parsed.payload, payload);
});

test("rejects unknown message types", () => {
  const result = safeParseProtocolMessage(
    createEnvelope({
      id: "msg_3",
      type: "unknown.type",
      source: "android:phone_1",
      target: "server",
      payload: {},
    }),
  );

  assert.equal(result.success, false);
});

test("rejects invalid payload for known message types", () => {
  const result = safeParseProtocolMessage(
    createEnvelope({
      id: "msg_4",
      type: "task.create",
      source: "android:phone_1",
      target: "agent:agent_1",
      payload: {
        title: "",
        prompt: "",
      },
    }),
  );

  assert.equal(result.success, false);
});
