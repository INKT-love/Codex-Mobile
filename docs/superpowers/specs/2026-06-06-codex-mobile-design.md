# Codex Mobile Design

Date: 2026-06-06

## Goal

Build an Android mobile control app for Codex, similar in spirit to TRAE SOLO Mobile, but using a self-hosted relay server instead of OpenAI-hosted device routing.

The communication path is:

```text
PC Codex Agent <-> Self-hosted server <-> Android app
```

Codex execution happens on the user's Windows PC. The server only handles pairing, authentication, routing, device presence, task metadata, and audit events.

## Confirmed Technology Choices

- Android app: Kotlin + Jetpack Compose.
- Relay server: Node.js + TypeScript.
- PC Agent: Node.js + TypeScript.
- Server database: SQLite for the first version.
- Server domain: `codex.inktandwkx.top`.
- Public service port: `9443`.
- Internal Node service port: `127.0.0.1:9001`.
- Production WebSocket endpoint: `wss://codex.inktandwkx.top:9443/ws`.
- Development fallback endpoint: `ws://127.0.0.1:9001/ws` or a LAN-only server address.
- Workspace whitelist root on PC: `F:\Coding\Program`.
- First PC Agent mode: command-line resident process.
- GitHub flow: each project folder is its own GitHub repository in version 1; automatic GitHub repo creation is reserved for a later version.

## System Architecture

The system has three main components.

### Android App

The Android app is a native mobile workbench for Codex. It handles pairing, device management, project selection, project creation, task creation, task history, live task output, approval prompts, and settings.

The first version should feel close to the provided TRAE SOLO screenshots:

- A task list as the primary screen.
- A large task creation screen with device and project selectors.
- Bottom sheets for device selection, project selection, and adding content.
- A task detail screen with a chat and event timeline.
- A device management page with online state and pairing entry points.

The app should use CodexMobile branding and should not copy TRAE assets or brand elements.

### Relay Server

The server is a self-hosted Node.js service on the user's Linux home server. It is reachable through the user's Cloudflare-managed DDNS domain.

Responsibilities:

- Create and validate one-time pairing codes.
- Issue and validate device tokens.
- Track device online status and capabilities.
- Route WebSocket messages between Android devices and PC Agents.
- Store task metadata and important events.
- Store audit records for approvals and sensitive actions.
- Expose local CLI/admin operations for first-version management.

The server must not:

- Execute user code.
- Call OpenAI directly.
- Access the PC filesystem.
- Trust client-supplied paths or permissions without Agent-side validation.

### PC Agent

The PC Agent runs on Windows as a command-line resident process in the first version. It connects outbound to the relay server and registers as a controllable Codex device.

Responsibilities:

- Enforce the workspace whitelist root `F:\Coding\Program`.
- List and create project folders under the whitelist root.
- Discover the Codex executable.
- Run Codex as a child process in the selected project directory.
- Stream stdout, stderr, status updates, errors, file summaries, and Git results back to the server.
- Run Git status, commit, and push after successful tasks when project permission allows it.

Codex executable discovery order:

1. Find `codex` from `PATH`.
2. Find `codex.exe` inside the installed Codex Desktop package.
3. Report `codexUnavailable` to the app if neither is available.

## Extension Points

The first version implements the practical path while reserving room for the fuller product shape.

Reserved extension points:

- Tray app support through Agent fields such as `capabilities`, `uiStatus`, and `startupMode`.
- Automatic GitHub repo creation through project fields such as `repoProvider`, `remoteCreateStatus`, and `githubRepoId`.
- Permission confirmation through `approval.request` and `approval.respond` messages.
- Mobile push notifications through `notificationIntent` events.
- Real media/file attachment upload through attachment placeholders.
- Voice input through the task input model.

## Protocol

All realtime communication uses WebSocket with JSON messages. Android and PC Agent clients both connect outbound to the server.

Every message uses a common envelope:

