# zkTalk Commercialization Plan

This file is the working execution plan for pushing zkTalk from “validated product prototype” to “commercial-ready product”.

The rule for execution is simple:

1. Read this file.
2. Pick the highest-priority unfinished item in the current phase.
3. Implement a focused batch.
4. Run validation for that batch.
5. Update this file with results, blockers, and next actions.
6. Repeat until the phase exit criteria are met.

Current authority map for runtime hardening and release-readiness work:

- use [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md) as the shortest operator entry point
- use [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md) as the deployment/runtime source of truth
- use [docs/current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md) as the concise blocker boundary
- use [docs/IMPLEMENTATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md) for the queue-level execution order
- use [docs/ZKCODER_RUNBOOK.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ZKCODER_RUNBOOK.md) for repo-local zkCoder operating rules

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

Engineering queue items that still matter, but should not be framed as current external blockers:

- recurring stability / E2E automation gaps
- remaining runtime/doc alignment work around deploy readiness and operator interpretation
- legal/trust surfaces such as privacy policy, terms, retention policy, and account deletion/export flows
- production observability and support readiness

Commercialization gaps identified from the current repo state on 2026-04-07:

- web auth still carries some bearer-token fallback paths, which should stay isolated to explicit desktop runtime and desktop harness cases
- API production runtime now fails closed for the previously highest-risk secret/localhost defaults, but compose placeholders and documented development-only exceptions still need clear operator handling
- legal/trust surfaces such as privacy policy, terms, retention policy, and account deletion/export flows are not yet productized
- production observability is still light; health exists, but commercial incident response needs error/performance monitoring and operator dashboards

Current runtime-hardening documentation priority on 2026-04-07:

- keep runtime/auth/readiness behavior aligned across `production-runtime-runbook`, env examples, and `.zkcoder/scripts/verify.sh`
- keep dirty-worktree risk concentrated on the current API/web/auth/runtime surfaces documented in `docs/high-risk-touched-surfaces-2026-04-07.md`
- keep external blockers sharply separated from code work so signing/device gaps do not get reintroduced as fake engineering tasks

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
- if runtime assumptions changed, also update `docs/production-runtime-runbook.md`, `docs/README.md`, and `.zkcoder/scripts/verify.sh` in the same batch

---

## 3. Phase plan

## Parallel workstreams

Use these as parallel agent lanes during execution. Only one implementation batch should be edited at a time in this repo, but discovery, validation, and follow-up queue building can run in parallel.

### Lane A — Auth / runtime hardening
- production secret and runtime config safety
- session / logout / restore consistency
- unsafe localhost or fallback assumptions

### Lane B — Realtime / delivery polish
- websocket lifecycle, reconnect behavior, offline handling
- noisy logs and confusing reconnect states
- message delivery edge cases after logout / reconnect

### Lane C — Surface quality / UX polish
- empty / loading / error state inconsistencies
- rough copy, raw errors, dead-end settings flows
- attach / upload / preview failure clarity

### Lane D — Release / operations hygiene
- required env documentation
- release and deployment runbooks
- deterministic smoke coverage and blocker visibility

## Phase 1 — Core commercial blockers

Goal: eliminate issues that block basic sellable usage.

### Priority items
- [ ] stabilize local infrastructure assumptions (postgres / redis / minio / livekit startup expectations) — in progress; current standard local baseline is `zk-talk-postgres` on 5432 and `zk-talk-redis` on 6379, with API launched explicitly against those endpoints for deterministic validation.
- [ ] remove hidden runtime dependency pitfalls in desktop/web/api
- [ ] close the remaining runtime exception cleanup after the fail-closed hardening batches (compose placeholders, documented dev-only fallback sites, token handling edge cases)
- [ ] finish AI runtime wiring so desktop AI works predictably in packaged builds
- [ ] ensure community create / join / discover / home flows are script-validated
- [ ] verify login / session restore / logout across web + desktop
- [ ] ensure settings surfaces do not dead-end

### Exit criteria
- web core flows pass scripted smoke checks
- desktop packaged build can reach backend and complete login/community flows
- production runtime fails closed when critical secrets/config are missing
- no critical blocker remains for first-time user navigation

### Current phase status
- started
- active focus: commercial blocker removal and deterministic runtime behavior

