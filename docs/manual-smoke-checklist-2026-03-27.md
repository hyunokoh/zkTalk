# zkTalk Manual Smoke Checklist (2026-03-27)

Status: ready for local hands-on QA

Use this with:

- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:status`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:open`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:refresh`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:brief`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:report`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run manual:smoke:capture`
- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run local:commercial:seed`

## Runtime targets

- Web login: `http://localhost:3000/login`
- Web home: `http://localhost:3000/home`
- API health: `http://localhost:4000/api/health`
- Desktop app: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/mac-arm64/zkTalk.app`
- Mobile app: booted `iPhone 15` simulator standalone build

## Cached QA data

Read the latest local QA dataset with:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:status
```

That command also writes `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-status-last-result.json`.

If the local stack is up but the signed-in account has no community/channel data yet, seed a chat-ready QA workspace with:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run local:commercial:seed
```

Launch the main QA surfaces with:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:open
```

That command now relaunches the mobile standalone app with stale simulator harness files cleaned first, so old `NOT_FOUND` or login test popups do not reappear by default. If a dev desktop shell is already running, it reuses that visible desktop app instead of trying to foreground a competing packaged app window.
The full open payload is also written to `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-open-last-result.json`.

Open the cached channel and DM targets too:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:open -- --with-targets
```

Open desktop app and immediately jump into the cached desktop channel and DM targets:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:open -- --with-desktop-targets
```

Refresh the whole QA workspace in one command:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:refresh -- --with-targets --with-desktop-targets
```

That command reopens the current QA surfaces, refreshes the desktop/mobile screenshots, rewrites the brief and report, updates the report history index, and prints the latest status JSON in one shot.
The full refresh payload is also written to `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-refresh-last-result.json`.

Generate a one-page QA brief:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:brief
```

Generate the latest Markdown QA report:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:report
```

Capture the current desktop/mobile QA surfaces:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk
npm run manual:smoke:capture
```

That command prints the current cached:

- `desktopMode`
- `desktopPackagedPid`
- `desktopDevPid`
- `desktopRecommendedOpenCommand`
- `desktopLatestCapture`
- `communitySlug`
- `channelId`
- `harnessConversationId`
- `webCommunity`
- `webChannel`
- `webDm`
- `desktopChannelDeepLink`
- `desktopDmDeepLink`
- `desktopOpenChannelCommand`
- `desktopOpenDmCommand`
- `mobileStandaloneBothCommand`
- `mobileExpoBothCommand`
- `mobileStandaloneOpenCommand`
- `mobileLatestCapture`
- test user emails

The brief is written to:

- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-brief-last-result.json`
- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-brief-latest.md`

The report is written to:

- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-report-last-result.json`
- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-report-latest.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-report-latest.json`

The open / refresh helpers write:

- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-status-last-result.json`
- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-open-last-result.json`
- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-refresh-last-result.json`

The recent report index is written to:

- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-history.md`

## Hands-on checks

### 1. Login and identity

- [ ] Web login screen opens without a server error
- [ ] Desktop app opens and reaches login or the last signed-in session
- [ ] Mobile standalone app opens and reaches login or the last signed-in session
- [ ] Logging in as a different user on mobile no longer lands on a forbidden screen

### 2. Profiles and public assets

- [ ] Upload a profile photo on mobile or web
- [ ] Confirm the avatar appears on web home, desktop rail, DM header, and mobile profile
- [ ] Upload a community icon
- [ ] Confirm the icon appears on web home, sidebar, and community settings preview

### 3. Messaging parity

- [ ] Send a channel message from desktop and confirm it appears on mobile
- [ ] Send a DM from mobile and confirm it appears on desktop
- [ ] Send an image in a channel and confirm the recipient sees a preview without clicking, and that it still appears after leaving and re-entering the room
- [ ] Send a file in a DM and confirm the recipient can open or download it on both desktop and mobile
- [ ] Check that grouped bubbles, author/avatar rhythm, and composer sizing feel consistent across desktop and mobile
- [ ] Check that reaction entry via `+` and `...` feels consistent on both platforms

### 4. Read state

- [ ] Use 3 users if possible and confirm message-level unread counts look reasonable
- [ ] Confirm your own sent messages do not show yourself inside unread counts
- [ ] Confirm opening the latest message on mobile clears read state on the server

### 5. DM -> community promotion

- [ ] Promote a group DM to a private community
- [ ] Confirm the original DM becomes read-only
- [ ] Confirm the promoted channel shows the source DM history entry point
- [ ] Confirm the DM list routes to the promoted channel by default

### 6. Voice and video

- [ ] In mobile community view, confirm the runtime hint matches reality for the current build
- [ ] Join a voice room from web or desktop
- [ ] Join the same room from mobile if the build supports it
- [ ] Confirm participant count and recent-room highlighting update correctly

## Known limits

- Harness regressions can temporarily hit API rate limits if run too frequently in a short window.
- Voice/video support still depends on runtime environment and native module availability.
- Final UI polish still needs human taste judgment even when automated checks are green.
