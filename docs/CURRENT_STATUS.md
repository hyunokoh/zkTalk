# zkTalk Current Status

This is the stable entry point for the latest known project state.

## Current release decision

- Unsigned handoff build: ready
- Signed production release: not ready
- Live blocker snapshot refreshed on 2026-04-07: `npm run release:next` now bootstraps `apps/desktop/dist/` automatically and reports current missing operator inputs instead of failing on a missing directory

Latest desktop release check:

- generated at: `2026-04-07T14:31:16.481Z`
- mac unpacked app: `MISSING`
- latest DMG: `MISSING`
- Windows unpacked app: `MISSING`
- latest NSIS installer: `MISSING`
- signing summaries: mac `NOT_READY`, windows `NOT_READY`
- signing env: `exists=NO`, `loaded=NO`
- primary next-step command: `npm run release:init-signing`

Latest unsigned release run:

- `apps/desktop npm run release:unsigned`: passed
- dist verification: passed
- bundle verification: passed
- archive verification: passed

Latest signed preflight:

- `apps/desktop npm run release:check:signed`: still blocked until signing env and real credentials exist
- `apps/desktop npm run release:next`: prints the latest signing blockers and next actions
- `Developer ID identity`: `MISSING`
- Apple signing values: `MISSING` in the current workspace snapshot because no `signing.env` is loaded
- Windows signing values: `MISSING` in the current workspace snapshot because no `signing.env` is loaded
- signing blocker reports refresh from the latest release status and show `signing.env` exists/loaded state
- release summary/report/handoff/index/bundle now also refresh signing/readiness inputs instead of silently reusing older blocker data
- release report / handoff / index now separate document generation time from artifact manifest generation time
- repo-level `npm run release:next` also includes the mobile IME runbook in its operator-facing next-step output

## Main blockers

Blocker classification:

- External-only blockers:
  - mac signing / notarization credentials
  - Windows code-signing credentials
  - Real iPhone Korean IME confirmation
- Code/documentation follow-up:
  - keep web/API runtime hardening, targeted regression coverage, and runbook cleanup in the engineering queue
  - do not reclassify those follow-ups as release blockers unless they newly break unsigned handoff or documented verification
  - simulator harness policy is resolved and is not a current blocker

Queue discipline:

- use `docs/COMMERCIALIZATION_PLAN.md` and `docs/IMPLEMENTATION_PLAN.md` for repo-local next coding work
- use `docs/ai-agent-feedback-runbook.md`, `docs/ai-agent-feedback-template.md`, and `docs/ai-agent-feedback-summary-2026-04-08.md` when the active task is synthetic-user feedback for desktop/mobile/cross-device product feel
- use `docs/current-blockers-2026-03-25.md` and `docs/final-operator-checklist-2026-04-07.md` for credentials, certificates, device access, and operator-only next steps
- if `.zkcoder/scripts/verify.sh` passes, missing signing inputs or real-device IME access should stay classified as external blockers
- Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.
- a dirty worktree with preserved user changes is acceptable during this handoff phase

- mac signing / notarization credentials
  - Runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md`
  - Live blocker report: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/signing-blockers.md`
  - First unblock step in a fresh workspace: `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:init-signing`
  - Env override: `ZKTALK_SIGNING_ENV_PATH=/absolute/path/to/signing.env npm run release:check:signed`
- Windows code signing credentials
  - Live blocker JSON: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/signing-blockers.json`
  - Snapshot JSON: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-next.json`
- Real iPhone Korean IME confidence check
  - Runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`
  - Report template: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-report-template-2026-03-26.md`
  - Init command: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run ime:report:init`
  - This is the remaining mobile confidence runbook after simulator verification

## Read this next

- Service deployment default path:
  - [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)
  - [production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
  - [release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
  - [final-operator-checklist-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
- Final operator checklist:
  - [final-operator-checklist-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
  - Use section `3b. Operator-owned blocker ledger` there for the shortest owner/unblock/evidence split before reopening engineering work.
- Feature-specific operator gates:
  - Storage readiness stays outside baseline `/api/health/ready`; use section `3a` in [final-operator-checklist-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md) before reopening engineering work for hosted attachments
  - Voice/video readiness is now treated as zkMeet scope rather than zkTalk core smoke scope
- Operator smoke shortlist:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:smoke:inventory`
  - Use this before widening scope when the operator needs the current repo-local automation shortlist without reopening external-only blockers.
