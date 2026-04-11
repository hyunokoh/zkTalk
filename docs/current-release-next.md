# zkTalk Current Release Next

Generated at: 2026-04-11T13:59:43.374Z

## Desktop Readiness

- macOS: NOT_READY
- Windows: NOT_READY
- Signing env exists: NO
- Signing env loaded: NO

## Primary Command

- `npm run release:init-signing`

## Commands

- `npm run release:next`
- `npm run release:next -- --json`
- `npm run operator:handoff:check`
- `npm run operator:smoke:inventory`
- `cd apps/desktop && npm run release:next`
- `cd apps/desktop && npm run release:next -- --json`

## Blocking Items

- macOS: Developer ID identity = MISSING
- macOS: APPLE_ID = MISSING
- macOS: APPLE_APP_SPECIFIC_PASSWORD = MISSING
- macOS: APPLE_TEAM_ID = MISSING
- macOS: Latest DMG = MISSING
- Windows: WIN_CSC_LINK / CSC_LINK = MISSING
- Windows: WIN_CSC_KEY_PASSWORD / CSC_KEY_PASSWORD = MISSING
- Windows: Latest NSIS installer = MISSING

## Next Steps

- Create signing.env from SIGNING.example.env before running signed release commands.
- Install a valid Developer ID Application certificate in Keychain.
- Set real APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID values.
- Set real Windows signing certificate and password values.

## Decision Boundary

- Unsigned handoff ready: YES
- Signed production ready: NO
- Blocker scope: External-only blockers stay in operator docs; repo-local hardening and regression work stay in the engineering queue.
- Visibility policy anchor: `docs/community-visibility-matrix-2026-04-10.md` is the source of truth for public-community discovery, locked `members_only` / `invite_only` rows, hidden `private` channels, and post-join unlock assumptions.

## External-Only Blockers

- mac signing / notarization credentials: A real Developer ID certificate and Apple notarization credentials are available in signing.env or an explicit env override.
- Windows code-signing credentials: A real Windows code-signing certificate and password are available in signing.env or an explicit env override.
- Real iPhone Korean IME confirmation: The physical-device Korean IME checklist has been run once and recorded with a real iPhone result.

## Manual Operator Gates

- Desktop signing credential gate (external-only blocker)
  - When to run: Before attempting signed macOS or Windows release commands, or any time the question is whether signed release readiness changed.
  - Unblock when: A real signing.env or explicit env override exists and all Apple/Windows signing values are real rather than placeholders.
  - Repo-local evidence: npm run release:next; apps/desktop/dist/signing-blockers.md; apps/desktop/dist/signing-blockers.json; apps/desktop/RELEASE.md
  - Keep out of engineering when: The only missing inputs are signing credentials, certificates, or signed artifact generation in the current workspace snapshot.
- Real-device Korean IME gate (external-only blocker)
  - When to run: Before claiming final mobile confidence beyond simulator coverage.
  - Unblock when: The physical-device Korean IME checklist has been executed once and recorded with a real iPhone result.
  - Repo-local evidence: docs/mobile-korean-ime-checklist-2026-03-26.md; docs/mobile-korean-ime-report-template-2026-03-26.md
  - Keep out of engineering when: Simulator validation is green and the remaining gap is only the physical-device confirmation pass.
- Object storage operator gate (manual operator gate)
  - When to run: Before claiming attachment upload/download readiness in a target deployment.
  - Unblock when: Real storage env values are present, /api/health/ready still excludes storage by design, and the separate storage gate passes.
  - Repo-local evidence: /api/health/ready; npm run verify:release-readiness; docs/final-operator-checklist-2026-04-07.md#3a-storage-and-voice-operator-gates
  - Keep out of engineering when: Baseline readiness is green and the remaining uncertainty is deploy-time S3/MinIO configuration rather than a reproduced repo defect.
- Voice / LiveKit operator gate (manual operator gate)
  - When to run: Before claiming voice/video readiness in a target deployment.
  - Unblock when: Real LiveKit env values are present, /api/health/ready still excludes voice by design, and the separate voice gate passes.
  - Repo-local evidence: /api/health/ready; npm run verify:release-readiness; docs/final-operator-checklist-2026-04-07.md#3a-storage-and-voice-operator-gates
  - Keep out of engineering when: Baseline readiness is green and the remaining uncertainty is LiveKit/operator setup rather than a reproduced repo defect.

## Operator Triage Order

- 1. Read deploy/runtime authority first: `docs/README.md -> docs/production-runtime-runbook.md -> docs/release-readiness-checklist-2026-03-25.md` (Start from the runtime and verification source of truth before classifying a blocker.)
- 2. Refresh the current release snapshot: `npm run release:next` (Regenerate the repo-local blocker snapshot so operators do not reason from stale dist state.)
- 3. Recheck operator-doc alignment after snapshot/doc edits: `npm run operator:handoff:check` (Confirm the blocker summary, current status, final operator checklist, and snapshot still agree.)
- 4. Use the smallest automation shortlist before widening scope: `npm run operator:smoke:inventory` (Pick the current smallest repo-local smoke command instead of reopening broad engineering work.)
- 5. Separate code failures from operator/environment gaps: `.zkcoder/scripts/verify.sh` (If repo-local verification passes, keep credentials, accounts, and device needs in operator docs.)

## Do Not Reopen As Code Blockers

- Missing signing.env in a fresh workspace
- A cleaned apps/desktop/dist directory
- A dirty worktree that still contains active user-authored changes
- Credential placeholders or missing certificates in the current operator environment
- Real-device confirmation work that cannot be completed repo-locally

## Reopen Engineering Only When

- Escalate to engineering only when a documented repo-local verification command fails unexpectedly.
- Escalate to engineering only when release snapshots contradict the current source-of-truth docs.
- Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.
- If the next action still requires credentials, account access, or a physical device, keep it in operator/blocker docs instead of reopening code work.
- Escalate to engineering only when a visibility-policy change updates the matrix, API reference, and deterministic tests together rather than reopening the policy from operator notes alone.

## Runbooks

- Desktop signing runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md`
- Mobile Korean IME checklist: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`
- Final operator checklist: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md`

## Source Of Truth

- Docs index: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md`
- Current status: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md`
- Blocker summary: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md`
- Runtime runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/production-runtime-runbook.md`
- Final operator checklist: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/final-operator-checklist-2026-04-07.md`
- Commercialization plan: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md`
- Implementation plan: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md`
- Visibility matrix: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/community-visibility-matrix-2026-04-10.md`

## Snapshot Files

- Repo JSON snapshot: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.json`
- Desktop JSON snapshot: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-next.json`
