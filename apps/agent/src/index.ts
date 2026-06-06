import os from "node:os";
import { createEnvelope } from "@codex-mobile/protocol";

const workspaceRoot = process.env.CODEX_MOBILE_WORKSPACE_ROOT ?? "F:\\Coding\\Program";

const bootMessage = createEnvelope({
  id: "agent_boot",
  type: "agent.boot",
  source: "agent",
  target: "server",
  payload: {
    deviceName: os.userInfo().username,
    workspaceRoot,
    capabilities: ["workspaceList", "projectCreate", "codexProcess", "git"],
  },
});

console.log(JSON.stringify(bootMessage, null, 2));
