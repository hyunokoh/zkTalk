import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  communities,
  communityMemberships,
  roles,
  membershipRoles,
  invites,
} from '../../lib/db/schema.js';
import { uuidv7 } from 'uuidv7';

// --------------- Community ---------------

export interface CreateCommunityData {
  name: string;
  slug: string;
  description?: string;
  visibility: 'public' | 'invite_only' | 'private';
  ownerUserId: string;
}

export async function createCommunity(data: CreateCommunityData) {
  const id = uuidv7();
  const now = new Date();
  const result = await db
    .insert(communities)
    .values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      visibility: data.visibility,
      ownerUserId: data.ownerUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return result[0]!;
}

export async function findBySlug(slug: string) {
  const result = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

export async function findById(id: string) {
  const result = await db
    .select()
    .from(communities)
    .where(eq(communities.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function findUserCommunities(userId: string) {
  const result = await db
    .select({
      id: communities.id,
      slug: communities.slug,
      name: communities.name,
      description: communities.description,
      iconUrl: communities.iconUrl,
      bannerUrl: communities.bannerUrl,
      visibility: communities.visibility,
      ownerUserId: communities.ownerUserId,
      createdAt: communities.createdAt,
      updatedAt: communities.updatedAt,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    );
  return result;
}

export async function updateCommunity(
  id: string,
  data: { name?: string; description?: string; visibility?: 'public' | 'invite_only' | 'private' },
) {
  const result = await db
    .update(communities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(communities.id, id))
    .returning();
  return result[0] ?? null;
}

// --------------- Membership ---------------

export async function createMembership(communityId: string, userId: string) {
  const id = uuidv7();
  const result = await db
    .insert(communityMemberships)
    .values({
      id,
      communityId,
      userId,
      membershipStatus: 'active',
      joinedAt: new Date(),
    })
    .returning();
  return result[0]!;
}

export async function findMembership(communityId: string, userId: string) {
  const result = await db
    .select()
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.userId, userId),
      ),
    )
    .limit(1);
  return result[0] ?? null;
}

// --------------- Invites ---------------

export interface CreateInviteData {
  communityId: string;
  createdByUserId: string;
  code: string;
  maxUses?: number;
  expiresAt?: Date;
}

export async function createInvite(data: CreateInviteData) {
  const id = uuidv7();
  const result = await db
    .insert(invites)
    .values({
      id,
      communityId: data.communityId,
      code: data.code,
      createdByUserId: data.createdByUserId,
      maxUses: data.maxUses ?? null,
      expiresAt: data.expiresAt ?? null,
    })
    .returning();
  return result[0]!;
}

export async function findInviteByCode(code: string) {
  const result = await db
    .select()
    .from(invites)
    .where(eq(invites.code, code))
    .limit(1);
  return result[0] ?? null;
}

export async function incrementInviteUseCount(id: string) {
  await db
    .update(invites)
    .set({ useCount: sql`${invites.useCount} + 1` })
    .where(eq(invites.id, id));
}

// --------------- Roles ---------------

export interface CreateRoleData {
  communityId: string;
  name: string;
  priority: number;
  isSystemRole: boolean;
  color?: string;
}

export async function createRole(data: CreateRoleData) {
  const id = uuidv7();
  const result = await db
    .insert(roles)
    .values({
      id,
      communityId: data.communityId,
      name: data.name,
      priority: data.priority,
      isSystemRole: data.isSystemRole,
      color: data.color ?? null,
    })
    .returning();
  return result[0]!;
}

export async function assignRole(membershipId: string, roleId: string) {
  await db.insert(membershipRoles).values({
    membershipId,
    roleId,
  });
}

export async function getUserRolesInCommunity(communityId: string, userId: string) {
  const result = await db
    .select({
      id: roles.id,
      name: roles.name,
      priority: roles.priority,
      isSystemRole: roles.isSystemRole,
      communityId: roles.communityId,
      color: roles.color,
    })
    .from(membershipRoles)
    .innerJoin(
      communityMemberships,
      eq(membershipRoles.membershipId, communityMemberships.id),
    )
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.userId, userId),
      ),
    );
  return result;
}
