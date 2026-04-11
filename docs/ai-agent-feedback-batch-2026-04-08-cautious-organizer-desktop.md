# AI-Agent Feedback Batch: Cautious Organizer Desktop-First (2026-04-08)

Status: completed repo-local evidence pass

This entry records the concrete `Queue item 104` execution for one desktop-first synthetic-user pass.

Template source:

- [AI-agent feedback template](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-template.md)

Evidence sources used for this pass:

- [desktop-harness page](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/desktop-harness/page.tsx)
- [desktop-harness test](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/desktop-harness/__tests__/page.test.tsx)
- [error-copy mapping](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/error-copy.ts)
- [AI-agent feedback runbook](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ai-agent-feedback-runbook.md)
- [Current status](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)

## Run metadata

- Date: 2026-04-08
- Run id: `poc-2026-04-08T00-57-43-057Z-a1`
- Persona: `Cautious Organizer`
- Scenario id: `desktop-core-comm`
- Device context: desktop-first, repo-local desktop harness evidence
- Runtime path: `apps/web/src/app/desktop-harness/page.tsx`
- Build or harness notes: direct runtime execution was not available in this sandbox; evidence is grounded in the current harness implementation plus focused tests
- Operator assumptions:
  - desktop harness is the explicit bearer-auth exception path
  - this pass covers desktop handoff into a channel or DM, not full mobile continuity
  - storage, LiveKit, signing, and real-device IME remain external or separate operator-gate concerns unless a repo-local defect is proven
- Evidence sources:
  - `readDesktopHarnessRequest()` enforces trimmed required params before any auth-bearing request
  - `DesktopHarnessPage` fetches `/api/me`, posts the message, then redirects to the target surface
  - `getDesktopHarnessErrorMessage()` maps auth/not-found/network cases to product copy instead of exposing raw error text
  - page tests prove channel path, DM path, invalid-link failure, and sanitized 403 failure copy

## Scenario target

- Goal: verify whether a cautious desktop operator can trust a desktop handoff into a real communication destination
- Start point: desktop harness link with `mode`, `sessionToken`, `body`, and destination params
- Required path:
  - open handoff link
  - validate params
  - reuse or replace session token
  - fetch current user
  - send message to target channel or DM
  - redirect into the communication surface
- Edge exercised: incomplete link rejection before any API request

## Timeline

| Step | Action | Expected result | Actual result |
| --- | --- | --- | --- |
| 1 | Open a valid channel handoff link | Harness should parse params and show in-progress state | `readDesktopHarnessRequest()` requires `mode`, `sessionToken`, `body`, `channelId`, and `communitySlug` before proceeding |
| 2 | Reconcile session token and fetch `/api/me` | Desktop-only bearer path should stay explicit and deterministic | `DESKTOP_HARNESS_AUTH_OPTIONS` keeps auth mode on the explicit bearer path; test coverage confirms `/api/me` is called first |
| 3 | Send the message and redirect | Message should be posted and the user should land in the destination surface | Channel and DM tests confirm post-plus-redirect behavior |
| 4 | Trigger a malformed link | The page should fail closed before auth-bearing requests | The invalid-link test confirms no API call occurs and product copy is shown |
| 5 | Trigger a 403-like failure | Internal exception details should not leak to the user | Failure copy is mapped to `common.notAuthorized` instead of raw backend text |

## Required answers

- First confusing moment: before this run, the harness screen exposed only a generic progress state, so a cautious organizer had no visible confirmation of which destination or message was being sent.
- Trust signal or trust break: trust improves because invalid links fail before auth-bearing requests and raw backend errors are sanitized. Trust drops if the page hides destination context during send/redirect because the user cannot confirm they are handing content to the right place.
- Commercially risky or unfinished feeling: a handoff page that immediately sends content without visible destination context feels risky for admins coordinating a real group, even when the underlying request path is correct.
- Avoidable extra effort: the user had to infer the target from the original link or surrounding app state instead of reading it directly on the handoff screen.
- Awkward label, message, or flow: the previous UI copy emphasized "desktop regression" rather than the practical destination or message context a real user would care about.
- Would this persona recommend zkTalk today? Why: not for a broader pilot on this exact harness state; yes for continued internal operator use after adding visible destination and message-preview context because the failure behavior is already appropriately fail-closed.

## Findings

| Severity | Classification | Surface | Observation | Suggested change |
| --- | --- | --- | --- | --- |
| `pilot-risk` | engineering | `apps/web/src/app/desktop-harness/page.tsx` | The handoff page previously hides the destination and message context during the send flow, which undermines trust for a cautious desktop operator. | Show the handoff mode, destination, and a short message preview before redirect. |
| `minor` | engineering | `apps/web/src/lib/i18n/locales/en.ts`, `apps/web/src/lib/i18n/locales/ko.ts` | Existing copy focused on regression language instead of user-facing confirmation. | Add labels for mode, destination, and message preview so the handoff reads like a controlled transfer rather than a test harness only. |
| `minor` | needs-reproduction | desktop-to-mobile continuity | This pass did not exercise real device switching, unread state, or continuity recovery. | Use the same template for a later cross-device run once local mobile evidence is available. |

## Blockers

- Blocking issue: no repo-local blocker prevented this desktop-first pass
- Blocker type: none for the desktop harness slice; separate external blockers still exist for signing credentials and real-device IME confidence
- Evidence: [CURRENT_STATUS.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)
- Next owner: engineering for repo-local trust polish, operator for external credential/device gates
- Next action: keep cross-device and mobile passes separate from the resolved desktop-harness trust improvement

## Summary for queue regeneration

- Highest-leverage next item: execute the next persona batch on mobile or cross-device continuity, reusing this evidence format and keeping external blockers explicitly separate
- Why this matters before external pilots: it converts the synthetic-user program from a scaffold into a concrete commercialization input with actionable product-feel findings
- Smallest verification path:
  - `.zkcoder/scripts/verify.sh`
  - `pnpm --dir apps/web test -- --run src/app/desktop-harness/__tests__/page.test.tsx`
