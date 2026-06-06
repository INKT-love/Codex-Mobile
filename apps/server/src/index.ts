import { createEnvelope } from "@codex-mobile/protocol";

const host = process.env.CODEX_MOBILE_HOST ?? "127.0.0.1";
const port = Number(process.env.CODEX_MOBILE_PORT ?? "9001");

const bootMessage = createEnvelope({
  id: "server_boot",
  type: "server.boot",
  source: "server",
  target: "server",
  payload: {
    host,
    port,
  },
});

console.log(JSON.stringify(bootMessage, null, 2));
