# zkTalk Test Matrix (2026-03-25)

Status: latest manual verification snapshot  
Audience: engineering / QA / handoff

This document captures the end-to-end flows that were actually exercised across desktop, mobile, and server as of 2026-03-25.

## Summary

- Desktop core messaging flows: verified
- Mobile core messaging flows: verified
- Desktop moderation / settings / role boundaries: verified
- Server multi-user messaging regression: verified
- Signed release / notarization / Windows code signing: not complete

## Desktop

### Auth

| Flow | Status | Notes |
| --- | --- | --- |
| Phone login | PASS | Session established and home loads |
| QR login | PASS | Mobile/device confirmation returns session token |
| Logout | PASS | Session clears and login screen returns |

### Messaging

| Flow | Status | Notes |
| --- | --- | --- |
| Channel send | PASS | Desktop UI send confirmed |
| Channel receive from external user | PASS | Real-time update confirmed |
| Channel image attachment preview | PASS | Electron shell smoke now verifies send + lightbox open |
| Channel document attachment open | PASS | Electron shell smoke verifies send + desktop temp-file open bridge |
| DM create | PASS | Opens `/dm/:conversationId` |
| DM receive | PASS | External message appears in desktop DM |
| DM send | PASS | Saved and visible in UI/API |
| Thread open / reply | PASS | Reply and thread navigation verified |
| Inbox mention | PASS | Item appears and click navigates correctly |
| Bookmark open | PASS | Verified earlier in desktop/web regression |
| Message edit/delete | PASS | Fixed against correct API contracts |
| Forward message | PASS | Server route implemented and verified |
| Reactions add/remove | PASS | Raw array shape + toggle behavior verified |

### Voice

| Flow | Status | Notes |
| --- | --- | --- |
| Voice channel creation | PASS | Desktop create modal supports `voice` |
| Join voice room | PASS | UI and participant presence verified |
| Leave voice room | PASS | Participant list clears correctly |
| Multi-user participant count | PASS | Desktop updates from 1 to 2 participants |

### Friends / Events

| Flow | Status | Notes |
| --- | --- | --- |
| Friend request receive | PASS | Pending tab shows request |
| Friend request accept | PASS | Friendship becomes `accepted` |
| Friend -> direct DM | PASS | Added desktop `Message` action |
| Event create | PASS | UI create flow verified |
| Event RSVP reflected from external user | PASS | Attendance count updates |
| Event attendees modal | PASS | Attendee list loads |
| Event attendee -> DM | PASS | Opens direct DM |

### Moderation / Roles / Settings

| Flow | Status | Notes |
| --- | --- | --- |
| Report create -> resolve | PASS | UI click + server state + audit log verified |
| Report create -> dismiss | PASS | UI click + server state + audit log verified |
| Audit log page | PASS | `report_created`, `report_resolved`, `report_dismissed` visible |
| Member mute | PASS | User loses active membership and cannot post |
| Member kick | PASS | User loses active membership and can rejoin public community |
| Member ban | PASS | User cannot rejoin community |
| Role change to moderator | PASS | Moderator can access/resolve reports |
| Moderator audit-log access denied | PASS | `403 FORBIDDEN` |
| Role change to admin | PASS | Admin can access audit log |
| Admin delete community denied | PASS | Owner-only delete enforced |
| General settings save | PASS | Name/description persisted |
| Visibility save: invite_only | PASS | Direct join blocked, invite join allowed |
| Visibility save: private | PASS | Direct join blocked, invite join allowed |
| Invite link create | PASS | Desktop-generated invite used by external account |
| Owner delete community | PASS | UI danger zone delete removes community |

## Mobile

### Auth

| Flow | Status | Notes |
| --- | --- | --- |
| Phone login | PASS | Verified in simulator flow |
| Logout | PASS | Token cleared, login screen returns |
| QR confirm for desktop login | PASS | QR confirmation returns `confirmed` + session token |

### Messaging

