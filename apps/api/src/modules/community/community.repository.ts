import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  communities,
  communityMemberships,
  channels,
  roles,
  membershipRoles,
  invites,
  users,
  communityOnboarding,
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
  data: {
    name?: string;
    description?: string;
    visibility?: 'public' | 'invite_only' | 'private';
    iconUrl?: string | null;
  },
) {
  const result = await db
    .update(communities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(communities.id, id))
    .returning();
  return result[0] ?? null;
}

// --------------- Default Channel ---------------

export async function createDefaultChannel(communityId: string) {
  const id = uuidv7();
  await db.insert(channels).values({
    id,
    communityId,
    name: 'general',
    type: 'chat',
    visibility: 'public',
    position: 0,
  });
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

export async function findCommunityMembers(communityId: string) {
  const memberships = await db
    .select({
      id: communityMemberships.id,
      userId: communityMemberships.userId,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      joinedAt: communityMemberships.joinedAt,
      membershipStatus: communityMemberships.membershipStatus,
    })
    .from(communityMemberships)
    .innerJoin(users, eq(communityMemberships.userId, users.id))
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    )
    .orderBy(communityMemberships.joinedAt);

  const memberIds = memberships.map((m) => m.id);
  if (memberIds.length === 0) return [];

  const allMemberRoles = await db
    .select({
      membershipId: membershipRoles.membershipId,
      roleName: roles.name,
      priority: roles.priority,
    })
    .from(membershipRoles)
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(eq(roles.communityId, communityId));

  const rolesByMembership = new Map<string, { name: string; priority: number }[]>();
  for (const mr of allMemberRoles) {
    const existing = rolesByMembership.get(mr.membershipId) ?? [];
    existing.push({ name: mr.roleName, priority: mr.priority });
    rolesByMembership.set(mr.membershipId, existing);
  }

  return memberships.map((m) => {
    const memberRoles = rolesByMembership.get(m.id) ?? [];
    const topRole = memberRoles.sort((a, b) => b.priority - a.priority)[0];
    return {
      id: m.id,
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      role: topRole?.name ?? 'member',
      joinedAt: m.joinedAt,
    };
  });
}

export async function updateMembershipStatus(
  communityId: string,
  userId: string,
  status: 'active' | 'muted' | 'banned' | 'left',
) {
  const result = await db
    .update(communityMemberships)
    .set({ membershipStatus: status })
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.userId, userId),
      ),
    )
    .returning();
  return result[0] ?? null;
}

export async function deleteCommunity(id: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      delete from slash_commands
      where bot_user_id in (
        select id from bot_users where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from event_rsvps
      where event_id in (
        select id from community_events where community_id = ${id}
      )
    `);

    await tx.execute(sql`delete from community_events where community_id = ${id}`);
    await tx.execute(sql`delete from community_onboarding where community_id = ${id}`);
    await tx.execute(sql`delete from invites where community_id = ${id}`);
    await tx.execute(sql`delete from automod_rules where community_id = ${id}`);
    await tx.execute(sql`delete from custom_emojis where community_id = ${id}`);
    await tx.execute(sql`delete from reports where community_id = ${id}`);
    await tx.execute(sql`delete from moderation_actions where community_id = ${id}`);

    await tx.execute(sql`
      delete from membership_roles
      where membership_id in (
        select id from community_memberships where community_id = ${id}
      )
      or role_id in (
        select id from roles where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from channel_role_permissions
      where channel_id in (
        select id from channels where community_id = ${id}
      )
      or role_id in (
        select id from roles where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from channel_keys
      where channel_id in (
        select id from channels where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from scheduled_messages
      where channel_id in (
        select id from channels where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from channel_reads
      where channel_id in (
        select id from channels where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from thread_follows
      where thread_id in (
        select threads.id
        from threads
        inner join channels on channels.id = threads.channel_id
        where channels.community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from zk_votes
      where poll_id in (
        select polls.id
        from polls
        inner join channels on channels.id = polls.channel_id
        where channels.community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from poll_votes
      where poll_id in (
        select polls.id
        from polls
        inner join channels on channels.id = polls.channel_id
        where channels.community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from poll_options
      where poll_id in (
        select polls.id
        from polls
        inner join channels on channels.id = polls.channel_id
        where channels.community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from polls
      where channel_id in (
        select id from channels where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from message_pins
      where channel_id in (
        select id from channels where community_id = ${id}
      )
      or message_id in (
        select id from messages where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from bookmarks
      where message_id in (
        select id from messages where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from reactions
      where message_id in (
        select id from messages where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from attachments
      where message_id in (
        select id from messages where community_id = ${id}
      )
    `);

    await tx.execute(sql`
      delete from p2p_files
      where channel_id in (
        select id from channels where community_id = ${id}
      )
      or message_id in (
        select id from messages where community_id = ${id}
      )
    `);

    await tx.execute(sql`delete from messages where community_id = ${id}`);

    await tx.execute(sql`
      delete from threads
      where channel_id in (
        select id from channels where community_id = ${id}
      )
    `);

    await tx.execute(sql`delete from webhooks where community_id = ${id}`);
    await tx.execute(sql`delete from bot_users where community_id = ${id}`);
    await tx.execute(sql`delete from channels where community_id = ${id}`);
    await tx.execute(sql`delete from categories where community_id = ${id}`);
    await tx.execute(sql`delete from roles where community_id = ${id}`);
    await tx.execute(sql`delete from community_memberships where community_id = ${id}`);

    await tx.delete(communities).where(eq(communities.id, id));
  });
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

// --------------- Onboarding ---------------

export async function findOnboarding(communityId: string) {
  const result = await db
    .select()
    .from(communityOnboarding)
    .where(eq(communityOnboarding.communityId, communityId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertOnboarding(
  communityId: string,
  data: {
    welcomeMessage?: string;
    rules?: string;
    defaultChannelIds?: string;
    isEnabled?: boolean;
  },
) {
  const existing = await findOnboarding(communityId);
  if (existing) {
    const result = await db
      .update(communityOnboarding)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(communityOnboarding.communityId, communityId))
      .returning();
    return result[0]!;
  }
  const id = uuidv7();
  const result = await db
    .insert(communityOnboarding)
    .values({
      id,
      communityId,
      welcomeMessage: data.welcomeMessage ?? null,
      rules: data.rules ?? null,
      defaultChannelIds: data.defaultChannelIds ?? null,
      isEnabled: data.isEnabled ?? false,
      updatedAt: new Date(),
    })
    .returning();
  return result[0]!;
}