- Synthetic-user feedback path:
  - Runbook: [ai-agent-feedback-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-runbook.md)
  - Template: [ai-agent-feedback-template.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md)
  - Summary: [ai-agent-feedback-summary-2026-04-08.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-summary-2026-04-08.md)
  - First concrete desktop batch: [ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md)
  - First concrete mobile batch: [ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md)
  - First concrete cross-device batch: [ai-agent-feedback-batch-2026-04-08-fast-power-user-cross-device.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-fast-power-user-cross-device.md)
  - Use this path to turn persona-based desktop/mobile/cross-device walkthroughs into actionable engineering queue items without mixing in credential or device blockers.
- Repo-level next-step command:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
  - JSON: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next -- --json`
  - Snapshot file: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
  - JSON now includes runnable `commands`, `operatorHandoff.externalOnlyBlockers`, `operatorHandoff.manualOperatorGates`, and `operatorHandoff.triageSequence`
  - Operator short loop: `npm run release:next` -> `npm run operator:handoff:check` -> `npm run operator:smoke:inventory` -> `.zkcoder/scripts/verify.sh`
- Detailed blockers:
  - [current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)
- Release checklist:
  - [release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
- Full tested flows:
  - [test-matrix-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- Broader handoff:
  - [HANDOFF.md](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)

## Product confidence snapshot

- Desktop core flows: verified
- Mobile core flows: verified
- Web production build: passed
- Web test suite: passed
- Web product polish: connection status banner, shared toasts, shared confirm dialogs, offline queued messaging with optimistic rows and per-row retry/remove, shared loading/empty states, restored Discover destination, and polished friends/bookmarks/search/moderation reports flows are now in place.
- Web/desktop selected-message AI: channel and thread message action bars now route AI reply-draft and rewrite-draft requests from the selected message into the composer instead of limiting AI actions to composer-only text transforms; reply keeps the reply target, rewrite replaces the active draft, and message translation stays inline on the message row.
- Non-voice isolated web lanes: verified. `e2e/tests/dm-promotion.smoke.spec.ts` and `e2e/tests/moderation.smoke.spec.ts` now pass in the isolated Playwright lane, closing the last non-voice commercialization gaps after the API auth precedence fix that now prefers explicit bearer auth over stale cookies.
- Web/desktop selected-message AI accessibility: the channel/thread message action bar now opens on keyboard focus as well as pointer hover, so packaged desktop and web operators can reach reply-draft, rewrite-draft, and inline translation from a selected message without relying on mouse-only discovery.
- Selected-message AI result contract: mobile channel/DM/thread and web/desktop channel/thread now share one repo-local contract. `reply-draft` always writes a reply draft into the composer reply path, `rewrite-draft` always replaces the active composer text, and `translate-inline` always renders on the selected message row instead of mutating the composer.
- Selected-message AI behavior copy: the shared contract now also exposes an explicit effect map for each action, and mobile/web settings copy now spells out the same output targets so operators and testers can verify reply-draft, rewrite-draft, and inline translation semantics without inferring them from implementation details.
- Selected-message AI runtime consistency: the mobile channel selected-message reply-draft callback now re-reads the current AI runtime state before showing the applied result message, which closes the last channel-only stale-closure gap between mobile channel and the already-matched DM/thread behavior.
- Selected-message AI verification: `.zkcoder/scripts/verify.sh` now treats the shared selected-message AI contract, the web message action entry point, the composer application path, and the AI settings/runtime disclosure copy as first-class targeted regression surfaces, so changed-file verification picks them up without rediscovery.
- Translation display preference foundation: shared types, validation, and settings storage now treat app locale and message-render language as separate concerns. `manual_only`, `target_language_all`, and `target_language_except_readable` are now persisted via `/api/me/settings`, and the shared decision helper explicitly distinguishes readable-language bypass, pending translation, stale translation, mock-only runtime, and unavailable runtime states before UI wiring lands.
- Translation render cache invalidation: web and mobile now treat translated inline/render output as versioned per-message cache entries keyed by message id, source version (`updatedAt` or `createdAt`), and target language. When a message edit changes the source version, existing translated output stays visibly marked as stale until the client re-fetches or the operator re-runs inline translation, which prevents silent reuse of pre-edit translations.
- Mobile translation runtime disclosure: channel, DM, and thread translation actions now read `/api/translate` runtime metadata directly. Mock translations stay labeled as mock on the message bubble, and disabled/provider-failure cases now surface explicit unavailable copy instead of implying that inline translation ran successfully.
- Desktop local machine bridge preset anchor: the shared translation-display contract now also exports stable preset definitions for `english_only`, `korean_preferred_english_readable`, and `manual_only`, and desktop runtime config persists `localAgentLanguagePreset` so Electron, the AI settings page, and future local Codex bridge routing all read the same preset ids instead of re-inventing per-surface language behavior.
- Local machine bridge trust model: the repo now has a source-of-truth trust model in [local-machine-bridge-trust-model-2026-04-10.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md), locking the rule that only the target machine's local bridge may use local Codex auth while zkTalk only authenticates the owning user, routes machine-scoped envelopes, and returns explicit `offline`, `busy`, `auth_missing`, `bridge_missing`, and `rejected` states.
- Local machine bridge shared contract: `packages/shared` now defines repo-local machine identity, slug-style naming, presence, owner-only routing decisions, command envelopes, and command-update payloads for named machines such as `mac-studio`, `laptop`, and `buildbox`, so follow-up API/desktop loopback work can reuse one tested contract instead of re-inventing machine metadata per surface.
- Local machine bridge first desktop dispatch gate: the shared helpers and web runtime now block non-desktop command starts with an explicit `desktop_only` state, preserve owner/presence failure reasons such as `busy`, `offline`, `auth_missing`, and `bridge_missing`, and build the first inspectable command envelope for a single named target machine instead of leaving the desktop-only dispatch contract implicit.
- Local machine bridge result delivery contract: shared helpers now build and normalize explicit command updates for `accepted`, `streaming`, `completed`, `offline`, `busy`, `auth_missing`, `bridge_missing`, and `rejected` states, while the web layer maps those same states to inspectable copy keys and UI tones instead of collapsing worker failures into one generic error bucket.
- Local machine bridge execution plan: `packages/shared` now includes a repo-local execution planner that takes a machine-scoped command envelope plus the addressed machine's bridge/auth state and deterministically returns the first accepted/streaming/completed update sequence or an explicit `busy`, `auth_missing`, or `rejected` block. That makes the “target machine runs work with its own local Codex session” rule inspectable in code before API/Electron loopback wiring expands.
- Public community join path: the API now accepts either community UUIDs or slugs on `POST /api/communities/:communityId/join`, which closes the current web discover-to-join mismatch and restores the primary authenticated public-community entry path without requiring an extra lookup hop.
- Mobile selected-message AI entry verification: the mobile long-press `MessageActionSheet` now exposes stable QA hooks for the AI section, reply-draft, rewrite-draft, reply, and translate actions so repo-local smoke or harness follow-up can verify that AI remains in the same message-action flow users already expect.
- Mobile selected-message AI long-press smoke: channel, DM, and thread message rows now expose stable long-press touch targets, and the repo provides `apps/mobile/maestro/flows/channel-selected-message-ai-smoke.yaml`, `apps/mobile/maestro/flows/dm-selected-message-ai-smoke.yaml`, `apps/mobile/maestro/flows/thread-selected-message-ai-smoke.yaml` plus `scripts/mobile-maestro-smoke.mjs --mode selected-message-ai`, `--mode selected-message-ai-dm`, and `--mode selected-message-ai-thread` for inspectable repo-local rechecks on each surface without manual selector rediscovery.
- Mobile selected-message AI runtime contract: `apps/mobile/src/components/MessageActionSheet.tsx`, `apps/mobile/src/lib/ai.ts`, and the channel/DM/thread screens are now pinned by verification so the action sheet keeps showing live/mock/unavailable runtime state before invocation, preserves inline translation as a separate message action, and keeps mock-applied draft messaging explicit in both English and Korean copy.
- Mobile selected-message AI runtime disclosure: channel, DM, and thread action sheets now share the same repo-local verification gate for `live`, `mock`, and `unavailable` runtime disclosure before users trigger AI, and verification now fails if any one of those surfaces loses the selected-message reply-draft/rewrite-draft wiring or the inline-translation note.
- Mobile create-community slug UX for Korean input: verified with typed-value retention, live auto-slug feedback, IME-friendlier `onChangeText` handling for name/description, reset-to-auto behavior when the slug is cleared, inline guidance, saved-link preview, create-button disablement until name plus a valid final slug are present, matching accessibility hints/state for the slug field and submit button, and polite live-region updates for slug help/preview. QA hooks now exist for the name field, slug field, slug help, slug preview, and submit button, and simulator preview/create results expose `slugInput`, `slug`, `slugFeedback`, `isWarning`, and `canSubmit`.
- Moderation / permissions / visibility rules: verified
- Release packaging / unsigned handoff docs: verified
- Mobile screen-level simulator hooks: centralized behind a shared harness gate
- Mobile simulator harness: **release-ready** — gated by `Device.isDevice` (physical device = OFF), `__DEV__` scope (dev builds only), and explicit env var override (CI/release on simulator defaults OFF, requires `EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS=true`). File system operations are no-ops when the harness is disabled, and no data is transmitted externally.
- Remaining harness surface: shared helper plus app bootstrap/result files, with the main bootstrap/login/settings/home JSON paths, route marker cleanup, and simulator duplicate-prevention marker claims already funneled through shared helpers. The remaining raw mobile search hits are mostly non-harness paths such as backup validation and temporary attachment cleanup.
- Simulator harness release policy: confirmed safe. All dev harness code paths short-circuit on physical devices or non-dev builds. No sensitive data leaves the device. CI can opt-in via env var when needed.

## Recent web readiness work (2026-04-05)

Recent web-focused commits completed a product-polish and validation sweep:

- `d8d5682` `feat(web): polish realtime feedback and offline messaging`
- `e839b07` `feat(web): unify loading and empty states`
- `34886ae` `feat(web): restore discover as a real destination`
- `0bd24d9` `feat(web): polish friend search and empty states`
- `5ef1832` `feat(web): polish bookmark browsing states`
- `dd0c44b` `feat(web): polish community search states`
- `04584ab` `feat(web): polish moderation report states`
- `3fe822d` `fix(web): stabilize validation after UX polish`

Current takeaway:

- web build is green
- web test suite is green
- recent polish changes are validated for the next handoff / PR step
- remaining release blockers are signing credentials and the real-device mobile IME confidence pass, not current web runtime quality
- remaining Phase 7 policy work is now narrowed to follow-through around the locked-channel matrix after discovery; the repo policy is set to show `members_only` and `invite_only` channels as locked rows for non-members in public communities while keeping `private` channels hidden, and the basic public-community join path remains fixed and regression-tested
- Phase 7 visibility regression coverage now has deterministic proof points at three layers: community/channel service tests cover non-member browse rules plus direct members-only unlock after join, web tests cover discover entry actions plus locked-channel join unlock behavior, and `e2e/tests/community-visibility.smoke.spec.ts` exercises anonymous discover, direct public-channel access, locked-channel denial, private-community denial, and post-join unlock against the local stack
- Phase 7 operator policy source of truth now lives in `/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-visibility-matrix-2026-04-10.md`, including the final community/channel matrix, locked-row decision, and the rule that joining a public community unlocks `members_only` channels but does not bypass `invite_only` or `private` role gates
- Phase 7 verify mapping is now explicit in `.zkcoder/scripts/verify.sh`: changing the visibility matrix doc, channel/community API policy files, discover UI, locked-channel sidebar UI, or the dedicated smoke now automatically pulls the targeted community/channel service tests plus the discover and locked-channel web tests into the repo-local hardening batch instead of relying on manual test selection
- Phase 8 mobile AI hardening is now narrowed to one remaining confidence gap: repo-local verification proves that selected-message AI actions and runtime state disclosure stay wired on mobile DM/channel/thread surfaces, but a simulator or device smoke still needs to exercise the full long-press interaction end to end before this can be promoted from structural verification to operator-observed behavior
- a fresh or cleaned desktop `dist/` directory is now reported explicitly by `release:next`; operators no longer need to infer blocker state from a script crash
