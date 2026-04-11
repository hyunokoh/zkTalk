# AI-Agent Feedback Runbook

Status: active working runbook  
Audience: zkCoder, engineering, operator  
Last updated: 2026-04-08

Use this runbook when the active queue item is synthetic-user feedback for desktop, mobile, or cross-device communication. Pair it with:

- [AI agent feedback plan (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/AI_AGENT_FEEDBACK_PLAN_2026-04-08.md)
- [AI-agent feedback template](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md)
- [AI-agent feedback summary (2026-04-08)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-summary-2026-04-08.md)
- [Current status](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)
- [Production runtime runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md)
- [Critical path verification map (2026-04-07)](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md)

## 1. Purpose

Run AI agents like realistic users before external pilots so zkTalk gets concrete product-feel feedback without reopening broad discovery.

This runbook is for:

- persona-based walkthroughs
- repeatable desktop/mobile/cross-device communication checks
- structured feedback capture
- synthesis of repeated friction into commercialization-ready next work

This runbook is not for:

- replacing real user research
- reclassifying missing credentials or device access as code defects
- broad feature ideation unrelated to current release-readiness work

## 2. Output contract

Each feedback batch should leave these repo-local artifacts:

- execution notes in the active `.zkcoder/runs/<run-id>/worklog.md`
- one or more filled feedback entries based on [ai-agent-feedback-template.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md)
- an updated synthesis snapshot in [ai-agent-feedback-summary-2026-04-08.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-summary-2026-04-08.md)
- every filled entry must cite the exact repo-local evidence it used, such as a runtime file, focused test, smoke artifact, or manual-smoke report

Operator rule:

- If a finding can be tightened repo-locally through code, docs, tests, or harness improvements, keep it in the engineering queue.
- If a finding depends on real signing credentials, third-party accounts, or physical-device-only confirmation, record it as an external blocker and link the owning runbook instead of creating a fake coding task.

## 3. Persona pack

### Persona A. Cautious Organizer

- Device bias: desktop first, mobile follow-up
- Primary goal: decide whether a real community can trust the product for daily coordination
- Watch for: permission clarity, trust signals, settings confidence, wording quality
- Recommendation prompt: "Would I move an actual group here this week?"

### Persona B. Fast Power User

- Device bias: rapid switching between desktop and mobile
- Primary goal: communicate quickly with minimal friction
- Watch for: extra clicks, stale state, reconnect oddities, keyboard inefficiency, cross-device continuity
- Recommendation prompt: "Does this feel fast enough to keep using under pressure?"

### Persona C. Casual Member

- Device bias: mobile first, short-session behavior
- Primary goal: understand and participate without setup fatigue
- Watch for: onboarding confusion, awkward labels, DM/channel ambiguity, attachment hesitation
- Recommendation prompt: "Would I come back after a short first session?"

## 4. Scenario matrix

Pick at least one scenario from each lane for a meaningful batch.

| Lane | Scenario id | Start surface | Required actions | Required observation |
| --- | --- | --- | --- | --- |
| Desktop | `desktop-core-comm` | desktop app or desktop harness | sign in or resume, open one community and one DM, send text plus emoji plus one attachment, visit one settings surface | first confusion, trust signal, attachment clarity |
| Mobile | `mobile-core-comm` | mobile app | sign in or resume, open one community and one DM, send short burst messages, visit settings or profile, try attachment or voice if available | small-screen friction, wording clarity, confidence to continue |
| Cross-device | `cross-device-continuity` | either device, then switch | start a conversation on device A, continue on device B, inspect unread/read state, ordering, reconnect or stale-state recovery | continuity trust, stale-state risk, recovery quality |
| Cross-device edge | `cross-device-edge-recovery` | either device | trigger one realistic edge such as logout, reconnect, failed upload, expired session, or voice join failure | whether failure handling feels commercial and recoverable |

Coverage rule:

- Do not claim cross-device confidence unless at least one desktop-to-mobile or mobile-to-desktop handoff was exercised in the batch.
- If a feature is currently excluded by environment limits, say so explicitly and keep moving on the remaining scenario.

## 5. Execution procedure

1. Read [CURRENT_STATUS.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md) and [production-runtime-runbook.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md) so the agent knows which gaps are code-follow-up versus external blockers.
2. Pick one persona and one primary scenario lane.
3. State the test assumption set before acting:
   - runtime used
   - device context
   - whether desktop harness, real desktop, web, or mobile simulator is in use
   - known missing services, secrets, or devices
4. Perform the minimum scenario path end to end.
5. Record observations immediately using the feedback template.
   - include an `Evidence sources` list with exact repo paths or repo-local artifact files
6. Classify each finding as one of:
   - `engineering`
   - `external`
   - `needs-reproduction`
7. If the same issue appears in more than one persona or device lane, update the summary doc rather than leaving it trapped in a single run note.

## 6. Required observation prompts

Every filled feedback entry must answer:

- What was the first confusing moment?
- What made the product feel trustworthy or untrustworthy?
- What felt commercially risky or unfinished?
- Where did the user spend avoidable effort?
- Which labels, messages, or flow transitions felt awkward?
- Would this persona recommend zkTalk to a real group today, and why?

## 7. Severity and queue mapping

Use this rubric to keep commercialization follow-up concrete.

| Severity | Meaning | Expected next action |
| --- | --- | --- |
| `release-risk` | damages trust in a core communication path or makes recovery unclear | create or update a focused engineering queue item tied to the touched repo surface |
| `pilot-risk` | acceptable for unsigned handoff but likely to block external pilot confidence | record in summary and queue for near-term polish or regression prevention |
| `minor` | noticeable but not credibility-damaging in the current phase | keep in summary until repeated across personas |
| `external` | blocked by credentials, external service ownership, or real-device-only access | link the owning blocker/runbook and do not convert into code work |

Queue writing rule:

- Map each engineering finding to a concrete surface such as `apps/web/src/components/MessageComposer`, `apps/web/src/components/AttachmentPreview`, `apps/api/src/modules/realtime`, or an existing release/operator doc.
- Prefer the smallest reproducible next item, not a generic theme like "improve UX."

## 8. Blocker handling

When the scenario cannot continue, stop and classify the blocker precisely.

| Blocker type | Example | Where to record it |
| --- | --- | --- |
| External credential | signing key, provider account, missing production secret | blocker doc or operator checklist |
| External device | real iPhone Korean IME confirmation | device checklist / operator checklist |
| Repo-local defect | stale unread state, broken attachment preview, confusing auth recovery | engineering queue plus touched summary doc |
| Missing harness path | no repeatable local way to exercise the scenario | engineering queue as tooling/runbook work |

Do not blur these categories. The purpose of the feedback program is to improve commercialization readiness, not to inflate the engineering queue with operator-owned work.

## 9. Minimum batch definition

A credible batch for this phase should include:

- at least 2 personas
- at least 1 desktop or desktop-harness scenario
- at least 1 mobile scenario
- at least 1 cross-device continuity attempt
- at least 1 filled feedback entry per persona/scenario pair
- one updated synthesis section in the summary doc

## 10. Repo-local verification hooks

Use the smallest verification step that matches the touched surface:

- `.zkcoder/scripts/verify.sh`
- `.zkcoder/scripts/verify.sh --docs`
- targeted repo commands listed in [release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)

Verification rule:

- docs-only updates still need `.zkcoder/scripts/verify.sh`
- if a feedback run creates a concrete code fix, run the mapped targeted verification for that surface before closing the batch

## 11. Suggested batch cadence

- `Daily`: one thin synthetic-user batch against the highest-risk active surface
- `Pre-pilot`: one wider batch covering all three persona types and all three lanes
- `Before queue regeneration`: update the summary doc so repeated friction becomes actionable queue items rather than vague themes
