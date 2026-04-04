import { AppError } from '../../lib/errors.js';
import { checkPermission } from '../channel/channel.service.js';
import * as repo from './channel-e2ee.repository.js';

/**
 * Initialize E2EE for a channel.
 * - Only admins (manage_channels permission) can enable E2EE.
 * - The client generates a random group key, encrypts it with each member's public key,
 *   and sends the encrypted keys.
 * - The server stores these encrypted keys and marks the channel as E2EE-enabled.
 */
export async function initializeE2ee(
  channelId: string,
  userId: string,
  memberKeys: Record<string, string>,
  keyVersion: number,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  // Check admin permission
  await checkPermission(userId, channel.communityId, channelId, 'manage_channels');

  if (channel.isE2eeEnabled) {
    throw AppError.conflict('E2EE is already enabled for this channel');
  }

  // Store the encrypted group keys for each member
  await repo.insertChannelKeys(channelId, memberKeys, keyVersion);

  // Enable E2EE on the channel
  const updatedChannel = await repo.setChannelE2ee(channelId, true);

  return updatedChannel;
}

/**
 * Get the encrypted group key for the requesting user.
 */
export async function getMyChannelKey(channelId: string, userId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  if (!channel.isE2eeEnabled) {
    throw AppError.badRequest('E2EE is not enabled for this channel');
  }

  const key = await repo.getChannelKeyForUser(channelId, userId);
  if (!key) {
    throw AppError.notFound('No encrypted key found for this user in this channel');
  }

  return {
    encryptedGroupKey: key.encryptedGroupKey,
    keyVersion: key.keyVersion,
  };
}

/**
 * Rotate the group key for a channel (e.g., when a member leaves).
 * All remaining members get a new encrypted group key.
 */
export async function rotateGroupKey(
  channelId: string,
  userId: string,
  memberKeys: Record<string, string>,
  keyVersion: number,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  if (!channel.isE2eeEnabled) {
    throw AppError.badRequest('E2EE is not enabled for this channel');
  }

  // Check admin permission
  await checkPermission(userId, channel.communityId, channelId, 'manage_channels');

  // Verify key version is higher than current
  const currentVersion = await repo.getLatestKeyVersion(channelId);
  if (keyVersion <= currentVersion) {
    throw AppError.badRequest('Key version must be higher than the current version');
  }

  // Store the new encrypted group keys
  await repo.insertChannelKeys(channelId, memberKeys, keyVersion);

  return { keyVersion };
}

/**
 * Add an encrypted group key for a new member.
 * An existing member with the group key encrypts it for the new member.
 */
export async function addMemberKey(
  channelId: string,
  requestingUserId: string,
  targetUserId: string,
  encryptedGroupKey: string,
  keyVersion: number,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  if (!channel.isE2eeEnabled) {
    throw AppError.badRequest('E2EE is not enabled for this channel');
  }

  // The requesting user must have a key (they need the group key to re-encrypt for the new member)
  const requesterKey = await repo.getChannelKeyForUser(channelId, requestingUserId);
  if (!requesterKey) {
    throw AppError.forbidden('You do not have access to this channel\'s encryption key');
  }

  // Store the new member's encrypted key
  const key = await repo.insertChannelKey(channelId, targetUserId, encryptedGroupKey, keyVersion);

  return key;
}
