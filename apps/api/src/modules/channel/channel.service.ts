import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import * as repo from './channel.repository.js';
import * as dmRepo from '../dm/dm.repository.js';

function buildSourceDmDisplayName(
  conversation: NonNullable<Awaited<ReturnType<typeof dmRepo.findConversationById>>>,
  userId: string,
) {
  const explicitName = conversation.conversation.name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const otherParticipants = conversation.participants.filter((participant) => participant.userId !== userId);
  if (conversation.conversation.type === 'direct') {
    const directTarget = otherParticipants[0] ?? conversation.participants[0];
    return directTarget?.user.displayName?.trim() || directTarget?.user.username?.trim() || null;
  }

  const participantNames = otherParticipants
    .map((participant) => participant.user.displayName.trim())
    .filter(Boolean);
  if (participantNames.length === 0) {
    return 'Group DM';
  }

  if (participantNames.length <= 3) {
    return participantNames.join(', ');
  }

  return `${participantNames.slice(0, 3).join(', ')} +${participantNames.length - 3}`;
}

async function buildSourceDmConversationSummary(
  sourceDmConversationId: string | null | undefined,
  userId: string,
) {
  if (!sourceDmConversationId) {
    return null;
  }

  const canAccessSourceDm = await dmRepo.isParticipant(sourceDmConversationId, userId);
  if (!canAccessSourceDm) {
    return null;
  }

  const sourceConversation = await dmRepo.findConversationById(sourceDmConversationId);
  if (!sourceConversation) {
    return null;
  }

  return {
    id: sourceDmConversationId,
    name: buildSourceDmDisplayName(sourceConversation, userId),
    type: sourceConversation.conversation.type,
  };
}

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
  let position = data.position;
  if (position === undefined) {
    const existing = await repo.findCategoriesByCommunity(communityId);
    const lastPosition = existing.reduce(
      (max, category) => Math.max(max, category.position ?? 0),
      -1,
    );
    position = lastPosition + 1;
  }

  return repo.createCategory({ communityId, ...data, position });
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

export async function listCategories(communityId: string, userId: string) {
  await checkPermission(userId, communityId, null, 'manage_channels');
  return repo.findCategoriesByCommunity(communityId);
}

async function syncRoleRestrictedViewPermissions(
  channelId: string,
  communityId: string,
  allowedViewRoleIds: string[],
  allowedPostRoleIds: string[],
) {
  const roles = await repo.findRolesByCommunity(communityId);
  const allowedViewSet = new Set(allowedViewRoleIds);
  const allowedPostSet = new Set(allowedPostRoleIds);

  await Promise.all(
    roles.map((role) => {
      const canView =
        role.name === 'owner' ||
        role.name === 'admin' ||
        allowedViewSet.has(role.id) ||
        allowedPostSet.has(role.id);
      const canPost =
        role.name === 'owner' || role.name === 'admin' || allowedPostSet.has(role.id);

      return Promise.all([
        repo.setChannelPermission(
          channelId,
          role.id,
          'view_channel',
          canView ? 'allow' : 'deny',
        ),
        repo.setChannelPermission(
          channelId,
          role.id,
          'post_message',
          canPost ? 'allow' : 'deny',
        ),
      ]);
    }),
  );
}

export async function getChannelPermissions(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'manage_channels');
  return repo.getChannelPermissions(channelId);
}

export async function getMyChannelPermissions(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  const membership = await repo.getUserMembership(userId, channel.communityId);
  if (!membership || membership.membershipStatus !== 'active') {
    throw AppError.forbidden('You are not an active member of this community');
  }

  const userRoles = await repo.getUserRolesInCommunity(userId, channel.communityId);
  if (userRoles.length === 0) {
    throw AppError.forbidden('You have no roles in this community');
  }

  const channelPermissions = await repo.getChannelPermissions(channelId);

  return {
    canViewChannel: hasPermission(
      userRoles,
      channelPermissions,
      'view_channel',
      DEFAULT_ROLE_PERMISSIONS,
    ),
    canPostMessage: hasPermission(
      userRoles,
      channelPermissions,
      'post_message',
      DEFAULT_ROLE_PERMISSIONS,
    ),
    canManageChannel: hasPermission(
      userRoles,
      channelPermissions,
      'manage_channels',
      DEFAULT_ROLE_PERMISSIONS,
    ),
    canReact: hasPermission(
      userRoles,
      channelPermissions,
      'react',
      DEFAULT_ROLE_PERMISSIONS,
    ),
    canUploadAttachment: hasPermission(
      userRoles,
      channelPermissions,
      'upload_attachment',
      DEFAULT_ROLE_PERMISSIONS,
    ),
    canCreateThread: hasPermission(
      userRoles,
      channelPermissions,
      'create_thread',
      DEFAULT_ROLE_PERMISSIONS,
    ),
  };
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
    type?: 'chat' | 'announcement' | 'forum' | 'voice';
    categoryId?: string;
    visibility?: 'public' | 'role_restricted';
    slowModeSeconds?: number;
    requireTopic?: boolean;
    allowedViewRoleIds?: string[];
    allowedPostRoleIds?: string[];
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

  const channel = await repo.createChannel({ communityId, ...data });

  if (data.visibility === 'role_restricted') {
    await syncRoleRestrictedViewPermissions(
      channel.id,
      communityId,
      data.allowedViewRoleIds ?? [],
      data.allowedPostRoleIds ?? [],
    );
  }

  return channel;
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
    disappearingDuration?: number | null;
    requireTopic?: boolean;
    allowedViewRoleIds?: string[];
    allowedPostRoleIds?: string[];
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

  const updated = await repo.updateChannel(channelId, data);
  const nextVisibility = data.visibility ?? channel.visibility;

  if (nextVisibility === 'public') {
    await repo.clearChannelPermissionKey(channelId, 'view_channel');
    await repo.clearChannelPermissionKey(channelId, 'post_message');
  } else if (
    data.allowedViewRoleIds !== undefined ||
    data.allowedPostRoleIds !== undefined
  ) {
    await syncRoleRestrictedViewPermissions(
      channelId,
      channel.communityId,
      data.allowedViewRoleIds ?? [],
      data.allowedPostRoleIds ?? [],
    );
  }

  return updated;
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

export async function deleteChannel(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'manage_channels');
  return repo.deleteChannel(channelId);
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

  const decorateChannel = async (channel: typeof results[number]['channel']) => ({
    ...channel,
    sourceDmConversation: await buildSourceDmConversationSummary(
      channel.sourceDmConversationId,
      userId,
    ),
  });

  return {
    uncategorized: await Promise.all(uncategorized.map((r) => decorateChannel(r.channel))),
    categories: await Promise.all(Array.from(byCategory.values()).map(async (entry) => ({
      ...entry.category,
      channels: await Promise.all(entry.channels.map((r) => decorateChannel(r.channel))),
    }))),
  };
}

export async function getChannel(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'view_channel');

  const sourceDmConversation = await buildSourceDmConversationSummary(
    channel.sourceDmConversationId,
    userId,
  );
  if (!sourceDmConversation) {
    return channel;
  }
  return {
    ...channel,
    sourceDmConversation,
  };
}
