import { spawn, spawnSync, type SpawnOptions, type SpawnSyncReturns } from "node:child_process";

export interface CommandSpec {
  command: string;
  args: string[];
}

function isWindowsCommandShim(command: string): boolean {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
}

export function toSpawnCommand(command: string, args: string[]): CommandSpec {
  if (!isWindowsCommandShim(command)) {
    return {
      command,
      args,
    };
  }

  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", command, ...args],
  };
}

export function spawnCommand(command: string, args: string[], options: SpawnOptions = {}) {
  const spec = toSpawnCommand(command, args);
  return spawn(spec.command, spec.args, options);
}

export function spawnCommandSync(
  command: string,
  args: string[],
  options: SpawnOptions = {},
): SpawnSyncReturns<string> {
  const spec = toSpawnCommand(command, args);
  return spawnSync(spec.command, spec.args, {
    ...options,
    encoding: "utf8",
  }) as SpawnSyncReturns<string>;
}
