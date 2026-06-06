import { loadConfig } from "./config.js";
import { openDatabase } from "./database.js";
import { createCodexMobileServer } from "./server.js";

const config = loadConfig();
const database = openDatabase(config.databasePath);
const server = createCodexMobileServer(config, database);

await server.listen();

console.log(`Codex Mobile server listening on http://${config.host}:${config.port}`);
console.log(`WebSocket endpoint: ${config.publicUrl}`);

const shutdown = async () => {
  await server.close();
  database.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
