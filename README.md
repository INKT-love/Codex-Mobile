# Codex Mobile

Codex Mobile is a self-hosted Android control app for running Codex on a Windows PC through a private relay server.

Communication path:

```text
PC Codex Agent <-> Self-hosted relay server <-> Android app
```

## Workspace

- `apps/server`: Node.js + TypeScript relay server.
- `apps/agent`: Node.js + TypeScript Windows PC Agent.
- `apps/android`: Kotlin + Jetpack Compose Android app.
- `packages/protocol`: shared TypeScript protocol types and validators.
- `docs`: design, implementation, and deployment notes.

## Scripts

```powershell
npm install
npm run build
```

The Android app will get its own Gradle build after the Android project is created.

## Local Server

Start the relay server on `127.0.0.1:9001`:

```powershell
npm run build
npm run start -w @codex-mobile/server
```

Create a short-lived pairing code:

```powershell
npm run pairing:create -w @codex-mobile/server -- --ttl-minutes=10
```

Useful server environment variables:

- `CODEX_MOBILE_HOST`: defaults to `127.0.0.1`.
- `CODEX_MOBILE_PORT`: defaults to `9001`.
- `CODEX_MOBILE_DATABASE_PATH`: defaults to `data/codex-mobile.sqlite`.
- `CODEX_MOBILE_PUBLIC_URL`: defaults to `ws://127.0.0.1:9001/ws`.

Production is designed to sit behind TLS on:

```text
wss://codex.inktandwkx.top:9443/ws
```

## PC Agent

Check local configuration and Codex discovery:

```powershell
npm run build
npm run doctor -w @codex-mobile/agent
```

Pair the Agent with a server pairing code:

```powershell
npm run pair -w @codex-mobile/agent -- <pairing-code>
```

Run the Agent:

```powershell
npm run start -w @codex-mobile/agent
```

Useful Agent environment variables:

- `CODEX_MOBILE_SERVER_URL`: defaults to `ws://127.0.0.1:9001/ws`.
- `CODEX_MOBILE_WORKSPACE_ROOT`: defaults to `F:\Coding\Program`.
- `CODEX_MOBILE_AGENT_EXECUTOR=mock`: uses the mock task executor for local end-to-end testing.

## Codex CLI Note

Install the standalone Codex CLI when the Windows Store/Desktop packaged executable cannot be spawned directly:

```powershell
npm install -g @openai/codex
```

On Windows PowerShell, the `.ps1` shim may be blocked by the system execution policy. Use the `.cmd` shim for manual checks:

```powershell
codex.cmd --version
```

The Agent now detects `codex.cmd` on `PATH` and executes it through `cmd.exe`, so it can use the globally installed CLI.

For local server-agent-Android flow testing without running Codex, use:

```powershell
$env:CODEX_MOBILE_AGENT_EXECUTOR = "mock"
```

## Android Toolchain

The Android project lives in `apps/android` and is configured as a Gradle module named `:apps:android`.

This machine currently does not expose `java`, `gradle`, `ANDROID_HOME`, or `ANDROID_SDK_ROOT`, so Android compilation has not been run locally yet. After installing Android Studio or a JDK + Android SDK, verify with:

```powershell
gradle :apps:android:assembleDebug
```

Current Android source includes:

- Server URL setting.
- Pairing code claim flow.
- In-memory device token state.
- Authenticated reconnect.
- Device list request and rendering.
