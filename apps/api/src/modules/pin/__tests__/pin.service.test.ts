import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../pin.repository.js', () => ({
  findPinnedMessages: vi.fn(),
  findChannelById: vi.fn(),
  getUserMembership: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  getChannelPermissions: vi.fn(),
  findPin: vi.fn(),
  pinMessage: vi.fn(),
  unpinMessage: vi.fn(),
}));

vi.mock('../../channel/channel-access.service.js', () => ({
  assertCanAccessChannel: vi.fn(),
}));

import * as pinService from '../pin.service.js';
import * as pinRepo from '../pin.repository.js';
import { assertCanAccessChannel } from '../../channel/channel-access.service.js';

const mockPinRepo = vi.mocked(pinRepo);
const mockAssertCanAccessChannel = vi.mocked(assertCanAccessChannel);

describe('pin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPinnedMessages', () => {
    it('uses shared channel access enforcement before loading pins', async () => {
      mockAssertCanAccessChannel.mockResolvedValue({
        id: 'channel-1',
        communityId: 'community-1',
      } as any);
      mockPinRepo.findPinnedMessages.mockResolvedValue([{ pin: { id: 'pin-1' } }] as any);

      const result = await pinService.getPinnedMessages('user-1', 'channel-1');

      expect(result).toEqual([{ pin: { id: 'pin-1' } }]);
      expect(mockAssertCanAccessChannel).toHaveBeenCalledWith('user-1', 'channel-1');
      expect(mockPinRepo.findPinnedMessages).toHaveBeenCalledWith('channel-1');
    });

    it('does not load pins when the channel is not accessible', async () => {
      mockAssertCanAccessChannel.mockRejectedValue(new Error('forbidden'));

      await expect(pinService.getPinnedMessages('user-1', 'channel-secret')).rejects.toThrow('forbidden');
      expect(mockPinRepo.findPinnedMessages).not.toHaveBeenCalled();
    });
  });
});
