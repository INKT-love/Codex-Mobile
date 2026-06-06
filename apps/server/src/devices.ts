import type { Device } from "@codex-mobile/protocol";
import { compareSecret } from "./crypto.js";
import {
  findDeviceById,
  listDevices,
  updateDevicePresence,
  type DatabaseConnection,
  type DeviceLookupRecord,
} from "./database.js";

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function toDevice(record: DeviceLookupRecord, online: boolean): Device {
  return {
    deviceId: record.device_id,
    deviceName: record.device_name,
    deviceType: record.device_type,
    online,
    capabilities: JSON.parse(record.capabilities_json) as string[],
    lastSeenAt: record.last_seen_at,
  };
}

export function authenticateDevice(
  database: DatabaseConnection,
  deviceId: string,
  token: string,
): Device {
  const record = findDeviceById(database, deviceId);

  if (!record) {
    throw new AuthError("device_not_found", "Device was not found.");
  }

  if (!compareSecret(token, record.token_hash)) {
    throw new AuthError("invalid_token", "Device token is invalid.");
  }

  const now = new Date().toISOString();
  updateDevicePresence(database, deviceId, now, JSON.parse(record.capabilities_json) as string[]);

  return toDevice(
    {
      ...record,
      last_seen_at: now,
    },
    true,
  );
}

export function updateAuthenticatedDevice(
  database: DatabaseConnection,
  deviceId: string,
  capabilities: string[],
): Device {
  const now = new Date().toISOString();
  updateDevicePresence(database, deviceId, now, capabilities);
  const record = findDeviceById(database, deviceId);

  if (!record) {
    throw new AuthError("device_not_found", "Device was not found.");
  }

  return toDevice(record, true);
}

export function listKnownDevices(database: DatabaseConnection, onlineDeviceIds: Set<string>): Device[] {
  return listDevices(database).map((record) => toDevice(record, onlineDeviceIds.has(record.device_id)));
}
