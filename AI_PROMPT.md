# AI Agent Prompt — zkTalk Current State

## Project

Repository:

- `/Users/hyunokoh/Documents/Projects/zkTalk`

zkTalk is a community messenger monorepo with:

- API: Fastify
- Web: Next.js
- Mobile: Expo React Native
- Desktop: Electron

## Read First

Before making assumptions, check these in order:

0. `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
1. `/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md`
2. `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md`
3. `/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md`
4. `/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md`
5. `/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md`

## Current reality

- Desktop core flows are heavily verified
- Mobile core flows are heavily verified
- Server multi-user messaging regression is verified
- Unsigned desktop handoff build is ready
- Signed production release is still blocked by signing credentials

## Current blockers

### Production signing

- mac Developer ID / notarization credentials are still not ready
- Windows code signing credentials are still not ready
- Fastest repo-level snapshot: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
- Fastest desktop-only snapshot: `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:next`

### Remaining confidence item

- Korean IME composition should still be confirmed on a real iPhone device
- Runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`
- The create-community slug UX issue is already addressed in mobile UI: typed Hangul stays visible, auto-slug guidance updates live, clearing the slug returns to auto mode, the sanitized saved-link preview is shown separately, and submit stays disabled until the final slug is valid

### Cleanup item

- Simulator-only mobile regression hooks should be reviewed before final release hardening

## What not to assume

- Do not assume the mobile app is still “partially working” in the old sense
- Do not assume channel creation, events, friends, bookmarks, inbox, polls, forum, or voice are still unverified; many of these were already exercised end-to-end
- Do not assume signed release is ready just because unsigned release artifacts exist

## Good next tasks

1. Finish mac signing / notarization setup
2. Finish Windows code signing setup
3. Verify Korean IME behavior on a real iPhone
4. Trim or isolate simulator-only mobile test hooks
5. Do final release hardening / warning cleanup

## Useful docs

- Root entry:
  - `/Users/hyunokoh/Documents/Projects/zkTalk/README.md`
- Docs index:
  - `/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md`
- Desktop release notes:
  - `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md`
