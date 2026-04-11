# Local Machine Bridge Trust Model

## Purpose

This document is the source of truth for queue item 177:

- define the trust model for a local zkTalk machine bridge that uses the local machine's own Codex auth rather than any server-side Codex identity

It exists so follow-up machine registration, routing, heartbeat, and result-delivery work can build on one explicit model instead of re-deciding the security boundary.

## Core Product Rule

zkTalk routes work between a user's named machines, but zkTalk does not own or proxy the user's Codex identity.

Instead:

- each target machine runs a local bridge process
- that local bridge uses the Codex auth/session already present on that machine
- zkTalk stores machine metadata, routes commands, and displays results
- the server never receives raw Codex auth material, refresh tokens, or a reusable Codex session

## Trust Boundary Summary

### zkTalk server is trusted to

- authenticate the zkTalk user
- store machine registration metadata
- route command envelopes to the correct owning user's machine
- persist command status and streamed/final result messages
- reject cross-user routing or stale-machine claims

### zkTalk server is not trusted to

- call Codex as the user
- mint or reuse a Codex session on behalf of the user
- inspect secrets stored only in the local Codex CLI/session
- execute local filesystem or shell actions without the target machine bridge

### Local bridge is trusted to

- verify it is acting for the signed-in owning zkTalk user and its registered machine id
- decide whether local Codex auth is present and usable
- forward only the allowed command context to local Codex
- run local command execution on that machine
- stream status and results back through zkTalk

### Local bridge is not trusted to

- impersonate another machine id
- accept commands addressed to a different zkTalk user
- auto-expand its access beyond the command envelope
- silently claim live execution when Codex auth or the local bridge is absent

## Identity Model

### User identity

- the user authenticates to zkTalk normally
- machine ownership is always scoped to exactly one zkTalk user id
- follow-up shared-machine support is out of scope until a separate trust model exists

### Machine identity

Each registered machine needs:

- stable machine id generated at registration time
- user-visible machine name such as `mac-studio`, `laptop`, or `buildbox`
- machine type such as `desktop`, `laptop`, `buildbox`, or `other`
- local bridge instance proof bound to the owning zkTalk user session

### Codex identity

- Codex identity stays local to the target machine
- the bridge may expose a coarse state such as `auth_present` or `auth_missing`
- the bridge must not upload raw auth artifacts, credential files, tokens, or reusable headers into zkTalk

## Registration And Presence

### Registration rules

- registration starts from the desktop app or local companion on the target machine
- the user must already be signed into zkTalk on that machine
- the bridge registers machine metadata plus a machine-local public identifier; it does not register Codex credentials
- registration must fail closed if the local bridge cannot bind the machine to the currently signed-in zkTalk user

### Presence rules

- presence is advisory, not an authorization shortcut
- the bridge reports presence states such as `online`, `busy`, `offline`, and `auth_missing`
- presence updates should expire quickly enough that stale online machines do not look runnable
- a presence heartbeat never upgrades permissions; it only reports current reachability and readiness

## Command Routing Model

### Allowed path

1. a zkTalk user chooses one of their own named machines
2. zkTalk creates a machine command envelope scoped to that same user id
3. zkTalk routes the envelope only to the addressed machine bridge
4. the local bridge decides whether it can execute locally with local Codex auth
5. the local bridge streams status and final output back into zkTalk

### Forbidden path

- no server-side Codex fallback when the bridge is offline
- no routing to another user's machines
- no automatic fan-out to multiple machines in the first bridge MVP
- no mobile/web claim that they can execute local Codex work themselves

## Command Envelope Constraints

The first envelope should be intentionally narrow:

- target machine id
- owning user id
- source conversation or control-thread reference
- instruction text
- explicit execution intent such as `analyze`, `edit`, `run`, or `summarize`
- optional selected-message excerpts
- optional attachment references that the bridge can fetch through the user's normal zkTalk access

The first envelope should not include:

- unrestricted full-channel history by default
- arbitrary server-side secret material
- hidden ambient filesystem access claims
- any field that implies the zkTalk server can directly execute Codex on behalf of the user

## Local Context And Permission Rules

- selected messages should be explicit, bounded context, not an implicit dump of full history
- file access should be opt-in per attachment reference or future explicit local path mapping
- the bridge may fetch zkTalk-visible content as the owning user, but it should not gain broader server privileges
- local filesystem access remains a local-machine concern and must be described as such in product copy

## Failure States That Must Stay Explicit

The product must keep these states visible and distinct:

- `offline`
  - the machine is not reachable through the bridge
- `busy`
  - the machine is online but already executing another task
- `auth_missing`
  - the bridge is reachable, but local Codex auth is missing or unusable
- `bridge_missing`
  - the user is on a non-desktop client or the target machine has no active bridge
- `rejected`
  - the bridge refused the command because ownership, envelope, or local policy checks failed

These states must not collapse into a fake generic success path.

## Product Degradation Rules

- desktop may register machines and run the first bridge MVP
- web and mobile may show machine state, command history, and results
- web and mobile must not imply that local Codex work can start there unless a later explicit bridge path ships
- when the bridge is absent, UI copy should say the machine is unavailable rather than implying a cloud fallback exists

## Verification Hooks For Follow-Up Work

The first bridge implementation batch should keep verification repo-local and inspectable:

- machine registration contract test
- machine ownership/routing test
- busy/offline/auth-missing result-state test
- shared bridge execution plan test for accepted -> streaming -> completed and explicit rejected/busy/auth-missing fallbacks through the target machine's local Codex session
- desktop bridge loopback smoke for register -> command -> streamed update -> final summary
- `.zkcoder/scripts/verify.sh`

## Immediate Follow-Up Queue Bias

After this trust model, the next smallest useful tasks are:

1. add shared types for machine identity, presence, command envelopes, and streamed results
2. define machine registration and naming payloads around the owning zkTalk user id
3. implement a desktop-only handshake/heartbeat path that can prove `online` vs `auth_missing`
4. add the first owner-only command dispatch loop and explicit failure/result delivery states

## Non-Goals

- server-side reuse of a user's Codex cloud session
- cross-user shared machine access
- hidden cloud fallback when the local bridge is offline
- claiming mobile-only or browser-only local Codex execution before a real bridge exists
