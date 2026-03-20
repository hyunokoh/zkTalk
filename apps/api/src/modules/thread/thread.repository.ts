import { eq, and, desc, sql, lt, gt } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  threads,
  threadFollows,
  messages,
  users,
  channels,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Thread CRUD
// ---------------------------------------------------------------------------

export interface CreateThreadInput {
  id: string;
  channelId: string;
  rootMessageId: string;
  title?: string;
  createdByUserId: string;
}

export async function createThread(data: CreateThreadInput) {
  const [thread] = await db
    .insert(threads)
    .values({
      id: data.id,
      channelId: data.channelId,
      rootMessageId: data.rootMessageId,
      title: data.title ?? null,
      createdByUserId: data.createdByUserId,
    })
    .returning();
  return thread;
}

export async function findThreadById(id: string) {
  const [result] = await db
    .select({
      thread: threads,
      creator: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(threads)
    .innerJoin(users, eq(threads.createdByUserId, users.id))
    .where(eq(threads.id, id))
    .limit(1);
  return result ?? null;
}

export async function findThreadsByChannel(
  channelId: string,
  cursor?: string,
  limit = 20,
  sort: 'latest' | 'top' = 'latest',
) {
  const orderCol = sort === 'top' ? threads.replyCount : threads.lastActivityAt;

  // Build the where condition upfront
  let whereCondition = eq(threads.channelId, channelId);

  if (cursor) {
    if (sort === 'top') {
      whereCondition = and(
        eq(threads.channelId, channelId),
        lt(threads.id, cursor),
      )!;
    } else {
      const [cursorThread] = await db
        .select({ lastActivityAt: threads.lastActivityAt })
        .from(threads)
        .where(eq(threads.id, cursor))
        .limit(1);

      if (cursorThread) {
        whereCondition = and(
          eq(threads.channelId, channelId),
          lt(threads.lastActivityAt, cursorThread.lastActivityAt),
        )!;
      }
    }
  }

  const results = await db
    .select({
      thread: threads,
      creator: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
      rootMessage: {
        id: messages.id,
        bodyMarkdown: messages.bodyMarkdown,
        createdAt: messages.createdAt,
      },
    })
    .from(threads)
    .innerJoin(users, eq(threads.createdByUserId, users.id))
    .innerJoin(messages, eq(threads.rootMessageId, messages.id))
    .where(whereCondition)
    .orderBy(desc(orderCol))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? items[items.length - 1].thread.id : null;

  return { items, nextCursor };
}

export async function getThreadMessages(
  threadId: string,
  cursor?: string,
  limit = 50,
) {
  let conditions = eq(messages.threadId, threadId);

  if (cursor) {
    const [cursorMsg] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, cursor))
      .limit(1);

    if (cursorMsg) {
      conditions = and(
        eq(messages.threadId, threadId),
        gt(messages.createdAt, cursorMsg.createdAt),
      )!;
    }
  }

  const results = await db
    .select({
      message: messages,
      author: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.authorUserId, users.id))
    .where(conditions)
    .orderBy(messages.createdAt)
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? items[items.length - 1].message.id : null;

  return { items, nextCursor };
}

export async function incrementReplyCount(threadId: string) {
  await db
    .update(threads)
    .set({ replyCount: sql`${threads.replyCount} + 1` })
    .where(eq(threads.id, threadId));
}

export async function updateThreadActivity(threadId: string) {
  await db
    .update(threads)
    .set({ lastActivityAt: new Date() })
    .where(eq(threads.id, threadId));
}

export async function lockThread(threadId: string) {
  const [thread] = await db
    .update(threads)
    .set({ isLocked: true })
    .where(eq(threads.id, threadId))
    .returning();
  return thread ?? null;
}

// ---------------------------------------------------------------------------
// Thread follow operations
// ---------------------------------------------------------------------------

export async function followThread(threadId: string, userId: string) {
  await db
    .insert(threadFollows)
    .values({ threadId, userId })
    .onConflictDoNothing();
}

export async function unfollowThread(threadId: string, userId: string) {
  await db
    .delete(threadFollows)
    .where(
      and(
        eq(threadFollows.threadId, threadId),
        eq(threadFollows.userId, userId),
      ),
    );
}

export async function isFollowing(threadId: string, userId: string) {
  const [row] = await db
    .select()
    .from(threadFollows)
    .where(
      and(
        eq(threadFollows.threadId, threadId),
        eq(threadFollows.userId, userId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function getFollowers(threadId: string) {
  const rows = await db
    .select({ userId: threadFollows.userId })
    .from(threadFollows)
    .where(eq(threadFollows.threadId, threadId));
  return rows.map((r) => r.userId);
}

export async function updateLastReadMessage(
  threadId: string,
  userId: string,
  messageId: string,
) {
  await db
    .update(threadFollows)
    .set({ lastReadMessageId: messageId })
    .where(
      and(
        eq(threadFollows.threadId, threadId),
        eq(threadFollows.userId, userId),
      ),
    );
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

export async function createMessage(data: {
  id: string;
  communityId: string;
  channelId: string;
  threadId?: string;
  authorUserId: string;
  bodyMarkdown: string;
  bodyPlaintext: string;
}) {
  const [msg] = await db
    .insert(messages)
    .values({
      id: data.id,
      communityId: data.communityId,
      channelId: data.channelId,
      threadId: data.threadId ?? null,
      authorUserId: data.authorUserId,
      bodyMarkdown: data.bodyMarkdown,
      bodyPlaintext: data.bodyPlaintext,
    })
    .returning();
  return msg;
}
