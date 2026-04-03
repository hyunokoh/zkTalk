import { eq, and, desc, lt, gt, sql, inArray, isNull, or } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import {
  messages,
  users,
  channels,
  attachments,
  communityMemberships,
  membershipRoles,
  roles,
  channelRolePermissions,
  channelReads,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateMessageInput {
  id?: string;
  communityId: string;
  channelId: string;
  threadId?: string | null;
  parentMessageId?: string | null;
  forwardedFromMessageId?: string | null;
  authorUserId: string;
  bodyMarkdown: string;
  bodyPlaintext: string;
  messageType?: 'user' | 'system';
  isEdited?: boolean;
  isDeleted?: boolean;
  isEncrypted?: boolean;
  isSealed?: boolean;
  encryptedPayload?: string | null;
  expiresAt?: Date | null;
  topic?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

async function withAttachments<
  T extends {
    message: {
      id: string;
    };
  },
>(rows: T[]): Promise<Array<T & { attachments: typeof attachments.$inferSelect[] }>> {
  if (rows.length === 0) {
    return rows.map((row) => ({ ...row, attachments: [] }));
  }

  const messageIds = rows.map((row) => row.message.id);
  const attachmentRows = await db
    .select()
    .from(attachments)
    .where(inArray(attachments.messageId, messageIds));

  const attachmentsByMessageId = new Map<string, typeof attachments.$inferSelect[]>();
  for (const attachment of attachmentRows) {
    if (!attachment.messageId) {
      continue;
    }
    const existing = attachmentsByMessageId.get(attachment.messageId) ?? [];
    existing.push(attachment);
    attachmentsByMessageId.set(attachment.messageId, existing);
  }

  return rows.map((row) => ({
    ...row,
    attachments: attachmentsByMessageId.get(row.message.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Message CRUD
// ---------------------------------------------------------------------------

export async function createMessage(data: CreateMessageInput) {
  const id = data.id ?? uuidv7();
  const createdAt = data.createdAt ?? new Date();
  const updatedAt = data.updatedAt ?? createdAt;
  const [message] = await db
    .insert(messages)
    .values({
      id,
      communityId: data.communityId,
      channelId: data.channelId,
      threadId: data.threadId ?? null,
      parentMessageId: data.parentMessageId ?? null,
      forwardedFromMessageId: data.forwardedFromMessageId ?? null,
      authorUserId: data.authorUserId,
      bodyMarkdown: data.bodyMarkdown,
      bodyPlaintext: data.bodyPlaintext,
      messageType: data.messageType ?? 'user',
      isEdited: data.isEdited ?? false,
      isDeleted: data.isDeleted ?? false,
      isEncrypted: data.isEncrypted ?? false,
      isSealed: data.isSealed ?? false,
      encryptedPayload: data.encryptedPayload ?? null,
      expiresAt: data.expiresAt ?? null,
      topic: data.topic ?? null,
      createdAt,
      updatedAt,
    })
    .returning();
  return message;
}

export async function findMessageById(id: string) {
  const rows = await db
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
    .where(eq(messages.id, id))
    .limit(1);

  const [row] = await withAttachments(rows);
  return row ?? null;
}

export async function findMessagesByChannel(
  channelId: string,
  cursor?: string,
  limit = 50,
  topic?: string,
) {
  // Fetch one extra to determine if there are more messages
  const queryLimit = limit + 1;

  // Filter out expired disappearing messages
  const notExpired = or(isNull(messages.expiresAt), gt(messages.expiresAt, new Date()));

  // Optional topic filter
  const topicFilter = topic ? eq(messages.topic, topic) : undefined;
  const topLevelOnly = isNull(messages.threadId);

  const baseConditions = cursor
    ? [eq(messages.channelId, channelId), lt(messages.id, cursor), notExpired, topLevelOnly, topicFilter].filter(Boolean)
    : [eq(messages.channelId, channelId), notExpired, topLevelOnly, topicFilter].filter(Boolean);

  const rows = await db
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
    .where(and(...baseConditions))
    .orderBy(desc(messages.id))
    .limit(queryLimit);

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;
  const rowsWithAttachments = await withAttachments(resultRows);

  return {
    messages: rowsWithAttachments,
    hasMore,
  };
}

export async function updateMessage(
  id: string,
  data: { bodyMarkdown: string; bodyPlaintext: string; isEdited: true },
) {
  const [message] = await db
    .update(messages)
    .set({
      bodyMarkdown: data.bodyMarkdown,
      bodyPlaintext: data.bodyPlaintext,
      isEdited: true,
      updatedAt: new Date(),
    })
    .where(eq(messages.id, id))
    .returning();
  return message ?? null;
}

export async function softDeleteMessage(id: string) {
  const [message] = await db
    .update(messages)
    .set({
      isDeleted: true,
      bodyMarkdown: '',
      bodyPlaintext: '',
      updatedAt: new Date(),
    })
    .where(eq(messages.id, id))
    .returning();
  return message ?? null;
}

export async function countMessagesAfter(channelId: string, afterMessageId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        gt(messages.id, afterMessageId),
        isNull(messages.threadId),
      ),
    );
  return result?.count ?? 0;
}

export async function findLastMessageByUser(channelId: string, userId: string) {
  const [message] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        eq(messages.authorUserId, userId),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return message ?? null;
}

// ---------------------------------------------------------------------------
// Channel lookup (used by service layer)
// ---------------------------------------------------------------------------

export async function findChannelById(id: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, id))
    .limit(1);
  return channel ?? null;
}

// ---------------------------------------------------------------------------
// Permission helpers (re-exported for the message service)
// ---------------------------------------------------------------------------

export async function getUserMembership(userId: string, communityId: string) {
  const [membership] = await db
    .select()
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
      ),
    )
    .limit(1);
  return membership ?? null;
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

export async function getChannelPermissions(channelId: string) {
  return db
    .select()
    .from(channelRolePermissions)
    .where(eq(channelRolePermissions.channelId, channelId));
}

// ---------------------------------------------------------------------------
// Mention helpers
// ---------------------------------------------------------------------------

/**
 * Get all active member user IDs for a community.
 */
export async function getCommunityMemberUserIds(communityId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: communityMemberships.userId })
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    );
  return rows.map((r) => r.userId);
}

