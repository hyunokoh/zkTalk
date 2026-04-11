# zkCoder Overnight Plan (2026-04-07 to 2026-04-08 09:00 KST)

## Window

- start window: 2026-04-07 evening KST
- stop target: 2026-04-08 09:00 KST
- execution mode: `zkcoder loop --until 2026-04-08T09:00`

## Primary Goal

Use the overnight window to keep zkCoder making safe, incremental progress on zkTalk commercialization work without touching external-only blockers such as signing credentials or real-device IME confirmation.

## Operating Rules

- preserve all existing dirty-worktree changes
- prefer the smallest safe change that closes one queue item cleanly
- keep web/API commercialization work ahead of speculative cleanup
- do not turn missing credentials, missing devices, or missing third-party accounts into code tasks
- always leave docs, verify behavior, and queue state aligned after each successful run
- if a queue item becomes ambiguous, prefer doc clarification or verification tightening over broad refactors

## Source Of Truth

Read these first before each major batch:

- [/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)
- [/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md)
- [/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)
- [/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
- [/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)

## Overnight Priority Order

1. Phase 0 queue cleanup
- finish any remaining zkCoder safety and authority-baseline items
- keep `.zkcoder/scripts/verify.sh`, `TASK_BRIEF.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/ZKCODER_RUNBOOK.md` coherent

2. Phase 1 runtime hardening
- keep reducing unsafe production fallback assumptions
- narrow remaining web bearer-token fallback paths
- protect same-origin cookie-first behavior
- tighten desktop-only auth exceptions so they stay explicit
- harden logout/session restore/reconnect edges

3. Phase 2 readiness and runtime docs
- improve health/readiness/operator clarity
- keep env examples and runbooks aligned with the codebase
- convert hidden runtime assumptions into explicit notes or fail-closed behavior

4. Phase 3 targeted verification
- add or tighten tests around hardened helpers and routes
- keep verify cost proportional to touched surfaces
- improve signal quality before expanding smoke coverage

5. Phase 4 UX polish only when directly tied to the changed runtime surface
- raw error cleanup
- stale auth-state cleanup
- upload/preview/settings edge polish

## Do Not Spend Overnight Time On

- billing or subscription systems
- new product areas unrelated to current commercialization hardening
- large refactors that do not close a queue item
- signing/notarization implementation that requires unavailable credentials
- real-device mobile tasks that cannot be completed locally

## Desired Overnight Outputs

- more completed queue items under `.zkcoder/plan-queue.json`
- additional run artifacts under `.zkcoder/runs/`
- updated docs when runtime assumptions or verification rules change
- smaller remaining set of web/API commercialization hardening gaps by morning

## Morning Review Checklist

At or before 2026-04-08 09:00 KST, review:

- `zkcoder status`
- `zkcoder next`
- latest run under `.zkcoder/runs/`
- changed files in docs, `.zkcoder/scripts/`, and touched API/web hardening surfaces
- whether any queue item stalled on a real blocker that should be reprioritized
