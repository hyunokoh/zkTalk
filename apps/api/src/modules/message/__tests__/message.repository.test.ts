import { describe, expect, it } from 'vitest';
import { computeChannelMessageUnreadCount } from '../message.repository';

describe('computeChannelMessageUnreadCount', () => {
  it('excludes the author from both participant totals and read counts', () => {
    const unreadCount = computeChannelMessageUnreadCount({
      totalMembers: 3,
      messageId: '019d-message',
      authorUserId: 'user-author',
      reads: [
        { userId: 'user-author', lastReadMessageId: '019z-later' },
        { userId: 'user-b', lastReadMessageId: '019z-later' },
        { userId: 'user-c', lastReadMessageId: null },
      ],
    });

    expect(unreadCount).toBe(1);
  });

  it('returns zero when every non-author participant has read the message', () => {
    const unreadCount = computeChannelMessageUnreadCount({
      totalMembers: 4,
      messageId: '019d-message',
      authorUserId: 'user-author',
      reads: [
        { userId: 'user-author', lastReadMessageId: '019z-later' },
        { userId: 'user-b', lastReadMessageId: '019z-later' },
        { userId: 'user-c', lastReadMessageId: '019z-later' },
        { userId: 'user-d', lastReadMessageId: '019z-later' },
      ],
    });

    expect(unreadCount).toBe(0);
  });
});
