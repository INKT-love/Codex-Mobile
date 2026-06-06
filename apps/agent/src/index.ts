import { loadAgentConfig, saveAgentConfig } from "./config.js";
import { discoverCodexExecutable } from "./codexDiscovery.js";
import { pairAgent, runAgent } from "./client.js";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "run";
  const config = loadAgentConfig();

  if (command === "pair") {
    const pairingCode = process.argv[3];

    if (!pairingCode) {
      throw new Error("Usage: npm run pair -w @codex-mobile/agent -- <pairing-code>");
    }

    const result = await pairAgent({
      config,
      pairingCode,
    });

    saveAgentConfig({
      ...config,
      deviceId: result.device.deviceId,
      deviceToken: result.token,
      deviceName: result.device.deviceName,
    });

    console.log(`Paired agent device ${result.device.deviceId}.`);
    return;
  }

  if (command === "doctor") {
    const codex = discoverCodexExecutable();
    console.log(JSON.stringify(
      {
        serverUrl: config.serverUrl,
        workspaceRoot: config.workspaceRoot,
        deviceId: config.deviceId ?? null,
        codex,
      },
      null,
      2,
    ));
    return;
  }

  if (!config.deviceId || !config.deviceToken) {
    throw new Error("Agent is not paired yet. Run: npm run pair -w @codex-mobile/agent -- <pairing-code>");
  }

  runAgent({
    ...config,
    deviceId: config.deviceId,
    deviceToken: config.deviceToken,
  });
}

await main();
