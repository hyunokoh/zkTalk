# Implementation Plan

## Goal

Turn zkTalk from a feature-rich prototype with strong local validation into an operator-ready commercial product by:

- preserving the user's active worktree
- finishing the remaining web/API commercialization hardening
- reducing runtime and release surprises
- increasing targeted verification around high-risk surfaces
- making AI assistance usable in the message flows that real users actually reach on mobile, desktop, and web
- introducing a production-sensible access model where public communities can expose only selected channels while restricted channels remain protected
- turning translation into a first-class per-user display preference rather than a per-message manual action only
- enabling a desktop-first local-agent bridge so a user can route work from one zkTalk machine to their other zkTalk-connected machines using their own local Codex installation
- converging desktop/web and mobile UX so core chat and settings surfaces feel intentionally aligned across platforms
- generalizing translation preferences so product settings can express arbitrary target and readable languages instead of only a few preset examples
- turning the desktop-first local-agent bridge from a shared-contract foundation into a real repo-local handshake, dispatch, execution, and result-return path
- leaving zkCoder with a long, concrete, queue-driven roadmap instead of generic themes

## Release Baseline

Use the following release-status documents as the baseline for all plan decisions:

- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md`

Baseline status as of 2026-04-07:

- unsigned desktop handoff: ready
- signed production desktop release: blocked by macOS and Windows signing credentials
- mobile final confidence: blocked by real-device Korean IME confirmation
- web/API commercialization work: materially improved but not yet fully hardened

## Global Constraints

- preserve the current dirty worktree and do not revert unrelated local edits
- prefer narrow, high-signal changes over broad rewrites
- keep docs and operator runbooks aligned with actual runtime behavior
- treat missing credentials, missing device access, and missing third-party accounts as external blockers, not code failures
- keep queue items small enough that zkCoder can execute and verify one at a time
- every queue item should reference a concrete product surface and an expected verification path

## Phase 0

### Objective

Keep zkCoder safe and productive inside the real zkTalk monorepo while it works against a dirty repository.

### Tasks

- preserve the current dirty worktree and avoid reverting unrelated local edits
- keep `.zkcoder/plan-queue.json`, `TASK_BRIEF.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/ZKCODER_RUNBOOK.md` synchronized
- ensure the next queue items target real zkTalk product work rather than scaffolding tasks
- make zkCoder outputs easy to inspect under `.zkcoder/runs/`
- keep the repo-local verification path lightweight enough that zkCoder can run repeatedly
- keep commercialization docs authoritative for runtime hardening work

### Exit Criteria

- zkCoder can run from the zkTalk repo and produce artifacts under `.zkcoder/runs/`
- queue items are product-specific and reference actual high-risk repo surfaces
- no user-authored local changes were lost

## Phase 1

### Objective

Finish runtime and auth hardening for the current web/API commercialization branch.

### Tasks

- remove remaining unsafe production fallbacks in API startup and feature wiring
- reduce remaining bearer-token fallback paths on web to explicit desktop runtime or desktop harness cases only
- tighten logout/session restore behavior across web, websocket, unread, and cached data flows
- ensure same-origin web traffic is cookie-first across API, uploads, and realtime
- keep cross-origin desktop harness behavior functional while isolating it from normal web runtime assumptions
- verify public asset proxy behavior does not silently mask runtime misconfiguration
- ensure AI provider integration no longer depends on localhost or shell-dotfile assumptions
- tighten production CORS boundaries so loopback access is explicit rather than automatic
- improve API/server logs so operator-visible logs avoid leaking credentials or noisy implementation detail

### Exit Criteria

- web/API runtime assumptions are explicit, production-safe, and documented
- normal web sessions are cookie-first with narrower bearer fallback scope
- auth loss, reconnect, and cache cleanup behavior is coherent across affected surfaces
- operator-visible API logs are more actionable and less noisy

## Phase 2

### Objective

Increase operator confidence by adding readiness signal, better runtime docs, and clearer failure boundaries.

### Tasks

- split API liveness and readiness and keep readiness tied to real dependencies
- expand readiness or supporting docs to cover object storage and other runtime dependencies where practical
- make production runtime docs describe required env, public origins, and dependency expectations precisely
- keep `.env.example` and `.env.production.example` aligned with actual runtime code
- reduce remaining mismatches between docs that describe old runtime fallbacks and the current codebase
- keep blocker docs focused on true external blockers rather than already-completed engineering work
- turn hidden runtime assumptions into explicit operator notes or fail-closed behavior
- improve server-side logging format and health output so deploy owners can diagnose startup state quickly

### Exit Criteria

- readiness, runtime docs, and env examples describe the same system
- operators can tell the difference between process-up and dependency-ready states
- the runtime runbook matches the current codebase rather than stale assumptions

## Phase 3

### Objective

Raise confidence in the highest-risk product journeys through deterministic verification and focused test coverage.

### Tasks

- add or update targeted tests for API env/runtime helpers, CORS behavior, health/readiness helpers, AI provider config, and logging helpers
- expand targeted web tests for runtime config, API behavior, websocket auth behavior, and public asset proxy behavior
- identify the thinnest credible smoke coverage for login, logout, session restore, community open, send message, attachment, and voice join
- keep deterministic local stack assumptions documented for postgres, Redis, MinIO/S3, and LiveKit
- standardize which checks should run for small hardening batches versus broader release-readiness batches
- reduce false-positive noise so failing checks point to the real touched surface
- keep commercialization notes updated when new validation gaps are discovered

### Exit Criteria

- high-risk hardening helpers and routes have targeted regression coverage
- smoke coverage expectations are clearer and more deterministic
- the next AI or human can see which critical paths remain lightly verified

## Phase 4

### Objective

Remove remaining prototype-feeling edges in web/API surfaces that directly affect product credibility.

### Tasks

- continue replacing raw or technical error messages with product-facing copy across settings, uploads, attachments, and realtime failures
- remove dead-end settings states or ambiguous success/failure feedback
- reduce stale UI flashes after auth loss, reconnect, or data reset
- ensure upload/download/preview failure handling stays consistent across channel and DM surfaces
- narrow console/debug output on user-facing surfaces to dev-only paths
- align runtime failure behavior between API responses and web toast/error handling
- identify any remaining same-origin web code paths that still duplicate auth tokens unnecessarily
- keep locale strings and user-facing messaging synchronized when behavior changes

### Exit Criteria

- major web/API hardening surfaces feel commercial rather than prototype-like
- user-facing failures are understandable without exposing internals
- auth/session edge cases leave less stale UI behind

## Phase 5

### Objective

Prepare a strong operator handoff for the remaining non-code blockers.

### Tasks

- keep release blocker docs current for mac signing, Windows signing, and real-device IME validation
- separate code-fixable blockers from credential/device blockers in all runbooks
- ensure release notes, handoff docs, and blocker summaries point to the current source-of-truth files
- tighten the final operator checklist for what engineering has already done versus what still depends on external inputs
- keep desktop release documentation aligned with the actual repo scripts and artifact outputs
- make sure zkCoder does not spend cycles turning external credential gaps into fake coding missions

### Exit Criteria

- remaining blockers are sharply bounded to credentials, device access, or explicit operator follow-up
- release owner documentation is current enough that another agent can continue without rediscovery
- zkCoder queue items after this phase remain engineering-relevant rather than repetitive documentation churn

## Detailed Queue Seeds

These should be interpreted as the preferred concrete work order for zkCoder when the queue is regenerated.

### Phase 1 queue seeds

- audit and remove any remaining production fallback that silently substitutes localhost or dev credentials in API code
- isolate remaining web bearer-token fallback logic so same-origin browser traffic never sends unnecessary auth duplication
- review `apps/web/src/app/desktop-harness/page.tsx` and related desktop-specific auth paths to ensure desktop exceptions stay explicit
- re-check websocket auth and reconnect behavior after token changes, logout, and auth loss
- tighten public asset proxy behavior and error signaling for production misconfiguration
- review AI runtime provider selection so external calls only use explicit runtime configuration
- reduce remaining API runtime assumptions that could hide misconfiguration in production

### Phase 2 queue seeds

- expand readiness checks or operator docs for storage and voice dependencies
- align `.env.production.example` with all production-required API and web settings
- review commercialization docs for stale mentions of removed fallbacks or already-completed hardening
- make readiness and runtime docs the default operator entry point for service deployment, not just desktop release docs
- improve health/readiness output or documentation so failure modes are actionable during deploys

### Phase 3 queue seeds

- add targeted tests for server logging, CORS, env helper, health helper, AI config helper, and public asset proxy behavior
- define which web/API commands should be run for minimal regression confidence once package tooling is available
- identify small-but-high-value smoke tasks that can be automated without turning brittle
- keep `.zkcoder/scripts/verify.sh` aligned with the current highest-value checks

### Phase 4 queue seeds

- review remaining upload, attachment, backup, and settings surfaces for raw errors or unclear UX
- review stale cache/sidebar/unread behavior after auth transitions
- keep dev-only logging isolated from production user flows
- remove or narrow any remaining same-origin auth duplication in fetch and websocket paths

### Phase 5 queue seeds

- sync final blocker docs and handoff docs to current repo state
- clarify external-only blockers versus code blockers in the release narrative
- ensure release-readiness docs still match actual scripts and artifacts

### Phase 6 queue seeds

- define shared translation preference enums and payloads so locale choice and message-render translation are not conflated
- add user settings storage for auto-translation display preferences and readable-language exceptions
- implement a translation decision helper that answers whether a given message should render original, translated, or original-preferred for a user
- wire the helper into channel, DM, and thread message rendering on web, desktop, and mobile
- preserve explicit manual translation actions and make them coexist cleanly with auto-rendered translation
- define UI copy for translation state such as translated, original, unavailable, stale, and runtime-disabled
- add targeted tests for preference combinations like english-only, korean-preferred-but-english-readable, and fully manual mode
- document translation runtime assumptions, caching, and invalidation behavior
- write a source-of-truth architecture doc for the local Codex bridge, including trust boundaries and machine registration
- source-of-truth trust model now lives in [local-machine-bridge-trust-model-2026-04-10.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md); follow-up queue items should reuse its ownership, presence, envelope, and failure-state rules instead of reopening the boundary
- add shared types for machine identity, bridge presence, machine command envelope, and streamed result events
- implement the minimal desktop bridge handshake and heartbeat path
- add user-facing machine naming and registration surfaces in settings
- define how zkTalk routes a user-issued machine command to a selected machine conversation or control channel
- implement the first command-execution loop using the target machine's local Codex CLI instead of any server-side Codex identity
- add delivery of stdout/status/final summary back into zkTalk as structured messages
- handle offline machine, busy machine, and missing-auth cases with explicit product-facing states
- add deterministic local smoke coverage for register machine, send command, receive result, and host/worker disconnect cases
- document why this path works for local Codex users while a server-side zkTalk app cannot directly reuse each user's Codex cloud session

### Phase 7 queue seeds

- define a concrete visibility matrix for `public`, `invite_only`, and `private` communities plus channel-level visibility inside each
- extend shared types and API schemas so channels can express distinct visibility instead of inheriting only the community rule
- update persistence and queries so public communities can expose only selected public channels while restricted channels remain protected
- ensure anonymous and non-member users can discover public communities without leaking private channel content, unread state, or restore state
- decide and implement whether restricted channels are hidden entirely or shown as locked rows with clear join/invite affordances
- align desktop, web, and mobile channel lists so open channels, locked channels, and join-required flows behave consistently
- protect search, restore-last-visited, realtime subscriptions, and pinned/unread surfaces from leaking restricted channel data
- update onboarding, invite, and member-management flows so joining a public community unlocks the intended members-only channels
- add deterministic tests for anonymous discovery, public-channel access, locked-channel denial, private-community denial, and post-join unlock behavior
- add local smoke coverage for the product journeys that matter most: discover public community, open a public channel, hit a locked channel, join, and retry
- document the final community/channel visibility policy so future zkCoder runs can build on it without reopening the policy decision

### Phase 8 queue seeds

- add mobile AI actions to `apps/mobile/src/components/MessageActionSheet.tsx` and wire them through channel, DM, and thread message surfaces
- define a shared selected-message AI contract so reply suggestion, rewrite, and translation know which source message they act on and where the result is shown

### Phase 9

#### Objective

Make translation behave like a real communication preference, not a manual afterthought, by allowing each user to choose how incoming messages are auto-rendered.

#### Tasks

- define a per-user translation-display preference model that separates app locale from message-render locale
- support preferences such as "show everything in English", "show Korean normally and translate non-English into Korean", and "show original when already readable"
- add server-side or shared helper logic that decides whether a message should render as original text, translated text, or original-plus-available-translation metadata
- preserve manual per-message translation as an explicit user action even when auto-translation is enabled
- ensure auto-translation state is obvious enough that users can tell whether they are reading original text or translated text
- decide where translation results are cached and how message edits invalidate or refresh translated render output
- ensure channel, DM, thread, desktop, web, and mobile surfaces follow the same rendering contract
- document provider/runtime behavior so auto-translation is not exposed as if it were guaranteed when the runtime is mock, unavailable, or user-disconnected
- add targeted verification for preference resolution, readable-language exceptions, and render fallback behavior

#### Exit Criteria

- users can choose message-display translation behavior independently from the app UI locale
- automatic translation works predictably across web, desktop, and mobile without removing manual translation
- mock, unavailable, and stale-translation states are explicit rather than misleading

### Phase 10

#### Objective

Enable a desktop-first local-agent mesh where a user can address named personal machines through zkTalk and have each machine run work locally using the user's own Codex installation.

#### Tasks

- define the trust model for a local zkTalk agent bridge that runs on a user's machine and uses that same machine's local Codex auth/session
- keep this model desktop-first and local-first rather than pretending a server can reuse the user's ChatGPT/Codex session
- define machine identity, naming, registration, heartbeat, and presence so one user can distinguish machines like `mac-studio`, `laptop`, and `buildbox`
- add a command surface in zkTalk so the user can send an instruction specifically to a chosen machine or a default machine group
- define message routing, result streaming, and completion/error delivery from worker machine back to the host machine conversation
- decide how much zkTalk context is forwarded to the local agent bridge and how file/channel permissions are constrained
- document the local companion process boundary, local port/authentication model, and failure behavior when the bridge is absent
- ensure non-desktop clients degrade cleanly by showing machine status and results without pretending they can execute local Codex work themselves
- add initial health-check and loopback verification for bridge registration, machine addressing, command dispatch, and result return
- keep the architecture compatible with future BYOK or provider-key paths without depending on them for the local-agent mesh

#### Exit Criteria

- a user can name machines, target a machine from zkTalk, and receive the result back through zkTalk
- execution uses the user's own local Codex session on the target machine rather than a shared server-side Codex identity
- failure modes for disconnected machines, missing bridge, and auth absence are explicit and testable

### Phase 9 queue seeds

- define shared translation preference enums and payloads so locale choice and message-render translation are not conflated
- add user settings storage for auto-translation display preferences and readable-language exceptions
- implement a translation decision helper that answers whether a given message should render original, translated, or original-preferred for a user
- wire the helper into channel, DM, and thread message rendering on web, desktop, and mobile
- preserve explicit manual translation actions and make them coexist cleanly with auto-rendered translation
- define UI copy for translation state such as translated, original, unavailable, stale, and runtime-disabled
- add targeted tests for preference combinations like english-only, korean-preferred-but-english-readable, and fully manual mode
- document translation runtime assumptions, caching, and invalidation behavior

### Phase 10 queue seeds

- write a source-of-truth architecture doc for the local Codex bridge, including trust boundaries and machine registration
- add shared types for machine identity, bridge presence, machine command envelope, and streamed result events
- implement the minimal desktop bridge handshake and heartbeat path
- add user-facing machine naming and registration surfaces in settings
- define how zkTalk routes a user-issued machine command to a selected machine conversation or control channel
- implement the first command-execution loop using the target machine's local Codex CLI instead of any server-side Codex identity
- add delivery of stdout/status/final summary back into zkTalk as structured messages
- handle offline machine, busy machine, and missing-auth cases with explicit product-facing states
- add deterministic local smoke coverage for register machine, send command, receive result, and host/worker disconnect cases

### Phase 9/10 progress notes

- 2026-04-12: the repo now has an explicit UX-parity decision record in `docs/chat-ux-alignment-inventory-2026-04-12.md` that fixes the current candidate semantics: mobile stays selected-message-first for AI, web/desktop may keep richer composer-adjacent affordances, and translation settings parity is defined as shared-payload parity rather than identical chrome.
  Next action: keep future mobile/web/desktop AI or translation-surface changes tied to that document unless product intentionally reopens the parity decision.
- 2026-04-12: the first desktop bridge loopback now has operator-facing run steps in `docs/local-machine-bridge-loopback-2026-04-12.md`, with the register -> heartbeat -> explicit state-check flow and a concrete split between repo-fixable bridge regressions and external machine/Codex setup blockers.
  Next action: only expand from loopback proof to cross-device routing or richer UI surfaces once that operator path remains stable under repo-local verification.
- document why this path works for local Codex users while a server-side zkTalk app cannot directly reuse each user's Codex cloud session

## Non-Goals

- do not rewrite the product architecture
- do not add unrelated net-new product areas such as billing during this hardening push
- do not block engineering progress on missing signing credentials
- do not invent parallel operational tooling when the repo already has a usable script or doc
- do not overwrite user work to create a superficially clean git state

## Suggested Build Order

1. finish remaining Phase 1 auth/runtime hardening
2. tighten Phase 2 readiness and runtime documentation
3. expand Phase 3 deterministic verification around the hardened surfaces
4. continue Phase 4 UX polish on error, session, and upload edges
5. keep Phase 5 blocker handoff docs current so external blockers stay sharply bounded
6. use Phase 6 to ship automatic-translation preferences and the first desktop-first local machine agent bridge
7. use Phase 7 to ship public-community discovery with channel-level access control that still protects restricted channels
8. use Phase 8 to turn repeated AI-UX friction into concrete mobile/web/desktop product work

## Phase 6

### Objective

Ship two user-visible AI-powered communication foundations:

- automatic translation as a per-user display preference
- a desktop-first local machine agent bridge that routes work to the user's named personal machines using local Codex

### Tasks

- define a per-user translation-display preference model that separates UI locale from message-render language
- support predictable presets such as `english_only`, `korean_preferred_english_readable`, and `manual_only`
- preserve manual per-message translation while adding automatic translated rendering where the user preference calls for it
- decide where translated render output is cached, invalidated, and marked stale after edits
- keep mock, unavailable, and runtime-disabled translation states explicit rather than pretending translation is always live
- 2026-04-10: the shared translation-display contract now exists in repo code and `/api/me/settings`. User settings can persist `manual_only`, `target_language_all`, and `target_language_except_readable` independently from `uiLocale`, and the shared render-decision helper now classifies original-readable, translation-pending, translation-ready, translation-stale, mock-only, and unavailable states for follow-up UI wiring.
- 2026-04-10: translated render output is now cached only in repo-local client memory as versioned entries keyed by message id, target language, and source version (`updatedAt` or `createdAt`). Web auto-translation re-fetches when an edited message makes the cached render stale, and mobile inline translation keeps stale output explicitly labeled instead of silently showing pre-edit text as if it were current.
- 2026-04-10: `/api/translate` now returns explicit runtime metadata for `available`, `mock`, `disabled`, and `unavailable` states. Web message translation UI uses that metadata to label mock output as mock and to surface disabled/unavailable runtime notices instead of implying provider-backed translation is always live.
- 2026-04-10: mobile channel, DM, and thread inline translation now consume the same `/api/translate` runtime metadata contract as web. Mock-backed output stays labeled as mock on the message row, while `disabled` and `unavailable` runtimes now stop at explicit operator-facing notices instead of silently pretending translation succeeded.
- 2026-04-10: the desktop-first local bridge now has a repo-local preset anchor for `english_only`, `korean_preferred_english_readable`, and `manual_only`. Shared utilities export one source of truth for preset semantics, `apps/desktop/desktop.config.json` persists `localAgentLanguagePreset`, and the web AI settings surface shows the same preset ids and bridge instructions that Electron exposes to the renderer.
- define the trust model for a local zkTalk machine bridge that uses the local machine's own Codex auth rather than any server-side Codex identity
- add machine identity, naming, presence, and routing concepts so users can address machines like `mac-studio`, `laptop`, or `buildbox`
- define the first desktop-only command dispatch flow from one zkTalk client to another named machine
- add result delivery states for accepted, streaming, completed, offline, busy, and auth-missing
- document the bridge boundary, local auth assumptions, and non-desktop degradation rules before claiming wider support

### Exit Criteria

- users can choose how incoming messages are translated by default without removing manual translate actions
- auto-translation behavior is explicit, cross-platform consistent, and not misleading when runtime support is absent
- the repo contains a concrete local-machine bridge model that routes commands through the target machine's local Codex session
- failure states for machine offline, machine busy, and missing local Codex auth are explicit and testable

## Phase 7

### Objective

Ship a commercial-ready visibility model where communities can be publicly discoverable while channel access remains explicitly controlled per channel.

### Tasks

- define the product policy for public communities with a mix of open, members-only, invite-only, and private channels
- encode that policy in shared types, validation, API payloads, and persistence so it is enforced rather than implied
- allow public communities to expose curated onboarding channels without forcing every channel fully public
- prevent invalid combinations such as private communities accidentally exposing public channels unless the policy explicitly permits it
- update community listing and channel listing APIs so non-members only see the communities and channels they are allowed to discover
- make locked channels either hidden or visibly locked by design, and keep that behavior consistent across web, mobile, and desktop
- add join or invite prompts when a user can discover a community but cannot yet enter a protected channel
- ensure unread counts, pinned messages, search results, realtime subscription setup, and last-visited restore do not leak restricted channel data
- align community home, channel sidebar/list, and onboarding copy across web, mobile, and desktop around the new visibility model
- add deterministic tests and smoke coverage for anonymous discovery, public-channel access, locked-channel denial, private-community denial, and post-membership unlock behavior
- document the final visibility matrix and operator assumptions so future changes do not re-open the policy from scratch

Current Phase 7 policy anchor:

- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-visibility-matrix-2026-04-10.md` is the source of truth for the final public/invite-only/private community matrix, locked-channel behavior, and operator assumptions. Future Phase 7 changes should update that file, the API reference, and deterministic tests in the same batch.

