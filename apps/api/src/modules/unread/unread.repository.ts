import { eq, and, ne, sql } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  channelReads,
  channels,
  messages,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Channel read state
// ---------------------------------------------------------------------------

export async function getChannelRead(channelId: string, userId: string) {
  const [row] = await db
    .select()
    .from(channelReads)
    .where(
      and(
        eq(channelReads.channelId, channelId),
        eq(channelReads.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertChannelRead(
  channelId: string,
  userId: string,
  lastReadMessageId: string | null,
) {
  // Try insert, on conflict update
  const [row] = await db
    .insert(channelReads)
    .values({
      channelId,
      userId,
      lastReadMessageId,
      unreadCountCache: 0,
      mentionCountCache: 0,
    })
    .onConflictDoUpdate({
      target: [channelReads.channelId, channelReads.userId],
      set: {
        lastReadMessageId,
        unreadCountCache: 0,
        mentionCountCache: 0,
      },
    })
    .returning();
  return row;
}

export async function findLatestMessageId(channelId: string) {
  const [message] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.channelId, channelId), sql`${messages.threadId} IS NULL`))
    .orderBy(sql`${messages.createdAt} DESC`)
    .limit(1);
  return message?.id ?? null;
}

// ---------------------------------------------------------------------------
// Unread summary for a community
// ---------------------------------------------------------------------------

export async function getUnreadSummary(communityId: string, userId: string) {
  const result = await db
    .select({
      channelId: channels.id,
      channelName: channels.name,
      lastReadMessageId: channelReads.lastReadMessageId,
      unreadCount: sql<number>`COALESCE((
        SELECT count(*)::int
        FROM ${messages} AS m
        WHERE m.channel_id = ${channels.id}
          AND m.thread_id IS NULL
          AND m.author_user_id <> ${userId}
          AND (
            ${channelReads.lastReadMessageId} IS NULL
            OR m.id > ${channelReads.lastReadMessageId}
          )
      ), 0)`,
      mentionCountCache: channelReads.mentionCountCache,
    })
    .from(channels)
    .leftJoin(
      channelReads,
      and(
        eq(channelReads.channelId, channels.id),
        eq(channelReads.userId, userId),
      ),
    )
    .where(eq(channels.communityId, communityId));

  return result.map((row) => ({
    channelId: row.channelId,
    channelName: row.channelName,
    lastReadMessageId: row.lastReadMessageId,
    unreadCount: row.unreadCount ?? 0,
    mentionCount: row.mentionCountCache ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Increment unread counts when a new message is posted
// ---------------------------------------------------------------------------

/**
 * Increment unread_count_cache for all users who have a channel_reads row
 * for this channel, except the message author.
 */
export async function incrementUnreadForChannel(
  channelId: string,
  excludeUserId: string,
) {
  await db
    .update(channelReads)
    .set({
      unreadCountCache: sql`COALESCE(${channelReads.unreadCountCache}, 0) + 1`,
    })
    .where(
      and(
        eq(channelReads.channelId, channelId),
        ne(channelReads.userId, excludeUserId),
      ),
    );
}

/**
 * Increment mention_count_cache for a specific user in a channel.
 */
export async function incrementMentionCount(
  channelId: string,
  userId: string,
) {
  // If no row exists yet, insert one with mentionCount=1
  const existing = await getChannelRead(channelId, userId);
  if (!existing) {
    await db
      .insert(channelReads)
      .values({
        channelId,
        userId,
        lastReadMessageId: null,
        unreadCountCache: 1,
        mentionCountCache: 1,
      })
      .onConflictDoNothing();
    return;
  }

  await db
    .update(channelReads)
    .set({
      mentionCountCache: sql`COALESCE(${channelReads.mentionCountCache}, 0) + 1`,
    })
    .where(
      and(
        eq(channelReads.channelId, channelId),
        eq(channelReads.userId, userId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function findChannelById(channelId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);
  return channel ?? null;
}
