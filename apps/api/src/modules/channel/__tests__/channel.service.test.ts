import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../lib/errors.js';

// Mock the repository module
vi.mock('../channel.repository.js', () => ({
  getUserMembership: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  getChannelPermissions: vi.fn(),
  clearChannelPermissionKey: vi.fn(),
  setChannelPermission: vi.fn(),
  findRolesByCommunity: vi.fn(),
  findCategoryById: vi.fn(),
  findChannelsByCategoryId: vi.fn(),
  findChannelById: vi.fn(),
  findChannelsByCommunity: vi.fn(),
  findCategoriesByCommunity: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createChannel: vi.fn(),
  updateChannel: vi.fn(),
  archiveChannel: vi.fn(),
}));

vi.mock('../../community/community.repository.js', () => ({
  findById: vi.fn(),
}));

import * as repo from '../channel.repository.js';
import * as service from '../channel.service.js';
import * as communityRepo from '../../community/community.repository.js';

const mockedRepo = vi.mocked(repo);
const mockedCommunityRepo = vi.mocked(communityRepo);

// Helpers
const COMMUNITY_ID = 'community-1';
const USER_ID = 'user-1';
const CHANNEL_ID = 'channel-1';
const CATEGORY_ID = 'category-1';

function mockActiveMember() {
  mockedRepo.getUserMembership.mockResolvedValue({
    id: 'membership-1',
    communityId: COMMUNITY_ID,
    userId: USER_ID,
    joinedAt: new Date(),
    membershipStatus: 'active',
    lastReadInboxAt: null,
  } as any);
}

function mockAdminRole() {
  mockedRepo.getUserRolesInCommunity.mockResolvedValue([
    { roleId: 'role-admin', roleName: 'admin', priority: 90 },
  ]);
}

function mockMemberRole() {
  mockedRepo.getUserRolesInCommunity.mockResolvedValue([
    { roleId: 'role-member', roleName: 'member', priority: 10 },
  ]);
}

