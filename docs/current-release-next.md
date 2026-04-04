# zkTalk Current Release Next

Generated at: 2026-04-03T13:12:54.991Z

## Desktop Readiness

- macOS: NOT_READY
- Windows: NOT_READY
- Signing env exists: YES
- Signing env loaded: YES

## Primary Command

- `npm run release:check:signed`

## Commands

- `npm run release:next`
- `npm run release:next -- --json`
- `cd apps/desktop && npm run release:next`
- `cd apps/desktop && npm run release:next -- --json`

## Blocking Items

- macOS: Developer ID identity = MISSING
- macOS: APPLE_ID = EXAMPLE
- macOS: APPLE_APP_SPECIFIC_PASSWORD = EXAMPLE
- macOS: APPLE_TEAM_ID = EXAMPLE
- Windows: WIN_CSC_LINK / CSC_LINK = EXAMPLE
- Windows: WIN_CSC_KEY_PASSWORD / CSC_KEY_PASSWORD = EXAMPLE

## Next Steps

- Install a valid Developer ID Application certificate in Keychain.
- Set real APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID values.
- Set real Windows signing certificate and password values.

## Runbooks

- Desktop signing runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md`
- Mobile Korean IME checklist: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`

## Snapshot Files

- Repo JSON snapshot: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
- Desktop JSON snapshot: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-next.json`
