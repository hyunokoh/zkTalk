# AI-Agent Feedback Summary (2026-04-08)

Status: active summary with first concrete desktop evidence pass, completed mobile evidence pass, and completed cross-device evidence pass

Use this file to consolidate repeated findings from [ai-agent-feedback-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-runbook.md) executions.

## Current batch status

- Persona coverage: `Cautious Organizer` desktop-first pass completed; `Casual Member` mobile-first pass completed; `Fast Power User` cross-device pass completed
- Desktop scenario coverage: `desktop-core-comm` completed via desktop harness evidence
- Mobile scenario coverage: `mobile-core-comm` completed via simulator smoke, Maestro touch flows, and mobile readiness docs
- Cross-device coverage: `cross-device-continuity` completed via desktop/mobile harness contracts, websocket continuity tests, unread auth-reset tests, and API regression notes
- Last updated by: queue item 106 cross-device execution

## Concrete batch entries

- [Cautious Organizer desktop-first batch (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md)
- [Casual Member mobile-first batch (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md)
- [Fast Power User cross-device continuity batch (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-fast-power-user-cross-device.md)

## Repeated findings ledger

Add only findings that repeated across personas, devices, or multiple runs.

| Theme | Personas affected | Scenario ids | Risk level | Current status | Next action |
| --- | --- | --- | --- | --- | --- |
| Evidence fragmentation is itself reducing operator confidence more than any newly proven runtime defect | `Casual Member`, `Fast Power User` | `mobile-core-comm`, `cross-device-continuity` | `pilot-risk` | mobile and continuity confidence both depended on stitching together several repo-local artifacts before the persona batches consolidated them | keep persona batches and summary links current, and queue one thin unified continuity smoke/inventory step instead of reopening stable code paths without a new failure |

## Single-run findings worth tracking

These findings appeared in the first concrete batch but have not repeated yet.

| Finding | Persona | Scenario id | Risk level | Evidence | Next action |
| --- | --- | --- | --- | --- | --- |
| Desktop handoff trust drops when the page hides destination and message context during send/redirect | `Cautious Organizer` | `desktop-core-comm` | `pilot-risk` | [desktop batch entry](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md) | keep the new destination/message-preview UI covered by the desktop-harness test and re-check this theme in the next persona batch |
| Mobile short-session confidence is stronger than it looks, but the proof was fragmented across smoke, matrix, and status docs before the persona batch tied it together | `Casual Member` | `mobile-core-comm` | `pilot-risk` | [mobile batch entry](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md) | keep the mobile batch linked from status/index docs and avoid reopening already-covered mobile-core risk during queue regeneration |
| Cross-device continuity contracts are stronger than they look, but the proof was split across harness helpers, websocket tests, unread tests, and API regression notes before this batch assembled them | `Fast Power User` | `cross-device-continuity` | `pilot-risk` | [cross-device batch entry](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-fast-power-user-cross-device.md) | keep the cross-device batch linked from status/index docs and queue only a thin unified smoke follow-up rather than speculative runtime rewrites |

## Initial commercialization watchlist

These are the areas the first feedback batches should bias toward because they map to current release-readiness priorities.

| Focus area | Why it matters now | Suggested repo surfaces |
| --- | --- | --- |
| Auth/session continuity | credibility drops quickly if resume/logout/reconnect feels stale | `apps/web/src/lib/session-token.ts`, `apps/web/src/hooks/useWebSocket.ts`, `apps/api/src/middleware/auth.ts` |
| Attachment confidence | send/preview/save failures are highly visible in pilots | `apps/web/src/components/AttachmentPreview`, `apps/web/src/lib/upload-assets.ts`, `apps/api/src/lib/s3.ts` |
| Realtime and voice trust | presence/join failures feel unfinished fast | `apps/web/src/components/VoiceRoom`, `apps/api/src/modules/realtime`, `apps/api/src/modules/voice` |
| Settings and operator clarity | pilot admins need confidence in permissions and recovery | `apps/web/src/app/(app)/settings`, `apps/web/src/app/(app)/communities/[slug]/settings`, related docs |

## External-only blocker reminders

Do not convert these into product-feedback code tasks unless a repo-local defect is proven:

- mac signing / notarization credentials
- Windows signing credentials
- real iPhone Korean IME confirmation

## Next batch definition

The next meaningful update to this summary should include:

- one cross-device edge-recovery pass
- confirmation whether evidence consolidation remains the main repeated commercialization issue after that edge run