function mockNoChannelOverrides() {
  mockedRepo.getChannelPermissions.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNoChannelOverrides();
  mockedCommunityRepo.findById.mockResolvedValue({
    id: COMMUNITY_ID,
    slug: 'alpha',
    name: 'Alpha',
    description: null,
    iconUrl: null,
    bannerUrl: null,
    visibility: 'public',
    ownerUserId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
});

// ---------------------------------------------------------------------------
// Permission checking
// ---------------------------------------------------------------------------

describe('checkPermission', () => {
  it('throws forbidden when user is not a community member', async () => {
    mockedRepo.getUserMembership.mockResolvedValue(null as any);

    await expect(
      service.checkPermission(USER_ID, COMMUNITY_ID, null, 'view_channel'),
    ).rejects.toThrow(AppError);

    await expect(
      service.checkPermission(USER_ID, COMMUNITY_ID, null, 'view_channel'),
    ).rejects.toThrow('You are not an active member of this community');
  });

  it('throws forbidden when user has banned membership', async () => {
    mockedRepo.getUserMembership.mockResolvedValue({
      id: 'membership-1',
      communityId: COMMUNITY_ID,
      userId: USER_ID,
      joinedAt: new Date(),
      membershipStatus: 'banned',
      lastReadInboxAt: null,
    } as any);

    await expect(
      service.checkPermission(USER_ID, COMMUNITY_ID, null, 'view_channel'),
    ).rejects.toThrow('You are not an active member of this community');
  });

  it('throws forbidden when user has no roles', async () => {
    mockActiveMember();
    mockedRepo.getUserRolesInCommunity.mockResolvedValue([]);

    await expect(
      service.checkPermission(USER_ID, COMMUNITY_ID, null, 'view_channel'),
    ).rejects.toThrow('You have no roles in this community');
  });

  it('throws forbidden when user lacks the required permission', async () => {
    mockActiveMember();
    mockMemberRole();

    await expect(
      service.checkPermission(USER_ID, COMMUNITY_ID, null, 'manage_channels'),
    ).rejects.toThrow('Missing permission: manage_channels');
  });

  it('succeeds when user has the required permission by default', async () => {
    mockActiveMember();
    mockAdminRole();

    await expect(
      service.checkPermission(USER_ID, COMMUNITY_ID, null, 'manage_channels'),
    ).resolves.toBeUndefined();
  });

  it('checks channel-specific overrides', async () => {
    mockActiveMember();
    mockMemberRole();
    mockedRepo.getChannelPermissions.mockResolvedValue([
      { roleId: 'role-member', permissionKey: 'manage_channels', effect: 'allow' as const },
    ] as any);

    await expect(
      service.checkPermission(USER_ID, COMMUNITY_ID, CHANNEL_ID, 'manage_channels'),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Category CRUD
// ---------------------------------------------------------------------------

describe('createCategory', () => {
  it('creates a category when user has manage_channels permission', async () => {
    mockActiveMember();
    mockAdminRole();
    mockedRepo.findCategoriesByCommunity.mockResolvedValue([]);

    const mockCategory = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: 'General', position: 0 };
    mockedRepo.createCategory.mockResolvedValue(mockCategory as any);

    const result = await service.createCategory(COMMUNITY_ID, USER_ID, { name: 'General' });
    expect(result).toEqual(mockCategory);
    expect(mockedRepo.createCategory).toHaveBeenCalledWith({
      communityId: COMMUNITY_ID,
      name: 'General',
      position: 0,
    });
  });

  it('throws forbidden when user lacks manage_channels', async () => {
    mockActiveMember();
    mockMemberRole();

    await expect(
      service.createCategory(COMMUNITY_ID, USER_ID, { name: 'General' }),
    ).rejects.toThrow('Missing permission: manage_channels');
  });
});

describe('updateCategory', () => {
  it('updates a category when user has permission', async () => {
    mockActiveMember();
    mockAdminRole();

    const mockCategory = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: 'Updated', position: 0 };
    mockedRepo.findCategoryById.mockResolvedValue(mockCategory as any);
    mockedRepo.updateCategory.mockResolvedValue({ ...mockCategory, name: 'Updated' } as any);

    const result = await service.updateCategory(CATEGORY_ID, USER_ID, { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('throws not found when category does not exist', async () => {
    mockedRepo.findCategoryById.mockResolvedValue(null as any);

    await expect(
      service.updateCategory('nonexistent', USER_ID, { name: 'X' }),
    ).rejects.toThrow('Category not found');
  });
});

describe('deleteCategory', () => {
  it('deletes an empty category', async () => {
    mockActiveMember();
    mockAdminRole();

    const mockCategory = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: 'Old', position: 0 };
    mockedRepo.findCategoryById.mockResolvedValue(mockCategory as any);
    mockedRepo.findChannelsByCategoryId.mockResolvedValue([]);
    mockedRepo.deleteCategory.mockResolvedValue(mockCategory as any);

    const result = await service.deleteCategory(CATEGORY_ID, USER_ID);
    expect(result).toEqual(mockCategory);
  });

  it('throws when category still has channels', async () => {
    mockActiveMember();
    mockAdminRole();

    const mockCategory = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: 'Old', position: 0 };
    mockedRepo.findCategoryById.mockResolvedValue(mockCategory as any);
    mockedRepo.findChannelsByCategoryId.mockResolvedValue([{ id: 'ch-1' }] as any);

    await expect(
      service.deleteCategory(CATEGORY_ID, USER_ID),
    ).rejects.toThrow('Cannot delete a category that still contains channels');
  });
});

// ---------------------------------------------------------------------------
// Channel CRUD
// ---------------------------------------------------------------------------

describe('createChannel', () => {
  it('creates a channel when user has manage_channels permission', async () => {
    mockActiveMember();
    mockAdminRole();

    const mockChannel = {
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      categoryId: null,
      name: 'general',
      description: null,
      type: 'chat',
      visibility: 'public',
      accessPolicy: 'public',
      slowModeSeconds: 0,
      position: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedRepo.createChannel.mockResolvedValue(mockChannel as any);

    const result = await service.createChannel(COMMUNITY_ID, USER_ID, { name: 'general' });
    expect(result).toEqual(mockChannel);
  });

  it('validates category belongs to community', async () => {
    mockActiveMember();
    mockAdminRole();

    // Category from a different community
    mockedRepo.findCategoryById.mockResolvedValue({
      id: CATEGORY_ID,
      communityId: 'other-community',
      name: 'Other',
      position: 0,
    } as any);

    await expect(
      service.createChannel(COMMUNITY_ID, USER_ID, {
        name: 'general',
        categoryId: CATEGORY_ID,
      }),
    ).rejects.toThrow('Invalid category for this community');
  });

  it('throws forbidden for members without manage_channels', async () => {
    mockActiveMember();
    mockMemberRole();

    await expect(
      service.createChannel(COMMUNITY_ID, USER_ID, { name: 'general' }),
    ).rejects.toThrow('Missing permission: manage_channels');
  });

  it('rejects public channels in non-public communities', async () => {
    mockActiveMember();
    mockAdminRole();
    mockedCommunityRepo.findById.mockResolvedValue({
      id: COMMUNITY_ID,
      visibility: 'private',
    } as any);

    await expect(
      service.createChannel(COMMUNITY_ID, USER_ID, {
        name: 'general',
        accessPolicy: 'public',
      }),
    ).rejects.toThrow('Only public communities can expose public channels');
  });
});

describe('updateChannel', () => {
  it('updates a channel', async () => {
    mockActiveMember();
    mockAdminRole();

    const mockChannel = {
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      categoryId: null,
      name: 'general',
      description: null,
      type: 'chat',
      visibility: 'public',
      accessPolicy: 'public',
      slowModeSeconds: 0,
      position: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedRepo.findChannelById.mockResolvedValue(mockChannel as any);
    mockedRepo.updateChannel.mockResolvedValue({ ...mockChannel, name: 'renamed' } as any);

    const result = await service.updateChannel(CHANNEL_ID, USER_ID, { name: 'renamed' });
    expect(result.name).toBe('renamed');
  });

  it('requires view roles when switching to invite-only', async () => {
    mockActiveMember();
    mockAdminRole();

    mockedRepo.findChannelById.mockResolvedValue({
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      visibility: 'public',
      accessPolicy: 'public',
      categoryId: null,
      isArchived: false,
    } as any);

    await expect(
      service.updateChannel(CHANNEL_ID, USER_ID, { accessPolicy: 'invite_only' }),
    ).rejects.toThrow('Invite-only and private channels require at least one allowed view role');
  });

  it('rejects restricted role updates that omit allowed view roles', async () => {
    mockActiveMember();
    mockAdminRole();

    mockedRepo.findChannelById.mockResolvedValue({
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      visibility: 'role_restricted',
      accessPolicy: 'invite_only',
      categoryId: null,
      isArchived: false,
    } as any);

    await expect(
      service.updateChannel(CHANNEL_ID, USER_ID, {
        allowedPostRoleIds: ['role-editor'],
      }),
    ).rejects.toThrow(
      'Restricted channel role updates must include allowedViewRoleIds when allowedPostRoleIds is provided',
    );
  });

  it('throws not found when channel does not exist', async () => {
    mockedRepo.findChannelById.mockResolvedValue(null as any);

    await expect(
      service.updateChannel('nonexistent', USER_ID, { name: 'X' }),
    ).rejects.toThrow('Channel not found');
  });
});

describe('archiveChannel', () => {
  it('archives a channel', async () => {
    mockActiveMember();
    mockAdminRole();

    const mockChannel = {
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      isArchived: false,
    };
    mockedRepo.findChannelById.mockResolvedValue(mockChannel as any);
    mockedRepo.archiveChannel.mockResolvedValue({ ...mockChannel, isArchived: true } as any);

    const result = await service.archiveChannel(CHANNEL_ID, USER_ID);
    expect(result.isArchived).toBe(true);
  });

  it('throws when channel is already archived', async () => {
    mockActiveMember();
    mockAdminRole();

    mockedRepo.findChannelById.mockResolvedValue({
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      isArchived: true,
    } as any);

    await expect(
      service.archiveChannel(CHANNEL_ID, USER_ID),
    ).rejects.toThrow('Channel is already archived');
  });
});

describe('getChannel', () => {
  it('returns channel when user has view_channel permission', async () => {
    mockActiveMember();
    mockMemberRole();

    const mockChannel = {
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      name: 'general',
      accessPolicy: 'public',
    };
    mockedRepo.findChannelById.mockResolvedValue(mockChannel as any);

    const result = await service.getChannel(CHANNEL_ID, USER_ID);
    expect(result).toEqual(mockChannel);
  });

  it('returns a public channel for a non-member in a public community', async () => {
    mockedRepo.getUserMembership.mockResolvedValue(null as any);
    mockedRepo.findChannelById.mockResolvedValue({
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      name: 'general',
      accessPolicy: 'public',
    } as any);

    const result = await service.getChannel(CHANNEL_ID, USER_ID);
    expect(result).toEqual({
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      name: 'general',
      accessPolicy: 'public',
    });
  });

  it('rejects a restricted channel for a non-member', async () => {
    mockedRepo.getUserMembership.mockResolvedValue(null as any);
    mockedRepo.findChannelById.mockResolvedValue({
      id: CHANNEL_ID,
      communityId: COMMUNITY_ID,
      name: 'staff',
      accessPolicy: 'members_only',
    } as any);

    await expect(service.getChannel(CHANNEL_ID, USER_ID)).rejects.toThrow(
      'You are not allowed to access this channel',
    );
  });

  it('throws not found when channel does not exist', async () => {
    mockedRepo.findChannelById.mockResolvedValue(null as any);

    await expect(service.getChannel('nonexistent', USER_ID)).rejects.toThrow('Channel not found');
  });
});

describe('listChannels', () => {
  it('returns channels grouped by category, filtered by permission', async () => {
    mockActiveMember();
    mockMemberRole();

    const mockCategory = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: 'Text', position: 0 };
    const mockChannelA = {
      id: 'ch-a',
      communityId: COMMUNITY_ID,
      categoryId: CATEGORY_ID,
      name: 'general',
      accessPolicy: 'members_only',
      isArchived: false,
    };
    const mockChannelB = {
      id: 'ch-b',
      communityId: COMMUNITY_ID,
      categoryId: null,
      name: 'random',
      accessPolicy: 'public',
      isArchived: false,
    };

    mockedRepo.findChannelsByCommunity.mockResolvedValue([
      { channel: mockChannelA, category: mockCategory },
      { channel: mockChannelB, category: null },
    ] as any);

    // No overrides -> member can view all public channels
    mockedRepo.getChannelPermissions.mockResolvedValue([]);

    const result = await service.listChannels(COMMUNITY_ID, USER_ID);
    expect(result.uncategorized).toHaveLength(1);
    expect(result.uncategorized[0].name).toBe('random');
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].channels).toHaveLength(1);
    expect(result.categories[0].channels[0].name).toBe('general');
  });

  it('returns only public channels for a non-member browsing a public community', async () => {
    mockedRepo.getUserMembership.mockResolvedValue(null as any);

    const mockCategory = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: 'Lobby', position: 0 };
    mockedRepo.findChannelsByCommunity.mockResolvedValue([
      {
        channel: {
          id: 'public-channel',
          communityId: COMMUNITY_ID,
          categoryId: CATEGORY_ID,
          name: 'announcements',
          accessPolicy: 'public',
          isArchived: false,
        },
        category: mockCategory,
      },
      {
        channel: {
          id: 'locked-channel',
          communityId: COMMUNITY_ID,
          categoryId: null,
          name: 'members',
          accessPolicy: 'members_only',
          isArchived: false,
        },
        category: null,
      },
      {
        channel: {
          id: 'invite-channel',
          communityId: COMMUNITY_ID,
          categoryId: null,
          name: 'ambassadors',
          accessPolicy: 'invite_only',
          isArchived: false,
        },
        category: null,
      },
      {
        channel: {
          id: 'private-channel',
          communityId: COMMUNITY_ID,
          categoryId: null,
          name: 'leadership',
          accessPolicy: 'private',
          isArchived: false,
        },
        category: null,
      },
      {
        channel: {
          id: 'archived-channel',
          communityId: COMMUNITY_ID,
          categoryId: null,
          name: 'retired-lobby',
          accessPolicy: 'public',
          isArchived: true,
        },
        category: null,
      },
    ] as any);

    const result = await service.listChannels(COMMUNITY_ID, USER_ID);
    expect(result.uncategorized).toHaveLength(2);
    expect(result.uncategorized[0]).toMatchObject({
      name: 'members',
      canView: false,
      lockedReason: 'join_required',
      description: null,
      sourceDmConversationId: null,
    });
    expect(result.uncategorized[1]).toMatchObject({
      name: 'ambassadors',
      canView: false,
      lockedReason: 'invite_required',
    });
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].channels).toHaveLength(1);
    expect(result.categories[0].channels[0]).toMatchObject({
      name: 'announcements',
      canView: true,
    });
    expect(
      result.uncategorized.find((channel) => channel.name === 'retired-lobby'),
    ).toBeUndefined();
    expect(mockedRepo.getChannelPermissions).not.toHaveBeenCalled();
  });

  it('rejects non-members browsing a non-public community', async () => {
    mockedRepo.getUserMembership.mockResolvedValue(null as any);
    mockedCommunityRepo.findById.mockResolvedValue({
      id: COMMUNITY_ID,
      slug: 'private-alpha',
      name: 'Private Alpha',
      description: null,
      iconUrl: null,
      bannerUrl: null,
      visibility: 'private',
      ownerUserId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    mockedRepo.findChannelsByCommunity.mockResolvedValue([] as any);

    await expect(service.listChannels(COMMUNITY_ID, USER_ID)).rejects.toThrow(
      'You are not allowed to browse channels in this community',
    );
  });

  it('throws when user is not a member', async () => {
    mockedRepo.getUserMembership.mockResolvedValue(null as any);
    mockedCommunityRepo.findById.mockResolvedValue(null as any);
    mockedRepo.findChannelsByCommunity.mockResolvedValue([] as any);

    await expect(
      service.listChannels(COMMUNITY_ID, USER_ID),
    ).rejects.toThrow('You are not allowed to browse channels in this community');
  });
});
