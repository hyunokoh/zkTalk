# Bridging zkTalk channels to Telegram and Discord

You can mirror a zkTalk channel to a **Telegram group** or a **Discord
channel** so the same conversation runs in both places. This is the
"server / channel" pattern — for now we don't bridge 1:1 DMs.

| Direction              | Telegram | Discord |
|------------------------|----------|---------|
| zkTalk → external       | ✅       | ✅      |
| external → zkTalk       | ✅       | ❌ (Phase 2) |
| Setup difficulty        | medium   | easy    |

Discord inbound (Discord → zkTalk) requires a long-lived Bot Gateway
connection and is intentionally deferred — the docs below cover only
the outbound webhook path for Discord.

---

## 1. Open the bridge panel

In zkTalk, open the channel you want to bridge → click the **gear icon**
in the channel header → scroll to **External chat bridges**. You'll see
two "+ Telegram bridge" / "+ Discord bridge" buttons.

You need `manage_channels` permission on the channel — usually the
community owner or a channel admin role.

## 2. Telegram (bidirectional)

### a. Make a bot

1. In Telegram, open **@BotFather** and send `/newbot`.
2. Pick a display name (e.g. `My zkTalk bridge`) and a username ending
   in `bot` (e.g. `myzktalkbridge_bot`).
3. BotFather replies with a token like
   `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`. **Copy it** — this is
   the bot token zkTalk will use.

### b. Add the bot to your group + grab the chat_id

1. Open the Telegram group you want to bridge.
2. **Add the bot as a member** (group settings → Add members → search
   for the bot's username).
3. Disable **Group Privacy** so the bot can see all messages, not just
   commands sent to it: BotFather → `/mybots` → pick your bot → **Bot
   Settings** → **Group Privacy** → **Turn off**. Then **remove and
   re-add the bot to the group** so the new privacy setting takes
   effect.
4. Get the group's `chat_id`. Easiest way:
   - Send any message in the group.
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
     in a browser.
   - Find `"chat":{"id":-100xxxxxxxxx, …}` — that long negative
     number is the chat_id.

### c. Wire it up in zkTalk

Back in the bridge panel:

- Click **+ Telegram bridge**.
- Paste the **bot token**.
- Paste the **chat_id** (with the leading `-` for groups).
- **Create**.

zkTalk validates the token via Telegram's `getMe`, registers a webhook
so Telegram pushes incoming messages back to us, and starts mirroring.
Anything posted in the zkTalk channel from now on appears in the
Telegram group prefixed with the sender's display name. Telegram
messages from the group appear in the zkTalk channel as
`**Author**: text` so you can see who said what.

> **Public URL note**: in production, set `PUBLIC_API_URL` on the API
> process to your reachable HTTPS origin (e.g. `https://api.zktalk.app`).
> Locally Telegram cannot reach `localhost:4000` for inbound — use a
> tunnel like `ngrok http 4000` and set `PUBLIC_API_URL` to the ngrok
> URL before creating the bridge.

## 3. Discord (outbound only)

### a. Create a channel webhook

1. In Discord, open the **server** that holds the channel.
2. **Server Settings → Integrations → Webhooks → New Webhook**.
3. Pick the **target channel**, set a name + avatar (this is what
   zkTalk-relayed messages will use as their identity), and **Copy
   Webhook URL**.

The URL looks like
`https://discord.com/api/webhooks/123456789012345678/ABCdefGHIjklMNOpqr…`.

### b. Wire it up in zkTalk

- Click **+ Discord bridge**.
- Paste the **webhook URL**.
- **Create**.

zkTalk verifies the URL by GETting the webhook and reading back the
target channel name. Every zkTalk message in the channel is then
POSTed to Discord, with the sender's zkTalk display name and avatar
shown on the Discord side.

`@everyone` / `@here` / role / user mentions are stripped before
posting — a bridged message will never ping a Discord user. (We may
add an opt-in for this later.)

## 4. Per-bridge controls

Each row in the panel has:

- **Disable** — pauses outbound mirroring without losing the
  config. Re-enable any time.
- **Delete** — removes the bridge. For Telegram, also calls
  `deleteWebhook` so Telegram stops sending updates.

## 5. Loop guard

Inbound messages (Telegram → zkTalk) are tagged with their source
bridge id in `message_bridge_origins`. The outbound dispatcher checks
this table and skips re-mirroring messages that came in through a
bridge — so a Telegram message that becomes a zkTalk message does not
get sent back to Telegram and infinitely echo.

## 6. Limitations

- **Attachments are not mirrored yet** — text only. (Telegram captions
  are read as text on the way in.)
- **Edits and deletes don't propagate.** If you edit a zkTalk message,
  the Telegram/Discord copy stays as-was. We may add this later.
- **Reactions don't propagate.** Same reason.
- **Discord inbound** (Discord → zkTalk) needs a Gateway worker — not
  yet built. Use Discord webhook **outgoing** integrations against the
  zkTalk public API (`/v1/channels/:id/messages`) if you need
  one-off Discord-side automation in the meantime.

## 7. Where the secrets live

- **Bot tokens / webhook URLs** are stored in `channel_bridges.config`
  as JSON. They're encrypted at the disk level by Postgres but not
  application-level encrypted — treat the database the same way you
  treat any service that holds OAuth tokens.
- **Inbound webhook secret** (`channel_bridges.inbound_secret`) is the
  random URL-path token Telegram embeds when calling our webhook. We
  also send it to Telegram as `secret_token` for header-based
  verification on top of the path-based lookup.
