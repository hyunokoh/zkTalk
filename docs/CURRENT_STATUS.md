# zkTalk Current Status

This is the stable entry point for the latest known project state.

## Current release decision

- Unsigned handoff build: ready
- Signed production release: not ready

Latest desktop release check:

- mac unpacked app: `OK`
- latest DMG: `OK`
- Windows unpacked app: `OK`
- latest NSIS installer: `OK`
- signing summaries: mac `NOT_READY`, windows `NOT_READY`

Latest unsigned release run:

- `apps/desktop npm run release:unsigned`: passed
- dist verification: passed
- bundle verification: passed
- archive verification: passed

Latest signed preflight:

- `apps/desktop npm run release:check:signed`: blocked as expected
- `apps/desktop npm run release:next`: prints the latest signing blockers and next actions
- `Developer ID identity`: `MISSING`
- Apple signing values: `EXAMPLE`
- Windows signing values: `EXAMPLE`
- signing blocker reports refresh from the latest release status and show `signing.env` exists/loaded state
- release summary/report/handoff/index/bundle now also refresh signing/readiness inputs instead of silently reusing older blocker data
- release report / handoff / index now separate document generation time from artifact manifest generation time

## Main blockers

- mac signing / notarization credentials
  - Runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md`
  - Live blocker report: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/signing-blockers.md`
  - Env override: `ZKTALK_SIGNING_ENV_PATH=/absolute/path/to/signing.env npm run release:check:signed`
- Windows code signing credentials
  - Live blocker JSON: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/signing-blockers.json`
  - Snapshot JSON: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-next.json`
- Real iPhone Korean IME confidence check
  - Runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`
  - Report template: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-report-template-2026-03-26.md`
  - Init command: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ime:report:init`
  - This is the remaining mobile confidence runbook after simulator verification
- Decide the release policy for the remaining centralized simulator harness

## Read this next

- Repo-level next-step command:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
  - JSON: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next -- --json`
  - Snapshot file: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
  - JSON now includes runnable `commands`
- Detailed blockers:
  - [current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)
- Release checklist:
  - [release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
- Full tested flows:
  - [test-matrix-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- Broader handoff:
  - [HANDOFF.md](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)

## Product confidence snapshot

- Desktop core flows: verified
- Mobile core flows: verified
- Mobile create-community slug UX for Korean input: verified with typed-value retention, live auto-slug feedback, IME-friendlier `onChangeText` handling for name/description, reset-to-auto behavior when the slug is cleared, inline guidance, saved-link preview, create-button disablement until name plus a valid final slug are present, matching accessibility hints/state for the slug field and submit button, and polite live-region updates for slug help/preview. QA hooks now exist for the name field, slug field, slug help, slug preview, and submit button, and simulator preview/create results expose `slugInput`, `slug`, `slugFeedback`, `isWarning`, and `canSubmit`.
- Moderation / permissions / visibility rules: verified
- Release packaging / unsigned handoff docs: verified
- Mobile screen-level simulator hooks: centralized behind a shared harness gate
- Mobile simulator harness: dev builds default on, release builds default off unless explicitly enabled
- Remaining harness surface: shared helper plus app bootstrap/result files, with the main bootstrap/login/settings/home JSON paths, route marker cleanup, and simulator duplicate-prevention marker claims already funneled through shared helpers. The remaining raw mobile search hits are mostly non-harness paths such as backup validation and temporary attachment cleanup.
