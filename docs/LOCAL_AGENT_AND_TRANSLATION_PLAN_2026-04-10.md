# Local Agent And Translation Plan

## Purpose

This document locks two new product directions before zkCoder regenerates queue items:

- default-capable automatic translation based on each user's reading preferences
- a desktop-first local machine agent bridge that lets a user route work between their own zkTalk-connected machines using local Codex

## Product Decision 1: Automatic Translation Preferences

### Core rule

Message rendering language must be a user preference, not a property of the community.

### Why

- multilingual communities need different readers to see the same message differently
- app locale and message translation are different concerns
- manual per-message translation remains useful even when automatic translation exists

### Preference model

- `manual_only`
  - render original text by default
  - keep explicit translate actions
- `target_language_all`
  - render every incoming message in the user's target language
  - original remains inspectable
- `target_language_except_readable`
  - if a message is already in a language the user marked readable, keep the original
  - otherwise render translated text in the target language

### First concrete presets

- `english_only`
  - target language: `en`
  - readable languages: `en`
  - render all non-English incoming content in English
- `korean_preferred_english_readable`
  - target language: `ko`
  - readable languages: `ko`, `en`
  - keep Korean and English original
  - render all other languages in Korean
- `manual_only`
  - no auto-rendering

### Rendering rules

- do not mutate the original stored message body
- render translated text as a view-layer decision
- manual translate remains available even when auto-translation is active
- if runtime is unavailable or mock-only, do not pretend translation is live
- when a message is edited, translated render output must be invalidated or refreshed

### UX rules

- translated messages need a subtle but clear state such as `translated from Japanese`
- original text must remain inspectable on demand
- settings copy must distinguish:
  - app language
  - auto-translation behavior
  - readable languages

## Product Decision 2: Local Machine Agent Bridge

### Core rule

zkTalk must not pretend the server can reuse each user's ChatGPT/Codex identity.

Instead:

- each machine runs a local bridge
- that bridge uses the local user's own Codex auth/session
- zkTalk only routes commands and results

### Why

- this matches how zkCoder already works locally
- it avoids server-side impersonation of a user's Codex session
- it allows one user to coordinate multiple personal machines

### Machine model

Each machine owned by a user has:

- stable machine id
- user-visible machine name
- machine type
  - `desktop`
  - `laptop`
  - `buildbox`
  - `other`
- bridge presence state
  - `online`
  - `offline`
  - `busy`
  - `auth_missing`

### Command model

The user can:

- target one machine
- target a default machine
- target a named machine group later

Each command carries:

- target machine id
- instruction text
- optional attached zkTalk context
  - selected messages
  - files
  - channel reference
- execution intent
  - `analyze`
  - `edit`
  - `run`
  - `summarize`

### Result model

The target machine returns:

- accepted/rejected status
- in-progress streamed updates
- final summary
- optional artifact references
- explicit failure state for:
  - machine offline
  - bridge missing
  - local Codex auth missing
  - execution rejected

### Security and trust boundaries

- only the local bridge touches local Codex auth
- zkTalk server never receives raw Codex auth material
- machine bridge must authenticate to zkTalk as the owning user and machine id
- command routing must be limited to the owner's machines unless a future shared-machine feature is explicitly designed

### Source of truth

- use [local-machine-bridge-trust-model-2026-04-10.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md) for the concrete trust boundary, registration rules, command-envelope limits, and failure-state rules that queue items 177-181 should inherit

## Immediate zkCoder Bias

For the next queue regeneration, bias toward:

1. shared types and settings payloads for translation preferences
2. UI surfaces for translation preferences on web/mobile/desktop
3. rendering helpers and explicit runtime-state UX for auto-translation
4. architecture and shared types for local machine registration and command envelopes
5. desktop-only bridge MVP before any mobile/web execution claims

## Non-Goals For This Batch

- do not claim server-side reuse of personal Codex sessions
- do not ship autonomous cross-user agent execution
- do not replace manual translation actions
- do not require mobile clients to execute local Codex work
