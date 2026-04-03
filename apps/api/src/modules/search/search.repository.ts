import { eq, and, or, sql, lt, gte, lte, inArray, ilike, type SQLWrapper } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  messages,
  users,
  channels,
  attachments,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchFilters {
  communityId: string;
  channelId?: string;
  authorId?: string;
  author?: string;
  hasAttachment?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// ---------------------------------------------------------------------------
// Full-text search
// ---------------------------------------------------------------------------

export async function searchMessages(
  query: string,
  filters: SearchFilters,
  accessibleChannelIds: string[],
  cursor?: string,
  limit = 50,
) {
  if (accessibleChannelIds.length === 0) {
    return { messages: [], hasMore: false };
  }

  const queryLimit = limit + 1;

  const conditions: Array<SQLWrapper | undefined> = [];

  // Full-text search condition
  conditions.push(
    sql`to_tsvector('english', ${messages.bodyPlaintext}) @@ plainto_tsquery('english', ${query})`,
  );

  // Community filter
  conditions.push(eq(messages.communityId, filters.communityId));

  // Only search in accessible channels
  conditions.push(inArray(messages.channelId, accessibleChannelIds));

  // Not deleted
  conditions.push(eq(messages.isDeleted, false));

  // Optional filters
  if (filters.channelId) {
    conditions.push(eq(messages.channelId, filters.channelId));
  }

  if (filters.authorId) {
    conditions.push(eq(messages.authorUserId, filters.authorId));
  }

  if (filters.author) {
    const authorQuery = `%${filters.author}%`;
    conditions.push(
      or(
        ilike(users.username, authorQuery),
        ilike(users.displayName, authorQuery),
      ),
    );
  }

  if (filters.dateFrom) {
    conditions.push(gte(messages.createdAt, new Date(filters.dateFrom)));
  }

  if (filters.dateTo) {
    conditions.push(lte(messages.createdAt, new Date(filters.dateTo)));
  }

  if (cursor) {
    conditions.push(lt(messages.id, cursor));
  }

  // Build the base query
  let rows;

  if (filters.hasAttachment) {
    // Join with attachments to filter messages that have attachments
    rows = await db
      .select({
        message: messages,
        author: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
        channel: {
          id: channels.id,
          name: channels.name,
        },
        rank: sql<number>`ts_rank(to_tsvector('english', ${messages.bodyPlaintext}), plainto_tsquery('english', ${query}))`.as('rank'),
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorUserId, users.id))
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .innerJoin(attachments, eq(messages.id, attachments.messageId))
      .where(and(...conditions))
      .orderBy(sql`rank DESC`)
      .limit(queryLimit);
  } else {
    rows = await db
      .select({
        message: messages,
        author: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
        channel: {
          id: channels.id,
          name: channels.name,
        },
        rank: sql<number>`ts_rank(to_tsvector('english', ${messages.bodyPlaintext}), plainto_tsquery('english', ${query}))`.as('rank'),
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorUserId, users.id))
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .where(and(...conditions))
      .orderBy(sql`rank DESC`)
      .limit(queryLimit);
  }

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    messages: resultRows,
    hasMore,
  };
}
