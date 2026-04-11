import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
vi.mock('../community.repository.js', () => ({
  createCommunity: vi.fn(),
  findBySlug: vi.fn(),
  findById: vi.fn(),
  findUserCommunities: vi.fn(),
  updateCommunity: vi.fn(),
  createMembership: vi.fn(),
  findMembership: vi.fn(),
  createInvite: vi.fn(),
  findInviteByCode: vi.fn(),
  incrementInviteUseCount: vi.fn(),
  findOnboarding: vi.fn(),
  createRole: vi.fn(),
  assignRole: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  createDefaultChannel: vi.fn(),
  countChannelsByAccessPolicy: vi.fn(),
  findChannelsByIds: vi.fn(),
  upsertOnboarding: vi.fn(),
}));

// Mock the db module for getCommunityRoles helper
vi.mock('../../../lib/db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock('../../../lib/db/schema.js', () => ({
  roles: { communityId: 'community_id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

import * as communityService from '../community.service.js';
import * as communityRepo from '../community.repository.js';

const mockRepo = vi.mocked(communityRepo);

describe('community.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.countChannelsByAccessPolicy.mockResolvedValue(0);
    mockRepo.findChannelsByIds.mockResolvedValue([]);
  });

  describe('createCommunity', () => {
    it('should create community with system roles and owner membership', async () => {
      const userId = 'user-1';
      const data = {
        name: 'Test Community',
        slug: 'test-community',
        description: 'A test community',
        visibility: 'public' as const,
      };

      // No existing community with this slug
      mockRepo.findBySlug.mockResolvedValue(null as any);

      // Community creation
      const mockCommunity = {
        id: 'community-1',
        slug: 'test-community',
        name: 'Test Community',
        description: 'A test community',
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.createCommunity.mockResolvedValue(mockCommunity);

      // Role creation - returns incrementing IDs
      let roleCounter = 0;
      mockRepo.createRole.mockImplementation(async (data) => ({
        id: `role-${++roleCounter}`,
        communityId: 'community-1',
        name: data.name,
        priority: data.priority,
        isSystemRole: data.isSystemRole,
        color: null,
      }));

      // Membership creation
      mockRepo.createMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: 'community-1',
        userId,
        joinedAt: new Date(),
        membershipStatus: 'active' as const,
        lastReadInboxAt: null,
      });

      mockRepo.assignRole.mockResolvedValue(undefined);

      const result = await communityService.createCommunity(userId, data);

      expect(result.id).toBe('community-1');
      expect(result.name).toBe('Test Community');
      expect(result.slug).toBe('test-community');
      expect(result.ownerUserId).toBe(userId);

      // Verify slug check
      expect(mockRepo.findBySlug).toHaveBeenCalledWith('test-community');

      // Verify community created
      expect(mockRepo.createCommunity).toHaveBeenCalledWith({
        name: 'Test Community',
        slug: 'test-community',
        description: 'A test community',
        visibility: 'public',
        ownerUserId: userId,
      });

      // Verify 5 system roles created (owner, admin, moderator, member, guest)
      expect(mockRepo.createRole).toHaveBeenCalledTimes(5);
      expect(mockRepo.createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'owner', isSystemRole: true, priority: 100 }),
      );
      expect(mockRepo.createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'admin', isSystemRole: true, priority: 80 }),
      );
      expect(mockRepo.createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'moderator', isSystemRole: true, priority: 60 }),
      );
      expect(mockRepo.createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'member', isSystemRole: true, priority: 20 }),
      );
      expect(mockRepo.createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'guest', isSystemRole: true, priority: 0 }),
      );

      // Verify membership created
      expect(mockRepo.createMembership).toHaveBeenCalledWith('community-1', userId);

      // Verify owner role assigned (first role created is owner with role-1)
      expect(mockRepo.assignRole).toHaveBeenCalledWith('membership-1', 'role-1');
      expect(mockRepo.createDefaultChannel).toHaveBeenCalledWith('community-1', 'public');
    });

    it('should throw conflict if slug already exists', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        id: 'existing',
        slug: 'taken-slug',
        name: 'Existing',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        communityService.createCommunity('user-1', {
          name: 'New',
          slug: 'taken-slug',
          visibility: 'public',
        }),
      ).rejects.toThrow('A community with this slug already exists');
    });

    it('should create a members-only default channel for non-public communities', async () => {
      const userId = 'user-1';
      mockRepo.findBySlug.mockResolvedValue(null as any);
      mockRepo.createCommunity.mockResolvedValue({
        id: 'community-1',
        slug: 'staff',
        name: 'Staff',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'private' as const,
        ownerUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      let roleCounter = 0;
      mockRepo.createRole.mockImplementation(async (data) => ({
        id: `role-${++roleCounter}`,
        communityId: 'community-1',
        name: data.name,
        priority: data.priority,
        isSystemRole: data.isSystemRole,
        color: null,
      }));
      mockRepo.createMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: 'community-1',
        userId,
        joinedAt: new Date(),
        membershipStatus: 'active' as const,
        lastReadInboxAt: null,
      });
      mockRepo.assignRole.mockResolvedValue(undefined);

      await communityService.createCommunity(userId, {
        name: 'Staff',
        slug: 'staff',
        visibility: 'private',
      });

      expect(mockRepo.createDefaultChannel).toHaveBeenCalledWith('community-1', 'members_only');
    });
  });

  describe('getCommunity', () => {
    it('should return community by slug', async () => {
      const mockCommunity = {
        id: 'community-1',
        slug: 'my-community',
        name: 'My Community',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.findBySlug.mockResolvedValue(mockCommunity);

      const result = await communityService.getCommunity('my-community');
      expect(result).toEqual({
        ...mockCommunity,
        discovery: {
          isDiscoverable: true,
          canSelfJoin: true,
        },
      });
    });

    it('should throw not found for nonexistent slug', async () => {
      mockRepo.findBySlug.mockResolvedValue(null as any);
      await expect(communityService.getCommunity('nonexistent')).rejects.toThrow(
        'Community not found',
      );
    });
  });

  describe('getCommunityForUser', () => {
    it('allows non-members to open public community metadata and returns discovery policy', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        id: 'community-1',
        slug: 'public-alpha',
        name: 'Public Alpha',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockRepo.findMembership.mockResolvedValue(null as any);

      const result = await communityService.getCommunityForUser('public-alpha', 'user-1');

      expect(result.isMember).toBe(false);
      expect(result.discovery).toEqual({
        isDiscoverable: true,
        canSelfJoin: true,
      });
    });

    it('blocks non-members from directly opening invite-only communities', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        id: 'community-2',
        slug: 'invite-alpha',
        name: 'Invite Alpha',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'invite_only' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockRepo.findMembership.mockResolvedValue(null as any);

      await expect(
        communityService.getCommunityForUser('invite-alpha', 'user-1'),
      ).rejects.toThrow('You are not allowed to access this community');
    });

    it('allows active members to open private communities', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        id: 'community-3',
        slug: 'private-alpha',
        name: 'Private Alpha',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'private' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockRepo.findMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: 'community-3',
        userId: 'user-1',
        joinedAt: new Date(),
        membershipStatus: 'active' as const,
        lastReadInboxAt: null,
      } as any);

      const result = await communityService.getCommunityForUser('private-alpha', 'user-1');

      expect(result.isMember).toBe(true);
      expect(result.discovery).toEqual({
        isDiscoverable: false,
        canSelfJoin: false,
      });
    });
  });

  describe('updateCommunity', () => {
    it('should throw forbidden if user lacks admin role', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'community-1',
        slug: 'test',
        name: 'Test',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // User has only member role
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        {
          id: 'role-4',
          name: 'member',
          priority: 20,
          isSystemRole: true,
          communityId: 'community-1',
          color: null,
        },
      ]);

      await expect(
        communityService.updateCommunity('community-1', 'user-1', { name: 'New Name' }),
      ).rejects.toThrow('You do not have permission to perform this action');
    });

    it('should update community if user is admin', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'community-1',
        slug: 'test',
        name: 'Test',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        {
          id: 'role-2',
          name: 'admin',
          priority: 80,
          isSystemRole: true,
          communityId: 'community-1',
          color: null,
        },
      ]);

      const updatedCommunity = {
        id: 'community-1',
        slug: 'test',
        name: 'Updated Name',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepo.updateCommunity.mockResolvedValue(updatedCommunity);

      const result = await communityService.updateCommunity('community-1', 'user-1', {
        name: 'Updated Name',
      });
      expect(result!.name).toBe('Updated Name');
      expect(result!.discovery).toEqual({
        isDiscoverable: true,
        canSelfJoin: true,
      });
    });

    it('should reject moving to a non-public visibility while public channels remain', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'community-1',
        slug: 'test',
        name: 'Test',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        {
          id: 'role-2',
          name: 'admin',
          priority: 80,
          isSystemRole: true,
          communityId: 'community-1',
          color: null,
        },
      ]);
      mockRepo.countChannelsByAccessPolicy.mockResolvedValue(1);

      await expect(
        communityService.updateCommunity('community-1', 'user-1', { visibility: 'private' }),
      ).rejects.toThrow(
        'Communities with public channels must stay public until those channels are restricted',
      );
    });
  });

  describe('joinViaInvite', () => {
    it('should throw not found for invalid invite code', async () => {
      mockRepo.findInviteByCode.mockResolvedValue(null as any);
      await expect(communityService.joinViaInvite('badcode', 'user-1')).rejects.toThrow(
        'Invite not found',
      );
    });

    it('should throw if invite is expired', async () => {
      mockRepo.findInviteByCode.mockResolvedValue({
        id: 'invite-1',
        communityId: 'community-1',
        code: 'abc123',
        createdByUserId: 'user-2',
        expiresAt: new Date(Date.now() - 1000), // expired
        maxUses: null,
        useCount: 0,
      });

      await expect(communityService.joinViaInvite('abc123', 'user-1')).rejects.toThrow(
        'This invite has expired',
      );
    });

    it('should throw if invite max uses reached', async () => {
      mockRepo.findInviteByCode.mockResolvedValue({
        id: 'invite-1',
        communityId: 'community-1',
        code: 'abc123',
        createdByUserId: 'user-2',
        expiresAt: null,
        maxUses: 5,
        useCount: 5,
      });

      await expect(communityService.joinViaInvite('abc123', 'user-1')).rejects.toThrow(
        'This invite has reached its maximum uses',
      );
    });

    it('should return alreadyMember if already active in the community', async () => {
      mockRepo.findInviteByCode.mockResolvedValue({
        id: 'invite-1',
        communityId: 'community-1',
        code: 'abc123',
        createdByUserId: 'user-2',
        expiresAt: null,
        maxUses: null,
        useCount: 0,
      });

      mockRepo.findMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: 'community-1',
        userId: 'user-1',
        joinedAt: new Date(),
        membershipStatus: 'active' as const,
        lastReadInboxAt: null,
      });

      mockRepo.findById.mockResolvedValue({
        id: 'community-1',
        slug: 'test-community',
        name: 'Test Community',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await communityService.joinViaInvite('abc123', 'user-1');
      expect(result.alreadyMember).toBe(true);
      expect(result.membership.id).toBe('membership-1');
    });
  });

  describe('joinPublicCommunity', () => {
    it('should allow joining a public community by slug', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        id: 'community-1',
        slug: 'test-community',
        name: 'Test Community',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockRepo.findMembership.mockResolvedValue(null as any);
      mockRepo.createMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: 'community-1',
        userId: 'user-1',
        joinedAt: new Date(),
        membershipStatus: 'active' as const,
        lastReadInboxAt: null,
      } as any);
      mockRepo.getUserRolesInCommunity.mockResolvedValue([]);

      const result = await communityService.joinPublicCommunity('test-community', 'user-1');

      expect(mockRepo.findBySlug).toHaveBeenCalledWith('test-community');
      expect(mockRepo.createMembership).toHaveBeenCalledWith('community-1', 'user-1');
      expect(result.alreadyMember).toBe(false);
      expect(result.community.slug).toBe('test-community');
      expect(result.community.discovery).toEqual({
        isDiscoverable: true,
        canSelfJoin: true,
      });
    });

    it('should allow joining a public community by id', async () => {
      mockRepo.findById.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'test-community',
        name: 'Test Community',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockRepo.findMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        joinedAt: new Date(),
        membershipStatus: 'active' as const,
        lastReadInboxAt: null,
      } as any);
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        {
          id: 'role-member',
          name: 'member',
          priority: 20,
          isSystemRole: true,
          communityId: '550e8400-e29b-41d4-a716-446655440000',
          color: null,
        },
      ] as any);

      const result = await communityService.joinPublicCommunity(
        '550e8400-e29b-41d4-a716-446655440000',
        'user-1',
      );

      expect(mockRepo.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(result.alreadyMember).toBe(true);
      expect(result.community.discovery).toEqual({
        isDiscoverable: true,
        canSelfJoin: true,
      });
    });

    it('should reject direct join for invite-only communities', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        id: 'community-1',
        slug: 'invite-alpha',
        name: 'Invite Alpha',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'invite_only' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(communityService.joinPublicCommunity('invite-alpha', 'user-1')).rejects.toThrow(
        'This community is not public',
      );
      expect(mockRepo.createMembership).not.toHaveBeenCalled();
    });

    it('should reject direct join for private communities', async () => {
      mockRepo.findBySlug.mockResolvedValue({
        id: 'community-2',
        slug: 'private-alpha',
        name: 'Private Alpha',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'private' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(communityService.joinPublicCommunity('private-alpha', 'user-1')).rejects.toThrow(
        'This community is not public',
      );
      expect(mockRepo.createMembership).not.toHaveBeenCalled();
    });
  });

  describe('updateOnboarding', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue({
        id: 'community-1',
        slug: 'alpha-team',
        name: 'Alpha Team',
        description: null,
        iconUrl: null,
        bannerUrl: null,
        visibility: 'public' as const,
        ownerUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        {
          id: 'role-2',
          name: 'admin',
          priority: 80,
          isSystemRole: true,
          communityId: 'community-1',
          color: null,
        },
      ]);
    });

    it('accepts public, members-only, and invite-only starter channels', async () => {
      mockRepo.findChannelsByIds.mockResolvedValue([
        {
          id: 'channel-public',
          communityId: 'community-1',
          name: 'announcements',
          accessPolicy: 'public',
        },
        {
          id: 'channel-members',
          communityId: 'community-1',
          name: 'general',
          accessPolicy: 'members_only',
        },
        {
          id: 'channel-invite',
          communityId: 'community-1',
          name: 'projects',
          accessPolicy: 'invite_only',
        },
      ] as any);
      mockRepo.upsertOnboarding.mockResolvedValue({
        id: 'onboarding-1',
        communityId: 'community-1',
        isEnabled: true,
      } as any);

      await communityService.updateOnboarding('community-1', 'user-1', {
        defaultChannelIds: ['channel-public', 'channel-members', 'channel-invite'],
        isEnabled: true,
      });

      expect(mockRepo.findChannelsByIds).toHaveBeenCalledWith([
        'channel-public',
        'channel-members',
        'channel-invite',
      ]);
      expect(mockRepo.upsertOnboarding).toHaveBeenCalledWith(
        'community-1',
        expect.objectContaining({
          defaultChannelIds: JSON.stringify([
            'channel-public',
            'channel-members',
            'channel-invite',
          ]),
          isEnabled: true,
        }),
      );
    });

    it('rejects private starter channels', async () => {
      mockRepo.findChannelsByIds.mockResolvedValue([
        {
          id: 'channel-private',
          communityId: 'community-1',
          name: 'leadership',
          accessPolicy: 'private',
        },
      ] as any);

      await expect(
        communityService.updateOnboarding('community-1', 'user-1', {
          defaultChannelIds: ['channel-private'],
        }),
      ).rejects.toThrow(
        'Onboarding channels must belong to this community and stay visible after join',
      );
    });

    it('rejects missing or foreign starter channels', async () => {
      mockRepo.findChannelsByIds.mockResolvedValue([
        {
          id: 'channel-foreign',
          communityId: 'community-2',
          name: 'shared',
          accessPolicy: 'members_only',
        },
      ] as any);

      await expect(
        communityService.updateOnboarding('community-1', 'user-1', {
          defaultChannelIds: ['channel-foreign', 'channel-missing'],
        }),
      ).rejects.toThrow('Onboarding channels must exist in this community');
    });

    it('rejects starter channels from another community even when they exist', async () => {
      mockRepo.findChannelsByIds.mockResolvedValue([
        {
          id: 'channel-foreign',
          communityId: 'community-2',
          name: 'shared',
          accessPolicy: 'members_only',
        },
      ] as any);

      await expect(
        communityService.updateOnboarding('community-1', 'user-1', {
          defaultChannelIds: ['channel-foreign'],
        }),
      ).rejects.toThrow(
        'Onboarding channels must belong to this community and stay visible after join',
      );
    });
  });
});
