import { eq, and, desc, lt } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  bookmarks,
  channels,
  communities,
  messages,
  users,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Bookmark CRUD
// ---------------------------------------------------------------------------

export async function addBookmark(id: string, userId: string, messageId: string) {
  const [bookmark] = await db
    .insert(bookmarks)
    .values({ id, userId, messageId })
    .onConflictDoNothing({
      target: [bookmarks.userId, bookmarks.messageId],
    })
    .returning();
  return bookmark ?? null;
}

export async function removeBookmark(userId: string, messageId: string) {
  const [bookmark] = await db
    .delete(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.messageId, messageId),
      ),
    )
    .returning();
  return bookmark ?? null;
}

export async function findUserBookmarks(
  userId: string,
  cursor?: string,
  limit = 50,
) {
  const queryLimit = limit + 1;

  let rows;
  if (cursor) {
    rows = await db
      .select({
        bookmark: bookmarks,
        message: messages,
        channel: {
          id: channels.id,
          name: channels.name,
        },
        community: {
          slug: communities.slug,
        },
        author: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(bookmarks)
      .innerJoin(messages, eq(bookmarks.messageId, messages.id))
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .innerJoin(communities, eq(messages.communityId, communities.id))
      .innerJoin(users, eq(messages.authorUserId, users.id))
      .where(and(eq(bookmarks.userId, userId), lt(bookmarks.id, cursor)))
      .orderBy(desc(bookmarks.id))
      .limit(queryLimit);
  } else {
    rows = await db
      .select({
        bookmark: bookmarks,
        message: messages,
        channel: {
          id: channels.id,
          name: channels.name,
        },
        community: {
          slug: communities.slug,
        },
        author: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(bookmarks)
      .innerJoin(messages, eq(bookmarks.messageId, messages.id))
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .innerJoin(communities, eq(messages.communityId, communities.id))
      .innerJoin(users, eq(messages.authorUserId, users.id))
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.id))
      .limit(queryLimit);
  }

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    bookmarks: resultRows,
    hasMore,
  };
}

export async function findBookmark(userId: string, messageId: string) {
  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.messageId, messageId),
      ),
    )
    .limit(1);
  return bookmark ?? null;
}

// ---------------------------------------------------------------------------
// Message lookup
// ---------------------------------------------------------------------------

export async function findMessageById(id: string) {
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);
  return message ?? null;
}
