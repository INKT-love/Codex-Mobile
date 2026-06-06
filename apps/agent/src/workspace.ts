import { mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

const invalidWindowsNamePattern = /[<>:"/\\|?*\x00-\x1F]/;
const reservedWindowsNames = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

export function assertSafeProjectName(folderName: string): void {
  if (!folderName.trim()) {
    throw new Error("Project folder name is required.");
  }

  if (folderName !== basename(folderName)) {
    throw new Error("Project folder name must not contain path separators.");
  }

  if (folderName === "." || folderName === ".." || folderName.includes("..")) {
    throw new Error("Project folder name must not contain traversal segments.");
  }

  if (invalidWindowsNamePattern.test(folderName)) {
    throw new Error("Project folder name contains invalid characters.");
  }

  if (reservedWindowsNames.has(folderName.toUpperCase())) {
    throw new Error("Project folder name is reserved by Windows.");
  }
}

export function resolveInsideWorkspace(workspaceRoot: string, inputPath: string): string {
  const root = resolve(workspaceRoot);
  const resolved = resolve(root, inputPath);

  if (resolved !== root && !resolved.startsWith(`${root}\\`) && !resolved.startsWith(`${root}/`)) {
    throw new Error("Path is outside the configured workspace root.");
  }

  return resolved;
}

export function listProjectFolders(workspaceRoot: string): string[] {
  const root = resolveInsideWorkspace(workspaceRoot, ".");
  mkdirSync(root, {
    recursive: true,
  });

  return readdirSync(root)
    .filter((entry) => statSync(resolveInsideWorkspace(root, entry)).isDirectory())
    .sort((left, right) => left.localeCompare(right));
}

export function createProjectFolder(workspaceRoot: string, folderName: string): string {
  assertSafeProjectName(folderName);
  const projectPath = resolveInsideWorkspace(workspaceRoot, folderName);
  mkdirSync(projectPath, {
    recursive: false,
  });
  return projectPath;
}
