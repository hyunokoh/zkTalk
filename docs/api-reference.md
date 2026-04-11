# zkTalk REST API Reference

Base URL: `http://localhost:4000` (development)

## Authentication

Most endpoints require authentication via one of:
- **Cookie**: `zktalk_session=<JWT>` (set automatically by login endpoints)
- **Bearer token**: `Authorization: Bearer <JWT>`

Endpoints marked **Auth: None** do not require authentication.

---

## 1. Auth

### POST /api/auth/magic-link/request
Request a magic link for email authentication.

**Auth:** None

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email address |

**Response:** `200 OK`
```json
{ "token": "abc123..." }
```

---

### POST /api/auth/magic-link/verify
Verify a magic link token and create a session.

**Auth:** None

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Token from magic link |

**Response:** `200 OK` (sets `zktalk_session` cookie)
```json
{ "success": true, "sessionToken": "jwt..." }
```

---

### POST /api/auth/phone/request
Request SMS OTP for phone authentication.

**Auth:** None

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phoneNumber | string | Yes | E.164 format phone number |

**Response:** `200 OK`
```json
{ "sent": true, "code": "123456" }
```
> `code` is only returned in development mode.

---

### POST /api/auth/phone/verify
Verify phone OTP and create a session.

**Auth:** None

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phoneNumber | string | Yes | E.164 format |
| code | string | Yes | 6-digit OTP code |

**Response:** `200 OK`
```json
{ "success": true, "sessionToken": "jwt..." }
```

---

### POST /api/auth/oauth/google
Authenticate via Google OAuth.

**Auth:** None

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| idToken | string | Yes | Google ID token |

**Response:** `200 OK`
```json
{ "success": true }
```

---

### POST /api/auth/oauth/apple
Authenticate via Apple Sign-In.

**Auth:** None

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| idToken | string | Yes | Apple ID token |
| name | string | No | User's name (first sign-in only) |

**Response:** `200 OK`
```json
{ "success": true }
```

---

### POST /api/auth/qr/generate
Generate a QR code token for cross-device login.

**Auth:** None

**Response:** `200 OK`
```json
{ "qrToken": "...", "expiresAt": "..." }
```

---

### POST /api/auth/qr/confirm
Confirm a QR login from an authenticated device.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| qrToken | string | Yes | Token from QR code |

**Response:** `200 OK`
```json
{ "success": true }
```

---

### GET /api/auth/qr/status/:token
Check QR login status (poll from unauthenticated device).

**Auth:** None

**Response:** `200 OK`
```json
{ "status": "pending" }
```
or (sets session cookie):
```json
{ "status": "confirmed" }
```

---

### POST /api/auth/logout
Clear session cookie.

**Auth:** None

**Response:** `200 OK`
```json
{ "success": true }
```

---

### GET /api/me
Get current user profile.

**Auth:** Required

**Response:** `200 OK`
```json
{ "user": { "id": "...", "email": "...", "displayName": "...", "username": "...", "bio": "...", "avatarUrl": "..." } }
```

---

### PATCH /api/me
Update current user profile.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| displayName | string | No | Display name |
| bio | string | No | Bio text |
| avatarUrl | string | No | Avatar URL |
| username | string | No | Username |

**Response:** `200 OK`
```json
{ "user": { ... } }
```

---

### POST /api/me/link
Link an additional auth method to the account.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Auth method type |
| identifier | string | Yes | Identifier (email, phone, etc.) |

**Response:** `200 OK`
```json
{ "method": { ... } }
```

---

### GET /api/me/auth-methods
List linked authentication methods.

**Auth:** Required

**Response:** `200 OK`
```json
{ "methods": [ ... ] }
```

---

### DELETE /api/me/auth-methods/:id
Unlink an authentication method.

**Auth:** Required

**Response:** `200 OK`
```json
{ "success": true }
```

---

### PUT /api/me/keys
Set E2EE public key for the current user.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| publicKey | string | Yes | Base64-encoded public key |

**Response:** `200 OK`
```json
{ "publicKey": "..." }
```

---

### GET /api/users/:userId/keys
Get a user's E2EE public key.

**Auth:** Required

**Response:** `200 OK`
```json
{ "publicKey": "..." }
```

---

## 2. Communities

### GET /api/communities
List communities the current user belongs to.

**Auth:** Required

**Response:** `200 OK`
```json
{ "communities": [ { "id": "...", "name": "...", "slug": "...", ... } ] }
```

---

### POST /api/communities
Create a new community.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Community name |
| slug | string | Yes | URL slug |
| description | string | No | Description |
| visibility | string | No | "public", "invite_only", or "private" |

**Response:** `201 Created`
```json
{ "community": { ... } }
```

---

### GET /api/communities/:communityId
Get community by ID (UUID) or slug.

