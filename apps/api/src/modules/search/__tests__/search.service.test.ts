import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
vi.mock('../search.repository.js', () => ({
  searchMessages: vi.fn(),
}));

// Mock the db module
vi.mock('../../../lib/db/index.js', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('../../../lib/db/schema.js', () => ({
  channels: { communityId: 'community_id', id: 'id', visibility: 'visibility', isArchived: 'is_archived' },
  communityMemberships: {
    id: 'id',
    userId: 'user_id',
    communityId: 'community_id',
    membershipStatus: 'membership_status',
  },
  membershipRoles: { membershipId: 'membership_id', roleId: 'role_id' },
  roles: { id: 'id' },
  channelRolePermissions: {
    channelId: 'channel_id',
    roleId: 'role_id',
    permissionKey: 'permission_key',
    effect: 'effect',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

import * as searchService from '../search.service.js';
import * as searchRepo from '../search.repository.js';
import { db } from '../../../lib/db/index.js';

const mockSearchRepo = vi.mocked(searchRepo);
const mockDb = vi.mocked(db);

// Helper to set up the chain of db.select().from().where().limit()
function mockDbChain(returnValue: unknown) {
  const chain = {
    limit: vi.fn().mockResolvedValue(returnValue),
    where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(returnValue) }),
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(returnValue),
      }),
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(returnValue),
        }),
        where: vi.fn().mockResolvedValue(returnValue),
      }),
    }),
  };
  mockDb.select.mockReturnValue(chain as any);
  return chain;
}

describe('search.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchMessages', () => {
    it('should throw if query is empty', async () => {
      await expect(
        searchService.searchMessages('user-1', '', { communityId: 'community-1' }),
      ).rejects.toThrow('Search query must not be empty');
    });

    it('should throw if query is only whitespace', async () => {
      await expect(
        searchService.searchMessages('user-1', '   ', { communityId: 'community-1' }),
      ).rejects.toThrow('Search query must not be empty');
    });

    it('should return empty results if user has no accessible channels', async () => {
      // Mock: user has no membership
      mockDbChain([]);

      const result = await searchService.searchMessages('user-1', 'hello', {
        communityId: 'community-1',
      });

      expect(result).toEqual({ messages: [], hasMore: false });
    });

    it('should call searchMessages repo with correct params when user has access', async () => {
      // First call: get membership
      const membershipResult = [{ id: 'membership-1' }];
      // Second call: get user roles
      const rolesResult = [{ roleId: 'role-1' }];
      // Third call: get all channels
      const channelsResult = [{ id: 'channel-1', visibility: 'public' }];

      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // membership query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(membershipResult),
              }),
            }),
          } as any;
        }
        if (callCount === 2) {
          // roles query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(rolesResult),
            }),
          } as any;
        }
        if (callCount === 3) {
          // channels query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(channelsResult),
            }),
          } as any;
        }
        return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) } as any;
      });

      mockSearchRepo.searchMessages.mockResolvedValue({
        messages: [],
        hasMore: false,
      });

      const result = await searchService.searchMessages('user-1', 'hello world', {
        communityId: 'community-1',
      });

      expect(result).toEqual({ messages: [], hasMore: false });
      expect(mockSearchRepo.searchMessages).toHaveBeenCalledWith(
        'hello world',
        { communityId: 'community-1' },
        ['channel-1'],
        undefined,
        undefined,
      );
    });
  });
});
