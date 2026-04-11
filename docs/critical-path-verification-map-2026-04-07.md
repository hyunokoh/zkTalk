# Critical Path Verification Map (2026-04-07)

Status: active verification coverage snapshot  
Audience: engineering / release owner / zkCoder follow-up runs

Use this file to see, in one place, which release-critical product journeys are strongly covered, thinly covered, or still lightly verified.

Primary sources behind this map:

- [e2e/core-smoke-contract.json](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/core-smoke-contract.json)
- [docs/COMMERCIALIZATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md)
- [docs/high-risk-touched-surfaces-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/high-risk-touched-surfaces-2026-04-07.md)
- [docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)

Coverage strength labels:

- `strong`: deterministic repo-local smoke or targeted coverage exists and is already part of the current hardening/release-readiness path
- `partial`: targeted regression coverage exists, but the full user-visible journey is not yet proven by the smallest deterministic smoke
- `thin`: only a narrow seeded or structural check exists; treat operator validation as still required
- `gap`: not part of the smallest release-readiness smoke and still depends on broader suites or manual spot checks

## Current critical-path map

| Journey | Current strongest repo-local signal | Strength | Main surfaces | Remaining boundary |
| --- | --- | --- | --- | --- |
| Login / logout / session restore | `pnpm e2e:smoke:web:core`, auth and session helper tests | `strong` | `apps/api/src/modules/auth/*`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/session-token.ts` | Keep same-origin cookie-first behavior stable while desktop-only bearer fallback stays explicit. |
| Community open | `pnpm e2e:smoke:web:core` | `strong` | `apps/web/src/app/(app)/layout.tsx`, community routes, runtime config | Depends on the documented local stack and seeded data contract. |
| Channel send message | `pnpm e2e:smoke:web:core` | `strong` | composer, realtime, API message flow | Continue to keep websocket/auth regressions on the targeted path. |
| Channel attachment send | `pnpm e2e:smoke:web:core` plus targeted attachment/public-asset tests | `partial` | `apps/web/src/components/AttachmentPreview/AttachmentPreview.tsx`, `apps/web/src/app/api/public-assets/[...assetPath]/route.ts`, S3 helpers | The smallest smoke proves send only; it does not yet prove authenticated attachment open/save or hosted-media retrieval after upload. |
| Voice join | `pnpm e2e:smoke:web:core` plus targeted `VoiceRoom` tests | `thin` | `apps/web/src/components/VoiceRoom/VoiceRoom.tsx`, LiveKit config/runtime wiring | Current smoke is only a thin seeded join check, not a full operator-visible media session. |
| DM | broader suites and targeted component/service checks only | `gap` | DM conversation surfaces and related API routes | Still outside the smallest release-readiness smoke. Promote only after a deterministic slice exists. |
| Inbox | broader suites and manual spot checks | `gap` | inbox/open flows | Still outside the smallest release-readiness smoke. |
| Profile | targeted local edits and manual spot checks | `gap` | profile/settings surfaces | Still outside the smallest release-readiness smoke. |
| Discover / join outside seeded community-open flow | broader suites and manual spot checks | `gap` | discover, join, community acquisition flows | Still outside the smallest release-readiness smoke. |

## What the next operator should assume

- The current smallest deterministic browser gate is still [e2e/core-smoke-contract.json](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/core-smoke-contract.json).
- `npm run verify:selected-message-ai` is now the smallest targeted regression gate for selected-message AI UX contract work across shared contract logic and web DM/thread/channel surfaces.
- Lightly verified critical paths today are channel attachment open/save and hosted-media retrieval, full voice/media validation, DM, inbox, profile, and discover.
- New verification gaps should be recorded in the `Current validation gap ledger` in [docs/COMMERCIALIZATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md), not added to the external blocker doc unless they truly require credentials, devices, or third-party access.
- Before widening release claims, compare this map against the current hardening batch and update the map in the same change if the verification boundary moved.
