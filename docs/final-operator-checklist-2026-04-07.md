# zkTalk Final Operator Checklist (2026-04-07)

Status: operator handoff shortcut  
Audience: release owner / operator / next agent

Use this file when the question is:

- what engineering has already cleared
- what the operator can run right now without new code
- what is still blocked on external credentials, device access, or third-party accounts

For service deployment, read the runtime and readiness docs first, then return here for the blocker split.

Primary source-of-truth files:

- [docs/current-release-next.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md)
- [docs/current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)
- [docs/release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
- [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
- [HANDOFF.md](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)

Machine-readable shortcut:

- `npm run release:next -- --json`
- The snapshot now carries `operatorHandoff.externalOnlyBlockers`, `operatorHandoff.manualOperatorGates`, and `operatorHandoff.triageSequence`, so queue regeneration can preserve signing/device/storage/voice gates and the intended operator decision order without rediscovering them from prose docs.

## 1. Engineering already done

These items should not be reopened as generic blocker work unless a current repo-local verification command fails.

- unsigned desktop handoff path is already validated
- current desktop scripts generate blocker/report/handoff outputs from the latest release status instead of stale data
- `npm run release:next` now reports missing operator inputs even when `apps/desktop/dist/` is absent
- web/API runtime hardening, targeted regression tests, and runtime docs remain engineering-queue work, not external blockers
- mobile simulator validation is already broad enough that the remaining Korean IME concern is a real-device confidence gate, not an unbounded mobile rewrite

Operator interpretation:

- missing `signing.env` in this workspace is an input gap, not evidence that engineering regressed
- a cleaned desktop `dist/` directory is a current-workspace snapshot, not evidence that unsigned packaging broke
- A dirty worktree is not a release blocker by itself.
- Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.
- if `.zkcoder/scripts/verify.sh` passes, do not convert remaining credential/device gaps into new coding missions
- if the next step still needs a certificate, account login, or a physical device, keep it in blocker/operator docs instead of the engineering queue

Phase 7 visibility policy:

- Public-community discoverability and per-channel access policy are already product-decided for this release path.
- Use [community-visibility-matrix-2026-04-10.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-visibility-matrix-2026-04-10.md) as the source of truth before changing discoverability, locked-channel UX, join prompts, or channel browse behavior.
- Do not reopen the hidden-versus-locked decision from operator docs: in `public` communities, `members_only` and `invite_only` channels render as locked rows for non-members, while `private` channels stay hidden.
- Treat visibility-policy changes as engineering work only when the matrix, API reference, and deterministic tests are updated together. Do not classify them as credential/device/operator blockers.

## 2. Operator actions that can run now

Run these in order before escalating anything as a new engineering blocker.

1. Start with the service deployment index:
   [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)
2. Read the runtime/deploy source of truth:
   [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
3. Run the release-readiness verification sequence:
   [docs/release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
   Use section `Minimal Web/API Regression Commands` there as the default repo-local command order once package tooling is available.
4. If you need the current small automation shortlist before choosing a check, run:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:smoke:inventory`
5. If blocker/status/checklist docs were edited or `release:next` was refreshed, run:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:handoff:check`
   This is the smallest repo-local guard that the operator narrative still matches the current snapshot before reopening engineering work.
6. Refresh the current release snapshot:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
7. Read the latest combined snapshot:
   [docs/current-release-next.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md)
8. If the question is whether a failure is code versus environment, run:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && .zkcoder/scripts/verify.sh`
9. Inspect `/api/health` or `/api/health/ready` and read `operator.trafficGate`, `operator.immediateActions`, and `boundary.excludedDependencies` before reopening engineering work
10. If the question is whether attachments or voice are production-ready, run the separate operator gates in section `3a` below before reopening engineering work
11. If desktop signing work is about to start, initialize the env template:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:init-signing`

The intended short decision loop is:

- `npm run release:next`
- `npm run operator:handoff:check`
- `npm run operator:smoke:inventory`
- `.zkcoder/scripts/verify.sh`

If that loop leaves only credential, account, certificate, or device work, keep it in operator docs instead of reopening engineering.
If the remaining question is about public-community discoverability or locked-channel behavior, read [community-visibility-matrix-2026-04-10.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-visibility-matrix-2026-04-10.md) before reopening product policy discussion.

Escalate to engineering only when:

- a documented repo-local command fails unexpectedly
- a release snapshot contradicts the documented source-of-truth files
- a previously verified unsigned packaging command stops working without a credential change
- Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.

## 3. External-only blockers still open

These remain outside repo-local engineering control.

Snapshot-aligned gate labels:

- `Desktop signing credential gate`: A real signing.env or explicit env override exists and all Apple/Windows signing values are real rather than placeholders.
- `Real-device Korean IME gate`: The physical-device Korean IME checklist has been executed once and recorded with a real iPhone result.

### mac signing / notarization

- `Developer ID Application` certificate
- real `APPLE_ID`
- real `APPLE_APP_SPECIFIC_PASSWORD`
- real `APPLE_TEAM_ID`
- usable `signing.env` or `ZKTALK_SIGNING_ENV_PATH` override

### Windows signing

- real `WIN_CSC_LINK` or `CSC_LINK`
- real `WIN_CSC_KEY_PASSWORD` or `CSC_KEY_PASSWORD`

### Mobile confidence gate

- real iPhone Korean IME confirmation using
  [docs/mobile-korean-ime-checklist-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)

## 3a. Storage and voice operator gates

These are not baseline `/api/health/ready` checks. Run them separately before claiming attachment or voice readiness.

Snapshot-aligned gate labels:

- `Object storage operator gate`: Real storage env values are present, /api/health/ready still excludes storage by design, and the separate storage gate passes.
- `Voice / LiveKit operator gate`: Real LiveKit env values are present, /api/health/ready still excludes voice by design, and the separate voice gate passes.

### Object storage gate

1. Confirm production env values are real, not placeholders:
   `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, and optional `S3_ENDPOINT`
2. Render the effective deploy config and inspect it:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && docker compose -f docker/docker-compose.prod.yml config`
3. Verify the API readiness payload still shows storage outside the baseline boundary:
   `curl -fsS http://127.0.0.1:4000/api/health/ready | jq`
   Read `operator.immediateActions` first; if it already says baseline traffic must stay blocked, fix that before treating storage as the primary issue.
4. Run repo-local verification before escalation:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:release-readiness`
5. Treat failures in presign upload or public asset retrieval as storage/operator follow-up first unless the repo-local verification batch identifies a code regression

### Voice / LiveKit gate

1. Confirm production env values are real, not placeholders:
   `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
2. Verify the API readiness payload still shows LiveKit outside the baseline boundary:
   `curl -fsS http://127.0.0.1:4000/api/health/ready | jq`
   Read `operator.immediateActions` first; if it already says baseline traffic must stay blocked, fix that before treating LiveKit as the primary issue.
3. For repo-local confidence, confirm the expected local LiveKit target is available:
   `ws://127.0.0.1:7880`
4. Run repo-local verification before escalation:
   `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:release-readiness`
5. Treat token issuance or room-join failures as LiveKit/operator follow-up first unless the repo-local verification batch identifies a code regression

## 3b. Operator-owned blocker ledger

Use this as the shortest decision table before reopening engineering work.

| Item | Owner | Unblock when | Repo-local evidence | Keep out of engineering when |
| --- | --- | --- | --- | --- |
| mac signing / notarization credentials | operator | A real Developer ID certificate and Apple notarization credentials are available in signing.env or an explicit env override. | `npm run release:next`, `apps/desktop/dist/signing-blockers.md`, `apps/desktop/RELEASE.md` | the current workspace only lacks `signing.env`, Apple values, or desktop signing artifacts |
| Windows code-signing credentials | operator | A real Windows code-signing certificate and password are available in signing.env or an explicit env override. | `npm run release:next`, `apps/desktop/dist/signing-blockers.json`, `apps/desktop/RELEASE.md` | the current workspace only lacks Windows signing env values or the latest signed installer |
| Real iPhone Korean IME confirmation | operator | The physical-device Korean IME checklist has been run once and recorded with a real iPhone result. | `docs/mobile-korean-ime-checklist-2026-03-26.md`, `docs/mobile-korean-ime-report-template-2026-03-26.md` | simulator validation is already green and the only missing proof is the real-device pass |
| Object storage gate | operator | Production S3/MinIO env values are real and the separate storage gate passes. | `/api/health/ready`, `npm run verify:release-readiness`, section `3a` above | baseline readiness is green but attachment/presign confidence still depends on real storage config |
| Voice / LiveKit gate | operator | Production LiveKit env values are real and the separate voice gate passes. | `/api/health/ready`, `npm run verify:release-readiness`, section `3a` above | baseline readiness is green but full media confidence still depends on real LiveKit config |

## 4. Decision boundary

- Ready for unsigned handoff: yes
- Ready for signed production release: no
- Remaining blockers are external-only unless a repo-local verification command now fails

## 5. Next-agent note

When regenerating queue items:

- keep credential, certificate, account, and physical-device needs out of the engineering queue
- keep runtime hardening, regression coverage, and doc alignment in the engineering queue
- start from `docs/README.md`, `docs/CURRENT_STATUS.md`, and `docs/IMPLEMENTATION_PLAN.md` before opening a new repo-local task
- prefer concrete repo surfaces over generic release themes
