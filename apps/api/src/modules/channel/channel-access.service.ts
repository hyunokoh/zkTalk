import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import * as channelRepo from './channel.repository.js';
import * as communityRepo from '../community/community.repository.js';

type ChannelRecord = NonNullable<Awaited<ReturnType<typeof channelRepo.findChannelById>>>;
type CommunityChannelRows = Awaited<ReturnType<typeof channelRepo.findChannelsByCommunity>>;
type CommunityChannelRow = CommunityChannelRows[number];

interface ChannelAccessContext {
  membership: Awaited<ReturnType<typeof channelRepo.getUserMembership>> | null;
  userRoles: Awaited<ReturnType<typeof channelRepo.getUserRolesInCommunity>>;
}

export interface ChannelBrowseEntry {
  row: CommunityChannelRow;
  canView: boolean;
  lockedReason?: 'join_required' | 'invite_required';
}

async function resolveChannelAccessContext(userId: string, communityId: string): Promise<ChannelAccessContext> {
  const membership = await channelRepo.getUserMembership(userId, communityId);
  if (!membership || membership.membershipStatus !== 'active') {
    return { membership: null, userRoles: [] };
  }

  const userRoles = await channelRepo.getUserRolesInCommunity(userId, communityId);
  return { membership, userRoles };
}

async function canBrowseChannelWithoutMembership(channel: ChannelRecord) {
  if (channel.accessPolicy !== 'public') {
    return false;
  }

  const community = await communityRepo.findById(channel.communityId);
  return community?.visibility === 'public';
}

export async function canAccessChannelByRecord(
  userId: string,
  channel: ChannelRecord,
  context?: ChannelAccessContext,
) {
  const accessContext = context ?? await resolveChannelAccessContext(userId, channel.communityId);
  if (!accessContext.membership) {
    return canBrowseChannelWithoutMembership(channel);
  }

  if (accessContext.userRoles.length === 0) {
    return false;
  }

  const channelPermissions = await channelRepo.getChannelPermissions(channel.id);
  return hasPermission(
    accessContext.userRoles,
    channelPermissions,
    'view_channel',
    DEFAULT_ROLE_PERMISSIONS,
  );
}

export async function assertCanAccessChannel(userId: string, channelId: string) {
  const channel = await channelRepo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  const allowed = await canAccessChannelByRecord(userId, channel);
  if (!allowed) {
    throw AppError.forbidden('You are not allowed to access this channel');
  }

  return channel;
}

export async function getAccessibleChannelIdsForCommunity(userId: string, communityId: string) {
  const rows = (await channelRepo.findChannelsByCommunity(communityId)).filter(
    (row) => !row.channel.isArchived,
  );
  if (rows.length === 0) {
    return [];
  }

  const accessContext = await resolveChannelAccessContext(userId, communityId);
  const allowedChannelIds: string[] = [];

  for (const row of rows) {
    if (await canAccessChannelByRecord(userId, row.channel, accessContext)) {
      allowedChannelIds.push(row.channel.id);
    }
  }

  return allowedChannelIds;
}

export async function getChannelBrowseEntriesForCommunity(
  userId: string,
  communityId: string,
): Promise<ChannelBrowseEntry[]> {
  const rows = (await channelRepo.findChannelsByCommunity(communityId)).filter(
    (row) => !row.channel.isArchived,
  );
  if (rows.length === 0) {
    const accessContext = await resolveChannelAccessContext(userId, communityId);
    if (accessContext.membership) {
      return [];
    }

    const community = await communityRepo.findById(communityId);
    if (!community || community.visibility !== 'public') {
      throw AppError.forbidden('You are not allowed to browse channels in this community');
    }

    return [];
  }

  const accessContext = await resolveChannelAccessContext(userId, communityId);
  if (!accessContext.membership) {
    const community = await communityRepo.findById(communityId);
    if (!community || community.visibility !== 'public') {
      throw AppError.forbidden('You are not allowed to browse channels in this community');
    }

    return rows.flatMap<ChannelBrowseEntry>((row) => {
      if (row.channel.accessPolicy === 'public') {
        return [{ row, canView: true }];
      }

      if (row.channel.accessPolicy === 'members_only') {
        return [{ row, canView: false, lockedReason: 'join_required' }];
      }

      if (row.channel.accessPolicy === 'invite_only') {
        return [{ row, canView: false, lockedReason: 'invite_required' }];
      }

      return [];
    });
  }

  const allowedEntries: ChannelBrowseEntry[] = [];
  for (const row of rows) {
    if (await canAccessChannelByRecord(userId, row.channel, accessContext)) {
      allowedEntries.push({ row, canView: true });
    }
  }

  return allowedEntries;
}
