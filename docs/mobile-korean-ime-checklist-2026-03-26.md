# zkTalk Mobile Korean IME Real-Device Checklist (2026-03-26)

Status: real-device verification checklist  
Audience: mobile QA / release owner

Goal:

- Confirm that Korean IME composition on a real iPhone does not regress the already-verified create-community slug UX and other basic text-entry flows.

Preconditions:

- iPhone device available
- Latest zkTalk mobile build installed
- API reachable
- A test account can log in

## 1. Login Input

- [ ] Enter a Korean phone number or email using the real iPhone keyboard
- [ ] Confirm characters appear normally while composing
- [ ] Confirm no duplicated characters, dropped keystrokes, or broken cursor jumps

Expected:

- Text entry behaves normally during Korean composition

## 2. Create Community Name Field

Screen:

- `/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/screens/CreateCommunityScreen.tsx`

Steps:

- [ ] Open `Create Community`
- [ ] Type a Korean community name slowly
- [ ] Type a Korean community name quickly
- [ ] Use backspace during composition
- [ ] Move the cursor and continue editing

Expected:

- The typed Korean name remains visible
- No composition flicker or text loss
- Cursor position does not jump unexpectedly

## 3. Create Community Slug Field

Steps:

- [ ] Focus the slug field
- [ ] Type Hangul directly into the slug field
- [ ] Confirm the typed Hangul remains visible in the field
- [ ] Confirm inline guidance updates
- [ ] Confirm the saved-link preview updates separately
- [ ] Clear the slug field fully
- [ ] Confirm the screen returns to auto-slug mode

Expected:

- The field shows the raw typed value
- The app does not silently erase Hangul from the visible field
- Warning / guidance appears when needed
- Preview reflects the sanitized saved value, not the raw field value
- Clearing the slug restores auto generation from the name field

## 4. Create Button Behavior

Steps:

- [ ] Leave name empty and verify `Create` stays disabled
- [ ] Enter a Korean name that cannot generate a slug automatically and verify `Create` stays disabled until a valid slug exists
- [ ] Enter a valid manual slug and verify `Create` becomes enabled immediately

Expected:

- Button state changes immediately and consistently
- No delayed enable/disable after Korean composition commits

## 5. Basic Channel / DM Composer Sanity

Steps:

- [ ] Open a channel composer
- [ ] Type Korean text
- [ ] Send a message
- [ ] Open a DM composer
- [ ] Type Korean text
- [ ] Send a message

Expected:

- Korean composition works normally in regular message composers too
- No duplicated send, missing text, or broken composition state

## 6. Accessibility Sanity

Steps:

- [ ] If VoiceOver is available, focus the slug field
- [ ] Confirm the help hint is announced
- [ ] Focus the disabled `Create` button
- [ ] Confirm the disabled reason is understandable

Expected:

- Slug field and submit button expose meaningful accessibility hints

## 7. Sign-Off

- [ ] PASS: no real-device Korean IME issues found
- [ ] FAIL: issue reproduced and captured with device model / iOS version / exact steps

Record with:

- Device model
- iOS version
- Build identifier
- Repro steps
- Screenshot or screen recording if failed

Report template:

- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-report-template-2026-03-26.md`
- Initialize a dated report file:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ime:report:init`
