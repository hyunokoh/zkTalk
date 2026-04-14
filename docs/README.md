# zkTalk Docs Index

Use this page as the shortest path to the current project state.
For service deployment and operator handoff, start here before opening desktop-only release docs.

Authority map:

- release snapshot: [current-release-next.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md) and [current-release-next.json](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json)
- concise external blockers: [Current blockers](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)
- operator handoff shortcut: [Final operator checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
- runtime/deploy truth: [Production runtime runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
  - includes the current runtime dependency matrix and readiness boundary notes for PostgreSQL, Redis, object storage, and LiveKit
- desktop local machine bridge boundary: [Local machine bridge trust model (2026-04-10)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md)
  - use this before expanding machine registration, routing, or local Codex execution claims beyond desktop-only support
- desktop loopback operator steps: [Local machine bridge loopback (2026-04-12)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-loopback-2026-04-12.md)
  - use this for the first repo-local machine registration, heartbeat, and local operator blocker split
- current cross-platform UX decisions: [Chat UX alignment inventory (2026-04-12)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/chat-ux-alignment-inventory-2026-04-12.md)
  - use this before reopening mobile/web/desktop AI or translation parity decisions
- current mobile parity execution queue: [Mobile parity queue (2026-04-13)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-parity-queue-2026-04-13.md)
  - use this before reopening mobile polish or parity work for queue items 277-280
- queue/order of work: [Commercialization plan](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md) and [Implementation plan](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)
- zkCoder operating rules: [zkCoder runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ZKCODER_RUNBOOK.md)

Decision split:

- If the next step requires repository edits, targeted tests, or doc/runtime alignment, treat it as engineering follow-up and route it through the commercialization/implementation docs.
- If the next step requires real signing credentials, a real certificate, third-party account access, or a physical device check, treat it as an external blocker and keep it in the blocker doc plus the relevant operator checklist.
- This split is intentional so release owners and zkCoder do not re-open credential/device gaps as fake code tasks.
- Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.

## Current status

## Service deployment default path

1. [Production runtime runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
   Use this first for runtime contracts, readiness boundaries, origin rules, deterministic local stack assumptions, and the desktop local machine bridge operator boundary.
2. [Release readiness checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
   Use this next for the exact repo-local verification cadence and operator gate sequence.
3. [Final operator checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
   Use this after the runtime/readiness docs to split engineering-complete work from external-only blockers.
4. [Current blockers](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)
   Use this only for credential, certificate, account, and device blockers that remain after the deploy/readiness path is understood.
5. [apps/desktop/RELEASE.md](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md)
   Use this only when the active task is desktop packaging/signing rather than service deployment.

- [Current status](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)
- [Handoff summary](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)
- [Commercialization plan](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md)
  - use the `Current validation gap ledger` section there when a new smoke or regression-coverage gap is discovered
- [Implementation plan](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)
- [Community visibility matrix (2026-04-10)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-visibility-matrix-2026-04-10.md)
  - use this as the Phase 7 policy source of truth before changing discoverability, locked-channel UX, or public-community join behavior
- [AI agent feedback plan (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/AI_AGENT_FEEDBACK_PLAN_2026-04-08.md)
- [AI-agent feedback runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-runbook.md)
- [AI-agent feedback template](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md)
- [AI-agent feedback summary (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-summary-2026-04-08.md)
- [AI-agent feedback batch: Cautious Organizer desktop-first (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md)
- [AI-agent feedback batch: Casual Member mobile-first (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md)
- [AI-agent feedback batch: Fast Power User cross-device continuity (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-fast-power-user-cross-device.md)
- [zkCoder runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ZKCODER_RUNBOOK.md)
- [Current blockers](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)
  - this file is intentionally limited to true external blockers and release-confidence gates
- [Final operator checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
  - use this first when the question is "what is already done by engineering vs what is still waiting on operator input"
  - section `3b. Operator-owned blocker ledger` is the shortest owner/unblock/evidence matrix for non-code blockers
- [Release readiness checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
- [Production runtime runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
  - use this first for deploy-time dependency expectations and non-readiness runtime checks
  - `/api/health` and `/api/health/ready` now expose `operator.trafficGate` plus `operator.immediateActions`, and `/api/health/ready` includes an explicit `boundary` section so readiness coverage vs excluded feature dependencies is visible in the API output
  - also documents the current compose placeholder boundary so operators do not confuse green readiness with production-safe secrets or browser URLs
  - also includes the deterministic local stack contract for PostgreSQL, Redis, MinIO/S3, and LiveKit used by repo-local smoke and verification commands
- [Local machine bridge trust model (2026-04-10)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md)
  - use this as the source of truth for desktop-only local Codex execution, owner-only routing, and non-desktop degradation before claiming wider machine-bridge support
- [Local machine bridge loopback (2026-04-12)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-loopback-2026-04-12.md)
  - use this for the operator-visible register -> heartbeat -> state-check loop on the first desktop bridge candidate
- [Chat UX alignment inventory (2026-04-12)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/chat-ux-alignment-inventory-2026-04-12.md)
- [Mobile parity queue (2026-04-13)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-parity-queue-2026-04-13.md)
  - use this as the current source of truth for web/desktop/mobile translation and selected-message AI parity decisions
- [Core smoke contract](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/core-smoke-contract.json)
  - use this to see the exact spec files, covered journeys, excluded journeys, and local prerequisites behind `pnpm e2e:smoke:web:core`
- [Critical path verification map (2026-04-07)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md)
  - use this to see which release-critical journeys are strongly covered, thinly covered, or still lightly verified
- [High-risk touched surfaces (2026-04-07)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/high-risk-touched-surfaces-2026-04-07.md)
- [Mobile Korean IME checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)
- [Mobile Korean IME report template](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-report-template-2026-03-26.md)
- [Test matrix](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- Repo-level next-step command:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
- Repo-level operator smoke inventory:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:smoke:inventory`
  - use this to list the current small-but-high-value automatable smoke tasks versus manual/external gates
- Repo-level operator handoff consistency check:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:handoff:check`
  - use this after editing blocker/status/checklist docs or after refreshing `release:next` if the question is whether the operator narrative still matches the live repo snapshot
- Repo-level hardening verify command:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:hardening`
- Repo-level operator short loop:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:handoff:check`
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run operator:smoke:inventory`
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && .zkcoder/scripts/verify.sh`
  - use this exact order before reopening engineering when the question is blocker classification rather than feature work
- Repo-level release-readiness verify command:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run verify:release-readiness`
- Repo-level snapshot file:
  - [current-release-next.json](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json)
  - includes structured `operatorHandoff.externalOnlyBlockers`, `operatorHandoff.manualOperatorGates`, and `operatorHandoff.triageSequence` for queue regeneration and operator triage
- Repo-level markdown snapshot:
  - [current-release-next.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md)
- Desktop signing snapshot command:
  - `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:next`

## Product and engineering references

- [API reference](/Users/hyunokoh/Documents/Projects/zkTalk/docs/api-reference.md)
- [Community messenger design](/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-messenger-design.md)
- [MCP setup](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mcp-setup.md)

## Recommended reading order

1. [Production runtime runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
   Includes runtime dependency matrix, readiness boundary notes, compose placeholder checks, the deterministic local stack contract, and the desktop local machine bridge operator boundary.
2. [Release readiness checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
3. [Final operator checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md)
4. [Current blockers](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)
5. [Commercialization plan](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md)
   Includes the current validation gap ledger for attachment open/save, thin voice smoke, and non-core journey coverage gaps.
6. [Local machine bridge trust model (2026-04-10)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md)
   Includes the desktop-only bridge boundary, local auth assumptions, and non-desktop degradation rules for the first local Codex path.
7. [Local machine bridge loopback (2026-04-12)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-loopback-2026-04-12.md)
   Includes the first desktop loopback proof, operator steps, and code-vs-external blocker split.
8. [Chat UX alignment inventory (2026-04-12)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/chat-ux-alignment-inventory-2026-04-12.md)
   Includes the current parity decision for mobile selected-message AI and language-agnostic translation settings.
9. [Mobile parity queue (2026-04-13)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-parity-queue-2026-04-13.md)
   Includes the deterministic follow-up queue for the remaining mobile-only parity and stability work.
10. [Implementation plan](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)
11. [High-risk touched surfaces (2026-04-07)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/high-risk-touched-surfaces-2026-04-07.md)
12. [Critical path verification map (2026-04-07)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md)
   Includes which critical paths remain lightly verified.
13. [AI-agent feedback runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-runbook.md)
   Includes persona/scenario mapping, blocker classification, and summary/update rules for synthetic-user passes.
14. [AI-agent feedback template](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md)
15. [AI-agent feedback summary (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-summary-2026-04-08.md)
16. [AI-agent feedback batch: Cautious Organizer desktop-first (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-cautious-organizer-desktop.md)
17. [AI-agent feedback batch: Casual Member mobile-first (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-casual-member-mobile.md)
18. [AI-agent feedback batch: Fast Power User cross-device continuity (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-batch-2026-04-08-fast-power-user-cross-device.md)
19. [Current status](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)
20. [zkCoder runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ZKCODER_RUNBOOK.md)
21. [Mobile Korean IME checklist](/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md)
22. [Test matrix](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
23. [Handoff summary](/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md)