/**
 * Find a user by their display name (case-insensitive).
 */
export async function findUserByDisplayName(displayName: string) {
  const [user] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(sql`lower(${users.displayName}) = lower(${displayName})`)
    .limit(1);
  return user ?? null;
}

/**
 * Find a user by their ID (for push notification author name).
 */
export async function findUserByUserId(userId: string) {
  const [user] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

// ---------------------------------------------------------------------------
// Batch unread count for messages (KakaoTalk-style read receipts)
// ---------------------------------------------------------------------------

/**
 * For a list of message IDs in a channel, compute how many active community
 * members have NOT read past each message.
 *
 * Uses `channelReads.lastReadMessageId` — since IDs are UUIDv7 (time-ordered),
 * a member has read a message if their lastReadMessageId >= that message's ID.
 *
 * Returns a map: messageId -> unreadCount
 */
export async function getUnreadCountsForMessages(
  channelId: string,
  communityId: string,
  messageIds: string[],
  messageAuthorMap: Record<string, string>,
): Promise<Record<string, number>> {
  if (messageIds.length === 0) return {};

  // 1. Count total active members in the community
  const [memberCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    );
  const totalMembers = memberCountResult?.count ?? 0;

  // 2. Get all channelReads for this channel
  const reads = await db
    .select({
      userId: channelReads.userId,
      lastReadMessageId: channelReads.lastReadMessageId,
    })
    .from(channelReads)
    .where(eq(channelReads.channelId, channelId));

  // 3. For each message, count how many members have read past it
  const result: Record<string, number> = {};
  for (const messageId of messageIds) {
    const authorUserId = messageAuthorMap[messageId];
    result[messageId] = computeChannelMessageUnreadCount({
      totalMembers,
      reads,
      messageId,
      authorUserId,
    });
  }

  return result;
}

export function computeChannelMessageUnreadCount({
  totalMembers,
  reads,
  messageId,
  authorUserId,
}: {
  totalMembers: number;
  reads: Array<{ userId: string; lastReadMessageId: string | null }>;
  messageId: string;
  authorUserId?: string;
}): number {
  const participantTotal = authorUserId ? Math.max(0, totalMembers - 1) : totalMembers;
  const readCount = reads.filter((r) => {
    if (authorUserId && r.userId === authorUserId) {
      return false;
    }
    return r.lastReadMessageId !== null && r.lastReadMessageId >= messageId;
  }).length;
  return Math.max(0, participantTotal - readCount);
}

// ---------------------------------------------------------------------------
// Topic helpers (Zulip-style topic-based threading)
// ---------------------------------------------------------------------------

/**
 * Get distinct topics for a channel, ordered by most recent message.
 */
export async function findDistinctTopics(channelId: string) {
  const rows = await db
    .select({
      topic: messages.topic,
      latestMessageAt: sql<string>`max(${messages.createdAt})`,
      messageCount: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        sql`${messages.topic} IS NOT NULL`,
      ),
    )
    .groupBy(messages.topic)
    .orderBy(sql`max(${messages.createdAt}) DESC`);

  return rows;
}
