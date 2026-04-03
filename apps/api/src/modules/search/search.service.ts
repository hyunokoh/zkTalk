import { eq, and, sql } from 'drizzle-orm';
import { AppError } from '../../lib/errors.js';
import { db } from '../../lib/db/index.js';
import {
  channels,
  communityMemberships,
  membershipRoles,
  channelRolePermissions,
} from '../../lib/db/schema.js';
import * as searchRepo from './search.repository.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get channel IDs the user can view in a community.
 * Public channels are visible to all active members.
 * Role-restricted channels require an explicit view_channel allow.
 */
async function getAccessibleChannelIds(
  userId: string,
  communityId: string,
): Promise<string[]> {
  // Get user's membership
  const [membership] = await db
    .select()
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    )
    .limit(1);

  if (!membership) {
    return [];
  }

  // Get user's role IDs
  const userRoles = await db
    .select({ roleId: membershipRoles.roleId })
    .from(membershipRoles)
    .where(eq(membershipRoles.membershipId, membership.id));

  const roleIds = userRoles.map((r) => r.roleId);

  // Get all channels in community
  const allChannels = await db
    .select({ id: channels.id, visibility: channels.visibility })
    .from(channels)
    .where(
      and(
        eq(channels.communityId, communityId),
        eq(channels.isArchived, false),
      ),
    );

  const publicChannelIds = allChannels
    .filter((c) => c.visibility === 'public')
    .map((c) => c.id);

  // For role-restricted channels, check if user has view_channel allow
  const restrictedChannels = allChannels.filter((c) => c.visibility === 'role_restricted');

  if (restrictedChannels.length === 0 || roleIds.length === 0) {
    return publicChannelIds;
  }

  const restrictedChannelIds = restrictedChannels.map((c) => c.id);

  // Check permissions for restricted channels
  const permissions = await db
    .select()
    .from(channelRolePermissions)
    .where(
      and(
        sql`${channelRolePermissions.channelId} = ANY(${restrictedChannelIds})`,
        sql`${channelRolePermissions.roleId} = ANY(${roleIds})`,
        eq(channelRolePermissions.permissionKey, 'view_channel'),
        eq(channelRolePermissions.effect, 'allow'),
      ),
    );

  const allowedRestrictedIds = [...new Set(permissions.map((p) => p.channelId))];

  return [...publicChannelIds, ...allowedRestrictedIds];
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchMessages(
  userId: string,
  query: string,
  filters: {
    communityId: string;
    channelId?: string;
    authorId?: string;
    author?: string;
    hasAttachment?: boolean;
    dateFrom?: string;
    dateTo?: string;
  },
  cursor?: string,
  limit?: number,
) {
  if (!query || query.trim().length === 0) {
    throw AppError.badRequest('Search query must not be empty');
  }

  // Get channels the user can access
  const accessibleChannelIds = await getAccessibleChannelIds(userId, filters.communityId);

  if (accessibleChannelIds.length === 0) {
    return { messages: [], hasMore: false };
  }

  // If a specific channel is requested, verify it's accessible
  if (filters.channelId && !accessibleChannelIds.includes(filters.channelId)) {
    throw AppError.forbidden('You do not have access to this channel');
  }

  return searchRepo.searchMessages(
    query.trim(),
    filters,
    filters.channelId ? [filters.channelId] : accessibleChannelIds,
    cursor,
    limit,
  );
}
