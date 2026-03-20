import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import * as repo from './channel.repository.js';

// ---------------------------------------------------------------------------
// Permission helper
// ---------------------------------------------------------------------------

/**
 * Checks whether a user has the given permission in a community (and optionally
 * scoped to a specific channel). Throws AppError.forbidden if denied.
 */
export async function checkPermission(
  userId: string,
  communityId: string,
  channelId: string | null,
  requiredPermission: string,
): Promise<void> {
  // Verify the user is an active member of the community
  const membership = await repo.getUserMembership(userId, communityId);
  if (!membership || membership.membershipStatus !== 'active') {
    throw AppError.forbidden('You are not an active member of this community');
  }

  // Fetch the user's roles in the community
  const userRoles = await repo.getUserRolesInCommunity(userId, communityId);
  if (userRoles.length === 0) {
    throw AppError.forbidden('You have no roles in this community');
  }

  // Get channel-specific overrides (if checking within a channel context)
  let channelPermissions: { roleId: string; permissionKey: string; effect: 'allow' | 'deny' }[] = [];
  if (channelId) {
    channelPermissions = await repo.getChannelPermissions(channelId);
  }

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

// ---------------------------------------------------------------------------
// Category operations
// ---------------------------------------------------------------------------

export async function createCategory(
  communityId: string,
  userId: string,
  data: { name: string; position?: number },
) {
  await checkPermission(userId, communityId, null, 'manage_channels');
  return repo.createCategory({ communityId, ...data });
}

export async function updateCategory(
  categoryId: string,
  userId: string,
  data: { name?: string; position?: number },
) {
  const category = await repo.findCategoryById(categoryId);
  if (!category) {
    throw AppError.notFound('Category not found');
  }

  await checkPermission(userId, category.communityId, null, 'manage_channels');
  return repo.updateCategory(categoryId, data);
}

export async function deleteCategory(categoryId: string, userId: string) {
  const category = await repo.findCategoryById(categoryId);
  if (!category) {
    throw AppError.notFound('Category not found');
  }

  await checkPermission(userId, category.communityId, null, 'manage_channels');

  // Ensure no channels are still in this category
  const channelsInCategory = await repo.findChannelsByCategoryId(categoryId);
  if (channelsInCategory.length > 0) {
    throw AppError.badRequest(
      'Cannot delete a category that still contains channels. Move or delete them first.',
    );
  }

  return repo.deleteCategory(categoryId);
}

export async function listCategories(communityId: string) {
  return repo.findCategoriesByCommunity(communityId);
}

// ---------------------------------------------------------------------------
// Channel operations
// ---------------------------------------------------------------------------

export async function createChannel(
  communityId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    type?: 'chat' | 'announcement' | 'forum';
    categoryId?: string;
    visibility?: 'public' | 'role_restricted';
    slowModeSeconds?: number;
  },
) {
  await checkPermission(userId, communityId, null, 'manage_channels');

  // If a categoryId is provided, verify it belongs to this community
  if (data.categoryId) {
    const category = await repo.findCategoryById(data.categoryId);
    if (!category || category.communityId !== communityId) {
      throw AppError.badRequest('Invalid category for this community');
    }
  }

  return repo.createChannel({ communityId, ...data });
}

export async function updateChannel(
  channelId: string,
  userId: string,
  data: {
    name?: string;
    description?: string | null;
    visibility?: 'public' | 'role_restricted';
    slowModeSeconds?: number;
    categoryId?: string | null;
    position?: number;
  },
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'manage_channels');

  // If moving to a new category, verify it belongs to the same community
  if (data.categoryId) {
    const category = await repo.findCategoryById(data.categoryId);
    if (!category || category.communityId !== channel.communityId) {
      throw AppError.badRequest('Invalid category for this community');
    }
  }

  return repo.updateChannel(channelId, data);
}

export async function archiveChannel(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  if (channel.isArchived) {
    throw AppError.badRequest('Channel is already archived');
  }

  await checkPermission(userId, channel.communityId, channelId, 'manage_channels');
  return repo.archiveChannel(channelId);
}

export async function listChannels(communityId: string, userId: string) {
  // Verify the user is a member
  const membership = await repo.getUserMembership(userId, communityId);
  if (!membership || membership.membershipStatus !== 'active') {
    throw AppError.forbidden('You are not an active member of this community');
  }

  const userRoles = await repo.getUserRolesInCommunity(userId, communityId);

  const results = await repo.findChannelsByCommunity(communityId);

  // Filter channels by view_channel permission
  const visibleChannels: typeof results = [];
  for (const row of results) {
    const channelPerms = await repo.getChannelPermissions(row.channel.id);
    const canView = hasPermission(
      userRoles,
      channelPerms,
      'view_channel',
      DEFAULT_ROLE_PERMISSIONS,
    );
    if (canView) {
      visibleChannels.push(row);
    }
  }

  // Group channels by category
  const uncategorized: typeof results = [];
  const byCategory: Map<string, { category: typeof results[0]['category']; channels: typeof results }> = new Map();

  for (const row of visibleChannels) {
    if (!row.category) {
      uncategorized.push(row);
    } else {
      const catId = row.category.id;
      if (!byCategory.has(catId)) {
        byCategory.set(catId, { category: row.category, channels: [] });
      }
      byCategory.get(catId)!.channels.push(row);
    }
  }

  return {
    uncategorized: uncategorized.map((r) => r.channel),
    categories: Array.from(byCategory.values()).map((entry) => ({
      ...entry.category,
      channels: entry.channels.map((r) => r.channel),
    })),
  };
}

export async function getChannel(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'view_channel');
  return channel;
}
