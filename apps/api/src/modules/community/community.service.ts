import crypto from 'node:crypto';
import { SystemRole } from '@zktalk/shared';
import * as communityRepo from './community.repository.js';
import { AppError } from '../../lib/errors.js';

const SYSTEM_ROLES = [
  { name: SystemRole.OWNER, priority: 100 },
  { name: SystemRole.ADMIN, priority: 80 },
  { name: SystemRole.MODERATOR, priority: 60 },
  { name: SystemRole.MEMBER, priority: 20 },
  { name: SystemRole.GUEST, priority: 0 },
] as const;

export async function createCommunity(
  userId: string,
  data: {
    name: string;
    slug: string;
    description?: string;
    visibility: 'public' | 'invite_only' | 'private';
  },
) {
  // Check slug uniqueness
  const existing = await communityRepo.findBySlug(data.slug);
  if (existing) {
    throw AppError.conflict('A community with this slug already exists');
  }

  // Create community
  const community = await communityRepo.createCommunity({
    ...data,
    ownerUserId: userId,
  });

  // Create system roles
  const createdRoles: Record<string, string> = {};
  for (const roleDef of SYSTEM_ROLES) {
    const role = await communityRepo.createRole({
      communityId: community.id,
      name: roleDef.name,
      priority: roleDef.priority,
      isSystemRole: true,
    });
    createdRoles[roleDef.name] = role.id;
  }

  // Create membership for owner
  const membership = await communityRepo.createMembership(community.id, userId);

  // Assign owner role
  await communityRepo.assignRole(membership.id, createdRoles[SystemRole.OWNER]!);

  // Create default #general channel
  await communityRepo.createDefaultChannel(community.id);

  return community;
}

export async function getCommunity(slug: string) {
  const community = await communityRepo.findBySlug(slug);
  if (!community) {
    throw AppError.notFound('Community not found');
  }
  return community;
}

export async function getCommunityById(communityId: string) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }
  return community;
}

export async function getUserCommunities(userId: string) {
  return communityRepo.findUserCommunities(userId);
}

export async function updateCommunity(
  communityId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    visibility?: 'public' | 'invite_only' | 'private';
    iconUrl?: string | null;
  },
) {
  // Check community exists
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  // Check user has admin+ role
  await requireRole(communityId, userId, [SystemRole.OWNER, SystemRole.ADMIN]);

  const updated = await communityRepo.updateCommunity(communityId, data);
  return updated;
}

export async function createInvite(
  communityId: string,
  userId: string,
  data: { maxUses?: number; expiresInHours?: number },
) {
  // Check community exists
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  // Check user is a member
  const membership = await communityRepo.findMembership(communityId, userId);
  if (!membership) {
    throw AppError.forbidden('You are not a member of this community');
  }

  const code = crypto.randomBytes(6).toString('hex');
  const expiresAt = data.expiresInHours
    ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
    : undefined;

  const invite = await communityRepo.createInvite({
    communityId,
    createdByUserId: userId,
    code,
    maxUses: data.maxUses,
    expiresAt,
  });

  return invite;
}

export async function joinViaInvite(code: string, userId: string) {
  const invite = await communityRepo.findInviteByCode(code);
  if (!invite) {
    throw AppError.notFound('Invite not found');
  }

  const community = await communityRepo.findById(invite.communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  // Check expiration
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    throw AppError.badRequest('This invite has expired');
  }

  // Check max uses
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    throw AppError.badRequest('This invite has reached its maximum uses');
  }

  // Check if already a member
  const existingMembership = await communityRepo.findMembership(invite.communityId, userId);
  if (existingMembership?.membershipStatus === 'active') {
    return {
      membership: existingMembership,
      onboarding: null,
      community,
      alreadyMember: true,
    };
  }

  if (existingMembership?.membershipStatus === 'banned') {
    throw AppError.forbidden('You are banned from this community');
  }

  // Create membership
  const membership = existingMembership
    ? await communityRepo.updateMembershipStatus(invite.communityId, userId, 'active')
    : await communityRepo.createMembership(invite.communityId, userId);

  if (!membership) {
    throw AppError.badRequest('Failed to join community');
  }

  // Assign member role
  const userRoles = await communityRepo.getUserRolesInCommunity(invite.communityId, userId);
  if (userRoles.length === 0) {
    // Find member role for this community
    const communityRoles = await getCommunityRoles(invite.communityId);
    const memberRole = communityRoles.find((r) => r.name === SystemRole.MEMBER);
    if (memberRole) {
      await communityRepo.assignRole(membership.id, memberRole.id);
    }
  }

  // Increment use count
  await communityRepo.incrementInviteUseCount(invite.id);

  // Check if onboarding is enabled
  const onboarding = await communityRepo.findOnboarding(invite.communityId);
  if (onboarding && onboarding.isEnabled) {
    return { membership, onboarding, community };
  }

  return { membership, onboarding: null, community };
}

export async function getCommunityMembers(communityId: string, userId: string) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  const membership = await communityRepo.findMembership(communityId, userId);
  if (!membership) {
    throw AppError.forbidden('You are not a member of this community');
  }

  return communityRepo.findCommunityMembers(communityId);
}

export async function joinPublicCommunity(communityId: string, userId: string) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  if (community.visibility !== 'public') {
    throw AppError.forbidden('This community is not public');
  }

  const existingMembership = await communityRepo.findMembership(communityId, userId);
  if (existingMembership && existingMembership.membershipStatus === 'active') {
    await ensureDefaultMemberRole(communityId, userId, existingMembership.id);
    return { community, alreadyMember: true, onboarding: null };
  }

  if (existingMembership && existingMembership.membershipStatus === 'banned') {
    throw AppError.forbidden('You are banned from this community');
  }

  const membership = existingMembership
    ? await communityRepo.updateMembershipStatus(communityId, userId, 'active')
    : await communityRepo.createMembership(communityId, userId);

  if (!membership) {
    throw AppError.badRequest('Failed to join community');
  }

  await ensureDefaultMemberRole(communityId, userId, membership.id);

  const onboarding = await communityRepo.findOnboarding(communityId);

  return {
    community,
    alreadyMember: false,
    onboarding: onboarding && onboarding.isEnabled ? onboarding : null,
  };
}

