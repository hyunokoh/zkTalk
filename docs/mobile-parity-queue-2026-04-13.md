# Mobile Parity Queue (2026-04-13)

## Scope for Queue Item 276

This document turns the remaining mobile-only friction against desktop and web into a short deterministic queue so follow-up runs do not reopen the same discovery work.

## Evidence used for this inventory

- `apps/mobile/src/screens/SettingsScreen.tsx`
- `apps/mobile/src/screens/LanguageSettingsScreen.tsx`
- `apps/mobile/src/screens/ChannelScreen.tsx`
- `apps/mobile/src/screens/DmScreen.tsx`
- `apps/mobile/src/screens/ThreadScreen.tsx`
- `apps/web/src/app/(app)/settings/page.tsx`
- `apps/web/src/app/(app)/settings/ai/page.tsx`
- `packages/shared/src/utils/settings-navigation.ts`
- `packages/shared/src/utils/ai-selected-message.ts`
- `docs/chat-ux-alignment-inventory-2026-04-12.md`

## Remaining mobile-only friction points

1. Settings entry and settings depth still feel split across multiple mobile surfaces.
   Mobile now has the right conceptual sections, but language, AI translation, and machine-control discovery still depends on remembering different entry screens.

2. Core chat parity risk is now about consistency and verification, not missing semantics.
   Channel, DM, and thread all expose selected-message AI, but future runs can still regress one surface at a time unless the verification lanes stay explicit.

3. Translation and selected-message AI feel foundation-complete but not fully operator-locked.
   The product contract is clear, yet the repo did not previously leave a deterministic next queue that says which visible gaps should be removed first.

4. Mobile stability follow-up still needs to stay separated from external blockers.
   Real-device Korean IME confidence remains an external/manual gate, while login, restore, navigation, and seeded-smoke drift are still code/verification work.

## Friction-to-queue matrix

| Friction cluster | Evidence anchor | Owning queue item | Release-ready exit signal |
| --- | --- | --- | --- |
| Settings discovery still feels split between the main settings screen and deeper mobile-only routes. | `apps/mobile/src/screens/SettingsScreen.tsx`, `apps/mobile/src/screens/LanguageSettingsScreen.tsx`, `packages/shared/src/utils/settings-navigation.ts` | `277` | Shared settings entrypoint tests and mobile settings surfaces agree on where language, AI, and machine control are discovered. |
| Header/composer/chat affordances can still drift by surface even when selected-message AI semantics already match. | `apps/mobile/src/screens/ChannelScreen.tsx`, `apps/mobile/src/screens/DmScreen.tsx`, `apps/mobile/src/screens/ThreadScreen.tsx`, `packages/shared/src/utils/chat-surface-actions.ts` | `277` | Channel, DM, and thread preserve the same high-traffic action order and no single surface regresses into a one-off mobile variant. |
| Login, restore, and navigation confidence still depends too much on repeated repo-local retries. | `apps/mobile/src/navigation/SettingsStack.tsx`, `apps/mobile/src/navigation/types.ts`, simulator or seeded helpers under `apps/mobile/src/lib/` | `278` | A narrow repo-local smoke or harness lane can be rerun without manual selector rediscovery or retry rituals. |
| Translation preferences and selected-message AI outcomes are structurally present but not yet fully product-facing. | `apps/mobile/src/screens/AiSettingsScreen.tsx`, `apps/mobile/src/lib/i18n/locales/en.ts`, `apps/mobile/src/lib/i18n/locales/ko.ts`, `packages/shared/src/utils/translation-display.ts` | `279` | Mobile copy makes runtime state, translation preference meaning, and reply/rewrite/translate outcomes explicit without implying unsupported execution paths. |
| Follow-up runs can still reopen already-known parity gaps unless the proof lane is named up front. | `.zkcoder/scripts/verify.sh`, `packages/shared/src/__tests__/settings-navigation.test.ts`, `packages/shared/src/__tests__/chat-surface-actions.test.ts`, `packages/shared/src/__tests__/ai-selected-message.test.ts` | `280` | The touched mobile parity surfaces map to a stable targeted test or verify lane before any broader release claim is made. |

## Deterministic next queue

Execution order for follow-up runs:

1. `277` for the highest-visibility product drift.
2. `279` for product-facing mobile translation and selected-message AI framing.
3. `278` for stability and restore/navigation confidence.
4. `280` for the verification sweep that locks in 277-279.

Queue discipline for follow-up runs:

- Treat each friction cluster in the matrix above as owned by exactly one next queue item.
- If a new observation does not change the owning surface or exit signal, keep it inside the existing item instead of minting another polish task.
- Reclassify only when the issue crosses the code/operator boundary; do not move IME or signing work back into the engineering queue.

### 277. Remove the most visible mobile divergence in settings, navigation, and chat surfaces

