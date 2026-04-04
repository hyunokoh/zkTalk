# zkTalk

zkTalk is a community messenger monorepo with:

- API: Fastify
- Web: Next.js
- Mobile: Expo React Native
- Desktop: Electron

## Start Here

- Current status:
  - [docs/CURRENT_STATUS.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)
- Handoff summary:
  - [HANDOFF.md](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)
- Docs index:
  - [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)

## Release / Verification

- Repo-level next steps:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
  - JSON: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next -- --json`
  - Snapshot file: [docs/current-release-next.json](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json)
  - Markdown snapshot: [docs/current-release-next.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md)
  - The JSON output includes runnable command fields
- Desktop signing snapshot:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:next`
  - JSON: `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:next -- --json`
  - Snapshot file: [apps/desktop/dist/release-next.json](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-next.json)
  - Env override example: `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && ZKTALK_SIGNING_ENV_PATH=/absolute/path/to/signing.env npm run release:check:signed`
- Real-device Korean IME runbook:
  - [docs/mobile-korean-ime-checklist-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)
  - Report template: [docs/mobile-korean-ime-report-template-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-report-template-2026-03-26.md)
  - Init report: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ime:report:init`
- Test matrix:
  - [docs/test-matrix-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- Release readiness checklist:
  - [docs/release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
- Mobile Korean IME checklist:
  - [docs/mobile-korean-ime-checklist-2026-03-26.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)
- Current blockers:
  - [docs/current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)

## App-specific docs

- Desktop release notes:
  - [apps/desktop/RELEASE.md](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md)
- API reference:
  - [docs/api-reference.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/api-reference.md)
