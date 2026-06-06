import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPairingCode, hashSecret } from "./crypto.js";
import { insertPairingCode, openDatabase } from "./database.js";
import { createId } from "./ids.js";
import { loadConfig } from "./config.js";

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function createPairingCodeCommand(args: string[] = process.argv.slice(2)): void {
  const ttlArg = args.find((arg) => arg.startsWith("--ttl-minutes="));
  const ttlMinutes = ttlArg ? Number(ttlArg.split("=")[1]) : 10;

  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    throw new Error("--ttl-minutes must be a positive number.");
  }

  const config = loadConfig();
  const database = openDatabase(config.databasePath);
  const code = createPairingCode();
  const now = new Date();
  const expiresAt = addMinutes(now, ttlMinutes);

  insertPairingCode(database, {
    pairingCodeId: createId("pairing"),
    codeHash: hashSecret(code),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    claimedAt: null,
    claimedByDeviceId: null,
  });

  database.close();

  console.log(JSON.stringify(
    {
      code,
      expiresAt: expiresAt.toISOString(),
      databasePath: config.databasePath,
    },
    null,
    2,
  ));
}

const isDirectRun = process.argv[1]
  ? resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
  : false;

if (isDirectRun) {
  const command = process.argv[2];

  if (command === "pairing:create") {
    createPairingCodeCommand(process.argv.slice(3));
  } else {
    console.error("Usage: node dist/cli.js pairing:create [--ttl-minutes=10]");
    process.exit(1);
  }
}
