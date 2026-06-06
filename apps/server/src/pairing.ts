import type { Device, PairingClaimPayload } from "@codex-mobile/protocol";
import { createRandomToken, hashSecret } from "./crypto.js";
import {
  findPairingCodeByHash,
  insertDevice,
  markPairingCodeClaimed,
  type DatabaseConnection,
} from "./database.js";
import { createId } from "./ids.js";

export interface PairingClaimResult {
  device: Device;
  token: string;
}

export class PairingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function claimPairingCode(
  database: DatabaseConnection,
  payload: PairingClaimPayload,
): PairingClaimResult {
  const codeHash = hashSecret(payload.code);
  const record = findPairingCodeByHash(database, codeHash);

  if (!record) {
    throw new PairingError("pairing_code_not_found", "Pairing code was not found.");
  }

  if (record.claimed_at) {
    throw new PairingError("pairing_code_claimed", "Pairing code has already been used.");
  }

  const now = new Date();
  if (new Date(record.expires_at).getTime() <= now.getTime()) {
    throw new PairingError("pairing_code_expired", "Pairing code has expired.");
  }

  const deviceId = createId(payload.deviceType);
  const token = createRandomToken();
  const createdAt = now.toISOString();

  const device: Device = {
    deviceId,
    deviceName: payload.deviceName,
    deviceType: payload.deviceType,
    online: true,
    capabilities: [],
    lastSeenAt: createdAt,
  };

  const transaction = database.transaction(() => {
    insertDevice(database, {
      deviceId,
      deviceName: payload.deviceName,
      deviceType: payload.deviceType,
      tokenHash: hashSecret(token),
      capabilitiesJson: JSON.stringify([]),
      createdAt,
      lastSeenAt: createdAt,
    });

    markPairingCodeClaimed(database, record.pairing_code_id, createdAt, deviceId);
  });

  transaction();

  return {
    device,
    token,
  };
}
