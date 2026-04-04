import { eq, and, desc, lt, sql, inArray, gt, ilike, or, ne, asc } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import {
  dmConversations,
  dmParticipants,
  dmMessages,
  users,
  attachments,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function createConversation(
  type: 'direct' | 'group',
  createdByUserId: string,
  name?: string,
) {
  const id = uuidv7();
  const [conversation] = await db
    .insert(dmConversations)
    .values({
      id,
      type,
      name: name ?? null,
      createdByUserId,
    })
    .returning();
  return conversation;
}

export async function addParticipant(conversationId: string, userId: string) {
  const id = uuidv7();
  const [participant] = await db
    .insert(dmParticipants)
    .values({
      id,
      conversationId,
      userId,
    })
    .returning();
  return participant;
}

export async function findConversationById(id: string) {
  const rows = await db
    .select({
      conversation: dmConversations,
      participant: {
        id: dmParticipants.id,
        userId: dmParticipants.userId,
        joinedAt: dmParticipants.joinedAt,
        lastReadMessageId: dmParticipants.lastReadMessageId,
      },
      user: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(dmConversations)
    .innerJoin(dmParticipants, eq(dmConversations.id, dmParticipants.conversationId))
    .innerJoin(users, eq(dmParticipants.userId, users.id))
    .where(eq(dmConversations.id, id));

  if (rows.length === 0) return null;

  const conversation = rows[0].conversation;
  const participants = rows.map((r) => ({
    ...r.participant,
    user: r.user,
  }));

  return { conversation, participants };
}

export async function markConversationPromoted(
  conversationId: string,
  promotedCommunityId: string,
  promotedChannelId: string,
) {
  const [conversation] = await db
    .update(dmConversations)
    .set({
      promotedCommunityId,
      promotedChannelId,
      promotedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(dmConversations.id, conversationId))
    .returning();

  return conversation ?? null;
}

export async function findDirectConversation(userId1: string, userId2: string) {
  // Find a conversation of type 'direct' where both users are participants
  const result = await db
    .select({ conversationId: dmParticipants.conversationId })
    .from(dmParticipants)
    .innerJoin(dmConversations, eq(dmParticipants.conversationId, dmConversations.id))
    .where(
      and(
        eq(dmConversations.type, 'direct'),
        inArray(dmParticipants.userId, [userId1, userId2]),
      ),
    )
    .groupBy(dmParticipants.conversationId)
    .having(sql`count(distinct ${dmParticipants.userId}) = 2`);

  if (result.length === 0) return null;

  return findConversationById(result[0].conversationId);
}

export async function findConversationsForUser(userId: string) {
  // Get all conversation IDs the user participates in
  const userConversations = await db
    .select({ conversationId: dmParticipants.conversationId })
    .from(dmParticipants)
    .where(eq(dmParticipants.userId, userId));

  if (userConversations.length === 0) return [];

  const conversationIds = userConversations.map((c) => c.conversationId);

  // Get conversations with all participants and latest message
  const rows = await db
    .select({
      conversation: dmConversations,
      participant: {
        id: dmParticipants.id,
        userId: dmParticipants.userId,
        joinedAt: dmParticipants.joinedAt,
        lastReadMessageId: dmParticipants.lastReadMessageId,
      },
      user: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(dmConversations)
    .innerJoin(dmParticipants, eq(dmConversations.id, dmParticipants.conversationId))
    .innerJoin(users, eq(dmParticipants.userId, users.id))
    .where(inArray(dmConversations.id, conversationIds))
    .orderBy(desc(dmConversations.updatedAt));

  // Group by conversation
  const conversationMap = new Map<
    string,
    {
      conversation: typeof rows[0]['conversation'];
      participants: Array<typeof rows[0]['participant'] & { user: typeof rows[0]['user'] }>;
    }
  >();

  for (const row of rows) {
    const existing = conversationMap.get(row.conversation.id);
    const participantWithUser = { ...row.participant, user: row.user };
    if (existing) {
      existing.participants.push(participantWithUser);
    } else {
      conversationMap.set(row.conversation.id, {
        conversation: row.conversation,
        participants: [participantWithUser],
      });
    }
  }

  // Fetch the latest message for each conversation
  const results = [];
  for (const [convId, data] of conversationMap) {
    const [latestMessage] = await db
      .select({
        message: dmMessages,
        author: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(dmMessages)
      .innerJoin(users, eq(dmMessages.authorUserId, users.id))
      .where(eq(dmMessages.conversationId, convId))
      .orderBy(desc(dmMessages.createdAt))
      .limit(1);

    results.push({
      ...data,
      latestMessage: latestMessage ?? null,
    });
  }

  // Sort by latest message time (or conversation updatedAt)
  results.sort((a, b) => {
    const aTime = a.latestMessage?.message.createdAt?.getTime() ?? a.conversation.updatedAt.getTime();
    const bTime = b.latestMessage?.message.createdAt?.getTime() ?? b.conversation.updatedAt.getTime();
    return bTime - aTime;
  });

  return results;
}

export async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: dmParticipants.id })
    .from(dmParticipants)
    .where(
      and(
        eq(dmParticipants.conversationId, conversationId),
        eq(dmParticipants.userId, userId),
      ),
    )
    .limit(1);
  return !!row;
}

export async function removeParticipant(conversationId: string, userId: string) {
  await db
    .delete(dmParticipants)
    .where(
      and(
        eq(dmParticipants.conversationId, conversationId),
        eq(dmParticipants.userId, userId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

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
    .where(inArray(attachments.dmMessageId, messageIds));

  const attachmentsByMessageId = new Map<string, typeof attachments.$inferSelect[]>();
  for (const attachment of attachmentRows) {
    const key = attachment.dmMessageId;
    if (!key) continue;
    const existing = attachmentsByMessageId.get(key) ?? [];
    existing.push(attachment);
    attachmentsByMessageId.set(key, existing);
  }

  return rows.map((row) => ({
    ...row,
    attachments: attachmentsByMessageId.get(row.message.id) ?? [],
  }));
}

export async function createDmMessage(
  conversationId: string,
  authorUserId: string,
  bodyMarkdown: string,
  bodyPlaintext: string,
  isEncrypted = false,
  encryptedPayload?: string,
) {
  const id = uuidv7();
  const [message] = await db
    .insert(dmMessages)
    .values({
      id,
      conversationId,
      authorUserId,
      bodyMarkdown,
      bodyPlaintext,
      isEncrypted,
      encryptedPayload: encryptedPayload ?? null,
    })
    .returning();

  // Return with author info
  const [result] = await db
    .select({
      message: dmMessages,
      author: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(dmMessages)
    .innerJoin(users, eq(dmMessages.authorUserId, users.id))
    .where(eq(dmMessages.id, message.id))
    .limit(1);

  const [row] = await withAttachments(result ? [result] : []);
  return row ?? null;
}

export async function findDmMessages(
  conversationId: string,
  cursor?: string,
  limit = 50,
) {
  const queryLimit = limit + 1;

  let rows;
  if (cursor) {
    rows = await db
      .select({
        message: dmMessages,
        author: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(dmMessages)
      .innerJoin(users, eq(dmMessages.authorUserId, users.id))
      .where(
        and(
          eq(dmMessages.conversationId, conversationId),
          lt(dmMessages.id, cursor),
        ),
      )
      .orderBy(desc(dmMessages.id))
      .limit(queryLimit);
  } else {
    rows = await db
      .select({
        message: dmMessages,
        author: {
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(dmMessages)
      .innerJoin(users, eq(dmMessages.authorUserId, users.id))
      .where(eq(dmMessages.conversationId, conversationId))
      .orderBy(desc(dmMessages.id))
      .limit(queryLimit);
  }

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;
  const rowsWithAttachments = await withAttachments(resultRows);

  return {
    messages: rowsWithAttachments,
    hasMore,
  };
}

export async function findAllDmMessagesForExport(conversationId: string) {
  return db
    .select({
      message: dmMessages,
      author: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(dmMessages)
    .innerJoin(users, eq(dmMessages.authorUserId, users.id))
    .where(eq(dmMessages.conversationId, conversationId))
    .orderBy(asc(dmMessages.createdAt), asc(dmMessages.id));
}

export async function findDmMessageById(messageId: string) {
  const [row] = await db
    .select({
      message: dmMessages,
      author: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(dmMessages)
    .innerJoin(users, eq(dmMessages.authorUserId, users.id))
    .where(eq(dmMessages.id, messageId))
    .limit(1);

  const [withAttachmentRow] = await withAttachments(row ? [row] : []);
  return withAttachmentRow ?? null;
}

export async function updateDmMessage(
  messageId: string,
  bodyMarkdown: string,
  bodyPlaintext: string,
  isEncrypted = false,
  encryptedPayload?: string,
) {
  const [message] = await db
    .update(dmMessages)
    .set({
      bodyMarkdown,
      bodyPlaintext,
      isEncrypted,
      encryptedPayload: isEncrypted ? (encryptedPayload ?? null) : null,
      isEdited: true,
      updatedAt: new Date(),
    })
    .where(eq(dmMessages.id, messageId))
    .returning();
  return message ?? null;
}

export async function softDeleteDmMessage(messageId: string) {
  const [message] = await db
    .update(dmMessages)
    .set({
      isDeleted: true,
      bodyMarkdown: '',
      bodyPlaintext: '',
      updatedAt: new Date(),
    })
    .where(eq(dmMessages.id, messageId))
    .returning();
  return message ?? null;
}

// ---------------------------------------------------------------------------
// Read tracking
// ---------------------------------------------------------------------------

export async function updateLastRead(
  conversationId: string,
  userId: string,
  messageId: string,
) {
  await db
    .update(dmParticipants)
    .set({ lastReadMessageId: messageId })
    .where(
      and(
        eq(dmParticipants.conversationId, conversationId),
        eq(dmParticipants.userId, userId),
      ),
    );
}

export async function getUnreadCount(
  conversationId: string,
  userId: string,
): Promise<number> {
  // Get the user's lastReadMessageId
  const [participant] = await db
    .select({ lastReadMessageId: dmParticipants.lastReadMessageId })
    .from(dmParticipants)
    .where(
      and(
        eq(dmParticipants.conversationId, conversationId),
        eq(dmParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (!participant) return 0;

  if (!participant.lastReadMessageId) {
    // Never read - count all messages
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dmMessages)
      .where(eq(dmMessages.conversationId, conversationId));
    return result?.count ?? 0;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dmMessages)
    .where(
      and(
        eq(dmMessages.conversationId, conversationId),
        gt(dmMessages.id, participant.lastReadMessageId),
      ),
    );
  return result?.count ?? 0;
}

export async function updateConversationTimestamp(conversationId: string) {
  await db
    .update(dmConversations)
    .set({ updatedAt: new Date() })
    .where(eq(dmConversations.id, conversationId));
}

// ---------------------------------------------------------------------------
// User lookup
// ---------------------------------------------------------------------------

export async function findUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

export async function findUsersByIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db
    .select()
    .from(users)
    .where(inArray(users.id, userIds));
}

export async function searchUsers(query: string, excludeUserId: string, limit = 8) {
  const searchPattern = `%${query}%`;

  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(
      and(
        ne(users.id, excludeUserId),
        or(
          ilike(users.username, searchPattern),
          ilike(users.displayName, searchPattern),
        ),
      ),
    )
    .orderBy(asc(users.displayName), asc(users.username))
    .limit(limit);
}

export async function getLastReadMessageIds(
  conversationId: string,
): Promise<Record<string, string | null>> {
  const rows = await db
    .select({
      userId: dmParticipants.userId,
      lastReadMessageId: dmParticipants.lastReadMessageId,
    })
    .from(dmParticipants)
    .where(eq(dmParticipants.conversationId, conversationId));

  const result: Record<string, string | null> = {};
  for (const row of rows) {
    result[row.userId] = row.lastReadMessageId;
  }
  return result;
}

export async function getParticipantUserIds(conversationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: dmParticipants.userId })
    .from(dmParticipants)
    .where(eq(dmParticipants.conversationId, conversationId));
  return rows.map((r) => r.userId);
}

// ---------------------------------------------------------------------------
// Batch unread counts for DM messages (KakaoTalk-style read receipts)
// ---------------------------------------------------------------------------

/**
 * For a list of message IDs in a DM conversation, compute how many participants
 * (excluding the message author) have NOT read past each message.
 *
 * Uses `dmParticipants.lastReadMessageId` — since IDs are UUIDv7 (time-ordered),
 * a participant has read a message if their lastReadMessageId >= that message's ID.
 *
 * Returns a map: messageId -> unreadCount
 */
export async function getDmUnreadCountsForMessages(
  conversationId: string,
  messageIds: string[],
  messageAuthorMap: Record<string, string>,
): Promise<Record<string, number>> {
  if (messageIds.length === 0) return {};

  // Get all participants and their lastReadMessageId
  const participants = await db
    .select({
      userId: dmParticipants.userId,
      lastReadMessageId: dmParticipants.lastReadMessageId,
    })
    .from(dmParticipants)
    .where(eq(dmParticipants.conversationId, conversationId));

  const result: Record<string, number> = {};
  for (const messageId of messageIds) {
    const authorUserId = messageAuthorMap[messageId];
    // Count participants (excluding the author) who haven't read past this message
    const unreadCount = participants.filter((p) => {
      if (p.userId === authorUserId) return false; // exclude the author
      return p.lastReadMessageId === null || p.lastReadMessageId < messageId;
    }).length;
    result[messageId] = unreadCount;
  }

  return result;
}
