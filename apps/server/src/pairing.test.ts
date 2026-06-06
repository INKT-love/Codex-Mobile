import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { hashSecret } from "./crypto.js";
import { insertPairingCode, openDatabase, type DatabaseConnection } from "./database.js";
import { createId } from "./ids.js";
import { claimPairingCode, PairingError } from "./pairing.js";

function withDatabase(run: (database: DatabaseConnection) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "codex-mobile-server-"));
  const database = openDatabase(join(directory, "test.sqlite"));

  try {
    run(database);
  } finally {
    database.close();
    rmSync(directory, {
      force: true,
      recursive: true,
    });
  }
}

function insertCode(database: DatabaseConnection, code: string, expiresAt: Date): void {
  const now = new Date();
  insertPairingCode(database, {
    pairingCodeId: createId("pairing"),
    codeHash: hashSecret(code),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    claimedAt: null,
    claimedByDeviceId: null,
  });
}

test("claims a valid pairing code and returns a device token", () => {
  withDatabase((database) => {
    insertCode(database, "123456", new Date(Date.now() + 60_000));

    const result = claimPairingCode(database, {
      code: "123456",
      deviceName: "Smoke Phone",
      deviceType: "android",
    });

    assert.equal(result.device.deviceName, "Smoke Phone");
    assert.equal(result.device.deviceType, "android");
    assert.equal(result.device.online, true);
    assert.ok(result.token.length > 20);
  });
});

test("rejects a pairing code after it has been claimed", () => {
  withDatabase((database) => {
    insertCode(database, "123456", new Date(Date.now() + 60_000));

    claimPairingCode(database, {
      code: "123456",
      deviceName: "First Phone",
      deviceType: "android",
    });

    assert.throws(
      () =>
        claimPairingCode(database, {
          code: "123456",
          deviceName: "Second Phone",
          deviceType: "android",
        }),
      (error) => error instanceof PairingError && error.code === "pairing_code_claimed",
    );
  });
});

test("rejects an expired pairing code", () => {
  withDatabase((database) => {
    insertCode(database, "123456", new Date(Date.now() - 60_000));

    assert.throws(
      () =>
        claimPairingCode(database, {
          code: "123456",
          deviceName: "Smoke Phone",
          deviceType: "android",
        }),
      (error) => error instanceof PairingError && error.code === "pairing_code_expired",
    );
  });
});
