# High-Risk Touched Surfaces (2026-04-07)

Status: active release-readiness map  
Audience: engineering / release owner / zkCoder follow-up runs

This snapshot records the highest-risk in-flight surfaces currently touched in the dirty worktree so the next operator can stabilize the right paths without rediscovery.

## Scope

The current risk review is centered on:

- auth
- realtime
- uploads
- API env/runtime config
- web composer and file preview flows
- AI message actions and runtime-state copy

## 1. Auth

Primary touched files:

- [`apps/api/src/middleware/auth.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/middleware/auth.ts)
- [`apps/api/src/modules/auth/auth.service.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/auth/auth.service.ts)
- [`apps/api/src/lib/env.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/env.ts)
- [`apps/web/src/lib/api.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/api.ts)
- [`apps/web/src/lib/session-token.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/session-token.ts)
- [`apps/web/src/app/desktop-harness/page.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/desktop-harness/page.tsx)

Current intent:

- API signing and verification paths now share centralized secret accessors from `env.ts`.
- Production API startup should fail closed when `COOKIE_SECRET`, `MAGIC_LINK_SECRET`, or related secrets are missing or still using development placeholders.
- Web auth now prefers cookie auth for normal browser requests and only attaches bearer tokens automatically for desktop runtime or cross-origin desktop harness sessions.
- The desktop harness handoff page is an explicit exception path and now shows mode, destination, and message-preview context so operators can verify where the bearer-auth handoff is going before redirect.
- Session tokens now live in `sessionStorage`, with one-time migration from legacy `localStorage`.

Main regression risks:

- same-origin web or same-origin desktop harness requests accidentally sending stale bearer tokens and bypassing cookie/session expectations
- desktop runtime or desktop harness flows losing bearer-token auth after the session-storage migration
- API/web signing paths drifting because different modules stop using the same secret source

Repo-local verification:

- [`apps/api/src/lib/__tests__/env.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/__tests__/env.test.ts)
- [`apps/api/src/modules/auth/__tests__/auth.service.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/auth/__tests__/auth.service.test.ts)
- [`apps/web/src/lib/__tests__/api.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/__tests__/api.test.ts)
- [`apps/web/src/lib/__tests__/session-token.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/__tests__/session-token.test.ts)
- [`apps/web/src/app/desktop-harness/__tests__/page.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/desktop-harness/__tests__/page.test.tsx)

## 2. Realtime

Primary touched files:

- [`apps/api/src/modules/realtime/realtime.routes.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/realtime/realtime.routes.ts)
- [`apps/api/src/modules/realtime/realtime.service.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/realtime/realtime.service.ts)
- [`apps/api/src/lib/redis.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/redis.ts)
- [`apps/web/src/hooks/useWebSocket.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/hooks/useWebSocket.ts)
- [`apps/web/src/lib/runtime-config.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/runtime-config.ts)

Current intent:

- same-origin web sockets, including same-origin desktop harness sessions, should authenticate through cookies
- explicit desktop runtime or cross-origin desktop harness websocket connections may still use the query token fallback
- Redis connection targets and realtime failures are now routed through structured server logging instead of raw console noise
- production web runtime should not silently fall back to localhost websocket endpoints

Main regression risks:

- reconnect loops caused by missing production `NEXT_PUBLIC_WS_URL`
- web sockets attaching query tokens when cookie auth should be authoritative
- Redis pub/sub errors disappearing into logs without enough target context

Repo-local verification:

- [`apps/web/src/hooks/__tests__/useWebSocket.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/hooks/__tests__/useWebSocket.test.tsx)
- [`apps/web/src/lib/__tests__/runtime-config.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/__tests__/runtime-config.test.ts)
- [`apps/api/src/lib/__tests__/server-log.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/__tests__/server-log.test.ts)

## 3. Uploads

Primary touched files:

- [`apps/api/src/lib/s3.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/s3.ts)
- [`apps/api/src/lib/env.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/env.ts)
- [`apps/web/src/lib/upload-assets.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/upload-assets.ts)
- [`apps/web/src/components/MessageComposer/MessageComposer.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/MessageComposer/MessageComposer.tsx)
- [`apps/web/src/components/AttachmentPreview/AttachmentPreview.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/AttachmentPreview/AttachmentPreview.tsx)

Current intent:

- S3 runtime values now come from centralized env helpers, with production requirements enforced for bucket, region, and credentials
- browser upload PUT requests now rely on cookies and presigned URLs instead of blindly attaching bearer headers
- message composer maps common upload failures like `401`, `403`, `413`, and `429` into user-facing messages
- attachment preview/download fetches use `credentials: 'include'` and surface permission/unavailable errors through toasts

Main regression risks:

