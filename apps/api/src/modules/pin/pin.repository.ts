import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  messagePins,
  messages,
  users,
  channels,
  communityMemberships,
  membershipRoles,
  roles,
  channelRolePermissions,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Pin CRUD
// ---------------------------------------------------------------------------

export async function pinMessage(
  id: string,
  channelId: string,
  messageId: string,
  userId: string,
) {
  const [pin] = await db
    .insert(messagePins)
    .values({ id, channelId, messageId, pinnedByUserId: userId })
    .returning();
  return pin;
}

export async function unpinMessage(channelId: string, messageId: string) {
  const [pin] = await db
    .delete(messagePins)
    .where(
      and(
        eq(messagePins.channelId, channelId),
        eq(messagePins.messageId, messageId),
      ),
    )
    .returning();
  return pin ?? null;
}

export async function findPinnedMessages(channelId: string) {
  return db
    .select({
      pin: messagePins,
      message: messages,
      author: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(messagePins)
    .innerJoin(messages, eq(messagePins.messageId, messages.id))
    .innerJoin(users, eq(messages.authorUserId, users.id))
    .where(eq(messagePins.channelId, channelId))
    .orderBy(desc(messagePins.pinnedAt));
}

export async function findPin(channelId: string, messageId: string) {
  const [pin] = await db
    .select()
    .from(messagePins)
    .where(
      and(
        eq(messagePins.channelId, channelId),
        eq(messagePins.messageId, messageId),
      ),
    )
    .limit(1);
  return pin ?? null;
}

// ---------------------------------------------------------------------------
// Channel lookup
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
// Permission helpers
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
