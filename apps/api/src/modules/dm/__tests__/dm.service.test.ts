import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../realtime/realtime.service.js', () => ({
  realtimeService: {
    sendToUser: vi.fn(),
    getOnlineUsers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../dm.repository.js', () => ({
  findConversationById: vi.fn(),
  createDmMessage: vi.fn(),
  updateConversationTimestamp: vi.fn(),
  findDmMessageById: vi.fn(),
  getParticipantUserIds: vi.fn().mockResolvedValue(['user-1', 'user-2']),
  isParticipant: vi.fn().mockResolvedValue(true),
  updateLastRead: vi.fn(),
}));

vi.mock('../channel/channel.repository.js', () => ({
  findChannelById: vi.fn(),
  findChannelsByCommunity: vi.fn().mockResolvedValue([]),
  createChannel: vi.fn(),
  updateChannel: vi.fn(),
}));

vi.mock('../community/community.service.js', () => ({
  createCommunity: vi.fn(),
}));

vi.mock('../community/community.repository.js', () => ({
  findBySlug: vi.fn(),
  findById: vi.fn(),
  createMembership: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  assignRole: vi.fn(),
}));

vi.mock('../message/message.repository.js', () => ({
  createMessage: vi.fn(),
}));

vi.mock('../unread/unread.repository.js', () => ({
  upsertChannelRead: vi.fn(),
}));

import * as repo from '../dm.repository.js';
import * as service from '../dm.service.js';

const mockedRepo = vi.mocked(repo);

function mockConversation() {
  mockedRepo.findConversationById.mockResolvedValue({
    conversation: {
      id: 'conversation-1',
      type: 'direct',
      name: null,
      createdByUserId: 'user-1',
      promotedCommunityId: null,
      promotedChannelId: null,
      promotedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    participants: [
      {
        id: 'participant-1',
        userId: 'user-1',
        joinedAt: new Date(),
        lastReadMessageId: null,
        user: {
          id: 'user-1',
          displayName: 'User One',
          username: 'userone',
          avatarUrl: null,
        },
      },
      {
        id: 'participant-2',
        userId: 'user-2',
        joinedAt: new Date(),
        lastReadMessageId: null,
        user: {
          id: 'user-2',
          displayName: 'User Two',
          username: 'usertwo',
          avatarUrl: null,
        },
      },
    ],
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConversation();
});

describe('sendMessage', () => {
  it('uses request id idempotency to avoid duplicate DM creation', async () => {
    const createdMessage = {
      message: {
        id: 'dm-message-1',
        conversationId: 'conversation-1',
        authorUserId: 'user-1',
        bodyMarkdown: 'hello',
        bodyPlaintext: 'hello',
        isEncrypted: false,
      },
      author: {
        id: 'user-1',
        displayName: 'User One',
        username: 'userone',
        avatarUrl: null,
      },
    };

    mockedRepo.createDmMessage.mockResolvedValue(createdMessage as any);
    mockedRepo.findDmMessageById.mockResolvedValue(createdMessage as any);

    const first = await service.sendMessage(
      'user-1',
      'conversation-1',
      'hello',
      false,
      undefined,
      'req-1',
    );
    const second = await service.sendMessage(
      'user-1',
      'conversation-1',
      'hello',
      false,
      undefined,
      'req-1',
    );

    expect(mockedRepo.createDmMessage).toHaveBeenCalledTimes(1);
    expect(first).toEqual(createdMessage);
    expect(second).toEqual(createdMessage);
  });
});
