import { db } from '../../lib/db/index.js';
import { messages, threads, threadFollows, users, channels } from '../../lib/db/schema.js';
import { eq, and, desc, sql, like } from 'drizzle-orm';

export async function getMentions(
  username: string,
  communityId: string,
  cursor?: string,
  limit = 20,
) {
  const mentionPattern = `%@${username}%`;
  const conditions = [
    eq(messages.communityId, communityId),
    eq(messages.isDeleted, false),
    like(messages.bodyPlaintext, mentionPattern),
  ];
  if (cursor) conditions.push(sql`${messages.id} < ${cursor}`);

  const results = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      authorUserId: messages.authorUserId,
      authorName: users.displayName,
      bodyMarkdown: messages.bodyMarkdown,
      createdAt: messages.createdAt,
      threadId: messages.threadId,
    })
    .from(messages)
    .innerJoin(users, eq(messages.authorUserId, users.id))
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  return {
    items: results.slice(0, limit).map((r) => ({ type: 'mention' as const, ...r })),
    hasMore,
  };
}

export async function getThreadReplies(userId: string, cursor?: string, limit = 20) {
  const conditions = [
    eq(messages.isDeleted, false),
    sql`${messages.authorUserId} != ${userId}`,
  ];
  if (cursor) conditions.push(sql`${messages.id} < ${cursor}`);

  const results = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      authorUserId: messages.authorUserId,
      authorName: users.displayName,
      bodyMarkdown: messages.bodyMarkdown,
      createdAt: messages.createdAt,
      threadId: messages.threadId,
      threadTitle: threads.title,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .innerJoin(users, eq(messages.authorUserId, users.id))
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .innerJoin(
      threadFollows,
      and(eq(threadFollows.threadId, messages.threadId), eq(threadFollows.userId, userId)),
    )
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  return {
    items: results.slice(0, limit).map((r) => ({ type: 'thread_reply' as const, ...r })),
    hasMore,
  };
}

export async function getInboxItems(
  userId: string,
  username: string,
  communityId?: string,
  cursor?: string,
  limit = 20,
) {
  const allItems: Array<{ type: string; id: string; createdAt: Date | null; [key: string]: unknown }> = [];

  if (communityId) {
    const mentions = await getMentions(username, communityId, cursor, limit);
    allItems.push(...mentions.items);
  }

  const threadReplies = await getThreadReplies(userId, cursor, limit);
  allItems.push(...threadReplies.items);

  allItems.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const limited = allItems.slice(0, limit);
  const hasMore = allItems.length > limit;

  return { items: limited, hasMore };
}
