# zkTalk

zkTalk is a community messenger monorepo with:

- API: Fastify
- Web: Next.js
- Mobile: Expo React Native
- Desktop: Electron

## Start Here

- Service deployment / operator path:
  - [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)
  - [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
  - [docs/release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
  - [docs/final-operator-checklist-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
- Current status:
  - [docs/CURRENT_STATUS.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)
- Handoff summary:
  - [HANDOFF.md](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)
- Docs index:
  - [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)

## Release / Verification

- Blocker boundary:
  - Code-fixable runtime or regression work belongs in [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md), [docs/COMMERCIALIZATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md), and [docs/IMPLEMENTATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md).
  - Credential, signing, and real-device gates belong in [docs/current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md).
  - Do not treat missing signing secrets, missing device access, or a fresh `dist/` directory as new code regressions by themselves.

- Repo-level next steps:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
  - JSON: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next -- --json`
  - Snapshot file: [docs/current-release-next.json](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json)
  - Markdown snapshot: [docs/current-release-next.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md)
  - The JSON output includes runnable command fields
  - The command now creates `apps/desktop/dist/` on demand so a fresh workspace still produces a blocker snapshot
- Desktop signing snapshot:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:next`
  - JSON: `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:next -- --json`
  - Snapshot file: [apps/desktop/dist/release-next.json](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-next.json)
  - First-step command in a fresh workspace without `signing.env`: `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:init-signing`
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
