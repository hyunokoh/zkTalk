import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import {
  webhooks,
  botUsers,
  slashCommands,
  channels,
  communities,
  communityMemberships,
  membershipRoles,
  roles,
  messages,
} from '../../lib/db/schema.js';

// ── Webhook CRUD ─────────────────────────────────────────────────────

export async function createWebhook(data: {
  communityId: string;
  channelId: string;
  name: string;
  token: string;
  avatarUrl?: string;
  createdByUserId: string;
}) {
  const id = uuidv7();
  const [webhook] = await db
    .insert(webhooks)
    .values({
      id,
      communityId: data.communityId,
      channelId: data.channelId,
      name: data.name,
      token: data.token,
      avatarUrl: data.avatarUrl ?? null,
      createdByUserId: data.createdByUserId,
    })
    .returning();
  return webhook;
}

export async function findWebhookById(id: string) {
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, id))
    .limit(1);
  return webhook ?? null;
}

export async function findWebhookByToken(token: string) {
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.token, token))
    .limit(1);
  return webhook ?? null;
}

export async function listWebhooksByCommunity(communityId: string) {
  return db
    .select()
    .from(webhooks)
    .where(eq(webhooks.communityId, communityId));
}

export async function deleteWebhook(id: string) {
  await db.delete(webhooks).where(eq(webhooks.id, id));
}

export async function updateWebhook(
  id: string,
  data: { name?: string; avatarUrl?: string | null; isActive?: boolean },
) {
  const [updated] = await db
    .update(webhooks)
    .set(data)
    .where(eq(webhooks.id, id))
    .returning();
  return updated ?? null;
}

// ── Bot CRUD ─────────────────────────────────────────────────────────

export async function createBot(data: {
  communityId: string;
  name: string;
  token: string;
  avatarUrl?: string;
  createdByUserId: string;
  permissions?: string;
}) {
  const id = uuidv7();
  const [bot] = await db
    .insert(botUsers)
    .values({
      id,
      communityId: data.communityId,
      name: data.name,
      token: data.token,
      avatarUrl: data.avatarUrl ?? null,
      createdByUserId: data.createdByUserId,
      permissions: data.permissions ?? null,
    })
    .returning();
  return bot;
}

export async function findBotById(id: string) {
  const [bot] = await db
    .select()
    .from(botUsers)
    .where(eq(botUsers.id, id))
    .limit(1);
  return bot ?? null;
}

export async function findBotByToken(token: string) {
  const [bot] = await db
    .select()
    .from(botUsers)
    .where(eq(botUsers.token, token))
    .limit(1);
  return bot ?? null;
}

export async function listBotsByCommunity(communityId: string) {
  return db
    .select()
    .from(botUsers)
    .where(eq(botUsers.communityId, communityId));
}

export async function deleteBot(id: string) {
  // Delete associated slash commands first
  await db.delete(slashCommands).where(eq(slashCommands.botUserId, id));
  await db.delete(botUsers).where(eq(botUsers.id, id));
}

export async function updateBot(
  id: string,
  data: { name?: string; avatarUrl?: string | null; isActive?: boolean; permissions?: string },
) {
  const [updated] = await db
    .update(botUsers)
    .set(data)
    .where(eq(botUsers.id, id))
    .returning();
  return updated ?? null;
}

// ── Slash command CRUD ───────────────────────────────────────────────

export async function createSlashCommand(data: {
  botUserId: string;
  name: string;
  description?: string;
}) {
  const id = uuidv7();
  const [command] = await db
    .insert(slashCommands)
    .values({
      id,
      botUserId: data.botUserId,
      name: data.name,
      description: data.description ?? null,
    })
    .returning();
  return command;
}

export async function listSlashCommandsByBot(botUserId: string) {
  return db
    .select()
    .from(slashCommands)
    .where(eq(slashCommands.botUserId, botUserId));
}

export async function deleteSlashCommand(id: string) {
  await db.delete(slashCommands).where(eq(slashCommands.id, id));
}

// ── Helpers ──────────────────────────────────────────────────────────

export async function findChannelById(id: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, id))
    .limit(1);
  return channel ?? null;
}

export async function findCommunityById(id: string) {
  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.id, id))
    .limit(1);
  return community ?? null;
}

export async function getUserRolesInCommunity(userId: string, communityId: string) {
  return db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      priority: roles.priority,
    })
    .from(communityMemberships)
    .innerJoin(membershipRoles, eq(communityMemberships.id, membershipRoles.membershipId))
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    );
}

/**
 * Create a message as a webhook or bot. Uses the system user approach:
 * we create a message attributed to the webhook creator but with system type.
 */
export async function createWebhookMessage(data: {
  communityId: string;
  channelId: string;
  authorUserId: string;
  bodyMarkdown: string;
  bodyPlaintext: string;
}) {
  const id = uuidv7();
  const [message] = await db
    .insert(messages)
    .values({
      id,
      communityId: data.communityId,
      channelId: data.channelId,
      authorUserId: data.authorUserId,
      bodyMarkdown: data.bodyMarkdown,
      bodyPlaintext: data.bodyPlaintext,
      messageType: 'system',
    })
    .returning();
  return message;
}
