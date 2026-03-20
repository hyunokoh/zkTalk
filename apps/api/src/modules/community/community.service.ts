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
  data: { name?: string; description?: string; visibility?: 'public' | 'invite_only' | 'private' },
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
  if (existingMembership) {
    throw AppError.conflict('You are already a member of this community');
  }

  // Create membership
  const membership = await communityRepo.createMembership(invite.communityId, userId);

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

  return membership;
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

async function requireRole(communityId: string, userId: string, allowedRoles: string[]) {
  const userRoles = await communityRepo.getUserRolesInCommunity(communityId, userId);
  const hasRole = userRoles.some((r) => allowedRoles.includes(r.name));
  if (!hasRole) {
    throw AppError.forbidden('You do not have permission to perform this action');
  }
}
