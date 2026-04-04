# zkTalk Release Readiness Checklist (2026-03-25)

Status: pre-release checklist  
Audience: engineering / release owner

Use this checklist together with:

- `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
- [HANDOFF.md](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)
- [docs/test-matrix-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- [docs/mobile-korean-ime-checklist-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)
- [apps/desktop/RELEASE.md](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md)

## 1. Environment

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

## 6. Signing / Distribution Blockers

- [ ] mac `Developer ID Application` certificate installed
- [ ] `APPLE_ID` set
- [ ] `APPLE_APP_SPECIFIC_PASSWORD` set
- [ ] `APPLE_TEAM_ID` set
- [ ] Windows certificate file available
- [ ] `WIN_CSC_LINK` or `CSC_LINK` set
- [ ] `WIN_CSC_KEY_PASSWORD` or `CSC_KEY_PASSWORD` set

## 7. Remaining Risks

- [ ] Real iPhone device check for Korean IME composition
  Run: [docs/mobile-korean-ime-checklist-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)
- [ ] Review / trim simulator-only auto-test hooks
- [ ] Clean up remaining non-blocking lint / warning noise

## 8. Release Decision

- Ready for unsigned handoff: yes, based on current verification
- Ready for signed production release: no, pending signing credentials
