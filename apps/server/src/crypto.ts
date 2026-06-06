import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createRandomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function createPairingCode(): string {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, "0");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function compareSecret(secret: string, hash: string): boolean {
  const candidate = Buffer.from(hashSecret(secret), "hex");
  const expected = Buffer.from(hash, "hex");

  if (candidate.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(candidate, expected);
}