### Exit Criteria

- public communities can expose only the intended channels without leaking restricted ones
- non-members cannot fetch or restore protected channel content through API, realtime, or cached state
- mobile, desktop, and web communicate channel lock/open states consistently
- targeted automated coverage exists for the highest-risk visibility and access transitions

## Phase 8

### Objective

Turn AI from a partially wired demo surface into a credible product path that works from selected messages and message actions on mobile, desktop, and web.

### Tasks

- add message-selection AI actions to mobile message action sheets for channel, DM, and thread surfaces
- support message-selection AI flows on web and desktop instead of limiting AI actions to composer-only text transforms
- make AI reply suggestion, translation, and rewrite actions accept a selected source message and produce a predictable output target
- define whether each AI action should create a reply draft, replace composer text, or show inline translated content, and keep that behavior consistent across platforms
- surface AI runtime state clearly when the backend is in mock, disabled, or misconfigured mode so users do not mistake placeholder output for real AI
- keep mobile and web settings/runtime copy aligned with the actual AI capabilities available on each platform
- add targeted verification for selected-message AI paths so zkCoder can iterate without rediscovering the UX contract
- keep the scope focused on commercialization-readiness AI polish, not unrelated AI feature expansion

### Current POC Note

- 2026-04-08: mobile message action sheets now expose selected-message AI reply-draft and rewrite-draft actions on channel, DM, and thread surfaces, and they surface backend runtime state as live, mock, or unavailable before the user triggers AI.
- 2026-04-08: web/desktop channel and thread message action bars now expose selected-message AI reply-draft and rewrite-draft actions, and the composer applies them to explicit targets only: reply draft keeps the inline reply path, rewrite draft replaces the active composer text, and inline translation remains on the message surface.
- 2026-04-09: web selected-message AI now consumes the same shared contract as mobile from `packages/shared/src/utils/ai-selected-message.ts`, so reply-draft, rewrite-draft, and unavailable-state handling no longer diverge by platform wording or target behavior.
- 2026-04-09: web/desktop selected-message AI now has route-level regression coverage for the highest-risk surfaces: channel page wiring and thread panel wiring both verify that reply-draft stays on the reply target while rewrite-draft clears reply state and reuses the selected-message contract path into the composer.
- 2026-04-10: the shared selected-message AI contract now exports an explicit effect map for each action, and mobile message sheets plus web AI settings both describe the same semantics directly: reply-draft creates a composer reply draft, rewrite-draft replaces the current composer text, and translation stays inline on the selected message.
- 2026-04-10: targeted verification now also locks the selected-message AI action bar itself plus the AI settings/runtime disclosure page into `.zkcoder/scripts/verify.sh`, so reply/rewrite entry wiring and mock-versus-real runtime copy do not fall out of the changed-surface batch.
- 2026-04-10: mobile channel/DM/thread message rows now expose stable long-press QA targets, and the repo includes channel, DM, and thread selected-message AI Maestro flows plus `scripts/mobile-maestro-smoke.mjs --mode selected-message-ai`, `--mode selected-message-ai-dm`, and `--mode selected-message-ai-thread` so each surface can be rechecked without rediscovering selectors or depending on manual route setup.