**Auth:** Required

Non-members may only open `public` communities. `invite_only` and `private` communities return `403 Forbidden` unless the caller already has an active membership.

**Response:** `200 OK`
```json
{
  "community": {
    "id": "...",
    "name": "...",
    "slug": "...",
    "description": "...",
    "visibility": "public",
    "discovery": {
      "isDiscoverable": true,
      "canSelfJoin": true
    },
    "isMember": false
  }
}
```

---

### PATCH /api/communities/:communityId
Update community settings.

**Auth:** Required (owner/admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| description | string | No | New description |
| visibility | string | No | "public", "invite_only", or "private" |
| iconUrl | string | No | New icon URL |

Communities cannot move to `invite_only` or `private` while any channel still uses the `public` access policy.

**Response:** `200 OK`
```json
{ "community": { ... } }
```

---

### DELETE /api/communities/:communityId
Delete a community (owner only).

**Auth:** Required (owner)

**Response:** `204 No Content`

---

### GET /api/communities/:communityId/members
List community members.

**Auth:** Required (member)

**Response:** `200 OK`
```json
{ "members": [ { "userId": "...", "displayName": "...", "role": "...", ... } ] }
```

---

### POST /api/communities/:communityId/invites
Create an invite link.

**Auth:** Required (member with invite permission)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| maxUses | number | No | Maximum uses |
| expiresInHours | number | No | Hours until expiry |

**Response:** `201 Created`
```json
{ "invite": { "code": "...", "url": "...", ... } }
```

---

### POST /api/invites/:code/join
Join a community via invite code.

**Auth:** Required

**Response:** `200 OK`
```json
{ "community": { ... }, "membership": { ... } }
```

---

### POST /api/communities/:communityId/join
Join a public community directly.

**Auth:** Required

`communityId` accepts either the UUID or the community slug so web/mobile discover flows can join without first resolving a second identifier.

**Response:** `200 OK`

---

### POST /api/communities/:communityId/leave
Leave a community.

**Auth:** Required

**Response:** `200 OK`
```json
{ "success": true }
```

---

### GET /api/communities/:communityId/roles
List roles in a community.

**Auth:** Required

**Response:** `200 OK`
```json
{ "roles": [ ... ] }
```

---

### PATCH /api/communities/:communityId/members/:userId/role
Assign a role to a member.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | Yes | Role name to assign |

**Response:** `200 OK`

---

### GET /api/communities/:communityId/onboarding
Get community onboarding settings.

**Auth:** Required

**Response:** `200 OK`
```json
{ "onboarding": { "welcomeMessage": "...", "rules": [...], ... } }
```

---

### PUT /api/communities/:communityId/onboarding
Update onboarding settings.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| welcomeMessage | string | No | Welcome message |
| rules | string[] | No | Community rules |
| defaultChannelIds | string[] | No | Default channels for new members |
| isEnabled | boolean | No | Enable/disable onboarding |

**Response:** `200 OK`

---

## 3. Channels

### POST /api/communities/:communityId/categories
Create a category.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Category name |
| position | number | No | Sort position |

**Response:** `201 Created`

---

### PATCH /api/categories/:categoryId
Update a category.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| position | number | No | New position |

**Response:** `200 OK`

---

### DELETE /api/categories/:categoryId
Delete a category (must be empty).

**Auth:** Required (admin)

**Response:** `204 No Content`

---

### GET /api/communities/:communityId/channels
List channels grouped by category.

**Auth:** Required

Active members receive only channels they can view. Logged-in non-members can browse channels in a `public` community with this visibility policy:

- `public`: returned as normal and can be opened immediately
- `members_only`: returned as a locked row with `canView: false` and `lockedReason: "join_required"`
- `invite_only`: returned as a locked row with `canView: false` and `lockedReason: "invite_required"`
- `private`: hidden from non-members

**Response:** `200 OK`
```json
{ "categories": [ { "id": "...", "name": "...", "channels": [ ... ] } ], "uncategorized": [ ... ] }
```

---

### POST /api/communities/:communityId/channels
Create a channel.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Channel name |
| description | string | No | Description |
| type | string | No | "chat", "announcement", or "forum" |
| categoryId | string | No | Category to place in |
| visibility | string | No | "public" or "role_restricted" |
| accessPolicy | string | No | "public", "members_only", "invite_only", or "private" |
| slowModeSeconds | number | No | Slow mode interval |

`accessPolicy` is the commercial visibility policy. `public` is only valid inside a `public` community. `invite_only` and `private` channels must provide at least one allowed view role.

**Response:** `201 Created`

---

### GET /api/channels/:channelId
Get channel details.

**Auth:** Required

**Response:** `200 OK`
```json
{ "channel": { "id": "...", "name": "...", "type": "...", ... } }
```

---

### PATCH /api/channels/:channelId
Update a channel.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | New name |
| description | string | No | New description |
| visibility | string | No | "public" or "role_restricted" |
| accessPolicy | string | No | "public", "members_only", "invite_only", or "private" |
| slowModeSeconds | number | No | Slow mode interval |
| categoryId | string | No | Move to category |
| position | number | No | Sort position |
| disappearingDuration | number | No | Disappearing message duration (ms) |

When `accessPolicy` moves to `public` or `members_only`, any channel-specific role gate is cleared. When it moves to `invite_only` or `private`, at least one allowed view role must be supplied when creating the restriction.
Restricted role updates must include `allowedViewRoleIds` whenever `allowedPostRoleIds` is sent so an existing invite-only/private channel cannot accidentally lose its view allow-list.

Community visibility and channel access policy must stay compatible. A community cannot be switched to `invite_only` or `private` while any channel still uses the `public` access policy.

**Response:** `200 OK`

---

### POST /api/channels/:channelId/archive
Archive a channel.

**Auth:** Required (admin)

**Response:** `200 OK`

---

## 4. Messages

### GET /api/channels/:channelId/messages
List messages with cursor-based pagination.

**Auth:** Required

**Query parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cursor | string | No | Pagination cursor |
| limit | number | No | Results per page (default 50) |
| topic | string | No | Filter by topic |

**Response:** `200 OK`
```json
{ "messages": [ ... ], "nextCursor": "..." }
```

---

### POST /api/channels/:channelId/messages
Send a message.

**Auth:** Required

**Headers:** `X-Request-Id` (optional, for idempotency)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bodyMarkdown | string | Yes | Message content in Markdown |
| parentMessageId | string | No | Reply-to message ID |
| topic | string | No | Topic for Zulip-style threading |

**Response:** `201 Created`
```json
{ "id": "...", "bodyMarkdown": "...", "authorUserId": "...", ... }
```

---

### POST /api/channels/:channelId/messages/sealed
Send a sealed sender (metadata-protected) message.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| encryptedPayload | string | Yes | Encrypted message payload |

**Response:** `201 Created`

---

### PATCH /api/messages/:messageId
Edit a message (author only).

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bodyMarkdown | string | Yes | Updated content |

**Response:** `200 OK`

---

### DELETE /api/messages/:messageId
Soft-delete a message (author or moderator).

**Auth:** Required

**Response:** `204 No Content`

---

### GET /api/channels/:channelId/topics
List distinct topics in a channel.

**Auth:** Required

**Response:** `200 OK`
```json
{ "topics": [ "general", "bugs", ... ] }
```

---

## 5. Threads

### POST /api/messages/:messageId/thread
Create a thread from an existing message.

**Auth:** Required

**Response:** `201 Created`

---

### POST /api/channels/:channelId/threads
Create a forum post (thread + root message).

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Post title |
| bodyMarkdown | string | Yes | Post body |

**Response:** `201 Created`

---

### GET /api/channels/:channelId/threads
List threads in a forum channel.

**Auth:** Required

**Query parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cursor | string | No | Pagination cursor |
| limit | number | No | Results per page |
| sort | string | No | "latest", "newest", or "oldest" |

**Response:** `200 OK`
```json
{ "threads": [ ... ], "nextCursor": "..." }
```

---

### GET /api/threads/:threadId/messages
Get messages in a thread.

**Auth:** Required

**Query:** `cursor`, `limit`

**Response:** `200 OK`
```json
{ "messages": [ ... ], "nextCursor": "..." }
```

---

### POST /api/threads/:threadId/messages
Reply to a thread.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bodyMarkdown | string | Yes | Reply content |

**Response:** `201 Created`

---

### POST /api/threads/:threadId/follow
Follow a thread.

**Auth:** Required

**Response:** `200 OK`

---

### DELETE /api/threads/:threadId/follow
Unfollow a thread.

**Auth:** Required

**Response:** `200 OK`

---

### POST /api/threads/:threadId/lock
Lock a thread (moderator).

**Auth:** Required (moderator)

**Response:** `200 OK`

---

## 6. Reactions

### POST /api/messages/:messageId/reactions
Add a reaction to a message.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| emoji | string | Yes | Emoji character or custom name |

**Response:** `201 Created`

---

### DELETE /api/messages/:messageId/reactions/:emoji
Remove a reaction.

**Auth:** Required

**Response:** `200 OK`

---

### GET /api/messages/:messageId/reactions
Get reactions for a message.

**Auth:** Required

**Response:** `200 OK`
```json
{ "reactions": [ { "emoji": "...", "count": 3, "users": [ ... ] } ] }
```

---

## 7. DMs

### POST /api/dm/conversations
Create a 1:1 DM conversation.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetUserId | string | Yes | User ID to DM |

**Response:** `201 Created`

---

### POST /api/dm/conversations/group
Create a group DM.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| participantUserIds | string[] | Yes | User IDs |
| name | string | No | Group name |

**Response:** `201 Created`

---

### GET /api/dm/conversations
List DM conversations.

**Auth:** Required

**Response:** `200 OK`
```json
{ "conversations": [ ... ] }
```

---

### GET /api/dm/conversations/:conversationId
Get a DM conversation.

**Auth:** Required

**Response:** `200 OK`

---

### GET /api/dm/conversations/:conversationId/messages
List DM messages.

**Auth:** Required

**Query:** `cursor`, `limit`

**Response:** `200 OK`
```json
{ "messages": [ ... ], "nextCursor": "..." }
```

---

### POST /api/dm/conversations/:conversationId/messages
Send a DM message.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bodyMarkdown | string | Yes | Message content |
| isEncrypted | boolean | No | Whether E2EE encrypted |

**Response:** `201 Created`

---

### PATCH /api/dm/messages/:messageId
Edit a DM message.

**Auth:** Required (author)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bodyMarkdown | string | Yes | Updated content |

**Response:** `200 OK`

---

### DELETE /api/dm/messages/:messageId
Delete a DM message.

**Auth:** Required (author)

**Response:** `204 No Content`

---

### GET /api/dm/conversations/:conversationId/read-status
Get read status for a DM conversation.

**Auth:** Required

**Response:** `200 OK`
```json
{ "readStatus": [ ... ] }
```

---

### POST /api/dm/conversations/:conversationId/read
Mark a DM conversation as read.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messageId | string | Yes | Last read message ID |

**Response:** `204 No Content`

---

### POST /api/dm/conversations/:conversationId/members
Add a member to a group DM.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User ID to add |

**Response:** `201 Created`

---

### DELETE /api/dm/conversations/:conversationId/members/me
Leave a group DM.

**Auth:** Required

**Response:** `204 No Content`

---

## 8. Voice

### POST /api/channels/:channelId/voice/join
Join a voice channel. Returns a token for the voice server.

**Auth:** Required

**Response:** `200 OK`
```json
{ "token": "...", "roomName": "...", "participants": [ ... ] }
```

---

### POST /api/channels/:channelId/voice/leave
Leave a voice channel.

**Auth:** Required

**Response:** `200 OK`
```json
{ "success": true }
```

---

### GET /api/channels/:channelId/voice/participants
List current voice participants.

**Auth:** Required

**Response:** `200 OK`
```json
{ "participants": [ { "userId": "...", "displayName": "...", ... } ] }
```

---

### POST /api/channels/:channelId/voice/token
Generate a voice token (legacy endpoint).

**Auth:** Required

**Response:** `200 OK`
```json
{ "token": "...", "roomName": "channel-..." }
```

---

## 9. Search

### GET /api/search/messages
Full-text search across messages.

**Auth:** Required

**Query parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| q | string | Yes | Search query |
| communityId | string | No | Filter by community |
| channelId | string | No | Filter by channel |
| authorId | string | No | Filter by author |
| hasAttachment | boolean | No | Filter messages with attachments |
| dateFrom | string | No | ISO date filter start |
| dateTo | string | No | ISO date filter end |
| cursor | string | No | Pagination cursor |
| limit | number | No | Results per page |

**Response:** `200 OK`
```json
{ "messages": [ ... ], "nextCursor": "..." }
```

---

## 10. Bookmarks

### POST /api/bookmarks/:messageId
Bookmark a message.

**Auth:** Required

**Response:** `201 Created`

---

### DELETE /api/bookmarks/:messageId
Remove a bookmark.

**Auth:** Required

**Response:** `204 No Content`

---

### GET /api/bookmarks
List bookmarks.

**Auth:** Required

**Query:** `cursor`, `limit`

**Response:** `200 OK`
```json
{ "bookmarks": [ ... ], "nextCursor": "..." }
```

---

## 11. Pins

### POST /api/channels/:channelId/pins/:messageId
Pin a message.

**Auth:** Required (moderator)

**Response:** `201 Created`

---

### DELETE /api/channels/:channelId/pins/:messageId
Unpin a message.

**Auth:** Required (moderator)

**Response:** `204 No Content`

---

### GET /api/channels/:channelId/pins
List pinned messages.

**Auth:** Required

**Response:** `200 OK`
```json
{ "pins": [ ... ] }
```

---

## 12. Polls

### POST /api/channels/:channelId/polls
Create a poll.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | string | Yes | Poll question |
| options | string[] | Yes | Answer options (2-10) |
| isAnonymous | boolean | No | Anonymous voting |
| allowMultiple | boolean | No | Multiple choice |
| expiresInHours | number | No | Expiration time |

**Response:** `201 Created`

---

### GET /api/channels/:channelId/polls
List polls in a channel.

**Auth:** Required

**Response:** `200 OK`
```json
{ "polls": [ ... ] }
```

---

### GET /api/polls/:pollId
Get poll with results.

**Auth:** Required

**Response:** `200 OK`

---

### POST /api/polls/:pollId/vote
Vote on a poll.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| optionId | string | Yes | Option ID |

**Response:** `201 Created`

---

### DELETE /api/polls/:pollId/vote/:optionId
Remove a vote.

**Auth:** Required

**Response:** `204 No Content`

---

## 13. ZK-Voting

### POST /api/channels/:channelId/zk-polls
Create a ZK anonymous poll.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | string | Yes | Poll question |
| options | string[] | Yes | Options |

**Response:** `201 Created`

---

### POST /api/zk-polls/:pollId/vote
Submit an anonymous ZK vote.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| voteHash | string | Yes | Cryptographic vote hash |
| nullifier | string | Yes | Nullifier to prevent double-voting |
| optionId | string | Yes | Option ID |

**Response:** `201 Created`

---

### GET /api/zk-polls/:pollId/results
Get ZK poll results.

**Auth:** Required

**Response:** `200 OK`

---

### POST /api/zk-polls/:pollId/verify
Verify a ZK vote.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nullifier | string | Yes | Nullifier |
| secret | string | Yes | Vote secret |
| optionId | string | Yes | Option ID |

**Response:** `200 OK`

---

## 14. Events

### POST /api/communities/:communityId/events
Create an event.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Event title |
| description | string | No | Description |
| startAt | string | Yes | ISO 8601 start time |
| endAt | string | No | ISO 8601 end time |
| location | string | No | Location |

**Response:** `201 Created`
```json
{ "event": { ... } }
```

---

### GET /api/communities/:communityId/events
List upcoming events.

**Auth:** Required

**Response:** `200 OK`
```json
{ "events": [ ... ] }
```

---

### GET /api/events/:eventId
Get event details.

**Auth:** Required

**Response:** `200 OK`
```json
{ "event": { ... } }
```

---

### PATCH /api/events/:eventId
Update an event.

**Auth:** Required (creator)

**Response:** `200 OK`

---

### DELETE /api/events/:eventId
Delete an event.

**Auth:** Required (creator)

**Response:** `204 No Content`

---

### POST /api/events/:eventId/rsvp
RSVP to an event.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | "going", "interested", or "not_going" |

**Response:** `200 OK`

---

### DELETE /api/events/:eventId/rsvp
Cancel RSVP.

**Auth:** Required

**Response:** `204 No Content`

---

## 15. Friends

### POST /api/friends/request
Send a friend request.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | Target user ID |

**Response:** `201 Created`
```json
{ "friendship": { ... } }
```

---

### POST /api/friends/:friendshipId/accept
Accept a friend request.

**Auth:** Required

**Response:** `200 OK`

---

### DELETE /api/friends/:friendshipId
Remove a friend or decline a request.

**Auth:** Required

**Response:** `204 No Content`

---

### POST /api/friends/:friendshipId/block
Block a user.

**Auth:** Required

**Response:** `200 OK`

---

### GET /api/friends
List friends.

**Auth:** Required

**Query:** `status` (optional: "pending", "accepted", "blocked")

**Response:** `200 OK`
```json
{ "friends": [ ... ] }
```

---

### GET /api/friends/check/:userId
Check friendship status with a user.

**Auth:** Required

**Response:** `200 OK`

---

## 16. Contacts

### POST /api/contacts/sync
Upload SHA-256 hashes of phone contacts to find matching zkTalk users.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hashes | string[] | Yes | SHA-256 hashes of contact phone numbers |

**Response:** `200 OK`

---

### GET /api/contacts/suggestions
Get contact-based friend suggestions.

**Auth:** Required

**Response:** `200 OK`
```json
{ "suggestions": [ ... ] }
```

---

## 17. AutoMod

### GET /api/communities/:communityId/automod/rules
List auto-moderation rules.

**Auth:** Required

**Response:** `200 OK`
```json
{ "rules": [ ... ] }
```

---

### POST /api/communities/:communityId/automod/rules
Create an auto-moderation rule.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Rule name |
| type | string | Yes | Rule type |
| pattern | string | No | Match pattern |
| action | string | Yes | Action to take |

**Response:** `201 Created`

---

### PATCH /api/automod/rules/:ruleId
Update a rule.

**Auth:** Required (admin)

**Response:** `200 OK`

---

### DELETE /api/automod/rules/:ruleId
Delete a rule.

**Auth:** Required (admin)

**Response:** `204 No Content`

---

## 18. Custom Emoji

### GET /api/communities/:communityId/emojis
List custom emojis.

**Auth:** Required

**Response:** `200 OK`
```json
{ "emojis": [ ... ] }
```

---

### POST /api/communities/:communityId/emojis
Create a custom emoji.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Emoji name (e.g., "party_parrot") |
| imageUrl | string | Yes | URL to emoji image |

**Response:** `201 Created`

---

### DELETE /api/emojis/:emojiId
Delete a custom emoji.

**Auth:** Required (admin)

**Response:** `204 No Content`

---

## 19. Webhooks & Bots

### POST /api/communities/:communityId/webhooks
Create a webhook.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channelId | string | Yes | Target channel |
| name | string | Yes | Webhook name |
| avatarUrl | string | No | Webhook avatar |

**Response:** `201 Created`
```json
{ "webhook": { "id": "...", "token": "...", ... } }
```

---

### GET /api/communities/:communityId/webhooks
List webhooks.

**Auth:** Required

**Response:** `200 OK`
```json
{ "webhooks": [ ... ] }
```

---

### DELETE /api/webhooks/:webhookId
Delete a webhook.

**Auth:** Required (admin)

**Response:** `204 No Content`

---

### POST /api/webhooks/:token/execute
Execute a webhook (send a message). Token-based auth, no session required.

**Auth:** Webhook token (in URL)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | Message content |
| username | string | No | Override display name |
| avatarUrl | string | No | Override avatar |

**Response:** `200 OK`

---

### POST /api/communities/:communityId/bots
Create a bot.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Bot name |
| permissions | string[] | No | Bot permissions |
| avatarUrl | string | No | Bot avatar |

**Response:** `201 Created`
```json
{ "bot": { "id": "...", "token": "...", ... } }
```

---

### GET /api/communities/:communityId/bots
List bots.

**Auth:** Required

**Response:** `200 OK`

---

### DELETE /api/bots/:botId
Delete a bot.

**Auth:** Required (admin)

**Response:** `204 No Content`

---

### POST /api/bots/:botId/commands
Register a slash command for a bot.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Command name |
| description | string | Yes | Command description |

**Response:** `201 Created`

---

### GET /api/bots/:botId/commands
List slash commands for a bot.

**Auth:** Required

**Response:** `200 OK`

---

### POST /api/bots/message
Send a message as a bot.

**Auth:** `Authorization: Bot <token>`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channelId | string | Yes | Target channel |
| content | string | Yes | Message content |

**Response:** `200 OK`

---

## 20. Upload (Attachments)

### POST /api/upload/presign
Generate a pre-signed upload URL.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channelId | string | Yes | Channel ID |
| fileName | string | Yes | File name |
| mimeType | string | Yes | MIME type |
| fileSize | number | Yes | File size in bytes |

**Response:** `200 OK`
```json
{ "uploadUrl": "...", "storageKey": "..." }
```

---

### POST /api/upload/attachments
Register an attachment after upload completes.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messageId | string | Yes | Message ID |
| storageKey | string | Yes | Storage key from presign |
| fileName | string | Yes | File name |
| mimeType | string | Yes | MIME type |
| fileSize | number | Yes | File size in bytes |
| width | number | No | Image width |
| height | number | No | Image height |

**Response:** `201 Created`

---

## 21. P2P Files

### POST /api/p2p/files
Register a P2P file transfer (metadata only).

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channelId | string | No | Channel ID |
| conversationId | string | No | DM conversation ID |
| fileName | string | Yes | File name |
| fileSize | number | Yes | File size |
| mimeType | string | Yes | MIME type |
| fileHash | string | Yes | SHA hash |
| chunkCount | number | Yes | Number of chunks |

**Response:** `201 Created`

---

### GET /api/p2p/files/:fileId
Get P2P file metadata.

**Auth:** Required

**Response:** `200 OK`

---

## 22. AI (Summarize)

### POST /api/channels/:channelId/ai/summarize
Get an AI-generated summary of recent channel messages.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messageCount | number | No | Messages to summarize (3-200) |

**Response:** `200 OK`
```json
{ "summary": "...", "messageCount": 50 }
```

---

## 23. Translation

### POST /api/translate
Translate text to a target language.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | Yes | Text to translate (max 5000 chars) |
| targetLang | string | Yes | Target language code |

**Response:** `200 OK`
```json
{ "translatedText": "...", "detectedLang": "..." }
```

---

## 24. Scheduled Messages

### POST /api/channels/:channelId/messages/schedule
Schedule a message.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bodyMarkdown | string | Yes | Message content |
| scheduledAt | string | Yes | ISO 8601 future datetime |

**Response:** `201 Created`

---

### GET /api/me/scheduled-messages
List pending scheduled messages.

**Auth:** Required

**Response:** `200 OK`
```json
{ "scheduledMessages": [ ... ] }
```

---

### DELETE /api/scheduled-messages/:id
Cancel a scheduled message.

**Auth:** Required (author)

**Response:** `204 No Content`

---

### POST /api/scheduled-messages/process
Process due scheduled messages (internal/cron).

**Auth:** Required

**Response:** `200 OK`
```json
{ "processed": 3 }
```

---

## 25. Backup

### POST /api/me/backup
Export all user messages as JSON.

**Auth:** Required

**Response:** `200 OK`
```json
{ "data": "...", "exportedAt": "..." }
```

---

### POST /api/me/restore
Validate and import an encrypted backup.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| encryptedData | string | Yes | Encrypted backup data |

**Response:** `200 OK`

---

## 26. Channel E2EE

### POST /api/channels/:channelId/e2ee/init
Initialize E2EE for a channel.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| memberKeys | object | Yes | Map of userId to encrypted group key |
| keyVersion | number | Yes | Key version number |

**Response:** `201 Created`

---

### GET /api/channels/:channelId/e2ee/key
Get your encrypted group key for a channel.

**Auth:** Required

**Response:** `200 OK`

---

### POST /api/channels/:channelId/e2ee/rotate
Rotate the group encryption key.

**Auth:** Required (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| memberKeys | object | Yes | New encrypted keys per member |
| keyVersion | number | Yes | New version |

**Response:** `200 OK`

---

### POST /api/channels/:channelId/e2ee/add-member
Add a new member's encrypted key.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | New member's user ID |
| encryptedGroupKey | string | Yes | Group key encrypted for new member |
| keyVersion | number | Yes | Current key version |

**Response:** `200 OK`

---

## 27. Push Tokens

### POST /api/me/push-token
Register a push notification token.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Push token |
| platform | string | Yes | "ios", "android", or "web" |

**Response:** `201 Created`

---

### DELETE /api/me/push-token
Remove all push tokens (call on logout).

**Auth:** Required

**Response:** `204 No Content`

---

## 28. Discovery

### GET /api/discover
Discover public communities.

**Auth:** None

**Query parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| q | string | No | Search query |
| sort | string | No | "members" or "newest" |
| limit | number | No | Results (max 50) |

**Response:** `200 OK`
```json
{ "communities": [ { "id": "...", "name": "...", "memberCount": 42, ... } ] }
```

---

## 29. ZK-Identity

### POST /api/me/zk-credentials
Add a ZK credential.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| credentialType | string | Yes | Credential type |
| credentialHash | string | Yes | Cryptographic hash |
| metadata | string | No | Public metadata |

**Response:** `201 Created`

---

### GET /api/users/:userId/zk-credentials
Get a user's public ZK credential badges.

**Auth:** Required

**Response:** `200 OK`
```json
{ "credentials": [ ... ] }
```

---

## 30. Link Preview

### GET /api/link-preview
Fetch Open Graph / metadata for a URL.

**Auth:** Required

**Query:** `url` (required)

**Response:** `200 OK`
```json
{ "title": "...", "description": "...", "image": "...", "siteName": "..." }
```

---

## 31. Unread State

### POST /api/channels/:channelId/read
Mark a channel as read.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| lastMessageId | string | Yes | Last read message ID |

**Response:** `200 OK`

---

### GET /api/communities/:communityId/unread
Get unread summary for all channels.

**Auth:** Required

**Response:** `200 OK`
```json
{ "channels": [ { "channelId": "...", "unreadCount": 5, "lastMessageId": "..." } ] }
```

---

## 32. Inbox

### GET /api/inbox
Get inbox notifications (mentions, thread replies).

**Auth:** Required

**Query:** `communityId` (optional), `cursor`, `limit`

**Response:** `200 OK`
```json
{ "items": [ ... ], "nextCursor": "..." }
```

---

## 33. Moderation

### POST /api/reports
Create a content report.

**Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetType | string | Yes | "message" or "user" |
| targetId | string | Yes | Target ID |
| communityId | string | Yes | Community ID |
| reason | string | Yes | Report reason |

**Response:** `201 Created`

---

### GET /api/communities/:communityId/reports
List reports (moderator+).

**Auth:** Required (moderator)

**Query:** `status`, `cursor`, `limit`

**Response:** `200 OK`

---

### PATCH /api/reports/:reportId
Resolve/dismiss a report.

**Auth:** Required (moderator)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | "resolved" or "dismissed" |

**Response:** `200 OK`

---

### POST /api/members/:membershipId/mute
Mute a member.

**Auth:** Required (moderator)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Reason |

**Response:** `200 OK`

---

### POST /api/members/:membershipId/kick
Kick a member.

**Auth:** Required (moderator)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Reason |

**Response:** `200 OK`

---

### POST /api/members/:membershipId/ban
Ban a member.

**Auth:** Required (moderator)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Reason |

**Response:** `200 OK`

---

### GET /api/communities/:communityId/audit-log
Get audit log (admin+).

**Auth:** Required (admin)

**Query:** `cursor`, `limit`

**Response:** `200 OK`

---

## 34. Health

### GET /api/health
Process liveness endpoint. This only proves the API process booted.

**Auth:** None

**Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "api",
  "scope": "process",
  "timestamp": "2026-04-07T...",
  "runtime": {
    "environment": "production",
    "pid": 123,
    "uptimeSeconds": 42,
    "nodeVersion": "v22.12.0"
  },
  "operator": {
    "healthEndpoints": {
      "liveness": "/api/health",
      "readiness": "/api/health/ready"
    },
    "trafficGate": {
      "shouldReceiveTraffic": false,
      "reason": "Traffic should stay blocked until readiness is confirmed.",
      "nextCheck": "/api/health/ready"
    },
    "readinessScope": {
      "requiredDependencies": ["database", "redis"],
      "excludedDependencies": ["object_storage", "livekit"]
    }
  }
}
```

---

### GET /api/health/ready
Dependency readiness endpoint for required API runtime dependencies.

**Auth:** None

**Response:** `200 OK` or `503 Service Unavailable`
```json
{
  "service": "api",
  "status": "ready",
  "scope": "required_runtime_dependencies",
  "timestamp": "2026-04-07T...",
  "runtime": {
    "environment": "production",
    "pid": 123,
    "uptimeSeconds": 42,
    "nodeVersion": "v22.12.0"
  },
  "summary": {
    "total": 2,
    "ok": 2,
    "error": 0,
    "failingDependencies": []
  },
  "dependencies": [
    { "name": "database", "status": "ok" },
    { "name": "redis", "status": "ok" }
  ],
  "boundary": {
    "checkedDependencies": ["database", "redis"],
    "excludedDependencies": [
      {
        "name": "object_storage",
        "includedInReadiness": false,
        "failureBoundary": "Attachment upload and public asset retrieval can fail while baseline API readiness stays green.",
        "operatorAction": "Verify bucket existence, API-side credentials, region, optional endpoint, presign, and asset retrieval separately."
      },
      {
        "name": "livekit",
        "includedInReadiness": false,
        "failureBoundary": "Voice and video token issuance or room join can fail while baseline API readiness stays green.",
        "operatorAction": "Verify public LiveKit URL, API credentials, and an actual room join separately."
      }
    ]
  },
  "operator": {
    "healthEndpoints": {
      "liveness": "/api/health",
      "readiness": "/api/health/ready"
    },
    "trafficGate": {
      "shouldReceiveTraffic": true,
      "reason": "Required runtime dependencies are ready for baseline API traffic.",
      "nextCheck": "/api/health/ready"
    },
    "readinessScope": {
      "requiredDependencies": ["database", "redis"],
      "excludedDependencies": ["object_storage", "livekit"]
    }
  }
}
```

Current readiness boundary:

- required for readiness: PostgreSQL, Redis
- not currently part of this endpoint: object storage, LiveKit
- response `runtime`, `summary.failingDependencies`, `boundary`, `operator.readinessScope`, and `operator.trafficGate` now make the startup and failure boundary visible in one payload
- green readiness does not guarantee attachment upload/download or voice join paths are healthy
- operators should treat storage bucket validation and LiveKit join checks as separate pre-deploy or smoke requirements

---

## WebSocket

### GET /api/ws
WebSocket endpoint for real-time events.

**Auth:** Query param `token=<JWT>` or `zktalk_session` cookie

**Incoming message types:**
- `subscribe_channel` - Subscribe to channel events
- `unsubscribe_channel` - Unsubscribe from channel
- `subscribe_community` - Subscribe to community events
- `unsubscribe_community` - Unsubscribe from community
- `typing_start` - Signal typing start
- `typing_stop` - Signal typing stop
- `heartbeat` - Keep connection alive
- `p2p_signal` - WebRTC signaling for P2P file transfer
- `p2p_file_request` - Request a P2P file
- `p2p_file_available` - Notify that a file is available for P2P

**Outgoing event types:**
- `connected` - Connection established
- `heartbeat_ack` - Heartbeat acknowledgement
- `message.created` - New message
- `message.updated` - Message edited
- `message.deleted` - Message deleted
- `typing.start` - User started typing
- `typing.stop` - User stopped typing
- `p2p.signal` - WebRTC signal relay
- `p2p.file_request` - File request broadcast
- `p2p.file_available` - File availability notification

---

## Error Format

All errors return JSON:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

Common error codes:
- `UNAUTHORIZED` (401) - Missing or invalid session
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid request body
- `CONFLICT` (409) - Resource already exists
- `INTERNAL_ERROR` (500) - Server error
