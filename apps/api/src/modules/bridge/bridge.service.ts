import crypto from 'node:crypto';
import { AppError } from '../../lib/errors.js';
import * as repo from './bridge.repository.js';
import {
  sendTelegramMessage,
  setTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramMe,
  readableAuthor,
  type TelegramUpdate,
} from './telegram.client.js';
import {
  sendDiscordWebhook,
  verifyDiscordWebhook,
} from './discord.client.js';

export type BridgePlatform = repo.BridgePlatform;

export interface BridgeView {
  id: string;
  channelId: string;
  platform: BridgePlatform;
  externalLabel: string | null;
  enabled: boolean;
  inboundEnabled: boolean;
  webhookUrl: string | null; // public URL Telegram should call
  createdAt: Date;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
  webhookSecret?: string;
}

interface DiscordConfig {
  webhookUrl: string;
  guildId?: string | null;
  channelId?: string | null;
}

function publicBaseUrl(): string {
  const fromEnv = process.env.PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Sensible local default; production must set PUBLIC_API_URL.
  return 'http://localhost:4000';
}

function makeWebhookUrl(secret: string): string {
  return `${publicBaseUrl()}/api/bridges/telegram/webhook/${secret}`;
}

function rowToView(row: repo.BridgeRow): BridgeView {
  return {
    id: row.id,
    channelId: row.channelId,
    platform: row.platform,
    externalLabel: row.externalLabel,
    enabled: row.enabled,
    inboundEnabled: row.platform === 'telegram' && !!row.inboundSecret,
    webhookUrl: row.platform === 'telegram' && row.inboundSecret
      ? makeWebhookUrl(row.inboundSecret)
      : null,
    createdAt: row.createdAt,
  };
}

export async function listForChannel(channelId: string): Promise<BridgeView[]> {
  const rows = await repo.listByChannel(channelId);
  return rows.map(rowToView);
}

export async function createTelegramBridge(input: {
  channelId: string;
  userId: string;
  botToken: string;
  chatId: string;
}): Promise<BridgeView> {
  const botToken = input.botToken.trim();
  const chatId = input.chatId.trim();
  if (!botToken || !chatId) {
    throw AppError.badRequest('botToken and chatId are required');
  }

  // Validate the bot token early — wrong token ⇒ 401 from Telegram.
  let label: string;
  try {
    const me = await getTelegramMe(botToken);
    label = `@${me.username}`;
  } catch (err) {
    throw AppError.badRequest(
      err instanceof Error
        ? `Telegram rejected the bot token: ${err.message}`
        : 'Telegram rejected the bot token',
    );
  }

  const inboundSecret = crypto.randomBytes(24).toString('base64url');
  const webhookSecret = crypto.randomBytes(24).toString('base64url');

  const config: TelegramConfig = { botToken, chatId, webhookSecret };
  const row = await repo.insert({
    channelId: input.channelId,
    platform: 'telegram',
    externalLabel: `${label} → ${chatId}`,
    config: JSON.stringify(config),
    inboundSecret,
    createdByUserId: input.userId,
  });

  // Best-effort: register the webhook with Telegram so it knows where to push.
  // If this fails, the bridge still works for outbound — the user can rerun
  // the registration via the UI. We log but do not throw.
  try {
    await setTelegramWebhook({
      botToken,
      url: makeWebhookUrl(inboundSecret),
      secretToken: webhookSecret,
    });
  } catch {
    // ignore — outbound still works
  }

  return rowToView(row);
}

export async function createDiscordBridge(input: {
  channelId: string;
  userId: string;
  webhookUrl: string;
}): Promise<BridgeView> {
  const webhookUrl = input.webhookUrl.trim();
  if (!webhookUrl) throw AppError.badRequest('webhookUrl is required');

  let info: { channelId: string; guildId: string | null; name: string };
  try {
    info = await verifyDiscordWebhook(webhookUrl);
  } catch (err) {
    throw AppError.badRequest(
      err instanceof Error ? err.message : 'Discord rejected the webhook URL',
    );
  }

  const config: DiscordConfig = {
    webhookUrl,
    guildId: info.guildId,
    channelId: info.channelId,
  };

  const row = await repo.insert({
    channelId: input.channelId,
    platform: 'discord',
    externalLabel: info.name ? `discord:${info.name}` : 'discord',
    config: JSON.stringify(config),
    inboundSecret: null,
    createdByUserId: input.userId,
  });
  return rowToView(row);
}