| Flow | Status | Notes |
| --- | --- | --- |
| Channel send | PASS | Mobile -> desktop/server verified |
| Channel receive | PASS | Desktop/external -> mobile verified |
| DM send | PASS | Mobile -> desktop/server verified |
| DM receive | PASS | Desktop/external -> mobile verified |
| Attachment upload | PASS | Upload -> message -> attachment render verified |
| DM attachment upload | PASS | DM presign, send, recipient render, and authenticated download verified |
| Poll vote / unvote | PASS | Both directions verified |
| Poll create | PASS | Simulator route and server persistence verified |
| Forum list | PASS | Screen loads correctly |
| Forum post create | PASS | Thread created |
| Forum reply | PASS | Reply saved and displayed |
| Inbox open | PASS | Mention opens target channel and marks read |
| Bookmark open | PASS | Bookmarked message opens correctly |

### Friends / Events / Community

| Flow | Status | Notes |
| --- | --- | --- |
| Friend request accept | PASS | Server state becomes `accepted` |
| Event RSVP | PASS | Going/interested state persisted |
| Event attendee -> DM | PASS | DM conversation opens |
| Event create | PASS | Saved via mobile UI |
| Event edit | PASS | Updated fields persisted |
| Join via invite | PASS | Invite code flow verified |
| Discover join | PASS | Public community join verified |
| Create community | PASS | Includes Hangul slug guidance verification |
| Slug UX for Korean input | PASS | Korean slug input keeps the typed value visible, updates auto-slug feedback live from the name field, uses IME-friendlier `onChangeText` handling for name/description, falls back to auto mode again when the slug is cleared, shows inline guidance, shows the sanitized saved-link preview, keeps the create button disabled until both name and a valid final slug are available, exposes matching accessibility state/hints for the slug field and submit button, marks help/preview as polite live regions, and the simulator/QA hooks expose `create-community-name-input`, `create-community-slug-input`, `create-community-slug-help`, `create-community-slug-preview`, `create-community-submit`, plus preview fields `slugInput`, `slug`, `slugFeedback`, `isWarning`, and `canSubmit` |
| Create channel | PASS | Mobile create entry points and send in new channel verified |
| Manage categories | PASS | Create, rename, delete verified |
| Manage members | PASS | Role change verified |
| Community edit | PASS | Name/description/visibility save verified |

### Settings / Identity / Utility

| Flow | Status | Notes |
| --- | --- | --- |
| Profile edit | PASS | Display name and bio persisted |
| Linked accounts add | PASS | Email and phone link verified |
| Linked accounts unlink | PASS | Phone unlink verified |
| My QR screen | PASS | Renders correctly |
| Profile QR scan | PASS | Friend request created |
| Backup export/import | PASS | Export file and restore verified |
| Voice join/leave | PASS | Token + roomName flow verified |
| Settings hub | PASS | Root settings screen loads |
| DM list hub | PASS | DM list screen loads and first conversation opens |

## Server / API

### Multi-user regression script