### Concrete Phase 1 launch bar
- no hidden production secret fallbacks remain in API/web runtime code
- remaining compose placeholders and development-only exceptions are documented as operator gates rather than mistaken for live blockers
- web session strategy is explicit and commercial-safe
- release/runtime docs describe the minimum required production env
- first-run flows are script-validated from a clean environment

---

## Phase 2 — E2E and regression safety net

Goal: make regressions expensive to introduce and cheap to catch.

### Priority items
- [ ] define a canonical E2E smoke suite for commercialization
- [ ] cover login, discover, create community, join community, send message, DM, settings, AI assistant
- [ ] separate flaky infra issues from real app regressions
- [ ] make local E2E setup deterministic
- [ ] document the exact command matrix for smoke / full / release validation

Current canonical core-path smoke:

- `pnpm e2e:smoke:web:core`
- contract file: [e2e/core-smoke-contract.json](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/core-smoke-contract.json)
- companion coverage map: [docs/critical-path-verification-map-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md)
- current covered journeys: login, logout, session restore, community open, channel send message, channel attachment send, and thin seeded voice join
- current boundary: DM, inbox, profile, discover, and hosted-media validation remain outside this smallest release-readiness smoke and can stay in broader suites

### Current validation gap ledger

Use this section as the commercialization-note sink whenever a new verification gap is found during hardening work. Keep blocker-only language in `docs/current-blockers-2026-03-25.md`; keep verification gaps here unless they truly depend on missing credentials, devices, or third-party access.

Use [docs/critical-path-verification-map-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md) to see which critical paths remain lightly verified before turning one of the items below into a new queue task.

- 2026-04-07: core smoke still covers attachment send, but it does not yet prove authenticated attachment open/save or hosted-media retrieval after upload.
  Next action: keep `apps/web/src/components/AttachmentPreview/AttachmentPreview.tsx` and `apps/web/src/app/api/public-assets/[...assetPath]/route.ts` on the targeted regression path, then add one deterministic repo-local smoke that exercises attachment open/save against the local commercial stack.
- 2026-04-07: the current voice journey is only a thin seeded join check, so it does not prove a full operator-visible voice session against a real LiveKit dependency.
  Next action: keep `apps/web/src/components/VoiceRoom/VoiceRoom.tsx` on targeted regression coverage and record any LiveKit-dependent failures as environment blockers unless they reproduce against the documented local `ws://127.0.0.1:7880` contract.
- 2026-04-07: DM, inbox, and profile remain outside the smallest release-readiness smoke, so regressions there still depend on broader suites or manual spot checks.
- 2026-04-10: public-community visibility policy now has targeted repo-local smoke coverage in `e2e/tests/community-visibility.smoke.spec.ts`, but it is still intentionally outside `pnpm e2e:smoke:web:core` until the core contract is expanded on purpose.
  Next action: keep those flows out of the blocker document, but promote the thinnest stable smoke slice into the release-readiness batch only after it can fail deterministically.
- 2026-04-10: `.zkcoder/scripts/verify.sh` now treats the Phase 7 visibility matrix doc, channel/community policy services, discover page, locked-channel sidebar, and the dedicated visibility smoke as one mapped regression surface, so future queue work on discoverability or channel gating automatically re-runs the targeted API/web tests instead of depending on manual command selection.
  Next action: if the visibility policy expands again, update the verify mapping and the matrix doc in the same batch so queue regeneration keeps the runtime policy and regression path aligned.
- 2026-04-10: mobile selected-message AI on DM, channel, and thread now has repo-local structural verification in `.zkcoder/scripts/verify.sh`, including reply-draft, rewrite-draft, inline-translation note, and pre-trigger runtime disclosure (`live`, `mock`, `unavailable`), but it still lacks a deterministic simulator smoke that proves the long-press sheet behavior end to end.
  Next action: add the thinnest harness or Maestro smoke that opens the mobile action sheet from a seeded message and captures the runtime badge plus AI action cards without introducing device-only flakiness.
- 2026-04-11: queue item 205 now has one additional regression guard at the operator-facing contract layer: the web AI settings test explicitly locks reply-draft, rewrite-draft, and inline-translation output semantics together, and the mobile channel callback no longer risks showing a stale mock/live applied-state message after runtime changes.
  Next action: keep the remaining mobile confidence gap focused on end-to-end long-press smoke rather than re-opening the shared action contract or runtime-copy semantics.
