import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

export type DatabaseConnection = Database.Database;

export interface PairingCodeRecord {
  pairingCodeId: string;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedByDeviceId: string | null;
}

export interface DeviceRecord {
  deviceId: string;
  deviceName: string;
  deviceType: "android" | "agent";
  tokenHash: string;
  capabilitiesJson: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface PairingCodeLookupRecord {
  pairing_code_id: string;
  code_hash: string;
  created_at: string;
  expires_at: string;
  claimed_at: string | null;
  claimed_by_device_id: string | null;
}

export function openDatabase(databasePath: string): DatabaseConnection {
  mkdirSync(dirname(databasePath), {
    recursive: true,
  });

  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrate(database);
  return database;
}

function migrate(database: DatabaseConnection): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      device_name TEXT NOT NULL,
      device_type TEXT NOT NULL CHECK (device_type IN ('android', 'agent')),
      token_hash TEXT NOT NULL,
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      last_seen_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pairing_codes (
      pairing_code_id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      claimed_at TEXT,
      claimed_by_device_id TEXT,
      FOREIGN KEY (claimed_by_device_id) REFERENCES devices(device_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at
      ON pairing_codes(expires_at);

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      project_id TEXT NOT NULL,
      agent_device_id TEXT NOT NULL,
      status TEXT NOT NULL,
      permission_level TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_events (
      event_id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      data_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(task_id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      audit_event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor_device_id TEXT,
      subject_id TEXT,
      data_json TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

export function insertPairingCode(
  database: DatabaseConnection,
  record: PairingCodeRecord,
): void {
  database
    .prepare(
      `
        INSERT INTO pairing_codes (
          pairing_code_id,
          code_hash,
          created_at,
          expires_at,
          claimed_at,
          claimed_by_device_id
        )
        VALUES (
          @pairingCodeId,
          @codeHash,
          @createdAt,
          @expiresAt,
          @claimedAt,
          @claimedByDeviceId
        )
      `,
    )
    .run(record);
}

export function findPairingCodeByHash(
  database: DatabaseConnection,
  codeHash: string,
): PairingCodeLookupRecord | undefined {
  return database
    .prepare(
      `
        SELECT
          pairing_code_id,
          code_hash,
          created_at,
          expires_at,
          claimed_at,
          claimed_by_device_id
        FROM pairing_codes
        WHERE code_hash = ?
      `,
    )
    .get(codeHash) as PairingCodeLookupRecord | undefined;
}

export function insertDevice(database: DatabaseConnection, record: DeviceRecord): void {
  database
    .prepare(
      `
        INSERT INTO devices (
          device_id,
          device_name,
          device_type,
          token_hash,
          capabilities_json,
          created_at,
          last_seen_at
        )
        VALUES (
          @deviceId,
          @deviceName,
          @deviceType,
          @tokenHash,
          @capabilitiesJson,
          @createdAt,
          @lastSeenAt
        )
      `,
    )
    .run(record);
}

export function markPairingCodeClaimed(
  database: DatabaseConnection,
  pairingCodeId: string,
  claimedAt: string,
  claimedByDeviceId: string,
): void {
  database
    .prepare(
      `
        UPDATE pairing_codes
        SET claimed_at = ?, claimed_by_device_id = ?
        WHERE pairing_code_id = ?
      `,
    )
    .run(claimedAt, claimedByDeviceId, pairingCodeId);
}
