# zkCoder Runbook For zkTalk

## Purpose

This file explains how zkCoder should be used against zkTalk from the current local environment.

## Paths

- zkTalk repo: /Users/hyunokoh/Documents/Projects/zkTalk
- zkCoder CLI source: /Users/hyunokoh/Documents/Projects/zkCoder/repo/src/cli.mjs
- Codex CLI: /Users/hyunokoh/.nvm/versions/node/v18.19.1/bin/codex

## Core Commands

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk

zkcoder brief
zkcoder plan-sync
zkcoder next
zkcoder plan --phase poc
zkcoder run --phase poc
zkcoder plan --phase mvp
zkcoder run --phase mvp
.zkcoder/scripts/verify.sh
.zkcoder/scripts/verify.sh --api
.zkcoder/scripts/verify.sh --web
.zkcoder/scripts/verify.sh --docs
npm run verify:selected-message-ai
npm run verify:hardening
npm run verify:release-readiness
npm run mobile:maestro:selected-message-ai
npm run mobile:maestro:selected-message-ai:dm
npm run mobile:maestro:selected-message-ai:thread
node /Users/hyunokoh/Documents/Projects/zkCoder/repo/src/cli.mjs run --phase mvp
```

## Long-Running Commands

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk

zkcoder run-next
zkcoder loop --for 8h
caffeinate -dimsu zkcoder loop --for 8h
caffeinate -dimsu zkcoder loop --until 2026-04-08T09:00
```

## Execution Notes

- Run zkCoder from the zkTalk repository root so the workspace is the real monorepo.
- The agent command uses Codex CLI directly through `.zkcoder/scripts/run-agent.sh`.
- The Codex workspace root is the zkTalk repository itself.
- If Codex CLI is broken locally, zkCoder runs will fail before any coding work begins.
- Run `.zkcoder/scripts/verify.sh` before closing a phase attempt so docs, blocker state, and targeted repo checks stay aligned.
- `npm run verify:hardening` is the standard small-batch gate. It is the same as the default `.zkcoder/scripts/verify.sh` behavior: repo/doc sanity, dirty-worktree preservation, and only the targeted API/web tests for touched runtime surfaces.
- `npm run verify:selected-message-ai` is the narrow AI-action gate for queue work around selected messages. It runs the shared selected-message contract test plus the web tests that pin reply-draft, rewrite-draft, inline-translation, DM/thread/channel routing, and settings copy without pulling in the broader release batch.
- `npm run mobile:maestro:selected-message-ai`, `npm run mobile:maestro:selected-message-ai:dm`, and `npm run mobile:maestro:selected-message-ai:thread` are the fixed repo-local recheck entry points for the mobile long-press selected-message AI flows. Use them when the task touches mobile message rows, action sheets, or route setup and you need an inspectable surface-specific rerun without rediscovering selectors or ad hoc `--mode` flags.
- `npm run verify:release-readiness` is the broader batch gate. It runs all targeted API/web tests plus `pnpm local:commercial:verify` and `pnpm e2e:smoke:web:core` so the local commercialization stack and core browser journey are checked together.
- Treat section `Minimal Web/API Regression Commands` in `/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md` as the operator-facing source of truth for which repo-local web/API commands should run once package tooling is available.
- The default verify scope is `changed`: it still runs repo/doc sanity checks, and only runs the mapped API/web targeted tests for the touched high-risk runtime files. Unmapped changes skip runtime tests instead of pulling in a package-wide batch.
- Use `.zkcoder/scripts/verify.sh --api`, `.zkcoder/scripts/verify.sh --web`, or `.zkcoder/scripts/verify.sh --docs` during tight inner-loop work when only one surface is being changed.
- Treat Docker/local stack availability as a release-batch prerequisite, not as a blocker for a small docs-only or narrow hardening batch.
- Treat `.zkcoder/queue-surface-map.json` as the repo-local bridge between abstract queue items and the actual high-risk zkTalk files/tests they should touch.
- Keep `.zkcoder/latest-run.json` pointed at the newest run directory under `.zkcoder/runs/` so repo-local verification and handoff notes inspect the current attempt rather than stale artifacts.
- The verify script now fails if any path captured in the run's `before.git-status.txt` disappears from the current dirty worktree, which is the repo-local guardrail for "no user-authored local changes were lost."
- The repository-local control directory for zkCoder in zkTalk is `.zkcoder/`.
- For the current overnight commercialization push, use [/Users/hyunokoh/Documents/Projects/zkTalk/docs/ZKCODER_OVERNIGHT_PLAN_2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ZKCODER_OVERNIGHT_PLAN_2026-04-07.md) as the execution bias document.
- Start with `/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md` if the current source-of-truth document is unclear.
- Treat `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md` and `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json` as the release snapshot source of truth before updating any mission docs.
- The release snapshot JSON now carries `operatorHandoff.triageSequence`; use that order to keep blocker classification deterministic before regenerating queue items.
- Treat `/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md` as the shortest operator-facing split between engineering-complete work and external-only blockers.
- Treat `/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md` as the runtime/deploy source of truth before changing web/API hardening notes.
- Use the "Deterministic local stack contract" section in `/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md` before changing repo-local smoke assumptions for PostgreSQL, Redis, MinIO/S3, or LiveKit.
- Use `/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md` to see which critical paths remain lightly verified before regenerating queue items or broadening release claims.
- Treat `/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md` and `/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md` as the queue-planning source of truth before regenerating next items.
- Treat `/Users/hyunokoh/Documents/Projects/zkTalk/docs/AI_AGENT_FEEDBACK_PLAN_2026-04-08.md` as the source of truth when the active mission is persona-based synthetic user feedback for desktop/mobile product feel.
- Use `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md` as the concise blocker boundary, and do not convert credential/device blockers into coding failures.
- Before creating or regenerating queue items, classify each issue explicitly:
  - `engineering`: repo-local code, tests, docs, or verification can move it
  - `external`: needs credentials, certificates, device access, or third-party operator action
- Only `engineering` items should become zkCoder queue tasks. `external` items should be linked from blocker docs and operator runbooks instead.
- When a new smoke or targeted-test gap is discovered, update the `Current validation gap ledger` in `/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md` in the same batch instead of pushing that note into the blocker doc.

## Current Mission Bias

- Preserve the user's uncommitted zkTalk changes.
- Focus first on the touched API and web files already in progress.
- Keep release-readiness and blocker docs current when work changes assumptions.
- Treat missing signing credentials and missing real-device access as external blockers, not coding failures.
- The current snapshot still says unsigned handoff is ready, while signed production release remains blocked by macOS signing, Windows signing, and real-device Korean IME confirmation.