- presigned upload URLs failing when API and web origins are mismatched
- browser uploads breaking because auth is duplicated in headers when the storage URL expects only the presigned signature
- attachment open/save flows silently failing on auth or missing-file responses

Repo-local verification:

- [`apps/web/src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx)
- [`apps/web/src/app/api/public-assets/__tests__/route.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/api/public-assets/__tests__/route.test.ts)
- [`apps/api/src/lib/__tests__/env.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/__tests__/env.test.ts)

## 4. API Env And Runtime Config

Primary touched files:

- [`apps/api/src/lib/env.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/env.ts)
- [`apps/api/src/lib/cors.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/cors.ts)
- [`apps/api/src/lib/health.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/health.ts)
- [`apps/api/src/server.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/server.ts)
- [`apps/web/src/lib/runtime-config.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/runtime-config.ts)

Current intent:

- production builds should fail closed on missing runtime values instead of silently using localhost defaults
- loopback CORS allowance stays development-only unless explicitly configured in production
- `/api/health` should stay a process-only liveness signal, while `/api/health/ready` remains the deploy-level readiness boundary for database and Redis dependency checks

Main regression risks:

- production boot succeeding with development defaults
- deploy operators assuming `health` means `ready` and missing dependency failures
- broadening readiness to feature-specific services without a real probe contract and creating false confidence
- cross-origin cookie auth failing because `CORS_ORIGIN` no longer matches the real web origin

Repo-local verification:

- [`apps/api/src/lib/__tests__/cors.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/__tests__/cors.test.ts)
- [`apps/api/src/lib/__tests__/health.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/__tests__/health.test.ts)
- [`apps/web/src/lib/__tests__/runtime-config.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/__tests__/runtime-config.test.ts)

## 5. Web Composer And File Preview

Primary touched files:

- [`apps/web/src/components/MessageComposer/MessageComposer.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/MessageComposer/MessageComposer.tsx)
- [`apps/web/src/components/AttachmentPreview/AttachmentPreview.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/AttachmentPreview/AttachmentPreview.tsx)
- [`apps/web/src/lib/file-preview.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/file-preview.ts)
- [`apps/web/src/lib/client-log.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/client-log.ts)

Current intent:

- local file previews should prefer object URLs and fall back to `FileReader` only when needed
- preview fallback logging should stay dev-only and avoid noisy production console output
- composer audio and attachment upload errors should show translated, user-facing failure reasons instead of raw exceptions
- opening or saving downloaded attachments should toast on access-denied and unavailable states

Main regression risks:

- object URL failures leaving the composer without any preview path
- new upload/auth changes surfacing raw status strings again in the UI
- preview and save actions failing silently in the browser or desktop bridge

Repo-local verification:

- [`apps/web/src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/AttachmentPreview/__tests__/AttachmentPreview.test.tsx)
- [`apps/web/src/app/(app)/__tests__/layout.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/__tests__/layout.test.tsx)

## 6. AI Message Actions And Runtime State

Primary touched files:

- [`apps/api/src/modules/ai/ai.routes.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/ai/ai.routes.ts)
- [`apps/mobile/src/lib/ai.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/lib/ai.ts)
- [`apps/mobile/src/components/MessageActionSheet.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/components/MessageActionSheet.tsx)
- [`apps/mobile/src/components/MessageComposer.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/components/MessageComposer.tsx)
- [`apps/mobile/src/screens/ChannelScreen.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/screens/ChannelScreen.tsx)
- [`apps/mobile/src/screens/DmScreen.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/screens/DmScreen.tsx)
- [`apps/mobile/src/screens/SettingsScreen.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/screens/SettingsScreen.tsx)
- [`apps/mobile/src/screens/ThreadScreen.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/screens/ThreadScreen.tsx)
- [`apps/mobile/src/lib/i18n/locales/en.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/lib/i18n/locales/en.ts)
- [`apps/mobile/src/lib/i18n/locales/ko.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/lib/i18n/locales/ko.ts)
- [`apps/web/src/components/MessageComposer/MessageComposer.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/MessageComposer/MessageComposer.tsx)
- [`apps/web/src/app/desktop-harness/page.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/desktop-harness/page.tsx)
- [`apps/web/src/app/(app)/settings/layout.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/settings/layout.tsx)
- [`apps/web/src/app/(app)/settings/page.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/settings/page.tsx)
- [`apps/web/src/app/(app)/settings/ai/page.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/settings/ai/page.tsx)
- [`apps/desktop/go-menu.js`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/go-menu.js)
- [`apps/desktop/main.js`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/main.js)
- [`docs/IMPLEMENTATION_PLAN.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)

Current intent:

- mobile long-press message actions should expose explicit AI reply-draft and rewrite-draft paths from the same place users already expect reply and translate
- selected-message AI should write to a predictable target: reply draft goes into the composer as a reply path, rewrite replaces the active composer draft, and translation stays inline on the selected message
- mobile should surface whether the backend AI runtime is live, mock, or unavailable before the user triggers an AI action
- web and desktop selected-message AI follow-up work should stay aligned with the same output-target contract instead of inventing a different behavior per platform
- web, desktop, and mobile settings language affordances should stay aligned enough that Korean and English selection changes the visible core settings entry points instead of leaving mixed-language navigation chrome

Main regression risks:

- AI actions mutating the wrong composer state or silently dropping the drafted output
- local mock AI being mistaken for a real provider-backed response
- runtime-state copy drifting from the actual backend configuration contract
- desktop/web tests staying pinned to old AI or bearer-handoff behavior while the runtime contract changes underneath them

Repo-local verification:

- [`apps/api/src/modules/ai/__tests__/ai.service.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/ai/__tests__/ai.service.test.ts)
- [`apps/web/src/app/desktop-harness/__tests__/page.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/desktop-harness/__tests__/page.test.tsx)
- [`apps/web/src/lib/i18n/__tests__/locales.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/i18n/__tests__/locales.test.ts)
- [`.zkcoder/scripts/verify.sh`](/Users/hyunokoh/Documents/Projects/zkTalk/.zkcoder/scripts/verify.sh)