```json
{
  "id": "msg_...",
  "type": "task.create",
  "version": 1,
  "timestamp": "2026-06-06T12:00:00.000Z",
  "source": "android",
  "target": "agent:device_id",
  "payload": {}
}
```

### Core Message Types

- Pairing: `pairing.create`, `pairing.claim`, `pairing.confirmed`.
- Device: `device.hello`, `device.status`, `device.list`.
- Project: `project.list`, `project.create`, `project.select`, `project.gitStatus`.
- Task: `task.create`, `task.cancel`, `task.status`, `task.event`.
- Approval: `approval.request`, `approval.respond`.
- System: `ping`, `pong`, `error`.

### Core Data Models

`User`

- Supports a single user in version 1.
- Keeps fields that allow future multi-user expansion.

`Device`

- Represents an Android device or PC Agent.
- Includes `deviceId`, `deviceName`, `deviceType`, `online`, `capabilities`, and `lastSeenAt`.

`PairingCode`

- A short-lived one-time code.
- Used to bind Android and PC Agent devices.
- Invalid after expiry or successful use.

`WorkspaceRoot`

- Represents a PC-side allowed root directory.
- First version uses `F:\Coding\Program`.

`Project`

- Represents a folder under an allowed workspace root.
- Includes path, display name, Git status, permission level, and remote repository metadata.

`Task`

- Represents one Codex execution.
- Includes project, target Agent, status, input, output summary, permission level, and Git result.

`TaskEvent`

- Represents live and persisted task events, including output chunks, status changes, file summaries, errors, approvals, and Git results.

`ApprovalRequest`

- Represents a sensitive action waiting for mobile confirmation.

`NotificationIntent`

- Represents an event that can later become a mobile push notification.

## Task Flow

1. Android selects a PC device and a project folder.
2. Android sends `task.create` to the relay server.
3. The server stores the task and forwards it to the target Agent.
4. The Agent validates the project path under `F:\Coding\Program`.
5. The Agent starts Codex in the selected project directory.
6. The Agent converts stdout, stderr, state changes, and errors into `task.event` messages.
7. The server persists key events and forwards them to Android.
8. When Codex exits, the Agent summarizes file changes.
9. If project permission is `Ship`, the Agent runs Git commit and push.
10. The Agent sends final `task.completed` or `task.failed`.

## Android UX

### Task List

The app opens to a task list with filters:

- All tasks.
- Running.
- Waiting for approval.
- Completed.
- Failed.

Each task row shows title, project, device, status, and last update time. A floating action button starts a new task.

### Task Creation

The task creation screen includes:

- A large greeting and prompt input.
- Current device selector.
- Current project selector.
- Attachment button.
- Voice button placeholder.
- Send button.

### Device Selection

Device selection uses a bottom sheet:

- A disabled cloud option for future use.
- Online PC Agent devices.
- A "connect your computer" entry for pairing.

### Project Selection

Project selection uses a bottom sheet or full page:

- Shows recent project folders under `F:\Coding\Program`.
- Allows choosing an existing folder.
- Allows creating a new project folder.
- Never allows browsing or selecting outside the whitelist root.

### Task Detail

The task detail screen shows:

- Project, device, status, and permission level.
- User prompts.
- Codex output.
- File change summaries.
- Test/build output.
- Git commit and push results.
- Approval cards when user confirmation is needed.
- A bottom input for follow-up instructions.

### Device Management

Device management shows:

- Bound PC Agents.
- Online/offline status.
- Last seen time.
- Agent capabilities.
- Pairing entry point.
- Future Agent version, tray status, and startup mode fields.

### Settings

Settings include:

- Server URL, defaulting to `wss://codex.inktandwkx.top:9443/ws`.
- Token state.
- Theme follows system.
- Logs and diagnostics entry.

## PC Agent Execution And Safety

The Agent is the final authority for filesystem safety.

Path rules:

- Normalize every incoming path.
- Resolve it against the whitelist root.
- Reject paths outside `F:\Coding\Program`.
- Reject `..`, absolute path injection, invalid Windows folder names, and reserved path characters for project creation.
- Never execute a task in a directory outside the whitelist root.

