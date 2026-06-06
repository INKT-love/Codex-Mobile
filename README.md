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
