import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnreadStore } from '../unread';

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;

    constructor(status: number, message: string, code?: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
    }
  },
  api: vi.fn(),
}));

describe('useUnreadStore', () => {
  beforeEach(() => {
    useUnreadStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    useUnreadStore.getState().reset();
  });

  it('clears cached unread state when fetchUnread hits an auth error', async () => {
    const { ApiError, api } = await import('@/lib/api');
    vi.mocked(api).mockRejectedValueOnce(new ApiError(401, 'Session expired'));

    useUnreadStore.setState({
      unreadMap: { 'channel-1': { unread: 3, mentions: 1 } },
      communityChannelIds: { 'community-1': ['channel-1'] },
    });

    await useUnreadStore.getState().fetchUnread('community-1');

    expect(useUnreadStore.getState().unreadMap).toEqual({});
    expect(useUnreadStore.getState().communityChannelIds).toEqual({});
  });

  it('clears cached unread state when markRead hits an auth error', async () => {
    const { ApiError, api } = await import('@/lib/api');
    vi.mocked(api).mockRejectedValueOnce(new ApiError(403, 'Forbidden'));

    useUnreadStore.setState({
      unreadMap: { 'channel-1': { unread: 2, mentions: 0 } },
      communityChannelIds: { 'community-1': ['channel-1'] },
    });

    await useUnreadStore.getState().markRead('channel-1', 'message-1');

    expect(useUnreadStore.getState().unreadMap).toEqual({});
    expect(useUnreadStore.getState().communityChannelIds).toEqual({});
  });
});
