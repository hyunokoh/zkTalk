import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../channel.repository.js', () => ({
  findChannelById: vi.fn(),
  findChannelsByCommunity: vi.fn(),
  getUserMembership: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  getChannelPermissions: vi.fn(),
}));

vi.mock('../../community/community.repository.js', () => ({
  findById: vi.fn(),
}));

import * as repo from '../channel.repository.js';
import * as communityRepo from '../../community/community.repository.js';
import {
  assertCanAccessChannel,
  canAccessChannelByRecord,
  getChannelBrowseEntriesForCommunity,
  getAccessibleChannelIdsForCommunity,
} from '../channel-access.service.js';

const mockedRepo = vi.mocked(repo);
const mockedCommunityRepo = vi.mocked(communityRepo);

const USER_ID = 'user-1';
const COMMUNITY_ID = 'community-1';

function makeChannel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'channel-1',
    communityId: COMMUNITY_ID,
    name: 'general',
    accessPolicy: 'public',
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedCommunityRepo.findById.mockResolvedValue({
    id: COMMUNITY_ID,
    visibility: 'public',
  } as any);
  mockedRepo.getUserMembership.mockResolvedValue(null as any);
  mockedRepo.getUserRolesInCommunity.mockResolvedValue([]);
  mockedRepo.getChannelPermissions.mockResolvedValue([]);
  mockedRepo.findChannelsByCommunity.mockResolvedValue([] as any);
});

describe('canAccessChannelByRecord', () => {
  it('allows non-members to open public channels in public communities', async () => {
    const allowed = await canAccessChannelByRecord(USER_ID, makeChannel());

    expect(allowed).toBe(true);
    expect(mockedCommunityRepo.findById).toHaveBeenCalledWith(COMMUNITY_ID);
  });

  it('denies non-members on members-only channels even in public communities', async () => {
    const allowed = await canAccessChannelByRecord(
      USER_ID,
      makeChannel({ accessPolicy: 'members_only' }),
    );

    expect(allowed).toBe(false);
  });

  it('denies non-members on public channels when the community itself is not public', async () => {
    mockedCommunityRepo.findById.mockResolvedValue({
      id: COMMUNITY_ID,
      visibility: 'invite_only',
    } as any);

    const allowed = await canAccessChannelByRecord(USER_ID, makeChannel());

    expect(allowed).toBe(false);
  });

  it('allows active members into members-only channels once they have default member permissions', async () => {
    mockedRepo.getUserMembership.mockResolvedValue({
      id: 'membership-1',
      communityId: COMMUNITY_ID,
      userId: USER_ID,
      membershipStatus: 'active',
    } as any);
    mockedRepo.getUserRolesInCommunity.mockResolvedValue([
      { roleId: 'role-member', roleName: 'member', priority: 20 },
    ] as any);

    const allowed = await canAccessChannelByRecord(
      USER_ID,
      makeChannel({ accessPolicy: 'members_only' }),
    );

    expect(allowed).toBe(true);
    expect(mockedRepo.getChannelPermissions).toHaveBeenCalledWith('channel-1');
  });
});

describe('assertCanAccessChannel', () => {
  it('returns the channel for a directly browsable public channel', async () => {
    const channel = makeChannel();
    mockedRepo.findChannelById.mockResolvedValue(channel);

    await expect(assertCanAccessChannel(USER_ID, channel.id)).resolves.toEqual(channel);
  });

  it('throws forbidden for a locked channel before the user joins', async () => {
    const channel = makeChannel({ accessPolicy: 'invite_only' });
    mockedRepo.findChannelById.mockResolvedValue(channel);

    await expect(assertCanAccessChannel(USER_ID, channel.id)).rejects.toThrow(
      'You are not allowed to access this channel',
    );
  });

  it('returns a members-only channel after the user joins with default member access', async () => {
    const channel = makeChannel({ accessPolicy: 'members_only' });
    mockedRepo.findChannelById.mockResolvedValue(channel);
    mockedRepo.getUserMembership.mockResolvedValue({
      id: 'membership-1',
      communityId: COMMUNITY_ID,
      userId: USER_ID,
      membershipStatus: 'active',
    } as any);
    mockedRepo.getUserRolesInCommunity.mockResolvedValue([
      { roleId: 'role-member', roleName: 'member', priority: 20 },
    ] as any);

    await expect(assertCanAccessChannel(USER_ID, channel.id)).resolves.toEqual(channel);
  });
});