## 7. Translation Preferences And Local Machine Bridge Foundations

Primary touched files:

- [`packages/shared/src/types/index.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/packages/shared/src/types/index.ts)
- [`packages/shared/src/utils/translation-display.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/packages/shared/src/utils/translation-display.ts)
- [`packages/shared/src/validators/index.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/packages/shared/src/validators/index.ts)
- [`apps/api/src/modules/auth/auth.repository.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/auth/auth.repository.ts)
- [`apps/api/src/modules/auth/auth.service.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/auth/auth.service.ts)
- [`apps/api/src/lib/db/schema.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/db/schema.ts)
- [`apps/web/src/lib/user-settings.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/user-settings.ts)
- [`apps/mobile/src/lib/storage.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile/src/lib/storage.ts)
- [`docs/LOCAL_AGENT_AND_TRANSLATION_PLAN_2026-04-10.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/LOCAL_AGENT_AND_TRANSLATION_PLAN_2026-04-10.md)
- [`docs/IMPLEMENTATION_PLAN.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)

Current intent:

- user settings should persist a translation-display preference that is separate from the app UI locale
- the shared render-decision helper should distinguish manual mode, readable-language bypass, translation pending, translated, stale, mock-only, and unavailable states before UI wiring expands
- translation behavior should remain a per-user view-layer choice rather than mutating stored message bodies
- the local machine bridge plan should stay explicit about using the target machine's local Codex auth/session instead of inventing server-side identity reuse

Main regression risks:

- UI locale and message-render language drifting back into one setting and causing unreadable auto-translation behavior
- runtime copy implying live translation when only mock or unavailable paths exist
- follow-up local-machine bridge work assuming the server can act with the user's Codex identity

Repo-local verification:

- [`packages/shared/src/__tests__/translation-display.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/packages/shared/src/__tests__/translation-display.test.ts)
- [`packages/shared/src/__tests__/validators.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/packages/shared/src/__tests__/validators.test.ts)
- [`apps/api/src/modules/auth/__tests__/auth.service.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/auth/__tests__/auth.service.test.ts)
- [`apps/web/src/lib/__tests__/user-settings.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/__tests__/user-settings.test.ts)
- [`.zkcoder/scripts/verify.sh`](/Users/hyunokoh/Documents/Projects/zkTalk/.zkcoder/scripts/verify.sh)

## 8. Local Machine Bridge Trust Model

Primary touched files:

- [`apps/desktop/local-machine-bridge.js`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/local-machine-bridge.js)
- [`apps/desktop/main.js`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/main.js)
- [`apps/desktop/preload.js`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/preload.js)
- [`docs/local-machine-bridge-trust-model-2026-04-10.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md)
- [`docs/LOCAL_AGENT_AND_TRANSLATION_PLAN_2026-04-10.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/LOCAL_AGENT_AND_TRANSLATION_PLAN_2026-04-10.md)
- [`docs/IMPLEMENTATION_PLAN.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)

Current intent:

- keep the product explicit that only a target machine's local bridge may use that machine's Codex auth/session
- keep the zkTalk server limited to user auth, machine metadata, owner-only routing, and result persistence
- constrain the first machine command envelope so later bridge work does not accidentally imply unrestricted history, secret, or filesystem access
- force offline, busy, auth-missing, bridge-missing, and rejected states to stay user-visible instead of collapsing into a fake cloud fallback
- the first packaged desktop loopback should persist a named machine registration and heartbeat snapshot without pretending a cloud bridge exists

Main regression risks:

- follow-up bridge work reintroducing the false idea that the server can act with the user's Codex identity
- machine registration or presence being treated as permission escalation instead of owner-scoped metadata
- mobile/web copy implying local Codex execution even though the first execution path is desktop-only
- desktop loopback state silently drifting from the explicit `online`, `busy`, `auth_missing`, `bridge_missing`, and expired `offline` presence contract

Repo-local verification:

- [`apps/desktop/local-machine-bridge.test.js`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/local-machine-bridge.test.js)
- [`.zkcoder/scripts/verify.sh`](/Users/hyunokoh/Documents/Projects/zkTalk/.zkcoder/scripts/verify.sh)

## 9. Community Visibility And Restricted Channel Access

Primary touched files:

- [`apps/api/src/lib/db/schema.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/db/schema.ts)
- [`apps/api/src/modules/channel/channel-access.service.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/channel/channel-access.service.ts)
- [`apps/api/src/modules/channel/channel.service.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/channel/channel.service.ts)
- [`apps/api/src/modules/channel/channel.routes.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/channel/channel.routes.ts)
- [`apps/api/src/modules/community/community.service.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/community/community.service.ts)
- [`apps/web/src/app/(app)/communities/[slug]/page.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/communities/[slug]/page.tsx)
- [`apps/web/src/components/ChannelSidebar/ChannelSidebar.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/ChannelSidebar/ChannelSidebar.tsx)
- [`docs/community-visibility-matrix-2026-04-10.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-visibility-matrix-2026-04-10.md)
- [`docs/IMPLEMENTATION_PLAN.md`](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)

Current intent:

- public community discovery should stay separate from channel-level access policy so operators can expose curated entry channels without leaking restricted areas
- API, realtime, unread, restore, and search paths should all honor the same access policy instead of assuming visibility from one surface only
- locked-channel copy and post-join unlock behavior should stay consistent across web, mobile, and desktop

Main regression risks:

- non-members seeing protected channels through list, restore, search, unread, or realtime side paths
- policy drift between shared types, validation, persistence, and UI copy leading to implied rather than enforced access rules
- discoverability changes silently breaking join prompts or onboarding expectations

Repo-local verification:

- [`apps/api/src/modules/channel/__tests__/channel-access.service.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/channel/__tests__/channel-access.service.test.ts)
- [`apps/api/src/modules/channel/__tests__/channel.service.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/channel/__tests__/channel.service.test.ts)
- [`apps/api/src/modules/community/__tests__/community.service.test.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/community/__tests__/community.service.test.ts)
- [`apps/web/src/app/(app)/communities/[slug]/__tests__/page.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/communities/[slug]/__tests__/page.test.tsx)
- [`apps/web/src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx)
- [`e2e/tests/community-visibility.smoke.spec.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/tests/community-visibility.smoke.spec.ts)
- [`.zkcoder/scripts/verify.sh`](/Users/hyunokoh/Documents/Projects/zkTalk/.zkcoder/scripts/verify.sh)

## Current Blockers To Keep Explicit

- Production secrets and hosted dependencies are still external blockers. They cannot be cleared repo-locally in this run.
- Real-device IME validation is still outside the scope of these auth/upload/runtime changes.
- The worktree is intentionally dirty. Follow-up runs should preserve existing unrelated edits and avoid broad resets.
- Queue triage for remaining external blockers should route through `TASK_BRIEF.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/README.md`, `docs/CURRENT_STATUS.md`, `docs/current-blockers-2026-03-25.md`, and `docs/final-operator-checklist-2026-04-07.md` before creating another coding task.

## Validation Gaps To Keep Explicit

- Attachment upload has targeted regression coverage, but repo-local smoke still does not prove authenticated attachment open/save or hosted-media retrieval after upload.
- Voice join has targeted regression coverage plus a thin seeded smoke, but it still does not prove a full operator-visible LiveKit session.
- DM, inbox, profile, and discover remain outside the smallest release-readiness smoke and should stay documented as confidence gaps until a deterministic slice exists.
- Record new gaps in the `Current validation gap ledger` inside `docs/COMMERCIALIZATION_PLAN.md` instead of expanding `docs/current-blockers-2026-03-25.md`.

## Recommended Operator Checks Before A Cut

1. Run `.zkcoder/scripts/verify.sh`.
2. Treat default `changed` verify output as the primary signal first: it now selects only the mapped high-risk API/web tests for the touched files instead of always running the full targeted package batch.
3. Confirm `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `COOKIE_SECRET`, `MAGIC_LINK_SECRET`, `REDIS_URL`, and S3 values are real production values before claiming production readiness.
4. Manually spot-check login, websocket connect, attachment upload, attachment open/save, and message composer audio upload on the active environment.
