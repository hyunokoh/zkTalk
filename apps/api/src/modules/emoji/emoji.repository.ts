import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  customEmojis,
  communityMemberships,
  membershipRoles,
  roles,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Emoji CRUD
// ---------------------------------------------------------------------------

export async function createEmoji(data: {
  id: string;
  communityId: string;
  name: string;
  imageUrl: string;
  uploadedByUserId: string;
}) {
  const [emoji] = await db.insert(customEmojis).values(data).returning();
  return emoji;
}

export async function findByCommunity(communityId: string) {
  return db
    .select()
    .from(customEmojis)
    .where(eq(customEmojis.communityId, communityId));
}

export async function findByName(communityId: string, name: string) {
  const [emoji] = await db
    .select()
    .from(customEmojis)
    .where(
      and(
        eq(customEmojis.communityId, communityId),
        eq(customEmojis.name, name),
      ),
    )
    .limit(1);
  return emoji ?? null;
}

export async function findById(id: string) {
  const [emoji] = await db
    .select()
    .from(customEmojis)
    .where(eq(customEmojis.id, id))
    .limit(1);
  return emoji ?? null;
}

export async function deleteEmoji(id: string) {
  const [emoji] = await db
    .delete(customEmojis)
    .where(eq(customEmojis.id, id))
    .returning();
  return emoji ?? null;
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

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
