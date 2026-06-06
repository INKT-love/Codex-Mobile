import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

const agentConfigSchema = z.object({
  serverUrl: z.string().url(),
  deviceId: z.string().min(1).optional(),
  deviceToken: z.string().min(1).optional(),
  deviceName: z.string().min(1),
  workspaceRoot: z.string().min(1),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

export function getDefaultConfigPath(): string {
  const base = process.env.APPDATA ?? join(process.env.USERPROFILE ?? process.cwd(), "AppData", "Roaming");
  return join(base, "CodexMobileAgent", "config.json");
}

export function loadAgentConfig(configPath = getDefaultConfigPath()): AgentConfig {
  if (!existsSync(configPath)) {
    return {
      serverUrl: process.env.CODEX_MOBILE_SERVER_URL ?? "ws://127.0.0.1:9001/ws",
      deviceName: process.env.COMPUTERNAME ?? "Codex PC",
      workspaceRoot: process.env.CODEX_MOBILE_WORKSPACE_ROOT ?? "F:\\Coding\\Program",
    };
  }

  const parsed = agentConfigSchema.parse(JSON.parse(readFileSync(configPath, "utf8")));
  return {
    ...parsed,
    serverUrl: process.env.CODEX_MOBILE_SERVER_URL ?? parsed.serverUrl,
    workspaceRoot: process.env.CODEX_MOBILE_WORKSPACE_ROOT ?? parsed.workspaceRoot,
  };
}

export function saveAgentConfig(config: AgentConfig, configPath = getDefaultConfigPath()): void {
  mkdirSync(dirname(configPath), {
    recursive: true,
  });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
