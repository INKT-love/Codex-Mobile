import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { spawnCommandSync } from "./processCommand.js";

export interface CodexDiscoveryResult {
  path: string | null;
  source: "path" | "desktop" | "missing";
  executable: boolean;
  error?: string;
}

function candidateNames(): string[] {
  return process.platform === "win32" ? ["codex.exe", "codex.cmd", "codex.bat"] : ["codex"];
}

function findOnPath(): string | null {
  const paths = (process.env.PATH ?? "").split(delimiter).filter(Boolean);

  for (const directory of paths) {
    for (const name of candidateNames()) {
      const candidate = join(directory, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function findDesktopCodex(): string | null {
  if (process.platform !== "win32") {
    return null;
  }

  const windowsApps = join(process.env.ProgramFiles ?? "C:\\Program Files", "WindowsApps");

  try {
    const output = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-ChildItem -LiteralPath '${windowsApps.replaceAll("'", "''")}' -Directory -Filter 'OpenAI.Codex_*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName`,
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    ).trim();

    if (!output) {
      return null;
    }

    const candidate = join(output, "app", "resources", "codex.exe");
    return existsSync(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function discoverCodexExecutable(): CodexDiscoveryResult {
  const pathResult = findOnPath();
  if (pathResult) {
    const executable = testExecutable(pathResult);
    return {
      path: pathResult,
      source: "path",
      ...executable,
    };
  }

  const desktopResult = findDesktopCodex();
  if (desktopResult) {
    const executable = testExecutable(desktopResult);
    return {
      path: desktopResult,
      source: "desktop",
      ...executable,
    };
  }

  return {
    path: null,
    source: "missing",
    executable: false,
    error: "Codex executable was not found.",
  };
}

export function codexPathToDisplayUrl(path: string): string {
  return pathToFileURL(path).toString();
}

function testExecutable(path: string): { executable: boolean; error?: string } {
  const result = spawnCommandSync(path, ["--version"], {
    timeout: 5_000,
    windowsHide: true,
  });

  if (result.error) {
    return {
      executable: false,
      error: result.error.message,
    };
  }

  return {
    executable: result.status === 0,
    error: result.status === 0 ? undefined : result.stderr || result.stdout || "Codex command failed.",
  };
}
