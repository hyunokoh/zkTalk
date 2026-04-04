import { db } from '../../lib/db/index.js';
import {
  messages,
  threads,
  threadFollows,
  users,
  channels,
  communities,
  communityMemberships,
} from '../../lib/db/schema.js';
import { eq, and, desc, sql, lt, or, ilike } from 'drizzle-orm';

type InboxItemRow = {
  id: string;
  type: 'mention' | 'thread_reply';
  communityId: string;
  communitySlug: string;
  channelId: string;
  channelName: string;
  authorDisplayName: string;
  bodyPreview: string;
  messageId: string;
  threadId: string | null;
  createdAt: Date | null;
  isRead: boolean;
};

function buildMentionMatchCondition(username: string, displayName: string) {
  const targets = Array.from(
    new Set(
      ['everyone', 'here', username, displayName]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  return or(
    ...targets.map((target) => ilike(messages.bodyPlaintext, `%@${target}%`)),
  )!;
}

const INBOX_READ_EPSILON = sql`interval '1 millisecond'`;

function inboxReadCutoff(column: typeof communityMemberships.lastReadInboxAt) {
  return sql`${column} + ${INBOX_READ_EPSILON}`;
}

export async function getMentions(
  userId: string,
  username: string,
  displayName: string,
  communityId?: string,
  q?: string,
  cursor?: string,
  limit = 20,
) {
  const conditions = [
    eq(messages.isDeleted, false),
    buildMentionMatchCondition(username, displayName),
    sql`${messages.authorUserId} != ${userId}`,
    eq(communityMemberships.userId, userId),
    eq(communityMemberships.membershipStatus, 'active'),
  ];
  if (q) {
    const searchPattern = `%${q}%`;
    conditions.push(
      or(
        ilike(users.displayName, searchPattern),
        ilike(channels.name, searchPattern),
        ilike(communities.slug, searchPattern),
        ilike(messages.bodyPlaintext, searchPattern),
      )!,
    );
  }
  if (communityId) conditions.push(eq(messages.communityId, communityId));
  if (cursor) conditions.push(sql`${messages.id} < ${cursor}`);

  const results = await db
    .select({
      id: sql<string>`'mention:' || ${messages.id}`,
      type: sql<'mention'>`'mention'`,
      communityId: messages.communityId,
      communitySlug: communities.slug,
      messageId: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      authorDisplayName: users.displayName,
      bodyPreview: messages.bodyPlaintext,
      createdAt: messages.createdAt,
      threadId: messages.threadId,
      isRead: sql<boolean>`CASE
        WHEN ${communityMemberships.lastReadInboxAt} IS NOT NULL
          AND ${messages.createdAt} < ${inboxReadCutoff(communityMemberships.lastReadInboxAt)}
        THEN true
        ELSE false
      END`,
    })
    .from(messages)
    .innerJoin(users, eq(messages.authorUserId, users.id))
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .innerJoin(communities, eq(messages.communityId, communities.id))
    .innerJoin(
      communityMemberships,
      and(
        eq(communityMemberships.communityId, messages.communityId),
        eq(communityMemberships.userId, userId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  return {
    items: results.slice(0, limit),
    hasMore,
  };
}

export async function getThreadReplies(
  userId: string,
  communityId?: string,
  q?: string,
  cursor?: string,
  limit = 20,
) {
  const conditions = [
    eq(messages.isDeleted, false),
    sql`${messages.authorUserId} != ${userId}`,
  ];
  if (q) {
    const searchPattern = `%${q}%`;
    conditions.push(
      or(
        ilike(users.displayName, searchPattern),
        ilike(channels.name, searchPattern),
        ilike(communities.slug, searchPattern),
        ilike(messages.bodyPlaintext, searchPattern),
      )!,
    );
  }
  if (communityId) conditions.push(eq(messages.communityId, communityId));
  if (cursor) conditions.push(sql`${messages.id} < ${cursor}`);

  const results = await db
    .select({
      id: sql<string>`'thread:' || ${messages.id}`,
      type: sql<'thread_reply'>`'thread_reply'`,
      communityId: messages.communityId,
      communitySlug: communities.slug,
      messageId: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      authorDisplayName: users.displayName,
      bodyPreview: messages.bodyPlaintext,
      createdAt: messages.createdAt,
      threadId: messages.threadId,
      isRead: sql<boolean>`CASE
        WHEN ${threadFollows.lastReadMessageId} IS NOT NULL
          AND ${messages.id} <= ${threadFollows.lastReadMessageId}
        THEN true
        ELSE false
      END`,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .innerJoin(users, eq(messages.authorUserId, users.id))
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .innerJoin(communities, eq(messages.communityId, communities.id))
    .innerJoin(
      threadFollows,
      and(eq(threadFollows.threadId, messages.threadId), eq(threadFollows.userId, userId)),
    )
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  return {
    items: results.slice(0, limit),
    hasMore,
  };
}

export async function getInboxItems(
  userId: string,
  username: string,
  displayName: string,
  communityId?: string,
  q?: string,
  cursor?: string,
  limit = 20,
) {
  const allItems: InboxItemRow[] = [];

  const mentions = await getMentions(
    userId,
    username,
    displayName,
    communityId,
    q,
    cursor,
    limit,
  );
  allItems.push(...mentions.items);

  const threadReplies = await getThreadReplies(userId, communityId, q, cursor, limit);
  allItems.push(...threadReplies.items);

  allItems.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const limited = allItems.slice(0, limit);
  const hasMore = allItems.length > limit;
  const nextCursor = hasMore ? limited[limited.length - 1]?.messageId ?? null : null;

  return { items: limited, hasMore, nextCursor };
}

export async function getInboxSummary(
  userId: string,
  username: string,
  displayName: string,
  communityId?: string,
) {
  const mentionConditions = [
    eq(messages.isDeleted, false),
    buildMentionMatchCondition(username, displayName),
    sql`${messages.authorUserId} != ${userId}`,
    eq(communityMemberships.membershipStatus, 'active'),
    communityId ? eq(messages.communityId, communityId) : undefined,
    or(
      sql`${communityMemberships.lastReadInboxAt} IS NULL`,
      sql`${messages.createdAt} >= ${inboxReadCutoff(communityMemberships.lastReadInboxAt)}`,
    ),
  ].filter(Boolean);

  const [mentionsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(
      communityMemberships,
      and(
        eq(communityMemberships.communityId, messages.communityId),
        eq(communityMemberships.userId, userId),
      ),
    )
    .where(and(...mentionConditions));

  const threadConditions = [
    eq(messages.isDeleted, false),
    sql`${messages.authorUserId} != ${userId}`,
    communityId ? eq(messages.communityId, communityId) : undefined,
    or(
      sql`${threadFollows.lastReadMessageId} IS NULL`,
      sql`${messages.id} > ${threadFollows.lastReadMessageId}`,
    ),
  ].filter(Boolean);

  const [threadsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .innerJoin(
      threadFollows,
      and(eq(threadFollows.threadId, messages.threadId), eq(threadFollows.userId, userId)),
    )
    .where(and(...threadConditions));

  const mentions = mentionsResult?.count ?? 0;
  const threadReplies = threadsResult?.count ?? 0;

  return {
    all: mentions + threadReplies,
    mentions,
    threads: threadReplies,
  };
}

export async function getInboxCommunitySummaries(
  userId: string,
  username: string,
  displayName: string,
) {
  const mentionRows = await db
    .select({
      communityId: messages.communityId,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(
      communityMemberships,
      and(
        eq(communityMemberships.communityId, messages.communityId),
        eq(communityMemberships.userId, userId),
      ),
    )
    .where(
      and(
        eq(messages.isDeleted, false),
        buildMentionMatchCondition(username, displayName),
        sql`${messages.authorUserId} != ${userId}`,
        eq(communityMemberships.membershipStatus, 'active'),
        or(
          sql`${communityMemberships.lastReadInboxAt} IS NULL`,
          sql`${messages.createdAt} >= ${inboxReadCutoff(communityMemberships.lastReadInboxAt)}`,
        ),
      ),
    )
    .groupBy(messages.communityId);

  const threadRows = await db
    .select({
      communityId: messages.communityId,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .innerJoin(
      threadFollows,
      and(eq(threadFollows.threadId, messages.threadId), eq(threadFollows.userId, userId)),
    )
    .where(
      and(
        eq(messages.isDeleted, false),
        sql`${messages.authorUserId} != ${userId}`,
        or(
          sql`${threadFollows.lastReadMessageId} IS NULL`,
          sql`${messages.id} > ${threadFollows.lastReadMessageId}`,
        ),
      ),
    )
    .groupBy(messages.communityId);

  const counts = new Map<
    string,
    {
      mentions: number;
      threads: number;
      all: number;
    }
  >();

  for (const row of mentionRows) {
    counts.set(row.communityId, {
      mentions: row.count,
      threads: 0,
      all: row.count,
    });
  }

  for (const row of threadRows) {
    const existing = counts.get(row.communityId) ?? { mentions: 0, threads: 0, all: 0 };
    existing.threads = row.count;
    existing.all = existing.mentions + row.count;
    counts.set(row.communityId, existing);
  }

  return {
    items: Array.from(counts.entries()).map(([communityId, value]) => ({
      communityId,
      ...value,
    })),
  };
}

export async function markInboxItemRead(userId: string, messageId: string) {
  const [message] = await db
    .select({
      id: messages.id,
      communityId: messages.communityId,
      threadId: messages.threadId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message) {
    return { ok: true };
  }

  if (message.createdAt) {
    const nextLastReadInboxAt = new Date(message.createdAt.getTime() + 1);
    await db
      .update(communityMemberships)
      .set({ lastReadInboxAt: nextLastReadInboxAt })
      .where(
        and(
          eq(communityMemberships.userId, userId),
          eq(communityMemberships.communityId, message.communityId),
          or(
            sql`${communityMemberships.lastReadInboxAt} IS NULL`,
            lt(communityMemberships.lastReadInboxAt, nextLastReadInboxAt),
          ),
        ),
      );
  }

  if (message.threadId) {
    await db
      .update(threadFollows)
      .set({
        lastReadMessageId: sql`CASE
          WHEN ${threadFollows.lastReadMessageId} IS NULL
            OR ${threadFollows.lastReadMessageId} < ${message.id}
          THEN ${message.id}
          ELSE ${threadFollows.lastReadMessageId}
        END`,
      })
      .where(
        and(
          eq(threadFollows.threadId, message.threadId),
          eq(threadFollows.userId, userId),
        ),
      );
  }

  return { ok: true };
}

export async function markAllInboxRead(
  userId: string,
  communityId?: string,
  type: 'all' | 'mentions' | 'threads' = 'all',
) {
  const now = new Date();
  const membershipConditions = [
    eq(communityMemberships.userId, userId),
    eq(communityMemberships.membershipStatus, 'active'),
    communityId ? eq(communityMemberships.communityId, communityId) : undefined,
  ].filter(Boolean);

  if (type === 'all' || type === 'mentions') {
    await db
      .update(communityMemberships)
      .set({ lastReadInboxAt: now })
      .where(and(...membershipConditions));
  }

  const threadFollowConditions = [
    eq(threadFollows.userId, userId),
    communityId
      ? sql`EXISTS (
          SELECT 1
          FROM ${threads} AS inbox_threads
          INNER JOIN ${channels} AS inbox_channels
            ON inbox_threads.channel_id = inbox_channels.id
          WHERE inbox_threads.id = ${threadFollows.threadId}
            AND inbox_channels.community_id = ${communityId}
        )`
      : undefined,
  ].filter(Boolean);

  if (type === 'all' || type === 'threads') {
    await db
      .update(threadFollows)
      .set({
        lastReadMessageId: sql`COALESCE((
          SELECT latest_messages.id
          FROM ${messages} AS latest_messages
          WHERE latest_messages.thread_id = ${threadFollows.threadId}
          ORDER BY latest_messages.created_at DESC
          LIMIT 1
        ), ${threadFollows.lastReadMessageId})`,
      })
      .where(and(...threadFollowConditions));
  }

  return { ok: true };
}
