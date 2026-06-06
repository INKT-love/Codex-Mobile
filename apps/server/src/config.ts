export interface ServerConfig {
  host: string;
  port: number;
  databasePath: string;
  publicUrl: string;
}

function readPort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid CODEX_MOBILE_PORT value: ${value}`);
  }

  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const host = env.CODEX_MOBILE_HOST ?? "127.0.0.1";
  const port = readPort(env.CODEX_MOBILE_PORT, 9001);

  return {
    host,
    port,
    databasePath: env.CODEX_MOBILE_DATABASE_PATH ?? "data/codex-mobile.sqlite",
    publicUrl: env.CODEX_MOBILE_PUBLIC_URL ?? `ws://${host}:${port}/ws`,
  };
}
