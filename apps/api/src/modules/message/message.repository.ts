import { eq, and, desc, lt, gt, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import {
  messages,
  users,
  channels,
  communityMemberships,
  membershipRoles,
  roles,
  channelRolePermissions,
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
  authorUserId: string;
  bodyMarkdown: string;
  bodyPlaintext: string;
}

// ---------------------------------------------------------------------------
// Message CRUD
// ---------------------------------------------------------------------------

export async function createMessage(data: CreateMessageInput) {
  const id = data.id ?? uuidv7();
  const [message] = await db
    .insert(messages)
    .values({
      id,
      communityId: data.communityId,
      channelId: data.channelId,
      threadId: data.threadId ?? null,
      parentMessageId: data.parentMessageId ?? null,
      authorUserId: data.authorUserId,
      bodyMarkdown: data.bodyMarkdown,
      bodyPlaintext: data.bodyPlaintext,
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

  return rows[0] ?? null;
}

export async function findMessagesByChannel(
  channelId: string,
  cursor?: string,
  limit = 50,
) {
  // Fetch one extra to determine if there are more messages
  const queryLimit = limit + 1;

  let rows;
  if (cursor) {
    rows = await db
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
      .where(and(eq(messages.channelId, channelId), lt(messages.id, cursor)))
      .orderBy(desc(messages.id))
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
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorUserId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.id))
      .limit(queryLimit);
  }

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    messages: resultRows,
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