export async function leaveCommunity(communityId: string, userId: string) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  if (community.ownerUserId === userId) {
    throw AppError.badRequest('The owner cannot leave the community. Transfer ownership or delete it.');
  }

  const membership = await communityRepo.findMembership(communityId, userId);
  if (!membership) {
    throw AppError.notFound('You are not a member of this community');
  }

  return communityRepo.updateMembershipStatus(communityId, userId, 'left');
}

export async function deleteCommunity(communityId: string, userId: string) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  if (community.ownerUserId !== userId) {
    throw AppError.forbidden('Only the community owner can delete the community');
  }

  await communityRepo.deleteCommunity(communityId);
}

// --------------- Roles ---------------

export async function listCommunityRoles(communityId: string) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }
  return getCommunityRoles(communityId);
}

export async function assignMemberRole(
  communityId: string,
  requesterId: string,
  targetUserId: string,
  roleName: string,
) {
  // Only owner/admin can assign roles
  await requireRole(communityId, requesterId, [SystemRole.OWNER, SystemRole.ADMIN]);

  // Find the target membership
  const membership = await communityRepo.findMembership(communityId, targetUserId);
  if (!membership) {
    throw AppError.notFound('Member not found');
  }

  // Find the role by name
  const communityRoles = await getCommunityRoles(communityId);
  const role = communityRoles.find((r) => r.name === roleName);
  if (!role) {
    throw AppError.notFound('Role not found');
  }

  // Don't allow assigning owner role
  if (roleName === SystemRole.OWNER) {
    throw AppError.forbidden('Cannot assign owner role');
  }

  // Remove existing roles and assign new one
  const { db } = await import('../../lib/db/index.js');
  const { membershipRoles } = await import('../../lib/db/schema.js');
  const { eq } = await import('drizzle-orm');
  await db.delete(membershipRoles).where(eq(membershipRoles.membershipId, membership.id));
  await communityRepo.assignRole(membership.id, role.id);

  return { success: true };
}

export async function getMemberRole(
  communityId: string,
  requesterId: string,
  targetUserId: string,
) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  const requesterMembership = await communityRepo.findMembership(communityId, requesterId);
  if (!requesterMembership || requesterMembership.membershipStatus !== 'active') {
    throw AppError.forbidden('You are not a member of this community');
  }

  if (requesterId !== targetUserId) {
    await requireRole(communityId, requesterId, [SystemRole.OWNER, SystemRole.ADMIN]);
  }

  const targetMembership = await communityRepo.findMembership(communityId, targetUserId);
  if (!targetMembership || targetMembership.membershipStatus !== 'active') {
    throw AppError.notFound('Member not found');
  }

  const roles = await communityRepo.getUserRolesInCommunity(communityId, targetUserId);
  const topRole = roles.sort((a, b) => b.priority - a.priority)[0];

  return {
    roleName: topRole?.name ?? SystemRole.MEMBER,
  };
}

// --------------- Helpers ---------------

async function getCommunityRoles(communityId: string) {
  // Use the getUserRolesInCommunity approach but we need all roles for the community
  // For now, we'll create a simple helper that gets roles by community
  // This is a simplification - in production we'd have a findRolesByCommunity repo method
  const { db } = await import('../../lib/db/index.js');
  const { roles } = await import('../../lib/db/schema.js');
  const { eq } = await import('drizzle-orm');
  const result = await db.select().from(roles).where(eq(roles.communityId, communityId));
  return result;
}

async function ensureDefaultMemberRole(
  communityId: string,
  userId: string,
  membershipId: string,
) {
  const roles = await communityRepo.getUserRolesInCommunity(communityId, userId);
  if (roles.length > 0) {
    return;
  }

  const communityRoles = await getCommunityRoles(communityId);
  const memberRole =
    communityRoles.find((r) => r.name === SystemRole.MEMBER) ??
    communityRoles.find((r) => r.priority === 20);

  if (memberRole) {
    await communityRepo.assignRole(membershipId, memberRole.id);
  }
}

async function requireRole(communityId: string, userId: string, allowedRoles: string[]) {
  const userRoles = await communityRepo.getUserRolesInCommunity(communityId, userId);
  const hasRole = userRoles.some((r) => allowedRoles.includes(r.name));
  if (!hasRole) {
    throw AppError.forbidden('You do not have permission to perform this action');
  }
}

// --------------- Onboarding ---------------

export async function getOnboarding(communityId: string, userId: string) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  await requireRole(communityId, userId, [SystemRole.OWNER, SystemRole.ADMIN]);
  return communityRepo.findOnboarding(communityId);
}

export async function updateOnboarding(
  communityId: string,
  userId: string,
  data: {
    welcomeMessage?: string;
    rules?: string[];
    defaultChannelIds?: string[];
    isEnabled?: boolean;
  },
) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  await requireRole(communityId, userId, [SystemRole.OWNER, SystemRole.ADMIN]);

  return communityRepo.upsertOnboarding(communityId, {
    welcomeMessage: data.welcomeMessage,
    rules: data.rules ? JSON.stringify(data.rules) : undefined,
    defaultChannelIds: data.defaultChannelIds ? JSON.stringify(data.defaultChannelIds) : undefined,
    isEnabled: data.isEnabled,
  });
}
