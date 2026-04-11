import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../search.repository.js', () => ({
  searchMessages: vi.fn(),
}));

vi.mock('../../channel/channel-access.service.js', () => ({
  getAccessibleChannelIdsForCommunity: vi.fn(),
}));

import * as searchService from '../search.service.js';
import * as searchRepo from '../search.repository.js';
import { getAccessibleChannelIdsForCommunity } from '../../channel/channel-access.service.js';

const mockSearchRepo = vi.mocked(searchRepo);
const mockGetAccessibleChannelIdsForCommunity = vi.mocked(getAccessibleChannelIdsForCommunity);

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

    it('should return empty results if user has no accessible channels', async () => {
      mockGetAccessibleChannelIdsForCommunity.mockResolvedValue([]);

      const result = await searchService.searchMessages('user-1', 'hello', {
        communityId: 'community-1',
      });

      expect(result).toEqual({ messages: [], hasMore: false });
      expect(mockGetAccessibleChannelIdsForCommunity).toHaveBeenCalledWith('user-1', 'community-1');
    });

    it('should throw when filtering to an inaccessible channel', async () => {
      mockGetAccessibleChannelIdsForCommunity.mockResolvedValue(['channel-1']);

      await expect(
        searchService.searchMessages('user-1', 'hello', {
          communityId: 'community-1',
          channelId: 'channel-2',
        }),
      ).rejects.toThrow('You do not have access to this channel');
    });

    it('should call searchMessages repo with accessible channel ids', async () => {
      mockGetAccessibleChannelIdsForCommunity.mockResolvedValue(['channel-1']);
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
