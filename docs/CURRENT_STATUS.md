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
- Web production build: passed
- Web test suite: passed
- Web product polish: connection status banner, shared toasts, shared confirm dialogs, offline queued messaging with optimistic rows and per-row retry/remove, shared loading/empty states, restored Discover destination, and polished friends/bookmarks/search/moderation reports flows are now in place.
- Mobile create-community slug UX for Korean input: verified with typed-value retention, live auto-slug feedback, IME-friendlier `onChangeText` handling for name/description, reset-to-auto behavior when the slug is cleared, inline guidance, saved-link preview, create-button disablement until name plus a valid final slug are present, matching accessibility hints/state for the slug field and submit button, and polite live-region updates for slug help/preview. QA hooks now exist for the name field, slug field, slug help, slug preview, and submit button, and simulator preview/create results expose `slugInput`, `slug`, `slugFeedback`, `isWarning`, and `canSubmit`.
- Moderation / permissions / visibility rules: verified
- Release packaging / unsigned handoff docs: verified
- Mobile screen-level simulator hooks: centralized behind a shared harness gate
- Mobile simulator harness: dev builds default on, release builds default off unless explicitly enabled
- Remaining harness surface: shared helper plus app bootstrap/result files, with the main bootstrap/login/settings/home JSON paths, route marker cleanup, and simulator duplicate-prevention marker claims already funneled through shared helpers. The remaining raw mobile search hits are mostly non-harness paths such as backup validation and temporary attachment cleanup.

## Recent web readiness work (2026-04-05)

Recent web-focused commits completed a product-polish and validation sweep:

- `d8d5682` `feat(web): polish realtime feedback and offline messaging`
- `e839b07` `feat(web): unify loading and empty states`
- `34886ae` `feat(web): restore discover as a real destination`
- `0bd24d9` `feat(web): polish friend search and empty states`
- `5ef1832` `feat(web): polish bookmark browsing states`
- `dd0c44b` `feat(web): polish community search states`
- `04584ab` `feat(web): polish moderation report states`
- `3fe822d` `fix(web): stabilize validation after UX polish`

Current takeaway:

- web build is green
- web test suite is green
- recent polish changes are validated for the next handoff / PR step
- remaining release blockers are signing credentials and the real-device mobile IME confidence pass, not current web runtime quality
