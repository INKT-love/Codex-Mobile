import { loadConfig } from "./config.js";
import { createCodexMobileServer } from "./server.js";

const config = loadConfig();
const server = createCodexMobileServer(config);

await server.listen();

console.log(`Codex Mobile server listening on http://${config.host}:${config.port}`);
console.log(`WebSocket endpoint: ${config.publicUrl}`);

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
