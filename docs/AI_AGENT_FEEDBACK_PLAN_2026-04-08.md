# AI Agent Feedback Plan (2026-04-08)

## Purpose

Before wider commercial rollout, use AI agents as synthetic users to exercise zkTalk across desktop, mobile, and cross-device communication flows and leave structured product feedback that feels like a real usability readout rather than a test log.

This is not meant to replace real user testing. It is meant to make the product sharper before real pilots by forcing repeated role-based walkthroughs and capturing where the experience still feels confusing, fragile, slow, or untrustworthy.

## Mission

Create a reusable repo-local workflow so zkCoder can:

- define realistic user personas
- run scenario-based product walkthroughs for desktop app, mobile app, and mixed-device communication
- write feedback in a structured human-readable format
- synthesize repeated findings into a short list of product issues worth fixing before external pilots

## Scope

The feedback program should cover:

- account entry and first-run understanding
- session restore and re-entry confidence
- desktop app communication flows
- mobile app communication flows
- desktop-to-mobile and mobile-to-desktop messaging continuity
- channel messaging and DM messaging
- attachment send, preview, save, and failure behavior
- voice or realtime-presence joins where currently supported
- settings or account-management surfaces that real users would touch in the first session

## Required Deliverables

The repo should gain and maintain these artifacts:

- persona pack for at least 3 distinct user types
- scenario pack for desktop-first, mobile-first, and cross-device communication
- reusable feedback template for each synthetic-user run
- execution runbook for how operators or agents should perform the feedback pass
- synthesized summary that groups repeated friction into concrete product themes

Preferred output paths:

- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-runbook.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-summary-2026-04-08.md`

## Persona Pack

At minimum, define these synthetic users:

### Persona 1: Cautious Organizer

- uses desktop first, then checks mobile later
- wants confidence that messages, roles, and community settings are understandable
- notices wording problems, trust issues, and unclear permission states

### Persona 2: Fast Power User

- switches quickly between desktop and mobile
- stress-tests messaging speed, navigation efficiency, keyboard flow, and realtime continuity
- notices friction caused by extra clicks, stale state, or inconsistent device behavior

### Persona 3: Casual Member

- arrives mostly from mobile and uses the app in short bursts
- cares about clarity, comfort, and whether the app feels easy enough to keep using
- notices awkward onboarding, confusing labels, attachment friction, and DM/channel ambiguity

## Scenario Matrix

Every execution batch should pull from this matrix:

### Desktop-First

- sign in or resume session on desktop
- open a community and a DM
- send text messages, emoji, and at least one attachment
- observe status, success feedback, and failure behavior
- switch to mobile and verify continuity

### Mobile-First

- sign in or resume session on mobile
- navigate to a community, DM, and settings surface
- send messages quickly in short bursts
- try attachment or voice entry where available
- switch to desktop and verify continuity

### Cross-Device Continuity

- begin on one device and continue on the other
- verify unread, last-read, message ordering, presence, and session behavior
- intentionally hit an edge such as reconnect, logout, failed upload, or stale state
- note whether recovery feels trustworthy

## Required Feedback Questions

Every synthetic-user output should answer these questions directly:

- What was the first confusing moment?
- What made the product feel trustworthy or untrustworthy?
- What felt unfinished or risky for a commercial product?
- Where did the user spend avoidable extra effort?
- Which labels, messages, or flows felt awkward?
- Would this persona recommend zkTalk to a real group today? Why or why not?

## Quality Bar

The feedback program is useful only if outputs are specific. Avoid vague statements like "UX could be improved."

Every finding should identify:

- the user persona
- the device context
- the exact action or sequence
- the observed feeling or confusion
- the likely product change that would reduce the friction

## Queue Bias For zkCoder

When this plan is active, queue items should prefer:

- creating or improving persona/scenario/template docs
- tightening harness or manual-smoke instructions so synthetic-user runs are easier to execute
- organizing feedback artifacts into a form that release owners can actually use
- identifying repeated product-credibility issues from walkthroughs rather than broad feature work

Do not let the queue drift into:

- speculative growth features
- billing or monetization work
- credential-only or device-only external blockers

## Execution Batch 1

After the runbook, template, and summary scaffold exist, the next queue should execute the first concrete synthetic-user feedback batch.

Batch 1 should:

- fill one Cautious Organizer desktop-first entry using the current desktop or desktop-harness path
- fill one Casual Member mobile-first entry using the current mobile harness or manual-smoke evidence
- fill one Fast Power User cross-device continuity entry using the best available desktop/mobile continuity path
- update the summary with repeated findings, or explicitly record that no repeated friction has been proven yet
- map any engineering findings to concrete repo surfaces and keep external-only blockers out of coding tasks

Preferred evidence sources for Batch 1:

- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-status-last-result.json`
- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-brief-latest.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/.tmp/manual-smoke-report-latest.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/manual-smoke-checklist-2026-03-27.md`
- repo scripts and docs for `desktop:harness:regression`, `mobile:harness:regression`, `ui:smoke:*`, and `manual:smoke:*`

Batch 1 must state assumptions clearly when a real runtime or device cannot be exercised in the current environment.

## Exit Criteria

- zkCoder can generate and maintain a concrete synthetic-user feedback workflow from repo-local docs
- the repo includes personas, scenarios, templates, and a summary artifact path for AI-user feedback
- a release owner can read the resulting output and immediately see likely pre-pilot UX blockers
- the repo includes at least one concrete feedback batch with persona-specific entries and a synthesized summary update
