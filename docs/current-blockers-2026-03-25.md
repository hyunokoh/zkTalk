# zkTalk Current Blockers (2026-03-25 baseline, refreshed 2026-04-07)

Status: concise external-blocker snapshot  
Audience: release owner / engineering

Boundary:

- This document only lists current external release blockers and confidence gates.
- Completed engineering work, internal cleanup, and non-blocking follow-up belong in `docs/COMMERCIALIZATION_PLAN.md` and `docs/IMPLEMENTATION_PLAN.md`, not here.
- The live release snapshot now comes from `npm run release:next`, which bootstraps `apps/desktop/dist/` if that directory is absent instead of failing before it can report blockers.

Source of truth:

- docs index: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md`
- operator handoff shortcut: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md`
- current status: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md`
- repo release snapshot: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md`
- repo release snapshot JSON: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
- runtime runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md`
- engineering queue: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md`
- implementation queue: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md`

Use this triage rule before adding a new blocker here:

- Add it here only if engineering cannot clear it repo-locally without new credentials, new device access, or an external service/account decision.
- Keep it out of this file if the fix is a code change, a repo-local test gap, a doc alignment task, or a verification improvement that engineering can still implement now.
- A fresh workspace missing `signing.env` or desktop `dist/` artifacts is an operator-state snapshot, not proof of a new code regression.
- A dirty worktree is not a release blocker by itself.

Operator shortcut:

- If you only need the current split between "engineering already done" and "still waiting on external inputs", start with `/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md`.

## Production release blockers

### 1. mac signing / notarization

Still missing or not fully provided:

- `Developer ID Application` certificate
- `signing.env` generated from `SIGNING.example.env` or an equivalent env override
- real `APPLE_ID`
- real `APPLE_APP_SPECIFIC_PASSWORD`
- real `APPLE_TEAM_ID`

Impact:

- Unsigned desktop artifacts can be built and verified
- Signed mac production release is still blocked

## 2. Windows code signing

Snapshot label: Windows code-signing credentials

Still missing or not fully provided:

- real Windows certificate file (`WIN_CSC_LINK` / `CSC_LINK`)
- real certificate password (`WIN_CSC_KEY_PASSWORD` / `CSC_KEY_PASSWORD`)

Impact:

- Unsigned Windows installer artifacts can be built
- Signed Windows production release is still blocked

## 3. Real-device Korean IME confirmation

Snapshot label: Real iPhone Korean IME confirmation

Current state:

- Mobile core flows are heavily verified in simulator
- Community slug guidance for Hangul input is verified
- The specific review finding about slug text disappearing without explanation is already addressed in the mobile UI. The create-community screen now keeps the typed slug visible, updates auto-slug guidance live from the name field, falls back to auto mode when the slug is cleared, previews the sanitized saved link separately, and keeps submit disabled until a valid final slug exists.
- QA/simulator coverage for this flow now exposes `slugInput`, `slug`, `slugFeedback`, `isWarning`, and `canSubmit`, plus `name/slug/help/preview/submit` test IDs on the screen
- Korean IME composition should still be checked once on a real iPhone before final release confidence is claimed
- Execution checklist: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`

Impact:

- Not a server blocker
- Still a release confidence blocker for mobile polish

## Current decision

- Ready for unsigned handoff: yes
- Ready for signed production release: no

## Not blockers

Keep these out of the blocker list unless a new verified regression changes the release decision:

- web/API runtime hardening still in progress
- targeted regression gaps that are already tracked in `docs/COMMERCIALIZATION_PLAN.md`
- simulator harness policy or cleanup follow-up
- lint, warning, or other non-release noise reduction work
- a cleaned `apps/desktop/dist/` directory in a fresh workspace
- a dirty worktree that still contains active user-authored changes

Dirty-worktree handling:

- Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.
- Use `.zkcoder/scripts/verify.sh` and the run's `before.git-status.txt` snapshot to confirm preservation instead of treating git cleanliness as a release criterion.

## Recommended next actions

1. Generate `apps/desktop/signing.env` from `SIGNING.example.env`, or point `ZKTALK_SIGNING_ENV_PATH` at a real signing env file
2. Provide real mac signing / notarization credentials
3. Provide real Windows code-signing credentials
4. Run the real-device Korean IME checklist:
   - `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`
5. Use `apps/desktop npm run release:next` for the current signing snapshot and next actions
6. Use `npm run release:next` at the repo root for the combined signing snapshot plus mobile IME runbook
7. Track internal harness-policy decisions and non-blocking cleanup in `docs/COMMERCIALIZATION_PLAN.md` and `docs/IMPLEMENTATION_PLAN.md`, not as release blockers

## Latest release check snapshot

Source:

- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
- `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-status.json`

Current state from the latest check:

- generated at: `2026-04-07T14:31:16.481Z`
- signing env exists: `NO`
- signing env loaded: `NO`
- primary command: `npm run release:init-signing`
- mac unpacked app: `MISSING`
- latest DMG: `MISSING`
- Windows unpacked app: `MISSING`
- latest NSIS installer: `MISSING`
- mac summary: `NOT_READY`
- windows summary: `NOT_READY`
- latest signed preflight: blocked as expected
- signing blocker reports now refresh from the latest `release-status.json`
- signing blocker reports now show `signing.env` `exists` / `loaded`
- summary / report / handoff / index / bundle generation now refreshes signing-readiness inputs on each run
- repo-level `release:next` output now carries the mobile IME runbook and combined source-of-truth links in the same snapshot

Important nuance:

- This live snapshot is from the current workspace, not from the last archived unsigned packaging run. If `dist/` was cleaned, `release:next` now reports the missing artifacts explicitly instead of crashing; that does not by itself mean unsigned handoff readiness regressed.
- Apple and Windows signing variables currently appear as `MISSING` in the live snapshot because no `signing.env` is loaded in this workspace. That is an operator input gap, not a newly discovered code blocker.
