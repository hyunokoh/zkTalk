import { eq, and } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import {
  categories,
  channels,
  channelRolePermissions,
  communityMemberships,
  membershipRoles,
  roles,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Category operations
// ---------------------------------------------------------------------------

export interface CreateCategoryInput {
  communityId: string;
  name: string;
  position?: number;
}

export async function createCategory(data: CreateCategoryInput) {
  const id = uuidv7();
  const [category] = await db
    .insert(categories)
    .values({
      id,
      communityId: data.communityId,
      name: data.name,
      position: data.position ?? 0,
    })
    .returning();
  return category;
}

export async function updateCategory(
  id: string,
  data: { name?: string; position?: number },
) {
  const [category] = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  return category ?? null;
}

export async function deleteCategory(id: string) {
  const [category] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();
  return category ?? null;
}

export async function findCategoryById(id: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return category ?? null;
}

export async function findCategoriesByCommunity(communityId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.communityId, communityId))
    .orderBy(categories.position);
}

// ---------------------------------------------------------------------------
// Channel operations
// ---------------------------------------------------------------------------

export interface CreateChannelInput {
  communityId: string;
  categoryId?: string | null;
  sourceDmConversationId?: string | null;
  name: string;
  description?: string | null;
  type?: 'chat' | 'announcement' | 'forum' | 'voice';
  visibility?: 'public' | 'role_restricted';
  accessPolicy?: 'public' | 'members_only' | 'invite_only' | 'private';
  slowModeSeconds?: number;
  position?: number;
  requireTopic?: boolean;
  allowedViewRoleIds?: string[];
  allowedPostRoleIds?: string[];
}

export async function createChannel(data: CreateChannelInput) {
  const id = uuidv7();
  const [channel] = await db
    .insert(channels)
    .values({
      id,
      communityId: data.communityId,
      categoryId: data.categoryId ?? null,
      sourceDmConversationId: data.sourceDmConversationId ?? null,
      name: data.name,
      description: data.description ?? null,
      type: data.type ?? 'chat',
      visibility: data.visibility ?? 'public',
      accessPolicy: data.accessPolicy ?? 'members_only',
      slowModeSeconds: data.slowModeSeconds ?? 0,
      position: data.position ?? 0,
      requireTopic: data.requireTopic ?? false,
    })
    .returning();
  return channel;
}

export async function updateChannel(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    visibility?: 'public' | 'role_restricted';
    accessPolicy?: 'public' | 'members_only' | 'invite_only' | 'private';
    slowModeSeconds?: number;
    categoryId?: string | null;
    sourceDmConversationId?: string | null;
    position?: number;
    disappearingDuration?: number | null;
    requireTopic?: boolean;
    allowedViewRoleIds?: string[];
    allowedPostRoleIds?: string[];
  },
) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  delete updateData.allowedViewRoleIds;
  delete updateData.allowedPostRoleIds;
  const [channel] = await db
    .update(channels)
    .set(updateData)
    .where(eq(channels.id, id))
    .returning();
  return channel ?? null;
}

export async function archiveChannel(id: string) {
  const [channel] = await db
    .update(channels)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(channels.id, id))
    .returning();
  return channel ?? null;
}

export async function deleteChannel(id: string) {
  const [channel] = await db
    .delete(channels)
    .where(eq(channels.id, id))
    .returning();
  return channel ?? null;
}

export async function findChannelById(id: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, id))
    .limit(1);
  return channel ?? null;
}

export async function findChannelsByCommunity(communityId: string) {
  return db
    .select({
      channel: channels,
      category: categories,
    })
    .from(channels)
    .leftJoin(categories, eq(channels.categoryId, categories.id))
    .where(eq(channels.communityId, communityId))
    .orderBy(categories.position, channels.position);
}

export async function findChannelsByCategoryId(categoryId: string) {
  return db
    .select()
    .from(channels)
    .where(eq(channels.categoryId, categoryId));
}

// ---------------------------------------------------------------------------
// Channel permission operations
// ---------------------------------------------------------------------------

export async function getChannelPermissions(channelId: string) {
  return db
    .select()
    .from(channelRolePermissions)
    .where(eq(channelRolePermissions.channelId, channelId));
}

export async function setChannelPermission(
  channelId: string,
  roleId: string,
  permissionKey: string,
  effect: 'allow' | 'deny',
) {
  // Upsert: try to find existing, update or insert
  const existing = await db
    .select()
    .from(channelRolePermissions)
    .where(
      and(
        eq(channelRolePermissions.channelId, channelId),
        eq(channelRolePermissions.roleId, roleId),
        eq(channelRolePermissions.permissionKey, permissionKey),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(channelRolePermissions)
      .set({ effect })
      .where(eq(channelRolePermissions.id, existing[0].id))
      .returning();
    return updated;
  }

  const id = uuidv7();
  const [created] = await db
    .insert(channelRolePermissions)
    .values({ id, channelId, roleId, permissionKey, effect })
    .returning();
  return created;
}

export async function clearChannelPermissionKey(
  channelId: string,
  permissionKey: string,
) {
  await db
    .delete(channelRolePermissions)
    .where(
      and(
        eq(channelRolePermissions.channelId, channelId),
        eq(channelRolePermissions.permissionKey, permissionKey),
      ),
    );
}

// ---------------------------------------------------------------------------
// User role queries (used by permission checking)
// ---------------------------------------------------------------------------

export async function getUserRolesInCommunity(
  userId: string,
  communityId: string,
) {
  // Join community_memberships -> membership_roles -> roles
  const result = await db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      priority: roles.priority,
    })
    .from(communityMemberships)
    .innerJoin(
      membershipRoles,
      eq(communityMemberships.id, membershipRoles.membershipId),
    )
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    );

  return result;
}

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

export async function findRolesByCommunity(communityId: string) {
  return db.select().from(roles).where(eq(roles.communityId, communityId));
}
