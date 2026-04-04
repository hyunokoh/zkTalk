import crypto from 'node:crypto';
import { SystemRole } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import { markdownToPlaintext } from '../../lib/markdown.js';
import * as repo from './webhook.repository.js';

// ── Token generation ─────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const MANAGE_INTEGRATIONS_ROLES: readonly string[] = [SystemRole.OWNER, SystemRole.ADMIN];

async function requireManageIntegrations(userId: string, communityId: string) {
  const community = await repo.findCommunityById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  const userRoles = await repo.getUserRolesInCommunity(userId, communityId);
  const hasRole = userRoles.some((role) => MANAGE_INTEGRATIONS_ROLES.includes(role.roleName));
  if (!hasRole) {
    throw AppError.forbidden('You do not have permission to manage webhooks or bots');
  }

  return community;
}

// ── Webhook operations ───────────────────────────────────────────────

export async function createWebhook(
  communityId: string,
  channelId: string,
  name: string,
  userId: string,
  avatarUrl?: string,
) {
  await requireManageIntegrations(userId, communityId);

  // Verify channel exists and belongs to community
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }
  if (channel.communityId !== communityId) {
    throw AppError.badRequest('Channel does not belong to this community');
  }

  const token = generateToken();
  return repo.createWebhook({
    communityId,
    channelId,
    name,
    token,
    avatarUrl,
    createdByUserId: userId,
  });
}

export async function listWebhooks(communityId: string, userId: string) {
  await requireManageIntegrations(userId, communityId);
  return repo.listWebhooksByCommunity(communityId);
}

export async function deleteWebhook(webhookId: string, userId: string) {
  const webhook = await repo.findWebhookById(webhookId);
  if (!webhook) {
    throw AppError.notFound('Webhook not found');
  }
  await requireManageIntegrations(userId, webhook.communityId);
  await repo.deleteWebhook(webhookId);
}

export async function executeWebhook(
  token: string,
  body: { content: string; username?: string; avatarUrl?: string },
) {
  const webhook = await repo.findWebhookByToken(token);
  if (!webhook) {
    throw AppError.notFound('Webhook not found');
  }
  if (!webhook.isActive) {
    throw AppError.forbidden('Webhook is disabled');
  }

  // Build message content with webhook author info embedded
  const displayName = body.username ?? webhook.name;
  const bodyMarkdown = `**[${displayName}]** ${body.content}`;
  const bodyPlaintext = markdownToPlaintext(bodyMarkdown);

  const message = await repo.createWebhookMessage({
    communityId: webhook.communityId,
    channelId: webhook.channelId,
    authorUserId: webhook.createdByUserId,
    bodyMarkdown,
    bodyPlaintext,
  });

  return {
    message,
    webhookName: displayName,
    avatarUrl: body.avatarUrl ?? webhook.avatarUrl,
  };
}

// ── Bot operations ───────────────────────────────────────────────────

export async function createBot(
  communityId: string,
  name: string,
  userId: string,
  permissions?: string[],
  avatarUrl?: string,
) {
  await requireManageIntegrations(userId, communityId);

  const token = `bot_${generateToken()}`;
  return repo.createBot({
    communityId,
    name,
    token,
    avatarUrl,
    createdByUserId: userId,
    permissions: permissions ? JSON.stringify(permissions) : undefined,
  });
}

export async function listBots(communityId: string, userId: string) {
  await requireManageIntegrations(userId, communityId);
  return repo.listBotsByCommunity(communityId);
}

export async function deleteBot(botId: string, userId: string) {
  const bot = await repo.findBotById(botId);
  if (!bot) {
    throw AppError.notFound('Bot not found');
  }
  await requireManageIntegrations(userId, bot.communityId);
  await repo.deleteBot(botId);
}

export async function sendBotMessage(
  botToken: string,
  channelId: string,
  content: string,
) {
  const bot = await repo.findBotByToken(botToken);
  if (!bot) {
    throw AppError.unauthorized('Invalid bot token');
  }
  if (!bot.isActive) {
    throw AppError.forbidden('Bot is disabled');
  }

  // Verify channel exists
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  // Bot can only post in channels within its community
  if (channel.communityId !== bot.communityId) {
    throw AppError.forbidden('Bot cannot post in channels outside its community');
  }

  const bodyMarkdown = `**[${bot.name}]** ${content}`;
  const bodyPlaintext = markdownToPlaintext(bodyMarkdown);

  const message = await repo.createWebhookMessage({
    communityId: bot.communityId,
    channelId,
    authorUserId: bot.createdByUserId,
    bodyMarkdown,
    bodyPlaintext,
  });

  return {
    message,
    botName: bot.name,
    avatarUrl: bot.avatarUrl,
  };
}

// ── Slash command operations ─────────────────────────────────────────

export async function registerSlashCommand(
  botId: string,
  userId: string,
  name: string,
  description?: string,
) {
  const bot = await repo.findBotById(botId);
  if (!bot) {
    throw AppError.notFound('Bot not found');
  }

  await requireManageIntegrations(userId, bot.communityId);

  return repo.createSlashCommand({
    botUserId: botId,
    name,
    description,
  });
}

export async function listSlashCommands(botId: string, userId: string) {
  const bot = await repo.findBotById(botId);
  if (!bot) {
    throw AppError.notFound('Bot not found');
  }

  await requireManageIntegrations(userId, bot.communityId);
  return repo.listSlashCommandsByBot(botId);
}
