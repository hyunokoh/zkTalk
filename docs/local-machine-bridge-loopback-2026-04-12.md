# Local Machine Bridge Loopback 2026-04-12

## Purpose

This note records the smallest release-readiness implementation for queue item 260:

- desktop machine registration persists a named machine locally
- a desktop heartbeat loopback proves `online`, `busy`, `auth_missing`, and `bridge_missing`
- the proof stays repo-local and inspectable instead of depending on external credentials or devices

## Implemented Surface

- `apps/desktop/local-machine-bridge.js`
  - stores machine registration in the desktop user-data directory
  - derives explicit loopback presence from bridge id, heartbeat freshness, Codex auth state, and active command id
- `apps/desktop/main.js`
  - exposes `local-machine-bridge:get-state`, `local-machine-bridge:register`, `local-machine-bridge:heartbeat`, and `local-machine-bridge:ensure-online` IPC handlers
- `apps/desktop/preload.js`
  - exposes desktop bridge methods to the renderer preload boundary
- `packages/shared/src/utils/local-machine-bridge.ts`
  - adds shared heartbeat presence resolution so web/shared tests keep the failure states explicit
- `apps/web/src/lib/local-machine-bridge-loopback.ts`
  - adds a minimal web-side reader for the desktop preload snapshot

## Explicit Presence Rules

- `bridge_missing`
  - no bridge identifier is registered, no heartbeat has ever arrived, or the heartbeat expired
- `auth_missing`
  - the bridge is reachable but the local Codex auth state is missing
- `busy`
  - the bridge is reachable, auth is present, and an active command id is reported
- `online`
  - the bridge is reachable, auth is present, and no active command is in flight

## Command Timeout Rule

- `timed_out`
  - the command started on the target machine, but local Codex did not return a final result before the desktop timeout window elapsed

## What This Does Not Claim Yet

- no server-side Codex execution fallback exists
- no cross-device command routing is claimed beyond the desktop-local loopback proof
- no external secret or signing dependency is needed for this proof path
- no mobile/web client is allowed to pretend it can start local Codex execution on its own

## Operator Notes

- registration and heartbeat state live in the desktop user-data file `local-machine-bridge.json`
- the Electron bridge facade now upgrades `registerMachine(...)` into the same auto-heartbeat path used by `ensureOnline(...)`, so an authenticated desktop owner no longer needs a separate manual heartbeat step after first registration
- the first loopback proof is meant to reduce ambiguity, not to replace the later full command-routing bridge
- remaining commercialization blockers are still external where noted elsewhere: signing credentials and real-device IME checks remain outside this code path

## Operator steps

1. Read the repo-local authority path before using the bridge:
   - `docs/README.md`
   - `docs/local-machine-bridge-trust-model-2026-04-10.md`
   - this loopback note
2. Re-run the smallest bridge verification before opening the desktop shell:
   - `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && node --test local-machine-bridge.test.js`
   - `cd /Users/hyunokoh/Documents/Projects/zkTalk && pnpm --filter @zktalk/web test -- --run src/lib/__tests__/local-machine-bridge-loopback.test.ts`
3. Start the desktop shell from `apps/desktop` with the repo's normal runtime configuration:
   - `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm start`
4. Sign in as the owning desktop user and let the app layout call the desktop auto-connect path, or call `ensure-online`/`register` through the preload bridge if you are exercising the IPC surface directly.
5. Confirm the snapshot reports one of the explicit states: `online`, `busy`, `auth_missing`, or `bridge_missing`.
6. Only attempt command dispatch after the snapshot is `online`.
   - expect explicit `accepted`, `streaming`, and `completed` updates when the local Codex CLI/auth path is usable
   - expect explicit `busy`, `auth_missing`, `timed_out`, or `rejected` when the loopback preconditions are not met
   - the desktop bridge now fail-closes long-running commands after `ZKTALK_LOCAL_CODEX_TIMEOUT_MS` or the default 5 minute timeout so a stuck local run does not leave the machine indefinitely `busy`
7. Run the repo-level hardening check before calling the queue item stable:
   - `cd /Users/hyunokoh/Documents/Projects/zkTalk && .zkcoder/scripts/verify.sh`

## Blocker split for this loopback

- Repo-fixable blocker:
  - bridge registration, heartbeat persistence, state derivation, or command-update persistence do not match the shared contract or fail repo-local tests
  - packaged desktop stops exposing the documented preload/settings surface for the bridge loopback
- External operator blocker:
  - the target machine does not have a usable local Codex CLI/auth session
  - the operator has not launched the desktop shell on the target machine
  - signing credentials or device-only checks are missing elsewhere in the release path
