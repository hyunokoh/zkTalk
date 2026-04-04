import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import * as repo from './pin.repository.js';

// ---------------------------------------------------------------------------
// Permission helper
// ---------------------------------------------------------------------------

async function checkPermission(
  userId: string,
  communityId: string,
  channelId: string | null,
  requiredPermission: string,
): Promise<void> {
  const membership = await repo.getUserMembership(userId, communityId);
  if (!membership || membership.membershipStatus !== 'active') {
    throw AppError.forbidden('You are not an active member of this community');
  }

  const userRoles = await repo.getUserRolesInCommunity(userId, communityId);
  if (userRoles.length === 0) {
    throw AppError.forbidden('You have no roles in this community');
  }

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
// Service methods
// ---------------------------------------------------------------------------

export async function pinMessage(
  userId: string,
  channelId: string,
  messageId: string,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'pin_messages');

  // Check if already pinned
  const existing = await repo.findPin(channelId, messageId);
  if (existing) {
    throw AppError.conflict('Message is already pinned');
  }

  const id = uuidv7();
  return repo.pinMessage(id, channelId, messageId, userId);
}

export async function unpinMessage(
  userId: string,
  channelId: string,
  messageId: string,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'pin_messages');

  const deleted = await repo.unpinMessage(channelId, messageId);
  if (!deleted) {
    throw AppError.notFound('Pin not found');
  }
}

export async function getPinnedMessages(
  userId: string,
  channelId: string,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'view_channel');

  return repo.findPinnedMessages(channelId);
}
