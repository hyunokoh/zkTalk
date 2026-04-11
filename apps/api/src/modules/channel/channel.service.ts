import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import * as repo from './channel.repository.js';
import * as dmRepo from '../dm/dm.repository.js';
import * as communityRepo from '../community/community.repository.js';
import {
  getChannelBrowseEntriesForCommunity,
  type ChannelBrowseEntry,
} from './channel-access.service.js';

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

function resolveAccessPolicy(input: {
  visibility?: 'public' | 'role_restricted';
  accessPolicy?: 'public' | 'members_only' | 'invite_only' | 'private';
  allowedViewRoleIds?: string[];
}): 'public' | 'members_only' | 'invite_only' | 'private' {
  if (input.accessPolicy) {
    return input.accessPolicy;
  }

  if (input.visibility === 'public') {
    return 'public';
  }

  if (input.visibility === 'role_restricted') {
    return (input.allowedViewRoleIds?.length ?? 0) > 0 ? 'invite_only' : 'members_only';
  }

  return 'members_only';
}

function resolveVisibility(accessPolicy: 'public' | 'members_only' | 'invite_only' | 'private') {
  return accessPolicy === 'public' ? 'public' : 'role_restricted';
}

async function validateChannelAccessPolicy(
  communityId: string,
  accessPolicy: 'public' | 'members_only' | 'invite_only' | 'private',
  allowedViewRoleIds?: string[],
  allowedPostRoleIds?: string[],
  options: { requireRestrictedRoles: boolean } = { requireRestrictedRoles: true },
) {
  const community = await communityRepo.findById(communityId);
  if (!community) {
    throw AppError.notFound('Community not found');
  }

  if (community.visibility !== 'public' && accessPolicy === 'public') {
    throw AppError.badRequest('Only public communities can expose public channels');
  }

  if ((accessPolicy === 'public' || accessPolicy === 'members_only') && ((allowedViewRoleIds?.length ?? 0) > 0 || (allowedPostRoleIds?.length ?? 0) > 0)) {
    throw AppError.badRequest('Open or members-only channels cannot define restricted role lists');
  }

  if (options.requireRestrictedRoles && (accessPolicy === 'invite_only' || accessPolicy === 'private') && (allowedViewRoleIds?.length ?? 0) === 0) {
    throw AppError.badRequest('Invite-only and private channels require at least one allowed view role');
  }
}

function validateRestrictedRoleUpdateInput(input: {
  accessPolicy: 'public' | 'members_only' | 'invite_only' | 'private';
  allowedViewRoleIds?: string[];
  allowedPostRoleIds?: string[];
}) {
  if (
    (input.accessPolicy === 'invite_only' || input.accessPolicy === 'private') &&
    input.allowedPostRoleIds !== undefined &&
    input.allowedViewRoleIds === undefined
  ) {
    throw AppError.badRequest(
      'Restricted channel role updates must include allowedViewRoleIds when allowedPostRoleIds is provided',
    );
  }
}