Permission levels:

- `Review`: read-only analysis only.
- `Edit`: allow file edits inside the project and routine test/build commands.
- `Ship`: allow file edits, routine commands, and Git commit/push after success.

Dangerous actions:

- Modifying files outside the whitelist is rejected.
- Dangerous shell operations are rejected or converted into `approval.request`.
- Bulk deletions can require approval.
- Failed `git push` does not trigger force push.

## Git And GitHub Flow

Each project folder is treated as its own repository in version 1.

For `Ship` projects, after a successful task the Agent runs:

```text
git status --porcelain
git add -A
git commit -m "<task title>"
git push
```

If there are no changes, the Agent reports `gitNoChanges`.

If the folder is not a Git repository, the Agent reports `gitNotInitialized`.

If push fails because of credentials, divergence, or remote configuration, the Agent reports the error and does not force push.

Automatic GitHub repo creation is not part of version 1, but the protocol reserves project fields and message types for it:

- `repoProvider`
- `remoteCreateStatus`
- `githubRepoId`
- `repo.createRequested`
- `repo.createCompleted`
- `repo.createFailed`

## Server Deployment

The server runs on the user's Linux home server.

Network plan:

- Public external port: `9443`.
- Internal app port: `127.0.0.1:9001`.
- Public WebSocket endpoint: `wss://codex.inktandwkx.top:9443/ws`.
- Local development endpoint: `ws://127.0.0.1:9001/ws`.
- LAN development endpoint: `ws://<server-lan-ip>:9001/ws`, only if the service is intentionally bound to a LAN interface during development.

Certificates will be managed separately with certd. The app should support both reverse-proxy TLS and local plaintext development modes.

The first version does not require a public web admin panel. Administrative actions such as creating pairing codes can be implemented as server CLI commands.

## Security

- Pairing codes are short-lived and single-use.
- Long-lived tokens are issued after pairing.
- Token values are stored hashed on the server.
- WebSocket clients must authenticate before sending privileged messages.
- The server verifies message source, target, device ownership, and type.
- The Agent enforces filesystem boundaries even if the server or app sends bad data.
- Key task and approval events are persisted as audit records.
- Production use should require `wss`.

## Testing Plan

Server tests:

- Pairing code lifecycle.
- Token hashing and authentication.
- Device online/offline state.
- Message routing.
- SQLite persistence.

Agent tests:

- Codex executable discovery.
- Whitelist path validation.
- Project list and create.
- Git status detection.
- Task event streaming.
- Failure reporting.

Android tests:

- Device list.
- Pairing flow.
- Project selection.
- Project creation.
- Task creation.
- Task event rendering.
- Approval card rendering.

End-to-end tests:

- Android creates task.
- Server forwards task.
- Agent validates workspace and starts Codex.
- Output streams back to Android.
- Agent performs Git commit and push.
- Android shows completion.
- Offline and reconnect behavior for both Android and Agent.

Deployment verification:

- Local `ws://127.0.0.1:9001/ws`.
- LAN access.
- Public `wss://codex.inktandwkx.top:9443/ws`.
- Router port forwarding for `9443`.
- Certificate chain accepted by Android.

## First-Version Scope

Included:

- Server.
- PC Agent.
- Android app.
- Pairing and device binding.
- Device online status.
- Workspace whitelist.
- Project list and create.
- Task creation.
- Live task events.
- Basic approval protocol.
- Git commit and push for `Ship` projects.
- SQLite task and event storage.

Reserved but not fully implemented:

- Windows tray app.
- Auto-start integration.
- Automatic GitHub repo creation.
- Push notifications.
- Voice input.
- Real image/photo/file upload.
- Advanced dangerous-operation approval policies.

Explicitly excluded:

- OpenAI-hosted device routing.
- Bypassing Codex login.
- Access outside `F:\Coding\Program`.
- Force pushing.
- Public admin panel in version 1.
