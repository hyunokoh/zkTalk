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
  createRole: vi.fn(),
  assignRole: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  createDefaultChannel: vi.fn(),
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
      expect(result).toEqual(mockCommunity);
    });

    it('should throw not found for nonexistent slug', async () => {
      mockRepo.findBySlug.mockResolvedValue(null as any);
      await expect(communityService.getCommunity('nonexistent')).rejects.toThrow(
        'Community not found',
      );
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
});
