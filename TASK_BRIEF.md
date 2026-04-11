# Goal

Accelerate zkTalk development with zkCoder by feeding it a concrete commercialization queue that it can execute without broad rediscovery.

Prioritize the highest-leverage path:
- preserve and stabilize the current dirty worktree
- finish the remaining web/API runtime hardening
- improve readiness, runtime docs, and operator confidence
- keep release blockers sharply separated between code work and external credentials/device checks
- move from "unsigned handoff ready" toward "operator-confident final candidate"

# Users

- the release owner driving zkTalk to ship
- community admins running real groups on web, mobile, and desktop
- end users sending messages, joining voice, sharing files, and managing communities

# Scope

- stabilize the current API and web changes already in progress
- keep desktop, web, mobile, and API flows aligned where the current hardening work touches them
- protect authentication, session, realtime, upload, message, AI runtime, and runtime-config paths touched by current work
- improve release-readiness verification, readiness signal, and operator docs
- drive concrete progress on the remaining blockers that do not require external credentials
- create a reusable synthetic-user feedback workflow so AI agents can review desktop and mobile product feel before real-user pilots
- make AI actions usable from selected messages on mobile, desktop, and web instead of leaving them hidden behind composer-only flows
- implement a visibility model where public communities can be discovered broadly while individual channels still enforce open, members-only, invite-only, or private access
- add user-level automatic translation display preferences so messages can render in the user's preferred readable language by default
- add a desktop-first local machine agent model so one user's zkTalk clients can dispatch work to named personal machines that run local Codex sessions

# Non-Goals

- do not add unrelated net-new product areas
- do not revert or overwrite user-authored uncommitted work unless explicitly required
- do not block the whole effort on missing signing credentials
- do not perform speculative large-scale refactors without a clear payoff

# Constraints

- the zkTalk repository already has user changes in progress; preserve them
- prefer the smallest correct change that moves release readiness forward
- use the existing monorepo stack and scripts instead of inventing parallel tooling
- leave clear notes when a blocker depends on unavailable secrets, devices, or services
- verification must stay repo-local and inspectable

# Acceptance Criteria

- zkCoder can describe the mission, current blockers, and commercialization priorities from this brief and the implementation plan
- each run targets one concrete queue item tied to an actual repo surface and leaves visible repository changes or a precise blocker record
- touched flows keep passing targeted verification for the packages, routes, helpers, or scripts involved
- unsigned handoff readiness is not regressed
- remaining production blockers are reduced or documented with concrete next actions
- queue regeneration produces detailed, actionable next items rather than generic release themes
- the repo gains persona, scenario, template, and summary scaffolding for AI-agent user feedback on desktop/mobile/cross-device communication
- the repo gains at least one concrete synthetic-user feedback batch with persona-specific entries grounded in available repo-local smoke, harness, or runtime evidence
- mobile AI entry points are defined around real message-selection flows rather than settings-only or composer-only copy
- selected-message AI behavior is explicit about whether it drafts a reply, rewrites composer text, translates inline, or is unavailable
- local AI runs do not mislead the user about mock versus real provider-backed output
- the repo gains a concrete community/channel visibility matrix plus implementation work for discoverable public communities with restricted channels
- public-community discovery, locked-channel gating, and post-join unlock behavior are testable and documented instead of implied
- automatic translation is preference-driven, cross-platform consistent, and distinct from manual per-message translation
- the repo gains a concrete local-machine bridge plan plus implementation work for named-machine registration, command routing, and result return using local Codex identity

# Verification

- .zkcoder/scripts/verify.sh
- targeted repo commands for changed areas when dependencies are available
- documentation updates when blocker state or operating assumptions change

# Queue Triage Rule

- only repo-local engineering work should become zkCoder queue items
- keep credentials, certificates, third-party account access, and physical-device checks in blocker docs and operator checklists
- treat `docs/README.md`, `docs/CURRENT_STATUS.md`, `docs/current-blockers-2026-03-25.md`, and `docs/final-operator-checklist-2026-04-07.md` as the shortest decision path before creating a new coding mission
- if `.zkcoder/scripts/verify.sh` passes and the remaining gap is still credentials or device access, do not reopen it as engineering work

# Current Release Source Of Truth

- Repo release snapshot: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md`
- Repo release snapshot JSON: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
- Concise blocker summary: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md`
- Release checklist: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md`

Use those documents as the current release-status authority for this mission. As of the snapshot generated on 2026-04-07T14:31:16.481Z, the remaining production blockers are:

- mac signing / notarization credentials are still placeholder or missing
- Windows code-signing credentials are still placeholder or missing
- real iPhone Korean IME confirmation is still pending

Unsigned handoff readiness remains `yes`; signed production release readiness remains `no`.

# Output

- changed files in /Users/hyunokoh/Documents/Projects/zkTalk
- run artifacts under /Users/hyunokoh/Documents/Projects/zkTalk/.zkcoder/runs/
- concise final notes that tell the next operator what changed, what passed, and what is still blocked