### Exit Criteria

- mobile exposes AI actions from the same long-press message flow where users already expect reply and translate actions
- web and desktop can run AI against a selected message rather than only against hand-typed composer text
- users can tell whether AI is real, mock, or unavailable without guessing
- the repo has focused regression coverage for the selected-message AI path on the highest-risk touched surfaces

## Phase 12

### Objective

Finish the product-facing last mile for the desktop-first local Codex bridge and language selection so desktop/web/mobile settings feel intentional instead of partially wired.

### Tasks

- make the desktop local-machine bridge auto-register and heartbeat for the authenticated owner by default instead of requiring manual operator steps first
- make desktop bridge status and recent command state discoverable from the shared settings surface with product-facing copy instead of implementation-only clues
- remove the most visible hard-coded English settings copy on web/desktop so Korean and English selection actually changes core settings menus
- align settings language selection semantics across mobile, web, and desktop so the same Korean/English choice is discoverable in the same conceptual place
- add deterministic verification for desktop bridge auto-connect and bilingual settings surfaces so follow-up runs do not reopen the same product gaps

### Exit Criteria

- an authenticated desktop user with local Codex auth sees the local machine bridge come online without manual register/heartbeat setup
- settings on mobile, web, and desktop expose a clear Korean/English choice and the core settings menus honor that selection instead of leaving major sections hard-coded in English