- 2026-04-10: the local machine bridge trust boundary is now documented, and the repo now has shared machine identity, naming, presence, owner-only routing, and command-envelope contracts in `packages/shared`, but the bridge still has no repo-local handshake proving that a real desktop loopback can report those states without leaking auth material.
  Next action: implement the thinnest desktop register/heartbeat loopback that emits the shared `machine.registered`, `machine.presence.updated`, and `machine.command.updated` contract for `online`, `auth_missing`, and owner-only routing paths.

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

## Phase 3.5 — Commercial operations and trust

Goal: cover the gaps between “ship-ready build” and “safe product to sell”.

### Priority items
- [ ] add production observability (error tracking, structured deploy metadata, key funnel/health dashboards)
- [ ] add operator runbooks for outages, degraded third-party services, and rollback
- [ ] define support workflow and admin tooling for user/account issues

### Exit criteria
- operators can detect and triage production failures quickly
- the repo contains the minimum runbooks needed for commercial support

---

## Phase 4 — UX and trust polish

Goal: make the product feel commercially credible, not just functional.

### Priority items
- [ ] unify onboarding quality for first-run users
- [ ] improve trust surfaces (status, errors, confirmations, AI transparency)
- [ ] polish notification and reconnect behavior across devices
- [ ] improve AI feature discoverability and settings clarity
- [ ] publish user-facing privacy / terms / retention / deletion explanations
- [ ] identify remaining “prototype-feeling” edges and remove them

### Exit criteria
- major surfaces feel consistent and intentional
- basic trust/compliance surfaces are accessible to end users
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
- [ ] make production config fail closed for missing secrets and unsafe defaults
- [ ] replace web `localStorage` bearer-token dependence with a commercial-safe session approach
- [x] write the first production runbook: required env, secret handling, and deployment assumptions
- [ ] make desktop packaged AI runtime deterministic without shell-dependent assumptions
- [x] make AI settings toggles actually control UI visibility and behavior
- [x] add scripted smoke coverage for AI surfaces — standardized desktop AI/config smoke now runs through `pnpm e2e:smoke:desktop` and validates desktop bridge config, AI settings visibility, and AI prompt interaction.
- [ ] validate community create/join flow again from a clean local infra state
- [x] reduce local infra drift by standardizing the expected dev database/redis state — standardized via `scripts/local-commercial-stack.mjs` and root commands `pnpm local:commercial:stack` / `pnpm local:commercial:verify`.

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
- local commercialization stack is now reproducible through `pnpm local:commercial:stack` and `pnpm local:commercial:verify`, which successfully boot postgres/redis/minio, ensure the `zktalk-uploads` bucket, run migrations, and pass api/web typecheck
- packaged desktop smoke now covers config + AI settings successfully; AI prompt interaction also passes as a targeted packaged test
- `pnpm e2e:smoke:desktop` now standardizes the deterministic backend stack first, then runs the packaged desktop AI/config smoke suite end to end
- current next priority after this batch: expand the standardized smoke path beyond desktop AI/config into community create/join and additional packaged desktop flows.

### 2026-04-07
- commercialization gap review completed against the current repo state
- strongest non-feature launch gaps identified:
  - production auth/runtime hardening
  - legal/trust surface publication
  - observability/support readiness
- concrete code-level concerns noted:
  - web session strategy and bearer-token fallback behavior needed tightening for a commercial deployment
  - API/runtime docs still needed to distinguish removed production fallbacks from the remaining development-only exceptions and compose placeholders
- updated priority order: security/runtime hardening first, then deterministic smoke coverage, then release/runtime hygiene, then release credential closure
- first hardening batch completed:
  - API cookie secret loading is now centralized and production-fail-closed instead of silently using the development fallback
  - web API error handling now prefers human-readable server messages over internal error codes
  - targeted regression tests were added for both behaviors
- surface polish batch completed:
  - backup import/export status now uses clearer success/error presentation instead of a single neutral status block
  - attachment open/save failures now show user-facing toast messages instead of silent failure or raw technical wording
  - composer upload, audio, and AI failure states now prefer product-facing messages over raw status text
- session hardening batch completed:
  - web session bearer tokens now live in `sessionStorage` instead of long-lived `localStorage`
  - legacy `localStorage` tokens migrate forward on first read and are removed afterward
  - websocket connections now reconnect when the session token changes without requiring a user-id change