- Normalize the highest-traffic entry surfaces first: `SettingsScreen`, `LanguageSettingsScreen`, and the message header/composer affordances in `ChannelScreen`, `DmScreen`, and `ThreadScreen`.
- Preserve the current product choice that mobile AI is selected-message-first.
- Do not reopen desktop/web composer AI scope while doing this pass.
- Concrete repo surface:
  - `apps/mobile/src/screens/SettingsScreen.tsx`
  - `apps/mobile/src/screens/LanguageSettingsScreen.tsx`
  - `apps/mobile/src/screens/ChannelScreen.tsx`
  - `apps/mobile/src/screens/DmScreen.tsx`
  - `apps/mobile/src/screens/ThreadScreen.tsx`
- Verification lane:
  - `pnpm --filter @zktalk/shared test -- --run src/__tests__/settings-navigation.test.ts src/__tests__/chat-surface-actions.test.ts`
  - `.zkcoder/scripts/verify.sh`

### 278. Tighten mobile stability around login, restore, core navigation, and seeded verification lanes

- Lock down the repo-local paths that can be verified without physical-device access.
- Keep real-device Korean IME and signing work explicitly out of this task.
- Treat repeated simulator/manual retry needs as a code or harness bug, not an operator ritual.
- Concrete repo surface:
  - `apps/mobile/src/screens/SettingsScreen.tsx`
  - `apps/mobile/src/navigation/SettingsStack.tsx`
  - `apps/mobile/src/navigation/types.ts`
  - simulator or seeded smoke helpers under `apps/mobile/src/lib/`
- Verification lane:
  - `.zkcoder/scripts/verify.sh`
  - `pnpm mobile:verify:session-restore`
  - use `pnpm mobile:harness:regression --mode dm --strict-consume` only when the session/bootstrap lane passes and DM-specific routing still needs confirmation

### 279. Make mobile translation and selected-message AI settings feel product-facing

- Keep the shared contract intact, then improve the mobile wording and surface framing around translation preferences, runtime state, and selected-message AI outcomes.
- Stay explicit that reply drafts a reply, rewrite replaces composer text, and translation stays inline on the selected message.
- Keep mock versus live runtime disclosure visible and truthful.
- Concrete repo surface:
  - `apps/mobile/src/screens/AiSettingsScreen.tsx`
  - `apps/mobile/src/lib/i18n/locales/en.ts`
  - `apps/mobile/src/lib/i18n/locales/ko.ts`
  - `packages/shared/src/utils/translation-display.ts`
- Verification lane:
  - `pnpm --filter @zktalk/shared test -- --run src/__tests__/translation-display.test.ts src/__tests__/ai-selected-message.test.ts`
  - `.zkcoder/scripts/verify.sh`

### 280. Add deterministic repo-local verification for the remaining highest-risk mobile surfaces

- Keep `ChannelScreen`, `DmScreen`, `ThreadScreen`, `SettingsScreen`, and shared settings/AI helpers covered by targeted tests or verify checks.
- Favor stable inspectable hooks and shared helper tests over broad brittle end-to-end expansion.
- Require follow-up queue items to cite the exact verification lane they depend on.
- Deterministic repo-local lane added in this pass:
  - `pnpm run test:mobile-risk-contracts`
  - covers the mobile settings IA routes, focused settings entrypoints, selected-message AI action-sheet grouping, and the simulator auto-login marker interpreter without requiring devices or credentials
- Concrete repo surface:
  - `.zkcoder/scripts/verify.sh`
  - `scripts/mobile-risk-contract.test.mjs`
  - `scripts/mobile-harness-regression.test.mjs`
  - `packages/shared/src/__tests__/settings-navigation.test.ts`
  - `packages/shared/src/__tests__/chat-surface-actions.test.ts`
  - `packages/shared/src/__tests__/ai-selected-message.test.ts`
- Verification lane:
  - `pnpm run test:mobile-risk-contracts`
  - `.zkcoder/scripts/verify.sh`

## Blocker split for follow-up runs

- External/manual blockers:
  - real iPhone Korean IME confirmation
  - signing/notarization credentials
- Repo-local engineering blockers:
  - mobile settings discoverability drift
  - mobile navigation and restore regressions
  - parity copy drift between translation settings and selected-message AI behavior
  - missing or stale targeted verification on mobile parity surfaces

## Explicit deferrals

- Do not treat desktop/web composer AI affordances as part of queue item `277`.
- Do not move physical-device IME validation into queue items `278` or `280`.
- Do not reopen local-machine bridge scope while the active task is mobile parity unless the touched mobile settings copy becomes incorrect.

## Definition of done for the Phase 13 follow-up queue

- Mobile no longer feels like a separate product in the main non-voice settings and message flows.
- Shared settings and selected-message AI semantics stay identical even when mobile chrome remains lighter than desktop/web.
- Future runs can pick item 277, 278, 279, or 280 directly without re-inventorying the parity gap.