## Phase 13

### Objective

Finish the remaining mobile-first polish and parity work so mobile is no longer the obvious lagging client across core non-voice chat, settings, translation, and selected-message AI flows.

### Tasks

- inventory the remaining mobile-only friction points against desktop/web and convert them into a short deterministic queue rather than open-ended polish
- remove the most visible settings, navigation, and chat-surface divergences that still make mobile feel like a separate product
- tighten mobile stability around login, restore, core navigation, and seeded verification lanes so repo-local confidence does not depend on manual retries
- make mobile translation and selected-message AI settings feel as product-facing as desktop/web instead of foundation-first
- add deterministic repo-local verification for the highest-risk remaining mobile surfaces so future runs stop reopening the same parity gaps

### Exit Criteria

- mobile non-voice chat and settings surfaces feel intentionally aligned with desktop/web for the main user journeys instead of visibly trailing them
- mobile parity/stability work has deterministic repo-local verification on the highest-risk remaining surfaces

### Phase 13 deterministic queue seed

- use [mobile-parity-queue-2026-04-13.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-parity-queue-2026-04-13.md) as the current source of truth before reopening mobile polish discussion
- queue item 277 should focus on the most visible entry-point and chat-surface drift across `SettingsScreen`, `LanguageSettingsScreen`, `ChannelScreen`, `DmScreen`, and `ThreadScreen`
- queue item 278 should stay limited to repo-local stability work around login, restore, navigation, and seeded verification lanes, with real-device IME checks kept in blocker docs
- queue item 279 should improve product-facing mobile translation and selected-message AI framing without changing the shared action/output contract
- queue item 280 should add or tighten deterministic verification on the exact mobile and shared helper surfaces touched by 277-279
