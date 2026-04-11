# Community Visibility Matrix (2026-04-10)

This file is the Phase 7 source of truth for how community discoverability and channel access work together in zkTalk.

Use it when changing:

- discover/community listing behavior
- channel list payloads for members and non-members
- locked-channel UX copy or join/invite prompts
- join/unlock behavior after entering a public community
- release-readiness notes that mention public communities or restricted channels

Do not reopen the product policy from scratch unless one of the assumptions in `Operator assumptions` changes.

## Product policy

zkTalk separates two decisions:

1. Community visibility decides whether the community itself can be discovered or directly joined.
2. Channel access policy decides what a user can see inside that community before and after membership.

This is intentional. Public communities may expose only a small onboarding surface while keeping the rest of the conversation protected.

## Final matrix

### Community-level behavior

| Community visibility | Discover listing | Direct join | Invite join | Default `#general` access |
| --- | --- | --- | --- | --- |
| `public` | Visible | Allowed | Allowed | `public` |
| `invite_only` | Hidden | Blocked | Allowed | `members_only` |
| `private` | Hidden | Blocked | Allowed | `members_only` |

### Channel-level behavior

This matrix describes what a non-member can see when the community itself is `public`.

| Channel access policy | Non-member sees row | Non-member can open | Locked reason | After join |
| --- | --- | --- | --- | --- |
| `public` | Yes | Yes | None | Still open |
| `members_only` | Yes | No | `join_required` | Unlocks for active members |
| `invite_only` | Yes | No | `invite_required` | Only unlocks if the member also has an allowed role |
| `private` | No | No | N/A | Only visible to allowed roles |

For `invite_only` and `private` communities, non-members cannot browse channels at all. The API must reject channel listing for those communities.

## Operator assumptions

- Community discovery only returns `public` communities.
- `POST /api/communities/:communityId/join` is the public self-serve entry point and accepts either a UUID or slug reference.
- A `public` channel is only valid inside a `public` community.
- `members_only` and `public` channels cannot carry role-restricted allow-lists.
- `invite_only` and `private` channels require at least one allowed view role.
- `private` channels stay hidden from non-members instead of rendering as locked rows.
- archived channels stay out of public and member browse payloads; they are not part of the discoverable runtime surface.
- Locked rows are a deliberate product choice for `members_only` and `invite_only` channels in `public` communities because they advertise the community structure without leaking message content.
- Joining a `public` community only guarantees access to `members_only` channels. It does not bypass role-gated `invite_only` or `private` channels.
- Onboarding starter-channel curation may include `public`, `members_only`, or `invite_only` channels, but must exclude `private` channels so the configured list always maps to a visible runtime surface.
- Search, unread, restore-last-visited, realtime subscriptions, and cached channel content must follow the same access boundary and must not reveal restricted-channel data to non-members.
- Channel-scoped P2P file discovery over realtime must require the same channel access check as message reads; unauthorized or stale subscribers cannot trigger `p2p.file_request` fan-out into protected channels.
- Missing signing credentials or real-device checks are not blockers for this policy. They stay external-only unless this visibility behavior regresses repo-local verification.

## Implementation anchors

- API browse policy: [apps/api/src/modules/channel/channel.service.ts](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/channel/channel.service.ts)
- Channel access enforcement: [apps/api/src/modules/channel/channel-access.service.ts](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/channel/channel-access.service.ts)
- Shared client visibility helper: [packages/shared/src/utils/channel-visibility.ts](/Users/hyunokoh/Documents/Projects/zkTalk/packages/shared/src/utils/channel-visibility.ts)
- Community join and visibility guardrails: [apps/api/src/modules/community/community.service.ts](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/community/community.service.ts)
- Web discover entry point: [apps/web/src/app/(app)/discover/page.tsx](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/(app)/discover/page.tsx)
- Locked-channel UX coverage: [apps/web/src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/components/ChannelSidebar/__tests__/ChannelSidebar.test.tsx)
- Desktop parity note: the Electron desktop shell inherits the same web locked-row and deep-link runtime surfaces, so `apps/web` visibility behavior is the desktop source of truth unless a desktop-only wrapper change says otherwise.
- Repo-local smoke: [e2e/tests/community-visibility.smoke.spec.ts](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/tests/community-visibility.smoke.spec.ts)
  - Current assertions explicitly cover anonymous discovery, direct public-channel access for a non-member, locked `members_only` denial before join, private-community browse denial, and post-join unlock while keeping `invite_only` role gates closed

## Verification anchors

- Required run-close gate: `.zkcoder/scripts/verify.sh`
- Targeted smoke evidence: `pnpm playwright test e2e/tests/community-visibility.smoke.spec.ts`
- Web regression evidence for locked rows and join prompts:
  - `pnpm --filter @zktalk/web test -- ChannelSidebar`
  - `pnpm --filter @zktalk/web test -- layout.test.tsx`
  - `pnpm --filter @zktalk/web test -- discover`

## Change rule

If a future change wants to alter whether restricted channels are hidden or shown as locked rows, update this file, the API reference, and the deterministic tests in the same batch. Policy discussion without test and doc updates is incomplete.