export async function deleteBridge(input: { channelId: string; bridgeId: string }): Promise<void> {
  const row = await repo.findById(input.bridgeId);
  if (!row || row.channelId !== input.channelId) {
    throw AppError.notFound('Bridge not found');
  }

  if (row.platform === 'telegram') {
    try {
      const cfg = JSON.parse(row.config) as TelegramConfig;
      await deleteTelegramWebhook({ botToken: cfg.botToken });
    } catch {
      // best-effort; continue with delete
    }
  }
  await repo.remove(input.bridgeId, input.channelId);
}

export async function setBridgeEnabled(input: {
  channelId: string;
  bridgeId: string;
  enabled: boolean;
}): Promise<void> {
  const row = await repo.findById(input.bridgeId);
  if (!row || row.channelId !== input.channelId) {
    throw AppError.notFound('Bridge not found');
  }
  await repo.setEnabled(input.bridgeId, input.enabled);
}

/**
 * Mirror an outbound zkTalk message to every enabled bridge on its
 * channel. Called from message.service after createMessage. Each
 * destination is fire-and-forget: a single bridge failure must NOT
 * block the others or the original message.
 */
export async function dispatchOutbound(opts: {
  channelId: string;
  messageId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  bodyPlaintext: string;
}): Promise<void> {
  // Loop guard: if this message originated from a bridge, skip.
  const origin = await repo.findOriginByMessage(opts.messageId);
  if (origin) return;

  const bridges = await repo.listByChannel(opts.channelId);
  if (bridges.length === 0) return;

  await Promise.all(
    bridges
      .filter((b) => b.enabled)
      .map(async (bridge) => {
        try {
          if (bridge.platform === 'telegram') {
            const cfg = JSON.parse(bridge.config) as TelegramConfig;
            const text = `${opts.authorDisplayName}: ${opts.bodyPlaintext}`;
            await sendTelegramMessage({
              botToken: cfg.botToken,
              chatId: cfg.chatId,
              text,
            });
          } else if (bridge.platform === 'discord') {
            const cfg = JSON.parse(bridge.config) as DiscordConfig;
            await sendDiscordWebhook({
              webhookUrl: cfg.webhookUrl,
              content: opts.bodyPlaintext,
              username: opts.authorDisplayName,
              avatarUrl: opts.authorAvatarUrl,
            });
          }
        } catch {
          // outbound failures are intentionally swallowed — never disrupt
          // the user's primary message flow because of a flaky bridge
        }
      }),
  );
}

export interface InboundResult {
  channelId: string;
  bridgeId: string;
  platform: BridgePlatform;
  externalAuthorName: string | null;
  externalAuthorId: string | null;
  externalMessageId: string | null;
  bodyText: string;
}

/**
 * Parse a Telegram update against a bridge identified by its inbound
 * secret. Returns the data needed to materialise it as a zkTalk message,
 * or null if the update is one we don't care about (no text, wrong chat,
 * etc.).
 */
export function parseTelegramUpdate(
  bridge: repo.BridgeRow,
  update: TelegramUpdate,
): InboundResult | null {
  const cfg = JSON.parse(bridge.config) as TelegramConfig;
  const msg = update.message ?? update.channel_post;
  if (!msg) return null;
  // Only accept updates from the chat this bridge is wired to. This
  // guards against a bot accidentally added to other groups posting
  // into our channel.
  if (String(msg.chat.id) !== String(cfg.chatId)) return null;
  const text = (msg.text ?? msg.caption ?? '').trim();
  if (!text) return null;

  return {
    channelId: bridge.channelId,
    bridgeId: bridge.id,
    platform: 'telegram',
    externalAuthorName: readableAuthor(msg),
    externalAuthorId:
      msg.from?.id !== undefined
        ? String(msg.from.id)
        : msg.sender_chat?.id !== undefined
          ? String(msg.sender_chat.id)
          : null,
    externalMessageId: String(msg.message_id),
    bodyText: text,
  };
}

export async function findBridgeByInboundSecret(secret: string) {
  return repo.findByInboundSecret(secret);
}

export async function recordInboundOrigin(opts: {
  messageId: string;
  bridgeId: string;
  platform: BridgePlatform;
  externalAuthorName: string | null;
  externalAuthorId: string | null;
  externalMessageId: string | null;
}): Promise<void> {
  await repo.recordOrigin(opts);
}
