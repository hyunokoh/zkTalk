# Chat UX Alignment Inventory (2026-04-12)

## Scope for Queue Item 264

This inventory captures the highest-friction desktop/web/mobile divergences found during the PoC pass for Queue item 264.

## Current highest-friction divergences

1. Settings IA is not conceptually aligned.
   Web/desktop expose AI runtime, selected-message semantics, and automatic translation preferences in `/settings/ai`.
   Mobile now exposes the same translation-preference payload, but it still enters that surface through a selected-message-first AI card in Settings instead of the fuller web/desktop shell.

2. Translation preferences are only product-editable through fixed presets.
   Shared contracts and validators already support arbitrary `targetLanguage` and `readableLanguages`, but the web settings UI only offered preset buttons.
   That meant the product contract was more capable than the operator-facing configuration surface.

3. Chat action placement still intentionally differs by platform.
   Mobile AI remains selected-message-first through the message action sheet.
   Web/desktop still expose both selected-message AI and composer AI actions.
   This is a known product choice for the current build, not an accidental drift, but it needs explicit copy whenever surfaced in settings.

4. Message header/composer density differs more than action semantics.
   The largest current product risk is not visual density; it is users misconfiguring translation behavior or assuming presets are the only supported model.

## Smallest high-impact alignment chosen for this run

- Keep the current action-placement model intact.
- Align settings semantics first by making web/desktop/mobile translation settings all match the shared product contract.
- Preserve stable presets for desktop local-machine bridge guidance, while also exposing explicit custom ISO-style language-code editing for `targetLanguage` and `readableLanguages` on both web and mobile.
- Keep the current platform-specific entry model explicit: web/desktop still pair selected-message AI with composer actions, while mobile remains selected-message-first.
- Add explicit per-platform settings-availability copy in the web AI settings page so operators understand that mobile can edit translation preferences, but does not mirror every composer/rail affordance.

## Final product decisions for the current candidate

- Settings parity means parity of meaning, not identical chrome.
  Web/desktop keep the fuller `/settings/ai` shell because they also expose bridge/runtime context and composer-adjacent AI affordances.
  Mobile keeps the lighter settings entry but must edit the same translation payload and describe the same selected-message behavior.

- Selected-message AI behavior is fixed per action and should not drift by platform.
  `reply-draft` creates a reply draft in the composer reply path.
  `rewrite-draft` replaces the active composer text.
  `translation` stays inline on the selected message and does not mutate the composer.

- Automatic translation is a user reading preference, not a community or message mutation.
  `targetLanguage` and `readableLanguages` may be any supported language codes that pass the shared validators.
  Presets are onboarding shortcuts only; they are not the product limit.

- Mobile remains intentionally selected-message-first for AI.
  This build does not promise desktop-style composer AI controls on mobile.
  Web/desktop may expose richer rail/composer affordances as long as the shared action semantics and runtime disclosure remain the same.

## Deferred follow-ups

- Add mobile smoke or component coverage for the new AI settings surface so the selected-message-first entry and translation controls stay inspectable.
- Revisit whether web/desktop composer AI actions should be visually reduced or mobile should gain more parity.
- Align chat header secondary actions after local-machine bridge and translation preference work are fully stable.