File: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/scripts/two-user-messaging-e2e.mjs`

Verified scenarios:

- Channel send / receive
- Channel message-level unread people count drops `2 -> 1 -> 0` as additional community members read the same message
- Channel unread summary per member drops `1 -> 0` after that member reads, even when no prior `channel_reads` row existed
- Channel edit / delete
- Mention -> inbox
- Thread create / reply / read
- Reaction add / remove
- Direct DM create / idempotency / send / read / edit / delete
- Direct DM attachment presign / upload / attach / recipient download
- Direct DM call target for friend-driven 1:1 voice/video entry
- Group DM create / send / read
- Group DM -> private community promotion with imported history, source-DM history target on the promoted channel, idempotent re-promotion, DM list target metadata, websocket update, read-only lock on the original DM, and follow-up posting
- Direct DM -> promoted channel source-history label resolves to the peer display name
- Dedicated writable harness DM creation / idempotency for packaged desktop and simulator regression runs after DM promotion coverage
- Dedicated writable harness DM attachment round-trip after DM promotion coverage
- Forum create / list
- Forward message

Status: PASS

### Auth precedence

Status: PASS

- `Authorization: Bearer ...` now takes precedence over the `zktalk_session` cookie in `/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/middleware/auth.ts`.
- This was verified as part of the packaged desktop regression, where desktop protocol handoff must override a stale browser cookie during session switching.

### Public asset delivery

Status: PASS

- `GET /api/upload/assets/*` is now intentionally public, while attachment downloads remain authenticated.
- Verified locally that a freshly uploaded community icon returns `200 image/png` without auth and that Next image optimization also succeeds for the same URL via `/_next/image?...`.
- Verified locally that the same asset also succeeds through the same-origin web proxy at `/api/public-assets/...` for both `GET` and `HEAD`.
- Route regression coverage lives in `/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/upload/__tests__/upload.routes.test.ts`.
- Web now rewrites public upload asset URLs to the same-origin `/api/public-assets/*` proxy before handing them to `next/image`, while private attachment URLs stay out of that optimization path.
- Web regression coverage for that rewrite and optimization boundary lives in `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/__tests__/image-optimization.test.ts`.
- Same-origin public asset proxy coverage lives in `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/api/public-assets/__tests__/route.test.ts`.
- Component-level rendering coverage for first-party public asset rewriting now lives in `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/UserAvatar/__tests__/UserAvatar.test.tsx`, `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/CommunityRail/__tests__/CommunityRail.test.tsx`, `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/home/__tests__/page.test.tsx`, and `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/discover/__tests__/page.test.tsx`.
- Desktop discoverability regressions now cover quick-start/profile-share entry points in `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/home/__tests__/page.test.tsx`, `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/settings/__tests__/page.test.tsx`, `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/friends/__tests__/page.test.tsx`, `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/DesktopProfileQuickActions/__tests__/DesktopProfileQuickActions.test.tsx`, `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/ProfileQR/__tests__/ProfileQR.test.tsx`, and `/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/FriendList/__tests__/FriendList.test.tsx`.
- The web proxy regression now covers missing-path `400`, upstream success passthrough, and upstream `404` passthrough so success and failure semantics both stay stable.

## Desktop protocol helpers

Helper scripts:

- Open a packaged desktop deep link:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run desktop:harness:open -- --url "zktalk://desktop-harness?mode=channel&sessionToken=<token>&communitySlug=<slug>&channelId=<id>&body=hello"`
- Generate a desktop harness URL:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run desktop:harness:url -- --mode channel --session-token <token> --community-slug <slug> --channel-id <id> --body "hello"`
- Run packaged desktop channel/DM regression against cached or fresh API E2E data:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run desktop:harness:regression -- --mode both --timeout-ms 25000`

Notes:

- Desktop protocol messaging now targets `/desktop-harness`, which sends the message first and then redirects into the channel or DM. This avoids timing-dependent composer auto-send behavior inside the packaged shell.
- `open-desktop-protocol.mjs` launches the packaged `.app` asynchronously, so regression runs do not hang while the desktop app stays open.
- The regression script caches the last E2E payload in `.tmp/desktop-harness-last-e2e.json` and can reuse it for repeated desktop checks.
- On this Mac, packaged desktop startup-route delivery is still flaky during cold automated launch, so `desktop-harness-regression.mjs` now falls back to a clean dev desktop shell when the packaged path does not consume the route in time. The last result is stored in `.tmp/desktop-harness-last-result.json`.
- The E2E payload now includes a dedicated writable `harnessConversationId` plus `dmHarnessSender` / `dmHarnessReceiver`, so desktop DM regression no longer targets a promoted read-only conversation.

Current local verification on this Mac:

- `apps/desktop` `npm run build:web` passed
- `apps/desktop` `npm run pack:mac` passed
- `npm run desktop:harness:regression -- --mode both --timeout-ms 25000` passed
- `env -u CI ZKTALK_WEB_PORT=3100 npx pnpm --dir e2e exec playwright test tests/desktop-shell.smoke.spec.ts --project chromium` passed
- Packaged desktop `channel` regression verified successfully (`channelVerified: true`)
- Packaged desktop `dm` regression verified successfully (`dmVerified: true`)
- Electron shell smoke now also verifies seeded channel launch, direct login-route shell boot, JPG attachment preview open, and PDF attachment open-path logging

## Mobile simulator helpers

Helper scripts:

- Find current simulator harness directory:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:harness:find -- --app expo`
- Launch the simulator app first:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:harness:launch -- --app expo`
- Launch the simulator app and immediately open a deep link or Expo experience URL:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:harness:launch -- --app expo --url "<exp-or-custom-url>"`
- Queue a simulator channel/DM send:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:harness:compose -- --dir "<harnessDir>" --mode channel --channel-id <id> --community-id <id> --body "hello"`
- Run API E2E + write one mobile simulator regression action:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:harness:regression -- --app expo --mode channel --launch`
- Run the same regression while also opening a specific Expo Go experience URL:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && EXPO_GO_URL="<exp-url>" npm run mobile:harness:regression -- --app expo --mode both --launch`
- Run the end-to-end mobile P0 smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:smoke -- --app standalone`
- Run the first touch-driven Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone`
- Standalone smoke now targets `iPhone 15` by default, boots that simulator explicitly, shuts down other booted simulators before the run, and uses `zktalk://` to bring zkTalk to the foreground before touch automation starts.
- Standalone Maestro runs also strip each flow's `launchApp` step in a generated temp copy when the runner already launched the app, which avoids foregrounding the wrong app on machines that also have other booted simulators.
- Current stable shortcut commands are:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:both`
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:mobile`
- Install or verify the local Maestro CLI used by the smoke runners:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:install`
- Equivalent explicit sequence if you want each step separately:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:standalone:prepare -- --device "iPhone 15"`
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:smoke -- --app standalone --timeout-ms 120000`
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode both --timeout-ms 120000 --maestro-timeout-ms 30000`

## Browser UI smoke

- Run the browser UI smoke suite locally:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run e2e:smoke:web`
- Run the full local UI smoke bundle across browser web, desktop shell, and mobile simulator:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:all`
- Print the latest UI smoke status snapshot:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run --silent ui:smoke:status -- --json`
- `ui:smoke:status` now also writes `.tmp/manual-smoke-status-last-result.json`, so the latest status snapshot is available as a stable manifest alongside the human-readable stdout.
- Regenerate the human-readable UI smoke brief:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:brief`
- `ui:smoke:brief` now also writes `.tmp/manual-smoke-brief-last-result.json`; the stable markdown pointer is `.tmp/manual-smoke-brief-latest.md`, the older date-stamped path is still written for backward compatibility, and the brief refreshes `.tmp/manual-smoke-status-last-result.json` first so the surfaced manual-status helper stays current.
- Refresh the latest desktop/mobile captures without running the full smoke suites:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:capture`
- Regenerate the richer manual smoke report/history bundle:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:report`
- Reopen the cached manual QA workspace surfaces:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:open`
- Reopen the cached QA workspace, refresh screenshots, and rebuild brief/report/history:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:refresh`
- Fail fast if the cached smoke manifests are missing, failed, or older than your freshness threshold:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:verify -- --max-age-minutes 180`
- Rerun only the suites that verify says are failing/stale, with duplicate work collapsed (`all > macos > desktop/mobile`):
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:rerun -- --max-age-minutes 180`
- Preview which suites would rerun without actually launching them:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:rerun -- --max-age-minutes 180 --dry-run`
- Run the whole repair loop once: verify first, rerun only what needs help, verify again, then refresh the brief:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:repair -- --max-age-minutes 180`
- Preview that repair loop without launching any suites:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:repair -- --max-age-minutes 180 --dry-run`
- The root smoke wrappers now leave last-run manifests in `.tmp/ui-smoke-playwright-web-last-result.json`, `.tmp/ui-smoke-playwright-desktop-last-result.json`, `.tmp/ui-smoke-mobile-last-result.json`, `.tmp/ui-smoke-macos-last-result.json`, and `.tmp/ui-smoke-all-last-result.json`, which makes local and CI failures easier to triage.
- `ui:smoke:verify` checks those manifests for `ok`, `finishedAt`, and freshness, and exits non-zero when any required suite is missing, failed, or stale.
- `ui:smoke:verify` also writes its own verdict to `.tmp/ui-smoke-verify-last-result.json`, so CI artifact bundles include both the raw run manifests and the freshness gate result.
- `ui:smoke:rerun` writes its last plan/run record to `.tmp/ui-smoke-rerun-last-result.json`, so you can inspect which suites were selected and which commands actually ran.
- `ui:smoke:repair` writes `.tmp/ui-smoke-repair-last-result.json` with the `before`, `rerun`, and `after` verification snapshots, which makes it easy to see whether the repair loop actually cleared the stale/failing suites.
- `ui:smoke:repair` now refreshes the latest desktop/mobile captures before rebuilding the report and brief, so the markdown artifacts and screenshots stay in sync.
- `manual:smoke:open` writes `.tmp/manual-smoke-open-last-result.json`, so the most recent workspace relaunch can be inspected the same way as the smoke wrappers.
- `manual:smoke:open` now rewrites that manifest after the relaunch completes so the embedded status snapshot already reflects the latest `manualSmokeOpen` timestamp and duration.
- `manual:smoke:refresh` writes `.tmp/manual-smoke-refresh-last-result.json`, which now embeds the latest status snapshot after the refresh completes.
- `ui:smoke:report` now also writes `.tmp/manual-smoke-report-last-result.json`, alongside `.tmp/manual-smoke-report-latest.md`, `.tmp/manual-smoke-report-latest.json`, and `.tmp/manual-smoke-history.md`, and the failure artifacts in both GitHub smoke workflows include all of those files plus `.tmp/manual-smoke-status-last-result.json`, `.tmp/manual-smoke-open-last-result.json`, and `.tmp/manual-smoke-refresh-last-result.json` next to the smoke result manifests.
- `ui:smoke:report` also reflects the latest capture method and stored screenshot counts, while failure artifacts now include `.tmp/manual-smoke-capture-last-result.json` plus the stable `manual-smoke-desktop-latest.png` and `manual-smoke-mobile-latest.png` images.
- The timestamped manual smoke report snapshots are also pruned automatically, keeping the newest `15` markdown/json pairs while the history page itself still summarizes the newest `10`, and that history table now tracks `Status` / `Open` / `Refresh` / `Brief` / `Report` alongside `Full UI smoke` / `Verify` / `Repair`.
- The timestamped manual smoke desktop/mobile screenshots are also pruned automatically, keeping the newest `15` captures per device kind plus the stable `manual-smoke-*-latest.png` pointers.
- `e2e:smoke:web` and `e2e:smoke:desktop` now auto-pick free API/web ports when you do not pin `ZKTALK_API_PORT` or `ZKTALK_WEB_PORT`, so they no longer trip over long-running local dev servers as easily.
- `apps/web` now allows `127.0.0.1` and `localhost` as dev origins, so Playwright smoke no longer emits the Next.js cross-origin warning for `/_next` assets when the runner uses loopback URLs.
- CI now installs Chromium and runs the same Playwright smoke suite from `.github/workflows/ci.yml`.
- Both GitHub UI smoke workflows now run `ui:smoke:verify` after the suites finish, then refresh both `ui:smoke:report` and `ui:smoke:brief` before appending the brief to the Actions job summary, so missing/stale manifests fail fast while the latest pass/fail state, timestamps, result-file paths, and report/history artifacts stay in sync with the run.

## macOS smoke entry points

- Prepare the standalone iOS simulator app locally before mobile smoke:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:standalone:prepare -- --device "iPhone 15"`
- Run the desktop Electron shell smoke locally:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run e2e:smoke:desktop`
- GitHub also has a manual macOS smoke workflow at `.github/workflows/macos-ui-smoke.yml` for `desktop shell + mobile harness` verification on macOS runners.
- That workflow now installs Maestro first, then delegates to the same `ui:smoke:macos` wrapper used locally, so local and CI macOS smoke stay aligned. On failure it uploads Playwright output, `.tmp/mobile-maestro`, and `.tmp/logs`.
- Run the macOS-local desktop + mobile smoke bundle:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ui:smoke:macos`
- `ui:smoke:all` now chains `e2e:smoke:web` first and then `ui:smoke:macos`, so a single root command can cover browser web, desktop shell, mobile harness, and mobile Maestro together.
- `ui:smoke:all` also accepts `--device "<simulator name>"` and forwards it to the macOS/mobile smoke wrappers.
- `ui:smoke:mobile` now starts a local API dev server on a free port when needed, reuses an existing healthy one when present, and starts Metro only when it is not already serving on port `8081`.
- `ui:smoke:mobile` now also runs `mobile:maestro:install` up front, so local smoke can bootstrap Maestro without requiring a separate manual install step first.
- `ui:smoke:mobile` now forwards the requested simulator name to both `mobile:smoke` and `mobile:maestro:smoke`, so the wrapper no longer mixes a named target with whichever simulator happened to be booted already.
- `ui:smoke:macos` now chains the new desktop Playwright wrapper and the self-contained mobile wrapper, so it no longer depends on fixed local port assignments.
- `ui:smoke:mobile` and `mobile:maestro:smoke` now set `MAESTRO_DRIVER_STARTUP_TIMEOUT=240000` by default, which gives the iOS XCTest driver enough time after a fresh standalone build on slower machines.
- `CreateCommunityScreen` now clears each consumed simulator harness action file and re-arms its harness effect when the screen regains focus, so `mobile:smoke` can reliably perform both slug preview and actual community creation in the same run.
- `mobile:maestro:smoke` now retries simulator harness lookup when CoreSimulator transiently reports the target device as `Shutdown`, which hardens `ui:smoke:mobile` and `ui:smoke:macos` after long standalone prepare/build phases.
- `mobile:smoke` and `mobile:maestro:smoke` now prime the standalone app once before resolving the simulator harness path, so reinstalls that rotate the app data container no longer break the first write to `Documents/`.
- `launch-mobile-simulator-app.mjs --app standalone` now prefers waking the simulator app through `zktalk://` instead of `simctl launch`, because `simctl launch com.zktalk.mobile` can be denied by SpringBoard even when the app is installed and healthy.
- The standalone launcher also treats `openurl` as successful once the app is actually running, which smooths over intermittent simulator `Operation timed out` noise during longer wrapper runs without making Expo Go URL handling more permissive.
- `shutdownOtherBootedSimulators()` now shuts down only non-target simulators, instead of using `shutdown all`, so the target `iPhone 15` is not accidentally dropped just before Maestro attaches.
- `mobile:standalone:prepare` now pipes `xcodebuild` through Expo's `excpretty` formatter when available, which keeps successful local/CI logs readable without changing the build itself.
- `mobile:maestro:install` checks `MAESTRO_BIN`, `~/.maestro/bin/maestro`, and PATH first, then falls back to Maestro's official install script so CI and fresh local Macs can bootstrap the CLI the same way.
- Run the DM touch-driven Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode dm`
- Run the DM attachment send Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode dm-attachment-send`
- Run the DM document send Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode dm-document-send`
- Run the DM camera send Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode dm-camera-send`
- Run the Korean IME Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode ime`
- Run the channel attachment send Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode attachment-send`
- Run the channel document send Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode document-send`
- Run the channel camera send Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode camera-send`
- Run the channel image preview Maestro smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode attachment`
- Run the channel lightbox zoom clamp smoke against the standalone simulator app:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode attachment-zoom`
- Run both Maestro touch smokes back-to-back:
  `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run mobile:maestro:smoke -- --app standalone --mode both`

Notes:

- The mobile app now polls `dev-route.json` and `dev-compose.json` while simulator harness mode is active, so standalone runs can consume newly written actions without requiring a cold start.
- `mobile:smoke` itself still expects Metro on `localhost:8081` and will fail fast with a clear message when the dev server is not running, but `ui:smoke:mobile` now makes sure Metro is available first.
- `mobile:maestro:smoke` also expects Metro on `localhost:8081`, requires the Maestro CLI (`brew install maestro` on this Mac), uses the simulator harness only for session bootstrap, and then performs the actual tab tap / list tap / composer tap/input/send through Maestro.
- `mobile:maestro:smoke --mode ime` reuses the same touch path as the channel flow, but sends a real Hangul message and waits for the exact Korean body to show up on the server so Korean composition regressions get caught early.
- `mobile:maestro:smoke --mode attachment-send` taps the real attach button and the real photo/video menu entry, but uses a simulator harness file to supply the picked image so the send flow stays stable without depending on the iOS system picker UI.
- `mobile:maestro:smoke --mode document-send` and `--mode dm-document-send` do the same for the real document menu path, so non-image attachment regressions are covered too.
- `mobile:maestro:smoke --mode camera-send` does the same for the real `camera` menu path, so we cover the in-app camera branch without depending on the native camera UI inside the simulator.
- `mobile:maestro:smoke --mode dm-attachment-send` and `--mode dm-camera-send` apply the same strategy to the DM composer, so DM media regressions are covered with the same stable harnessed picker path.
- `mobile:maestro:smoke --mode both` relaunches the standalone app between the channel and DM flows so stale keyboard/focus state from the first flow does not hide the bottom tabs for the second flow.
- `mobile:maestro:smoke --mode attachment` seeds a real PNG attachment through the API first, then verifies that the mobile channel UI can open and dismiss the image lightbox through actual taps.
- `mobile:maestro:smoke --mode attachment-zoom` opens the real lightbox through actual taps, then uses the simulator harness to push zoom scale changes and verify that the viewer clamps back to `1x` on zoom-out and caps at `4x` on zoom-in. This is a zoom-behavior regression guard, not a literal two-finger gesture test.
- `mobile:maestro:smoke` also auto-detects a locally unpacked CLI at `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/tools/maestro/maestro/bin/maestro` or an explicit `MAESTRO_BIN`, which is useful on machines where the Homebrew formula is blocked by outdated Command Line Tools.
- `--launch` is still best-effort for Expo Go. It relaunches Expo Go or the standalone app, but Expo Go only consumes `dev-route.json` / `dev-compose.json` after the zkTalk experience is actually active.
- `--url <link>` on `mobile:harness:launch` and `--expo-url <link>` or `EXPO_GO_URL` on `mobile:harness:regression` can be used to open the zkTalk Expo experience automatically once you know the local `exp://...` URL.
- Without `--strict-consume`, the regression script returns `ok: true` plus `consumeVerified: false` and a `consumeWarning` instead of failing outright when those files remain pending.
- If fresh E2E setup is temporarily blocked by auth rate limiting, the regression script falls back to the last cached E2E payload when one is available.
- Mobile DM regression now reads the dedicated writable `harnessConversationId` from the shared E2E payload, so it stays independent from DM promotion/read-only coverage in the main API script.

Current local verification on this Mac:

- Booted simulator device: `iPhone 15 (3EEE64B4-1D7D-4D51-B715-7E63DEB3FDCE)`
- Expo Go harness dir resolved successfully
- Standalone zkTalk harness dir resolved successfully
- Fresh `channel` regression write succeeded, then cached `dm` regression write succeeded
- Standalone `--launch --mode channel` regression consumes harness files successfully (`consumeVerified: true`)
- Standalone `--launch --mode dm` regression consumes harness files successfully (`consumeVerified: true`)
- Standalone `--launch --mode both` regression now consumes both sequential actions successfully (`consumeVerified: true`)
- Standalone `mobile:smoke -- --app standalone` passed for `open home -> logout/login -> channel send -> dm list -> dm send -> edit profile -> create community`
- `npm run ui:smoke:mobile` passed
- `npm run ui:smoke:macos` passed
- Standalone `mobile:maestro:smoke -- --app standalone` passed for `home -> community tap -> channel tap -> composer tap/input/send -> server delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode ime` passed for `home -> community tap -> channel tap -> Korean text input/send -> exact server delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode attachment-send` passed for `attach button -> photo/video menu -> pending image preview -> send -> attachment delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode document-send` passed for `attach button -> document menu -> pending file preview -> send -> attachment delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode camera-send` passed for `attach button -> camera menu -> pending image preview -> send -> attachment delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode dm` passed for `DM tab -> conversation tap -> composer tap/input/send -> server delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode dm-attachment-send` passed for `DM attach button -> photo/video menu -> pending image preview -> send -> attachment delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode dm-document-send` passed for `DM attach button -> document menu -> pending file preview -> send -> attachment delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode dm-camera-send` passed for `DM attach button -> camera menu -> pending image preview -> send -> attachment delivery`
- Standalone `mobile:maestro:smoke -- --app standalone --mode attachment-zoom` passed for `lightbox open -> zoom to 2x -> clamp back to 1x -> clamp max to 4x -> close`
- Standalone `mobile:maestro:smoke -- --app standalone --mode both` passed for `channel send -> DM send` in one run
- Expo Go `--launch --mode channel` returns `consumeVerified: false` if Expo Go is opened without the active zkTalk experience URL
- Expo Go `--launch --mode both` returns `consumeVerified: false` if Expo Go is opened without the active zkTalk experience URL
- `launch-mobile-simulator-app.mjs --app standalone --url zktalk://` was verified locally, so the simulator `openurl` plumbing itself is working
- Standalone launcher verification now reports `launchStrategy: "openurl"` on this Mac, which confirms the smoke path is using the custom URL wake-up path instead of the flaky direct launch path
- Expo Go `--launch --mode both` succeeds with `consumeVerified: true` once the current Metro URL is supplied via `EXPO_GO_URL` or `--expo-url` (verified locally with `exp://192.168.55.14:8082`)

## Visibility and discovery

| Visibility | Discover | Direct Join | Invite Join |
| --- | --- | --- | --- |
| `public` | Visible | Allowed | Allowed |
| `invite_only` | Hidden | Blocked | Allowed |
| `private` | Hidden | Blocked | Allowed |

## Remaining release risks

- mac Developer ID signing / notarization not completed
- Windows code signing not completed
- Some simulator-only automation hooks were added for fast regression coverage and should be reviewed before release cleanup
- Non-blocking lint / warning cleanup remains

## Evidence

Representative screenshots:

- Desktop channel cross-message: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/tmp-desktop-cross-message-new-user.png`
- Desktop voice 2 participants: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/tmp-desktop-voice-two-participants-fixed2.png`
- Desktop report resolve: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/tmp-desktop-report-resolve-cross.png`
- Desktop member ban: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/tmp-desktop-member-ban-cross.png`
- Desktop visibility private: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/tmp-desktop-visibility-private.png`
- Mobile bidirectional channel: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/tmp-mobile-bidirectional-channel.png`
- Mobile DM receive: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/tmp-mobile-dm-received.png`
- Mobile event RSVP: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/tmp-mobile-event-rsvp-after-rebuild.png`
- Mobile attachment: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/tmp-mobile-attachment-single.png`
- Mobile voice cycle: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/tmp-mobile-voice-cycle-success.png`
- Mobile slug warning / preview: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/tmp-mobile-create-community-slug-warning.png`
