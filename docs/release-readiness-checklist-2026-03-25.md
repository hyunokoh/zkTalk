# zkTalk Release Readiness Checklist (2026-03-25 baseline, refreshed 2026-04-07)

Status: pre-release checklist  
Audience: engineering / release owner

Use this checklist together with:

- [docs/final-operator-checklist-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
- [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
- [.env.production.example](/Users/hyunokoh/Documents/Projects/zkTalk/.env.production.example)
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
- [HANDOFF.md](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)
- [docs/test-matrix-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- [docs/mobile-korean-ime-checklist-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)
- [apps/desktop/RELEASE.md](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md)
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:hardening`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:release-readiness`

Operator note:

- For service deployment, start at [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md), then [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md), then this checklist before using desktop-only release docs.
- [docs/final-operator-checklist-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md) is the shortest current handoff for "engineering complete" versus "external input required".
- `npm run release:next` is the fastest current blocker snapshot and now succeeds even when `apps/desktop/dist/` does not exist yet.
- A missing `signing.env` or a currently empty `dist/` directory should be treated as present-workspace state, not as proof that previously verified unsigned packaging regressed.
- Items in sections `6. Signing / Distribution Blockers` and `7. Remaining External Confidence Gate` are external inputs. Treat unchecked items there as operator follow-up, not as engineering failures, unless a repo-local script or documented command itself breaks unexpectedly.
- Repo-local runtime fixes, test gaps, and doc mismatches belong in the engineering queue even if they are found while walking this checklist.

Runtime contract for this checklist:

- treat [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md) as the deploy/runtime source of truth
- treat [.env.production.example](/Users/hyunokoh/Documents/Projects/zkTalk/.env.production.example) as the expected compose input template for public origins and required secrets
- treat rendered `docker compose -f docker/docker-compose.prod.yml config` output as the effective operator view of what the containers will actually receive
- `/api/health` is process liveness only
- `/api/health/ready` is dependency readiness only; today that boundary is database plus Redis
- `operator.trafficGate` is the quickest operator-facing field for traffic admission decisions
- object storage and LiveKit are still production dependencies, but they remain separate operator gates until a repo-local readiness probe exists for them
- use the storage and voice operator-gate steps in `docs/final-operator-checklist-2026-04-07.md` section `3a` before escalating those paths as engineering blockers

Verification cadence for this checklist:

- use `npm run verify:hardening` for small runtime/doc hardening batches that touch only a narrow API/web surface
- use `npm run verify:release-readiness` before claiming a broader release-ready candidate; this expands to all targeted API/web tests, `pnpm local:commercial:verify`, and `pnpm e2e:smoke:web:core`
- use `npm run operator:smoke:inventory` when the operator needs the current repo-local automatable smoke shortlist without reopening external-only blocker work
- treat [e2e/core-smoke-contract.json](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/core-smoke-contract.json) as the explicit source of truth for which journeys and spec files the smallest web core smoke actually covers
- treat [docs/critical-path-verification-map-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md) as the quickest view of which critical paths remain lightly verified even after the current smoke and targeted-test batch passes
- if the broader batch fails because the local stack is unavailable, record that as an operator/environment prerequisite rather than collapsing it into an unrelated code regression

## Minimal Web/API Regression Commands

Run this sequence once package tooling is available and you need the thinnest credible repo-local confidence for current web/API commercialization work.

1. Narrow hardening batch for touched runtime surfaces:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:hardening`
   This keeps the current dirty-worktree guard, doc sanity checks, and only the mapped targeted API/web tests for changed high-risk files.
2. Print the current operator smoke shortlist:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:smoke:inventory`
   Use this when you need the smallest current automation candidates and their boundaries in one place before choosing a broader check.
3. Broad web/API release-readiness batch:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:release-readiness`
   This is the default operator-grade gate for current web/API confidence. It expands to all targeted API/web tests, `pnpm local:commercial:verify`, and `pnpm e2e:smoke:web:core`.
4. If you need to separate code failure from missing local stack inputs, rerun the underlying commands individually:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && pnpm local:commercial:verify`
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && pnpm e2e:smoke:web:core`
5. If the broad batch still fails, classify the result before opening a new engineering task:
   - repo-local code regression: targeted tests, typecheck, or the core smoke fail with the documented local stack available
   - operator/environment prerequisite: Docker/local stack, seeded data, package install state, or runtime secrets are unavailable

Current boundary for this minimal command set:

- It is intended for web/API runtime hardening confidence, not desktop signing or real-device validation.
- It covers the current smallest deterministic browser journey and targeted API/web runtime surfaces only.
- DM, inbox, profile, discover, authenticated attachment open/save, hosted-media retrieval after upload, and full operator-visible voice/media validation remain outside this smallest command set; keep those gaps in [docs/COMMERCIALIZATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md) and [docs/critical-path-verification-map-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md).

## 0. Runtime Readiness Contract

- [ ] Public origin values describe one deployment consistently:
  `CORS_ORIGIN`, `ZKTALK_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, and `NEXT_PUBLIC_LIVEKIT_URL`
- [ ] Rendered compose config contains no production-blocking placeholders such as `change-this-in-production`, `devkey`, `secret`, `minioadmin`, `http://localhost/api`, `ws://localhost/api/ws`, or `ws://localhost:7881`
- [ ] `/api/health` returns `scope: process`
- [ ] `/api/health` returns `operator.trafficGate.shouldReceiveTraffic=false`
- [ ] `/api/health/ready` returns `scope: required_runtime_dependencies`
- [ ] `/api/health/ready` returns `operator.trafficGate.shouldReceiveTraffic=true` only when required dependencies are ready
- [ ] `/api/health/ready` shows `boundary.checkedDependencies` for database and Redis
- [ ] `/api/health/ready` shows `boundary.excludedDependencies` for object storage and LiveKit
- [ ] Startup logs include a `startup_summary` entry with sanitized dependency targets and readiness boundaries
- [ ] Object storage is verified separately with presign plus asset retrieval
- [ ] LiveKit is verified separately with token issuance plus a real join
- [ ] Storage and voice follow the operator-gate sequence in `docs/final-operator-checklist-2026-04-07.md` section `3a`

## 1. Local Validation Environment

- [ ] Docker services are up
- [ ] API is reachable on `http://127.0.0.1:4000`
- [ ] Desktop packaged app launches
- [ ] Mobile simulator/dev build launches
- [ ] LiveKit is reachable on `ws://127.0.0.1:7880`

## 2. Core Product Verification

### Desktop

- [x] Phone login
- [x] QR login
- [x] Channel send / receive
- [x] DM create / send / receive
- [x] DM attachment send / receive / download
- [x] Thread reply
- [x] Inbox mention open
- [x] Bookmark open
- [x] Friend request accept
- [x] Friend -> DM
- [x] Event create / RSVP reflection
- [x] Event attendee -> DM
- [x] Voice create / join / leave / participant count
- [x] Settings save
- [x] Invite link create
- [x] Community delete

### Mobile

- [x] Login
- [x] Logout
- [x] Channel send / receive
- [x] DM send / receive
- [x] Attachment upload
- [x] DM attachment upload / open
- [x] Poll create / vote / unvote
- [x] Forum create / reply
- [x] Inbox open
- [x] Bookmark open
- [x] Friend accept
- [x] Event create / edit / RSVP
- [x] Event attendee -> DM
- [x] Create community
- [x] Create channel
- [x] Discover join
- [x] Join by invite
- [x] Backup export / import
- [x] Voice join / leave
- [x] Profile edit
- [x] Linked accounts add / unlink
- [x] QR profile / desktop login confirm

### Server

- [x] Multi-user messaging regression script passes
- [x] Visibility rules verified
- [x] Role boundaries verified
- [x] `/api/health` and `/api/health/ready` behavior matches the production runtime runbook boundary

## 3. Moderation / Roles

- [x] Report resolve
- [x] Report dismiss
- [x] Audit log visible to admin / owner
- [x] Audit log denied to moderator
- [x] Member mute
- [x] Member kick
- [x] Member ban
- [x] Role change to moderator
- [x] Role change to admin
- [x] Owner-only community delete enforced

## 4. Visibility Rules

- [x] `public` appears in discover
- [x] `public` allows direct join
- [x] `invite_only` hidden from discover
- [x] `invite_only` blocks direct join
- [x] `invite_only` allows invite join
- [x] `private` hidden from discover
- [x] `private` blocks direct join
- [x] `private` allows invite join

## 5. Desktop Release Artifacts

Run from `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop`:

- [ ] `npm run pack:mac`
- [ ] `npm run release:unsigned`
- [ ] `npm run release:verify`
- [ ] `npm run release:verify:bundle`
- [ ] `npm run release:verify:archive`

Confirm these outputs exist:

- [ ] `dist/mac-arm64/zkTalk.app`
- [ ] `dist/zkTalk-mac-arm64-0.0.1.dmg`
- [ ] `dist/zkTalk-win-x64-0.0.1.exe`
- [ ] `dist/release-summary.json`
- [ ] `dist/release-report.md`
- [ ] `dist/release-handoff.md`
- [ ] `dist/release-verification.html`
- [ ] `dist/zkTalk-desktop-release-bundle.tar.gz`

Operator interpretation:

- Section 5 is an engineering/package verification section.
- Sections 6 and 7 are external blocker sections.
- Do not mix them when writing handoff notes or deciding whether zkCoder should keep coding versus wait for credentials/device access.

## 6. Signing / Distribution Blockers

- [ ] `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:init-signing`
- [ ] mac `Developer ID Application` certificate installed
- [ ] `APPLE_ID` set
- [ ] `APPLE_APP_SPECIFIC_PASSWORD` set
- [ ] `APPLE_TEAM_ID` set
- [ ] Windows certificate file available
- [ ] `WIN_CSC_LINK` or `CSC_LINK` set
- [ ] `WIN_CSC_KEY_PASSWORD` or `CSC_KEY_PASSWORD` set

## 7. Remaining External Confidence Gate

- [ ] Real iPhone device check for Korean IME composition
  Run: [docs/mobile-korean-ime-checklist-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)

Internal follow-up, not a current release blocker:

- simulator-only auto-test hook policy and boundary cleanup stay in [docs/COMMERCIALIZATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md) and [docs/IMPLEMENTATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)
- lint / warning cleanup remains useful noise reduction work, but it does not block unsigned handoff or the current external blocker list

## 8. Release Decision

- Ready for unsigned handoff: yes, based on current verification
- Ready for signed production release: no, pending signing credentials
- Current live blocker snapshot on 2026-04-07: `signing.env` absent, so `npm run release:next` currently points operators to `npm run release:init-signing` before signed-release checks
