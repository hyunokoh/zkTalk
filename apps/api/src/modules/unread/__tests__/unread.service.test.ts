import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../unread.repository.js', () => ({
  findLatestMessageId: vi.fn(),
  upsertChannelRead: vi.fn(),
  getUnreadSummary: vi.fn(),
}));

vi.mock('../../realtime/realtime.service.js', () => ({
  realtimeService: {
    broadcastToChannel: vi.fn(),
  },
}));

vi.mock('../../channel/channel-access.service.js', () => ({
  assertCanAccessChannel: vi.fn(),
  getAccessibleChannelIdsForCommunity: vi.fn(),
}));

import * as unreadService from '../unread.service.js';
import * as unreadRepo from '../unread.repository.js';
import { assertCanAccessChannel, getAccessibleChannelIdsForCommunity } from '../../channel/channel-access.service.js';

const mockUnreadRepo = vi.mocked(unreadRepo);
const mockAssertCanAccessChannel = vi.mocked(assertCanAccessChannel);
const mockGetAccessibleChannelIdsForCommunity = vi.mocked(getAccessibleChannelIdsForCommunity);

describe('unread.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters unread summary to accessible channels', async () => {
    mockGetAccessibleChannelIdsForCommunity.mockResolvedValue(['channel-1']);
    mockUnreadRepo.getUnreadSummary.mockResolvedValue([
      { channelId: 'channel-1', unreadCount: 2, mentionCount: 0 },
    ] as any);

    const result = await unreadService.getUnreadSummary('user-1', 'community-1');

    expect(result).toEqual([{ channelId: 'channel-1', unreadCount: 2, mentionCount: 0 }]);
    expect(mockUnreadRepo.getUnreadSummary).toHaveBeenCalledWith(
      'community-1',
      'user-1',
      ['channel-1'],
    );
  });

  it('checks channel access before marking read', async () => {
    mockAssertCanAccessChannel.mockResolvedValue({
      id: 'channel-1',
      communityId: 'community-1',
    } as any);
    mockUnreadRepo.findLatestMessageId.mockResolvedValue('message-9');
    mockUnreadRepo.upsertChannelRead.mockResolvedValue({ channelId: 'channel-1' } as any);

    await unreadService.markChannelRead('user-1', 'channel-1');

    expect(mockAssertCanAccessChannel).toHaveBeenCalledWith('user-1', 'channel-1');
    expect(mockUnreadRepo.upsertChannelRead).toHaveBeenCalledWith(
      'channel-1',
      'user-1',
      'message-9',
    );
  });
});