- logout/session cleanup batch completed:
  - authenticated query cache is now cleared when the web session disappears
  - unread state is reset on auth loss so previous-user badges do not linger
  - mobile sidebar state is closed during auth loss to avoid stale protected UI flashes
- bearer reduction batch completed:
  - same-origin web upload, attachment, and voice keepalive requests now rely on cookie sessions instead of manually copying bearer tokens
  - DM and channel attachment uploads no longer duplicate the session token into raw fetch headers
  - websocket server auth now reuses the centralized cookie-secret loading path instead of its own fallback
- websocket token narrowing batch completed:
  - same-origin and normal cross-origin web sockets no longer append the session token in the query string
  - explicit desktop runtime and desktop harness websocket connections still keep the token fallback path
- logging hygiene batch completed:
  - user-facing failures that already surface in UI no longer spam production browser consoles
  - frontend fallback/debug logging now flows through a dev-only helper
  - explicit production debug logging is now session-scoped and scrubbed from the URL so operator inspection does not leak into normal user-shareable links
- production runtime runbook batch completed:
  - added a repo-level production runtime runbook covering required services, required env, fail-closed expectations, and deployment assumptions
  - linked the new runbook from the docs index so release owners have a shorter path than the desktop-only release notes
  - documented remaining localhost/dev fallback sites explicitly so they are treated as commercialization cleanup items, not production defaults
- production fallback removal batch completed:
  - magic-link and email-link signing now use centralized env validation instead of silent development secrets in production
  - voice token generation no longer relies on bundled development LiveKit credentials when production config is missing
  - public asset proxy now returns a clear 500 in production if its upstream API URL is not configured, instead of silently targeting localhost
- infrastructure fallback removal batch completed:
  - database and Redis bootstrap now require explicit production URLs instead of silently defaulting to localhost
  - S3 client bootstrap now requires explicit production bucket/region/credential values instead of bundled MinIO defaults
  - centralized env regression coverage now includes database, Redis, and S3 runtime expectations
- production CORS hardening batch completed:
  - production API no longer auto-allows localhost/loopback browser origins unless they are explicitly configured
  - development and test still keep loopback-friendly CORS behavior for local app surfaces and harnesses
  - origin parsing and allow/deny behavior now have targeted regression coverage
- server logging hygiene batch completed:
  - Redis connection logs no longer print the full configured URL, reducing accidental credential or path disclosure in operator logs
  - API-side service failures now flow through a shared server logging helper with more consistent scope/context formatting
  - targeted regression coverage was added for connection-target redaction
- AI provider runtime hygiene batch completed:
  - OpenRouter requests no longer send a hardcoded localhost referer header by default
  - AI provider site-origin selection now prefers explicit production config and falls back to configured public origins only when valid
  - env examples and runtime docs now describe the optional public-origin values for OpenRouter attribution
- AI key source hygiene batch completed:
  - API AI provider selection now relies only on explicit environment variables instead of reading shell dotfiles at runtime
  - OpenRouter/OpenAI key precedence now has targeted regression coverage
  - runtime docs were updated so remaining fallback-risk notes match the current codebase rather than older hardening gaps
- health/readiness batch completed:
  - API liveness and readiness are now split so basic process-up checks and dependency-ready checks are distinct
  - readiness now checks database and Redis and returns `503` when either dependency is not ready
  - targeted regression coverage was added for readiness-report construction
- blocker-boundary doc batch completed:
  - `docs/current-blockers-2026-03-25.md` is now explicitly scoped to true external blockers and release-confidence gates only
  - already-completed engineering work such as simulator-harness policy follow-up and non-blocking cleanup was removed from the blocker summary
  - the release checklist now points those items back to the commercialization/implementation plans instead of presenting them as current blockers
- validation-gap logging batch completed:
  - added a commercialization-plan validation gap ledger so newly discovered verification gaps have a stable home outside the blocker summary
  - recorded the current attachment open/save, hosted-media, thin voice smoke, and non-core journey gaps as follow-up work rather than external blockers
  - wired repo-local verification and operator docs to expect that ledger to stay current when the smoke boundary changes
- remaining near-term hardening target: reduce remaining bearer-token fallback paths on web and re-verify logout/session behavior across web + desktop

---

## 7. Next action

**Start with Phase 1:**

1. eliminate unsafe production auth/runtime defaults
2. re-validate login/session/community flows under hardened config
3. expand deterministic smoke coverage for commercial core journeys
4. update this file again