describe('getAccessibleChannelIdsForCommunity', () => {
  it('returns only directly accessible channels for non-members browsing a public community', async () => {
    mockedRepo.findChannelsByCommunity.mockResolvedValue([
      { channel: makeChannel({ id: 'public-channel', accessPolicy: 'public' }), category: null },
      { channel: makeChannel({ id: 'members-channel', accessPolicy: 'members_only' }), category: null },
      { channel: makeChannel({ id: 'private-channel', accessPolicy: 'private' }), category: null },
      { channel: makeChannel({ id: 'archived-channel', accessPolicy: 'public', isArchived: true }), category: null },
    ] as any);

    await expect(getAccessibleChannelIdsForCommunity(USER_ID, COMMUNITY_ID)).resolves.toEqual([
      'public-channel',
    ]);
  });

  it('returns members-only channels after the user joins, but keeps role-gated channels out', async () => {
    mockedRepo.getUserMembership.mockResolvedValue({
      id: 'membership-1',
      communityId: COMMUNITY_ID,
      userId: USER_ID,
      membershipStatus: 'active',
    } as any);
    mockedRepo.getUserRolesInCommunity.mockResolvedValue([
      { roleId: 'role-member', roleName: 'member', priority: 20 },
    ] as any);
    mockedRepo.findChannelsByCommunity.mockResolvedValue([
      { channel: makeChannel({ id: 'public-channel', accessPolicy: 'public' }), category: null },
      { channel: makeChannel({ id: 'members-channel', accessPolicy: 'members_only' }), category: null },
      { channel: makeChannel({ id: 'invite-channel', accessPolicy: 'invite_only' }), category: null },
    ] as any);
    mockedRepo.getChannelPermissions.mockImplementation(async (channelId: string) => {
      if (channelId === 'invite-channel') {
        return [
          { roleId: 'role-member', permissionKey: 'view_channel', effect: 'deny' },
        ] as any;
      }

      return [];
    });

    await expect(getAccessibleChannelIdsForCommunity(USER_ID, COMMUNITY_ID)).resolves.toEqual([
      'public-channel',
      'members-channel',
    ]);
  });
});

describe('getChannelBrowseEntriesForCommunity', () => {
  it('returns locked browse rows for discoverable non-member channels in public communities', async () => {
    mockedRepo.findChannelsByCommunity.mockResolvedValue([
      { channel: makeChannel({ id: 'public-channel', accessPolicy: 'public' }), category: null },
      { channel: makeChannel({ id: 'members-channel', accessPolicy: 'members_only' }), category: null },
      { channel: makeChannel({ id: 'invite-channel', accessPolicy: 'invite_only' }), category: null },
      { channel: makeChannel({ id: 'private-channel', accessPolicy: 'private' }), category: null },
      { channel: makeChannel({ id: 'archived-channel', accessPolicy: 'public', isArchived: true }), category: null },
    ] as any);

    await expect(getChannelBrowseEntriesForCommunity(USER_ID, COMMUNITY_ID)).resolves.toEqual([
      {
        row: { channel: makeChannel({ id: 'public-channel', accessPolicy: 'public' }), category: null },
        canView: true,
      },
      {
        row: { channel: makeChannel({ id: 'members-channel', accessPolicy: 'members_only' }), category: null },
        canView: false,
        lockedReason: 'join_required',
      },
      {
        row: { channel: makeChannel({ id: 'invite-channel', accessPolicy: 'invite_only' }), category: null },
        canView: false,
        lockedReason: 'invite_required',
      },
    ]);
  });

  it('rejects non-members browsing channel listings for non-public communities', async () => {
    mockedCommunityRepo.findById.mockResolvedValue({
      id: COMMUNITY_ID,
      visibility: 'private',
    } as any);

    await expect(
      getChannelBrowseEntriesForCommunity(USER_ID, COMMUNITY_ID),
    ).rejects.toThrow('You are not allowed to browse channels in this community');
  });

  it('returns only viewable channels for active members', async () => {
    mockedRepo.getUserMembership.mockResolvedValue({
      id: 'membership-1',
      communityId: COMMUNITY_ID,
      userId: USER_ID,
      membershipStatus: 'active',
    } as any);
    mockedRepo.getUserRolesInCommunity.mockResolvedValue([
      { roleId: 'role-member', roleName: 'member', priority: 20 },
    ] as any);
    mockedRepo.findChannelsByCommunity.mockResolvedValue([
      { channel: makeChannel({ id: 'public-channel', accessPolicy: 'public' }), category: null },
      { channel: makeChannel({ id: 'members-channel', accessPolicy: 'members_only' }), category: null },
      { channel: makeChannel({ id: 'invite-channel', accessPolicy: 'invite_only' }), category: null },
    ] as any);
    mockedRepo.getChannelPermissions.mockImplementation(async (channelId: string) => {
      if (channelId === 'invite-channel') {
        return [{ roleId: 'role-member', permissionKey: 'view_channel', effect: 'deny' }] as any;
      }

      return [];
    });

    await expect(getChannelBrowseEntriesForCommunity(USER_ID, COMMUNITY_ID)).resolves.toEqual([
      {
        row: { channel: makeChannel({ id: 'public-channel', accessPolicy: 'public' }), category: null },
        canView: true,
      },
      {
        row: { channel: makeChannel({ id: 'members-channel', accessPolicy: 'members_only' }), category: null },
        canView: true,
      },
    ]);
  });
});
