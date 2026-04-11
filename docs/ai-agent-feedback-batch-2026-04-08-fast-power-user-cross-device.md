# AI-Agent Feedback Batch: Fast Power User Cross-Device Continuity (2026-04-08)

Status: completed repo-local evidence pass

This entry records the concrete `Queue item 106` execution for one cross-device continuity synthetic-user pass.

Template source:

- [AI-agent feedback template](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md)

Evidence sources used for this pass:

- [session-token helpers](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/session-token.ts)
- [session-token tests](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/__tests__/session-token.test.ts)
- [useWebSocket hook](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/hooks/useWebSocket.ts)
- [useWebSocket tests](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/hooks/__tests__/useWebSocket.test.tsx)
- [unread store tests](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/stores/__tests__/unread.test.ts)
- [mobile P0 smoke script](/Users/hyunokoh/Documents/Projects/zkTalk/scripts/mobile-p0-smoke.mjs)
- [mobile Maestro smoke script](/Users/hyunokoh/Documents/Projects/zkTalk/scripts/mobile-maestro-smoke.mjs)
- [desktop protocol message helper](/Users/hyunokoh/Documents/Projects/zkTalk/scripts/desktop-protocol-message.mjs)
- [test matrix (2026-03-25)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- [Current status](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)
- [AI-agent feedback runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-runbook.md)

## Run metadata

- Date: 2026-04-08
- Run id: `poc-2026-04-08T01-21-20-206Z-a1`
- Persona: `Fast Power User`
- Scenario id: `cross-device-continuity`
- Device context: desktop-to-mobile continuity, repo-local harness and regression evidence
- Runtime path: `scripts/desktop-protocol-message.mjs`, `scripts/mobile-p0-smoke.mjs`, `apps/web/src/hooks/useWebSocket.ts`
- Build or harness notes: direct dual-device execution was not available in this sandbox; evidence is grounded in the checked-in desktop/mobile harness paths, current continuity tests, and the latest repo-local multi-user regression notes
- Operator assumptions:
  - the current best continuity proof is a hybrid of desktop handoff, mobile harness smoke, websocket reconnect tests, and unread regression evidence rather than a live physical desktop-plus-phone pass
  - this pass does exercise a concrete desktop-side start and mobile-side continuation path at the repo-contract level because both harness families use session-token-driven resume behavior
  - tactile continuity confidence on a real device pair still remains a later operator check unless a repo-local defect is proven
- Evidence sources:
  - `setSessionToken()` stores the active token in `sessionStorage`, removes the legacy `localStorage` copy, and emits `zktalk-session-token-changed`
  - `useWebSocket` reconnects after offline or token-refresh events, but disconnects fail-closed when the token is cleared or auth is lost
  - unread-store tests confirm auth errors clear cached unread state instead of leaving stale cross-session counts behind
  - the server test matrix records two-user unread transitions `2 -> 1 -> 0`, DM send/read coverage, and websocket updates for promoted DM/community flows
  - both `mobile-p0-smoke.mjs` and `mobile-maestro-smoke.mjs` use the shared harness `dev-session-token.txt` path for resume behavior on simulator-side flows
  - `desktop-protocol-message.mjs` generates the desktop-harness URL from an explicit session token so the desktop side uses the same auth handoff model

## Scenario target

- Goal: verify whether a fast-switching user can trust message continuity, reconnect behavior, and unread/read correctness when moving between desktop and mobile contexts
- Start point: desktop protocol handoff or existing desktop session, then simulator-side mobile resume path
- Required path:
  - start a conversation on desktop
  - carry the active auth/session state into mobile resume behavior
  - inspect message ordering and unread/read correctness
  - exercise one continuity edge through reconnect or token/session change
- Edge exercised: websocket reconnect and auth-loss fail-closed behavior during session changes

## Timeline

| Step | Action | Expected result | Actual result |
| --- | --- | --- | --- |
| 1 | Start from the desktop-side message handoff path | Desktop should produce a deterministic communication target using an explicit session token | `desktop-protocol-message.mjs` requires `--session-token`, destination fields, and message body before generating the `zktalk://desktop-harness` URL |
| 2 | Resume on the mobile harness path | Mobile should read the same active auth context through the harness resume contract instead of a separate fake login shape | `mobile-p0-smoke.mjs` and `mobile-maestro-smoke.mjs` both anchor resume behavior on `dev-session-token.txt` inside the shared harness directory |
| 3 | Inspect continuity after network or token movement | Realtime state should reconnect without leaving the user on stale socket state | `useWebSocket.test.tsx` proves offline -> reconnect recovery and token-refresh reconnect behavior for the same user |
| 4 | Check auth-loss handling | If continuity breaks because the session is gone, the product should fail closed instead of showing cross-user residue | `useWebSocket` clears the session on auth-close codes, and unread-store tests confirm cached unread state is cleared on auth errors |
| 5 | Validate read/unread correctness across participants | A fast user switching devices should not see unread counts drift after the other endpoint reads | The server regression notes record channel unread people counts dropping `2 -> 1 -> 0` and per-member unread summary dropping `1 -> 0` after read events |

## Required answers

- First confusing moment: the continuity proof is real but distributed across web hook tests, mobile smoke scripts, desktop handoff helpers, and API regression notes rather than one single cross-device report.
- Trust signal or trust break: trust improves because session changes emit an explicit token-change event, websocket reconnect is covered, unread caches clear on auth loss, and server-side unread transitions are documented. Trust remains capped because there is not yet one repo-local script that performs the entire desktop-to-mobile switch as a single runnable artifact.
- Commercially risky or unfinished feeling: for a fast power user, the main remaining risk is not a proven stale-state defect but the absence of one compact continuity harness that a release owner can rerun without stitching evidence together manually.
- Avoidable extra effort: understanding continuity still requires reading several sources instead of one focused cross-device artifact.
- Awkward label, message, or flow: no in-product wording issue was proven here; the awkward part is the operational evidence shape, where continuity confidence is scattered across multiple files.
- Would this persona recommend zkTalk today? Why: yes for internal candidate hardening because the repo-local evidence now supports session continuity, reconnect recovery, and unread correctness without exposing a concrete cross-device defect; not yet as a high-confidence external pilot recommendation until a single rerunnable cross-device harness or a real dual-device pass confirms tactile handoff quality.

## Findings

| Severity | Classification | Surface | Observation | Suggested change |
| --- | --- | --- | --- | --- |
| `pilot-risk` | engineering | `docs/ai-agent-feedback-summary-2026-04-08.md`, `docs/CURRENT_STATUS.md`, `docs/README.md` | Cross-device continuity evidence exists repo-locally, but it is fragmented across desktop helper, mobile smoke, websocket tests, unread tests, and API regression notes. | Keep a dedicated cross-device batch entry linked from status/index docs so queue regeneration starts from one continuity artifact instead of rediscovering the proof. |
| `minor` | engineering | `docs/IMPLEMENTATION_PLAN.md`, `docs/critical-path-verification-map-2026-04-07.md` | There is still no single rerunnable repo-local script that performs the whole desktop-to-mobile continuity path in one command. | Queue one thin harness/inventory follow-up for a unified cross-device continuity smoke after current hardening work stabilizes. |
| `external` | external | real desktop-plus-phone tactile confirmation | This pass proves continuity contracts and regressions repo-locally, but it does not replace a later real device-pair feel check. | Keep the eventual tactile handoff confirmation in operator-owned pilot readiness work, not as a fake runtime bug. |

## Blockers

- Blocking issue: no repo-local blocker prevented a continuity evidence pass, but there is still no single end-to-end dual-device harness command
- Blocker type: none for the current continuity contract slice; remaining tactile confirmation is external
- Evidence: [Current status](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md), [test matrix (2026-03-25)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)
- Next owner: engineering for evidence consolidation, operator for future real device-pair confirmation
- Next action: keep the next continuity improvement focused on evidence consolidation or a thin harness path, not on reopening already-covered session/unread code paths without a new defect

## Summary for queue regeneration

- Highest-leverage next item: add one thin rerunnable cross-device continuity smoke or inventory entry that combines the existing desktop/mobile/session evidence into a single operator-facing command path
- Why this matters before external pilots: it raises operator confidence by turning a scattered but valid continuity proof into a fast repeatable check without pretending that credential/device gates are engineering defects
- Smallest verification path:
  - `.zkcoder/scripts/verify.sh`
  - `pnpm --dir apps/web test -- --run src/hooks/__tests__/useWebSocket.test.tsx src/lib/__tests__/session-token.test.ts src/stores/__tests__/unread.test.ts`
