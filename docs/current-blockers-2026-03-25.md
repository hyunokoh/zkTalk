# zkTalk Current Blockers (2026-03-25)

Status: concise blocker snapshot  
Audience: release owner / engineering

## Production release blockers

### 1. mac signing / notarization

Still missing or not fully provided:

- `Developer ID Application` certificate
- real `APPLE_ID`
- real `APPLE_APP_SPECIFIC_PASSWORD`
- real `APPLE_TEAM_ID`

Impact:

- Unsigned desktop artifacts can be built and verified
- Signed mac production release is still blocked

## 2. Windows code signing

Still missing or not fully provided:

- real Windows certificate file (`WIN_CSC_LINK` / `CSC_LINK`)
- real certificate password (`WIN_CSC_KEY_PASSWORD` / `CSC_KEY_PASSWORD`)

Impact:

- Unsigned Windows installer artifacts can be built
- Signed Windows production release is still blocked

## 3. Real-device Korean IME confirmation

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

## 4. Test harness release-policy decision

Current state:

- Mobile simulator verification added multiple dev-only routes / auto actions
- These helped close real regressions quickly
- Core entry points now share a common harness gate in `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/lib/simulator-harness.ts`
- The harness can be disabled explicitly with `EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS=false`
- The harness now defaults to `on` for simulator dev builds, and defaults to `off` for non-dev/release builds unless `EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS=true` is set
- The shared gate now covers app bootstrap plus key regression screens such as login, settings, create community, home, discover, QR scan, linked accounts, DM list, DM compose, channel, channel search, channel pins, channel polls, inbox, friends, backup, event details, event attendees, event edit, voice, join invite, edit profile, edit community, edit channel, create channel, create poll, create forum post, thread reply, community members, manage categories, community reports, and community onboarding
- Direct screen-level `Device.isDevice` / `documentDirectory` simulator harness checks are now cleared from `apps/mobile/src/screens`
- Remaining harness touchpoints are centralized in the shared helper, app bootstrap (`dev-session-token` / `dev-route.json`), and simulator result/error files. Duplicate-prevention for simulator create flows is now handled through shared helper marker claims rather than ad hoc screen logic. The remaining raw search hits in mobile screens are now mostly non-harness code paths such as real backup JSON validation and temporary attachment file cleanup.

Decision still needed:

- keep as internal regression hooks
- move behind a stricter test-only guard
- remove before release branch cut

Impact:

- Not blocking unsigned handoff
- Not a functional product blocker at this point
- Still worth deciding before final production hardening / release branch cut

## 5. Non-blocking cleanup

Remaining work:

- lint / warning cleanup
- doc polish
- test harness boundary cleanup

Impact:

- Not a functional blocker
- Useful for reducing release noise

## Current decision

- Ready for unsigned handoff: yes
- Ready for signed production release: no

## Recommended next actions

1. Provide real mac signing / notarization credentials
2. Provide real Windows code-signing credentials
3. Run the real-device Korean IME checklist:
   - `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`
4. Use `apps/desktop npm run release:next` for the current signing snapshot and next actions
5. Use `npm run release:next` at the repo root for the combined signing snapshot plus mobile IME runbook

## Latest release check snapshot

Source:

- `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-status.json`

Current state from the latest check:

- mac unpacked app: `OK`
- latest DMG: `OK`
- Windows unpacked app: `OK`
- latest NSIS installer: `OK`
- mac summary: `NOT_READY`
- windows summary: `NOT_READY`
- latest signed preflight: blocked as expected
- signing blocker reports now refresh from the latest `release-status.json`
- signing blocker reports now show `signing.env` `exists` / `loaded`
- summary / report / handoff / index / bundle generation now refreshes signing-readiness inputs on each run

Important nuance:

- Apple and Windows signing variables currently appear as `EXAMPLE` in release status, which means placeholder values exist but real production credentials are still not configured.
