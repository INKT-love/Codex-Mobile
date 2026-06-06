import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertSafeProjectName,
  createProjectFolder,
  listProjectFolders,
  resolveInsideWorkspace,
} from "./workspace.js";

test("accepts a normal project folder name", () => {
  assert.doesNotThrow(() => assertSafeProjectName("CodexMobile"));
});

test("rejects path traversal in project folder names", () => {
  assert.throws(() => assertSafeProjectName("..\\secret"));
  assert.throws(() => assertSafeProjectName("../secret"));
  assert.throws(() => assertSafeProjectName("secret..backup"));
});

test("rejects Windows reserved project folder names", () => {
  assert.throws(() => assertSafeProjectName("CON"));
});

test("resolves paths only inside workspace root", () => {
  const root = "F:\\Coding\\Program";
  assert.equal(resolveInsideWorkspace(root, "Project"), "F:\\Coding\\Program\\Project");
  assert.throws(() => resolveInsideWorkspace(root, "..\\Secret"));
});

test("creates and lists project folders", () => {
  const root = mkdtempSync(join(tmpdir(), "codex-mobile-agent-"));

  try {
    createProjectFolder(root, "ProjectA");
    createProjectFolder(root, "ProjectB");

    assert.deepEqual(listProjectFolders(root), ["ProjectA", "ProjectB"]);
  } finally {
    rmSync(root, {
      force: true,
      recursive: true,
    });
  }
});