async function canBrowseChannelWithoutMembership(communityId: string, accessPolicy: string) {
  if (accessPolicy !== 'public') {
    return false;
  }

  const community = await communityRepo.findById(communityId);
  return community?.visibility === 'public';
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
    accessPolicy?: 'public' | 'members_only' | 'invite_only' | 'private';
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

  const accessPolicy = resolveAccessPolicy(data);
  const allowedViewRoleIds = data.allowedViewRoleIds ?? [];
  const allowedPostRoleIds = data.allowedPostRoleIds ?? [];

  validateRestrictedRoleUpdateInput({
    accessPolicy,
    allowedViewRoleIds,
    allowedPostRoleIds,
  });

  await validateChannelAccessPolicy(
    communityId,
    accessPolicy,
    allowedViewRoleIds,
    allowedPostRoleIds,
  );

  const channel = await repo.createChannel({
    communityId,
    ...data,
    visibility: resolveVisibility(accessPolicy),
    accessPolicy,
    allowedViewRoleIds,
    allowedPostRoleIds,
  });

  if (accessPolicy === 'invite_only' || accessPolicy === 'private') {
    await syncRoleRestrictedViewPermissions(
      channel.id,
      communityId,
      allowedViewRoleIds,
      allowedPostRoleIds,
    );
  } else {
    await repo.clearChannelPermissionKey(channel.id, 'view_channel');
    await repo.clearChannelPermissionKey(channel.id, 'post_message');
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
    accessPolicy?: 'public' | 'members_only' | 'invite_only' | 'private';
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

  const accessPolicy = resolveAccessPolicy({
    visibility: data.visibility ?? channel.visibility,
    accessPolicy: data.accessPolicy ?? channel.accessPolicy,
    allowedViewRoleIds: data.allowedViewRoleIds,
  });
  const allowedViewRoleIds = data.allowedViewRoleIds;
  const allowedPostRoleIds = data.allowedPostRoleIds;
  const isRestrictedPolicy = accessPolicy === 'invite_only' || accessPolicy === 'private';
  const wasRestrictedPolicy = channel.accessPolicy === 'invite_only' || channel.accessPolicy === 'private';
  const needsRestrictedRoles = isRestrictedPolicy && (!wasRestrictedPolicy || allowedViewRoleIds !== undefined);

  validateRestrictedRoleUpdateInput({
    accessPolicy,
    allowedViewRoleIds,
    allowedPostRoleIds,
  });

  await validateChannelAccessPolicy(
    channel.communityId,
    accessPolicy,
    allowedViewRoleIds,
    allowedPostRoleIds,
    { requireRestrictedRoles: needsRestrictedRoles },
  );

  const updated = await repo.updateChannel(channelId, {
    ...data,
    visibility: resolveVisibility(accessPolicy),
    accessPolicy,
  });

  if (accessPolicy === 'public' || accessPolicy === 'members_only') {
    await repo.clearChannelPermissionKey(channelId, 'view_channel');
    await repo.clearChannelPermissionKey(channelId, 'post_message');
  } else if (!wasRestrictedPolicy || allowedViewRoleIds !== undefined || allowedPostRoleIds !== undefined) {
    await syncRoleRestrictedViewPermissions(
      channelId,
      channel.communityId,
      allowedViewRoleIds ?? [],
      allowedPostRoleIds ?? [],
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
  const visibleChannels = await getChannelBrowseEntriesForCommunity(userId, communityId);

  // Group channels by category
  const uncategorized: typeof visibleChannels = [];
  const byCategory: Map<
    string,
    { category: ChannelBrowseEntry['row']['category']; channels: typeof visibleChannels }
  > = new Map();

  for (const entry of visibleChannels) {
    if (!entry.row.category) {
      uncategorized.push(entry);
    } else {
      const catId = entry.row.category.id;
      if (!byCategory.has(catId)) {
        byCategory.set(catId, { category: entry.row.category, channels: [] });
      }
      byCategory.get(catId)!.channels.push(entry);
    }
  }

  const decorateChannel = async (entry: typeof visibleChannels[number]) => {
    if (!entry.canView) {
      return {
        ...entry.row.channel,
        description: null,
        sourceDmConversationId: null,
        sourceDmConversation: null,
        canView: false,
        lockedReason: entry.lockedReason,
      };
    }

    return {
      ...entry.row.channel,
      canView: true,
      sourceDmConversation: await buildSourceDmConversationSummary(
        entry.row.channel.sourceDmConversationId,
        userId,
      ),
    };
  };

  return {
    uncategorized: await Promise.all(uncategorized.map((entry) => decorateChannel(entry))),
    categories: await Promise.all(Array.from(byCategory.values()).map(async (entry) => ({
      ...entry.category,
      channels: await Promise.all(entry.channels.map((channelEntry) => decorateChannel(channelEntry))),
    }))),
  };
}

export async function getChannel(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  const membership = await repo.getUserMembership(userId, channel.communityId);
  if (!membership || membership.membershipStatus !== 'active') {
    const canBrowseWithoutMembership = await canBrowseChannelWithoutMembership(
      channel.communityId,
      channel.accessPolicy,
    );
    if (!canBrowseWithoutMembership) {
      throw AppError.forbidden('You are not allowed to access this channel');
    }
  } else {
    await checkPermission(userId, channel.communityId, channelId, 'view_channel');
  }

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
