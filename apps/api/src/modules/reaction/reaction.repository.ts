import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { reactions, messages, users, channels } from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Reaction CRUD
// ---------------------------------------------------------------------------

export interface AddReactionInput {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export async function addReaction(data: AddReactionInput) {
  const [reaction] = await db
    .insert(reactions)
    .values({
      id: data.id,
      messageId: data.messageId,
      userId: data.userId,
      emoji: data.emoji,
    })
    .onConflictDoNothing()
    .returning();
  return reaction ?? null;
}

export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string,
) {
  const [deleted] = await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.messageId, messageId),
        eq(reactions.userId, userId),
        eq(reactions.emoji, emoji),
      ),
    )
    .returning();
  return deleted ?? null;
}

export async function getReactionsForMessage(messageId: string) {
  const rows = await db
    .select({
      emoji: reactions.emoji,
      userId: reactions.userId,
      username: users.username,
      displayName: users.displayName,
    })
    .from(reactions)
    .innerJoin(users, eq(reactions.userId, users.id))
    .where(eq(reactions.messageId, messageId))
    .orderBy(reactions.createdAt);

  // Group by emoji
  const grouped: Record<string, { emoji: string; count: number; users: { id: string; username: string; displayName: string }[] }> = {};
  for (const row of rows) {
    if (!grouped[row.emoji]) {
      grouped[row.emoji] = { emoji: row.emoji, count: 0, users: [] };
    }
    grouped[row.emoji].count++;
    grouped[row.emoji].users.push({
      id: row.userId,
      username: row.username,
      displayName: row.displayName,
    });
  }

  return Object.values(grouped);
}

export async function getReactionsForMessages(messageIds: string[]) {
  if (messageIds.length === 0) return {};

  const rows = await db
    .select({
      messageId: reactions.messageId,
      emoji: reactions.emoji,
      userId: reactions.userId,
      username: users.username,
      displayName: users.displayName,
    })
    .from(reactions)
    .innerJoin(users, eq(reactions.userId, users.id))
    .where(inArray(reactions.messageId, messageIds))
    .orderBy(reactions.createdAt);

  // Group by messageId then emoji
  const result: Record<string, { emoji: string; count: number; users: { id: string; username: string; displayName: string }[] }[]> = {};

  for (const row of rows) {
    if (!result[row.messageId]) {
      result[row.messageId] = [];
    }

    let group = result[row.messageId].find((g) => g.emoji === row.emoji);
    if (!group) {
      group = { emoji: row.emoji, count: 0, users: [] };
      result[row.messageId].push(group);
    }
    group.count++;
    group.users.push({
      id: row.userId,
      username: row.username,
      displayName: row.displayName,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers used by service layer
// ---------------------------------------------------------------------------

export async function findMessageById(messageId: string) {
  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  return msg ?? null;
}

export async function findChannelById(channelId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);
  return channel ?? null;
}
