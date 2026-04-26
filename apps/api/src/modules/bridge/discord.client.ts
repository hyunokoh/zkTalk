/**
 * Discord webhook client. Discord channel webhooks are outbound-only —
 * any HTTP POST hits the configured channel as if a custom integration
 * sent it. Username/avatar can be overridden per call so each zkTalk
 * sender shows up as themselves on the Discord side.
 *
 * For inbound (Discord → zkTalk) we'd need a Bot Gateway WebSocket
 * connection — that's deferred to a follow-up; this file is outbound
 * only on purpose.
 *
 * Webhook docs: https://discord.com/developers/docs/resources/webhook
 */

const DISCORD_USERNAME_MAX = 80;
const DISCORD_CONTENT_MAX = 2000;

export interface DiscordSendResult {
  externalMessageId: string;
}

interface DiscordWebhookResponse {
  id: string;
}

function sanitizeUsername(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  const trimmed = name.trim().slice(0, DISCORD_USERNAME_MAX);
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function sendDiscordWebhook(opts: {
  webhookUrl: string;
  content: string;
  username?: string | null;
  avatarUrl?: string | null;
}): Promise<DiscordSendResult> {
  const url = new URL(opts.webhookUrl);
  // Re-check the host on every send: if a bridge config row gets
  // tampered with to point at evil.com, we still won't egress there.
  if (url.protocol !== 'https:' || !isDiscordHost(url.hostname)) {
    throw new Error('Discord webhook URL is no longer valid');
  }
  // ?wait=true makes Discord return the created message envelope including its id
  url.searchParams.set('wait', 'true');

  const body = {
    content: opts.content.slice(0, DISCORD_CONTENT_MAX),
    ...(sanitizeUsername(opts.username) ? { username: sanitizeUsername(opts.username) } : {}),
    ...(opts.avatarUrl ? { avatar_url: opts.avatarUrl } : {}),
    allowed_mentions: { parse: [] }, // never @everyone/role/user from a bridge
  };

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as DiscordWebhookResponse;
  return { externalMessageId: json.id };
}

/**
 * Best-effort verification that a webhook URL is well-formed and
 * Discord recognises it. We GET the webhook (no token-leaking required;
 * the URL itself contains the token) and check the channel id field.
 */
// Allow discord.com / discordapp.com and their subdomains (e.g.
// canary.discord.com), but NOT bait domains like attackerdiscord.com.
function isDiscordHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'discord.com' ||
    h === 'discordapp.com' ||
    h.endsWith('.discord.com') ||
    h.endsWith('.discordapp.com')
  );
}

export async function verifyDiscordWebhook(webhookUrl: string): Promise<{
  channelId: string;
  guildId: string | null;
  name: string;
}> {
  const url = new URL(webhookUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Discord webhook URL must use https');
  }
  if (!isDiscordHost(url.hostname)) {
    throw new Error('Webhook URL must point to discord.com');
  }
  const res = await fetch(webhookUrl, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Discord webhook check failed (${res.status})`);
  }
  const json = (await res.json()) as {
    channel_id: string;
    guild_id: string | null;
    name: string;
  };
  return { channelId: json.channel_id, guildId: json.guild_id, name: json.name };
}
