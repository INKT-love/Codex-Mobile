# Codex Mobile Implementation Plan

Date: 2026-06-06

This plan breaks the approved design into small, verifiable changes. Each completed change must be committed and pushed to GitHub.

## Phase 1: Repository Foundation

1. Create a monorepo layout:
   - `apps/server` for the Node.js relay server.
   - `apps/agent` for the Windows PC Agent.
   - `apps/android` for the Kotlin + Jetpack Compose app.
   - `packages/protocol` for shared TypeScript protocol types and validators.
   - `docs` for specs and deployment notes.
2. Add root package management for the TypeScript workspaces.
3. Add TypeScript, lint/build scripts, and shared compiler configuration.
4. Add repository metadata files:
   - `.gitignore`
   - `.gitattributes`
   - `README.md`

Verification:

- `npm install`
- `npm run build`
- Git status is clean after generated files are ignored.

## Phase 2: Shared Protocol Package

1. Define message envelope types.
2. Define core models:
   - User
   - Device
   - PairingCode
   - WorkspaceRoot
   - Project
   - Task
   - TaskEvent
   - ApprovalRequest
   - NotificationIntent
3. Define message payload schemas for:
   - Pairing
   - Device
   - Project
   - Task
   - Approval
   - System
4. Add runtime validation with a lightweight schema library.
5. Export helpers for creating typed messages.

Verification:

- Protocol package builds.
- Unit tests cover valid and invalid message envelopes.

## Phase 3: Relay Server MVP

1. Create HTTP/WebSocket server on configurable host and port.
2. Add environment configuration:
   - `CODEX_MOBILE_HOST`
   - `CODEX_MOBILE_PORT`
   - `CODEX_MOBILE_DATABASE_PATH`
   - `CODEX_MOBILE_PUBLIC_URL`
3. Add SQLite persistence:
   - devices
   - pairing codes
   - tasks
   - task events
   - audit events
4. Add pairing code CLI command.
5. Add token issuing and hashed token storage.
6. Add WebSocket authentication.
7. Add in-memory connection registry.
8. Add message routing between Android and Agent clients.
9. Add device presence and heartbeat handling.

Verification:

- Server starts locally on `127.0.0.1:9001`.
- CLI can create a pairing code.
- Test client can pair, authenticate, send ping, and receive pong.
- Unit tests cover pairing, token auth, and routing.

## Phase 4: PC Agent MVP

1. Add Agent configuration file support.
2. Add first-run pairing command.
3. Connect to server WebSocket with device token.
4. Send `device.hello` with capabilities.
5. Implement workspace whitelist root `F:\Coding\Program`.
6. Implement project listing under the whitelist root.
7. Implement project creation with safe folder-name validation.
8. Implement Codex executable discovery:
   - PATH lookup.
   - Codex Desktop package lookup.
9. Implement task execution as a child process.
10. Stream stdout/stderr as `task.event`.
11. Implement Git status, commit, and push for `Ship` projects.

Verification:

- Agent connects and appears online.
- Agent lists projects under `F:\Coding\Program`.
- Agent rejects paths outside the whitelist.
- Agent can discover the local Codex Desktop `codex.exe`.
- Agent can run a harmless test task command path in dry-run mode.

## Phase 5: Server-Agent End-To-End

1. Add a local test client script that acts like Android.
2. Create a task targeting the connected Agent.
3. Forward task to Agent.
4. Stream events back to the test client.
5. Persist task status and key events.
6. Support task cancellation.

Verification:

- A local script can create a task and receive streamed output.
- Server database contains task and event records.
- Agent handles disconnect and reconnect.

## Phase 6: Android App Foundation

1. Create Android project in `apps/android`.
2. Add Compose, navigation, and app theme.
3. Add screens:
   - Task list.
   - Task creation.
   - Task detail.
   - Device management.
   - Project selection.
   - Settings.
4. Add local settings storage for server URL and token.
5. Add WebSocket client abstraction.
6. Add protocol model mapping for Android.

Verification:

- Android project builds.
- Compose previews or screenshots cover core screens.
- App can connect to local or configured server.

## Phase 7: Android Pairing And Device Flow

1. Implement pairing-code entry.
2. Store issued token securely.
3. Show bound devices and online state.
4. Show Agent capabilities.
5. Add reconnect behavior.

Verification:

- Android pairs with server.
- Bound PC Agent appears online.
- Offline state updates after heartbeat timeout.

## Phase 8: Android Project And Task Flow

1. Implement project list.
2. Implement project creation.
3. Implement current project selection.
4. Implement task creation.
5. Implement task detail event stream.
6. Implement completion and failure states.
7. Implement basic approval card UI.

Verification:

- Android can create a project through Agent.
- Android can create a task.
- Task events stream into the task detail screen.
- Final status is visible.

## Phase 9: Deployment Notes

1. Document Linux server setup.
2. Document process manager setup.
3. Document reverse proxy or certd TLS layout on port `9443`.
4. Document router port-forwarding requirement.
5. Document Windows Agent setup.
6. Document Android server URL configuration.

Verification:

- Fresh setup instructions can start server and Agent.
- Public `wss://codex.inktandwkx.top:9443/ws` can be tested after network and certificate setup.

## Phase 10: Hardening And Reserved Extensions

1. Add audit log views or export.
2. Add dangerous-operation approval rules.
3. Add attachment upload plumbing.
4. Add notification intent delivery hooks.
5. Add GitHub repo creation protocol implementation.
6. Add Windows tray app wrapper.

Verification:

- Each extension is implemented as its own small milestone with tests and a commit.
