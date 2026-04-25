# zkTalk Public API (v1)

External programs and AI agents can drive a zkTalk account through a
small, stable HTTP surface mounted under `/v1`. Authentication is by
**API key** (`Authorization: Bearer zk_live_…`), not session cookie.

The base URL in local development is `http://localhost:4000`. In production
it is wherever the API is deployed.

---

## 1. Get a key

1. Open zkTalk → **Settings → API keys** (`/settings/api-keys`).
2. Pick a label (e.g. *"Cursor on my MacBook"*).
3. Choose the scopes the program actually needs — keep this minimal.
4. Click **Create key**. The full secret is shown **once** — copy it
   immediately and store it the way you would store a password
   (`.env`, system keychain, secret manager). After you dismiss the
   banner, only the prefix is kept.

To rotate or shut off access, **Revoke** the key on the same page.
Revoking is immediate — the very next request with that key returns 401.

> Never paste an API key into source code committed to a repo, into a
> public chat, or into a screenshot. Treat it as a password.

## 2. Authenticate every request

Every `/v1/*` request needs:

```http
Authorization: Bearer zk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Failures:

| Status | `error`              | When                                                  |
|-------:|----------------------|-------------------------------------------------------|
|    401 | `UNAUTHORIZED`       | Missing / unknown / revoked / expired key             |
|    403 | `INSUFFICIENT_SCOPE` | Key is valid but doesn't carry the required scope     |

## 3. Scopes (v1)

Keep keys narrow — every scope is a power you grant to whatever holds the key.

| Scope               | Lets the key…                                            |
|---------------------|----------------------------------------------------------|
| `me:read`           | Read your own profile (id, username, displayName)        |
| `communities:read`  | List the communities you belong to                       |
| `channels:read`     | List channels in a community                             |
| `messages:read`     | Read messages from any channel you can see               |
| `messages:write`    | Post messages to any channel you can post in             |
| `dm:read`           | List DM conversations and read their messages            |
| `dm:write`          | Start DM conversations and post DM messages              |

## 4. Endpoints

All responses are `application/json`. Bodies are `application/json` too.

### Profile

```http
GET /v1/me
```

```json
{
  "id": "019dc4a7-…",
  "username": "alice",
  "displayName": "Alice"
}
```

### Communities you belong to

```http
GET /v1/communities
```

```json
{ "communities": [ { "id": "…", "name": "…", "slug": "…", … } ] }
```

### Channels in a community

```http
GET /v1/communities/{communityId}/channels
```

### Read messages from a channel

```http
GET /v1/channels/{channelId}/messages?limit=50&cursor=…&topic=…
```

`limit` (1–100, default 50) and `cursor` (opaque, returned in the prior
response) are both optional. `topic` filters to a single Zulip-style
topic.

### Post a message to a channel

```http
POST /v1/channels/{channelId}/messages
Content-Type: application/json

{ "body": "hello from cursor", "topic": "deploys" }
```

`topic` and `parentMessageId` are optional. Returns the created message
on `201`.

### List DM conversations

```http
GET /v1/dms
```

### Read DM messages

```http
GET /v1/dms/{conversationId}/messages
```

### Send a DM

```http
POST /v1/dms/{conversationId}/messages
Content-Type: application/json

{ "body": "hi" }
```

### Start a new direct conversation with a user

```http
POST /v1/dms
Content-Type: application/json

{ "userId": "019dc4a7-…" }
```

## 5. Quick `curl` walkthrough

```bash
export ZK="zk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export API="http://localhost:4000"

# Who am I?
curl -s -H "Authorization: Bearer $ZK" $API/v1/me

# Which communities am I in?
curl -s -H "Authorization: Bearer $ZK" $API/v1/communities

# Read the latest 20 messages from a channel
curl -s -H "Authorization: Bearer $ZK" \
  "$API/v1/channels/<channelId>/messages?limit=20"

# Post a message
curl -s -H "Authorization: Bearer $ZK" \
  -H "Content-Type: application/json" \
  -d '{"body":"hello from cron"}' \
  $API/v1/channels/<channelId>/messages
```

## 6. AI agent example (Anthropic Messages API)

A minimal agent that posts the result of an Anthropic call into a
zkTalk channel:

```ts
const ZK = process.env.ZK_API_KEY!;
const ZK_API = process.env.ZK_API ?? 'http://localhost:4000';
const CHANNEL = process.env.ZK_CHANNEL!;

const ai = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{ role: 'user', content: 'Summarize today\'s standup in one line.' }],
  }),
}).then((r) => r.json());

const text = ai.content?.[0]?.text ?? '(no answer)';

await fetch(`${ZK_API}/v1/channels/${CHANNEL}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ZK}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ body: text }),
});
```

## 7. Stability and versioning

- Anything under `/v1` is a public commitment. Adding fields and adding
  endpoints is non-breaking. Renaming or removing fields is breaking and
  ships only in `/v2`.
- Errors share one shape: `{ "error": "<CODE>", "message": "<human text>" }`.
- The `lastUsedAt` timestamp on each key is updated best-effort, not in
  the request critical path.
