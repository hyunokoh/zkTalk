import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { db } from './db/index.js';
import {
  communityMemberships,
  membershipRoles,
  roles,
  channelRolePermissions,
} from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from './errors.js';

/**
 * Resolves whether a user has the given permission in a community, optionally
 * scoped to a specific channel. Throws AppError.forbidden when denied.
 */
export async function checkPermission(
  userId: string,
  communityId: string,
  channelId: string | null,
  requiredPermission: string,
): Promise<void> {
  // 1. Verify user is an active member
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

  if (!membership || membership.membershipStatus !== 'active') {
    throw AppError.forbidden('You are not an active member of this community');
  }

  // 2. Get user's roles
  const userRoles = await db
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

  if (userRoles.length === 0) {
    throw AppError.forbidden('You have no roles in this community');
  }

  // 3. Get channel-specific overrides if applicable
  let channelPermissions: { roleId: string; permissionKey: string; effect: 'allow' | 'deny' }[] = [];
  if (channelId) {
    channelPermissions = await db
      .select()
      .from(channelRolePermissions)
      .where(eq(channelRolePermissions.channelId, channelId));
  }

  // 4. Evaluate
  const allowed = hasPermission(
    userRoles,
    channelPermissions,
    requiredPermission,
    DEFAULT_ROLE_PERMISSIONS,
  );

  if (!allowed) {
    throw AppError.forbidden(`Missing permission: ${requiredPermission}`);
  }
}
