# zkTalk Commercialization Plan

This file is the working execution plan for pushing zkTalk from “validated product prototype” to “commercial-ready product”.

The rule for execution is simple:

1. Read this file.
2. Pick the highest-priority unfinished item in the current phase.
3. Implement a focused batch.
4. Run validation for that batch.
5. Update this file with results, blockers, and next actions.
6. Repeat until the phase exit criteria are met.

---

## 0. Current starting point

zkTalk already has:

- strong feature coverage across API / web / mobile / desktop
- validated core messaging / community / moderation / events / voice flows
- production-passing web build
- desktop unsigned handoff build
- initial AI assistant features

Main known blockers before commercial release:

- mac signing / notarization credentials
- Windows code-signing credentials
- real-device iPhone Korean IME final confidence pass
- recurring stability / E2E automation gaps
- some infrastructure/runtime rough edges discovered during iterative testing

---

## 1. Commercial-ready definition

zkTalk is considered commercial-ready when all of the following are true:

### Product quality
- critical user journeys work end-to-end without manual workarounds
- empty/loading/error states are coherent across major surfaces
- onboarding, discovery, community creation/join, messaging, DM, notifications, and settings feel consistent
- desktop, web, and mobile behavior is aligned for core flows

### Reliability
- local release builds are reproducible
- core E2E smoke coverage exists for major journeys
- regressions are caught quickly by scripted validation
- runtime configuration is explicit and safe

### Release readiness
- mac signed + notarized build succeeds
- Windows signed build succeeds
- release docs and blocker reporting stay current
- no hidden env assumptions are required for basic operation

### Operational readiness
- current blockers are visible in docs
- plan and execution history are continuously updated
- each completed batch leaves the repo in a more testable state

---

## 2. Execution loop

For every iteration:

1. Read this file
2. Choose one batch from the active phase
3. Implement only that batch
4. Run the smallest useful validation set first
5. If green, update this file
6. If broken, fix and re-run
7. Move to the next batch

### Required update after each batch
- mark completed items
- add newly found blockers
- add follow-up tasks only if they are real
- keep this file as the single source of truth

---

## 3. Phase plan

## Phase 1 — Core commercial blockers

Goal: eliminate issues that block basic sellable usage.

### Priority items
- [ ] stabilize local infrastructure assumptions (postgres / redis / minio / livekit startup expectations) — in progress; current standard local baseline is `zk-talk-postgres` on 5432 and `zk-talk-redis` on 6379, with API launched explicitly against those endpoints for deterministic validation.
- [ ] remove hidden runtime dependency pitfalls in desktop/web/api
- [ ] finish AI runtime wiring so desktop AI works predictably in packaged builds
- [ ] ensure community create / join / discover / home flows are script-validated
- [ ] verify login / session restore / logout across web + desktop
- [ ] ensure settings surfaces do not dead-end

### Exit criteria
- web core flows pass scripted smoke checks
- desktop packaged build can reach backend and complete login/community flows
- no critical blocker remains for first-time user navigation

### Current phase status
- started
- active focus: commercial blocker removal and deterministic runtime behavior

---

## Phase 2 — E2E and regression safety net

Goal: make regressions expensive to introduce and cheap to catch.

### Priority items
- [ ] define a canonical E2E smoke suite for commercialization
- [ ] cover login, discover, create community, join community, send message, DM, settings, AI assistant
- [ ] separate flaky infra issues from real app regressions
- [ ] make local E2E setup deterministic
- [ ] document the exact command matrix for smoke / full / release validation

### Exit criteria
- reliable smoke suite exists and is runnable on demand
- failures identify the broken product surface clearly
- critical commercialization flows are not tested only manually

---

## Phase 3 — Release pipeline hardening

Goal: turn the product from “works locally” into “ship-ready”.

### Priority items
- [ ] finalize mac signing + notarization workflow
- [ ] finalize Windows signing workflow
- [ ] ensure release artifacts and handoff docs stay in sync automatically
- [ ] verify packaged desktop runtime config and AI/runtime env behavior
- [ ] reduce packaging surprises and stale artifact issues

### Exit criteria
- signed release process is documented and repeatable
- release blockers are credential-only, not code or packaging issues

---

## Phase 4 — UX and trust polish

Goal: make the product feel commercially credible, not just functional.

### Priority items
- [ ] unify onboarding quality for first-run users
- [ ] improve trust surfaces (status, errors, confirmations, AI transparency)
- [ ] polish notification and reconnect behavior across devices
- [ ] improve AI feature discoverability and settings clarity
- [ ] identify remaining “prototype-feeling” edges and remove them

### Exit criteria
- major surfaces feel consistent and intentional
- no obvious raw/debug/prototype UX remains in user-facing paths

---

## Phase 5 — Mobile/device confidence

Goal: close the last confidence gap for mobile commercialization.

### Priority items
- [ ] execute real iPhone Korean IME confidence pass
- [ ] validate high-frequency composition / message creation paths on device
- [ ] re-check mobile create/join/discover/settings against current web behavior
- [ ] verify simulator harness boundaries remain release-safe

### Exit criteria
- mobile confidence blockers are closed with real-device evidence

---

## 4. Validation matrix

Use the smallest useful validation first, then expand only as needed.

### Fast validation
- targeted route/page check
- targeted API call
- affected component smoke test
- packaged desktop spot verification

### Standard validation
- `pnpm turbo typecheck`
- targeted Playwright smoke run
- affected app build

### Release validation
- desktop unsigned release build
- bundle verification
- archive verification
- current release blocker report refresh

---

## 5. Active backlog for the next iterations

These are the current best next moves.

### Immediate next batch candidates
- [ ] make desktop packaged AI runtime deterministic without shell-dependent assumptions
- [x] make AI settings toggles actually control UI visibility and behavior
- [ ] add scripted smoke coverage for AI surfaces
- [ ] validate community create/join flow again from a clean local infra state
- [ ] reduce local infra drift by standardizing the expected dev database/redis state

### Things to avoid
- do not do broad refactors unless they directly remove a commercialization blocker
- do not add speculative platform abstractions
- do not declare a phase done without validation evidence

---

## 6. Working notes

### 2026-04-05
- plan created
- current execution model established: file-driven iterative implementation + validation loop
- AI assistant, composer actions, channel summaries, and AI settings UI have been added recently
- AI settings toggles now drive actual UI visibility for assistant, composer actions, and channel summaries
- desktop packaged runtime and AI/runtime env behavior still need deterministic verification
- local infra drift (postgres/redis/container collisions) remains one of the highest-friction commercialization blockers
- current local deterministic validation baseline: `zk-talk-postgres` + `zk-talk-redis`, API explicitly bound to `postgresql://zktalk:zktalk@localhost:5432/zktalk` and `redis://127.0.0.1:6379`
- latest validation after the AI toggle wiring batch: `@zktalk/web` typecheck passed, `@zktalk/api` typecheck passed, desktop DMG artifact exists at `apps/desktop/dist/zkTalk-mac-arm64-0.0.1.dmg` with SHA-256 `93e833ebb1445f5e1ab4f116a31b7fe51985b8168635d0865e87e8ef031e689a`
- current next priority after this batch: add scripted desktop packaged validation coverage for login/community/AI paths so commercialization progress is not relying on artifact existence alone.

---

## 7. Next action

**Start with Phase 1:**

1. eliminate local infra/runtime instability
2. re-validate desktop packaged login/community/AI paths
3. wire AI settings toggles to actual behavior
4. update this file again
