import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../lib/errors.js';

// Mock the repository module
vi.mock('../reaction.repository.js', () => ({
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  getReactionsForMessage: vi.fn(),
  getReactionsForMessages: vi.fn(),
  findMessageById: vi.fn(),
  findChannelById: vi.fn(),
}));

// Mock channel service checkPermission
vi.mock('../../channel/channel.service.js', () => ({
  checkPermission: vi.fn(),
}));

import * as repo from '../reaction.repository.js';
import * as service from '../reaction.service.js';
import { checkPermission } from '../../channel/channel.service.js';

const mockedRepo = vi.mocked(repo);
const mockedCheckPermission = vi.mocked(checkPermission);

const USER_ID = 'user-1';
const MESSAGE_ID = 'message-1';
const CHANNEL_ID = 'channel-1';
const COMMUNITY_ID = 'community-1';

function mockMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: MESSAGE_ID,
    communityId: COMMUNITY_ID,
    channelId: CHANNEL_ID,
    threadId: null,
    authorUserId: 'author-1',
    bodyMarkdown: 'Hello',
    bodyPlaintext: 'Hello',
    messageType: 'user' as const,
    isEdited: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    parentMessageId: null,
    ...overrides,
  };
}

function mockChannel() {
  return {
    id: CHANNEL_ID,
    communityId: COMMUNITY_ID,
    name: 'general',
    type: 'chat' as const,
    visibility: 'public' as const,
    isArchived: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedCheckPermission.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// addReaction
// ---------------------------------------------------------------------------

describe('addReaction', () => {
  it('adds a reaction to a message', async () => {
    mockedRepo.findMessageById.mockResolvedValue(mockMessage() as any);
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);

    const mockReaction = {
      id: 'reaction-1',
      messageId: MESSAGE_ID,
      userId: USER_ID,
      emoji: '👍',
      createdAt: new Date(),
    };
    mockedRepo.addReaction.mockResolvedValue(mockReaction as any);

    const result = await service.addReaction(USER_ID, MESSAGE_ID, '👍');

    expect(result).toEqual(mockReaction);
    expect(mockedCheckPermission).toHaveBeenCalledWith(
      USER_ID,
      COMMUNITY_ID,
      CHANNEL_ID,
      'react',
    );
    expect(mockedRepo.addReaction).toHaveBeenCalledWith({
      id: expect.any(String),
      messageId: MESSAGE_ID,
      userId: USER_ID,
      emoji: '👍',
    });
  });

  it('throws when message not found', async () => {
    mockedRepo.findMessageById.mockResolvedValue(null as any);

    await expect(
      service.addReaction(USER_ID, 'nonexistent', '👍'),
    ).rejects.toThrow('Message not found');
  });

  it('throws when message is deleted', async () => {
    mockedRepo.findMessageById.mockResolvedValue(
      mockMessage({ isDeleted: true }) as any,
    );

    await expect(
      service.addReaction(USER_ID, MESSAGE_ID, '👍'),
    ).rejects.toThrow('Cannot react to a deleted message');
  });

  it('throws conflict when duplicate reaction', async () => {
    mockedRepo.findMessageById.mockResolvedValue(mockMessage() as any);
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);
    mockedRepo.addReaction.mockResolvedValue(null as any);

    await expect(
      service.addReaction(USER_ID, MESSAGE_ID, '👍'),
    ).rejects.toThrow('You have already reacted with this emoji');
  });

  it('throws when user lacks react permission', async () => {
    mockedRepo.findMessageById.mockResolvedValue(mockMessage() as any);
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);
    mockedCheckPermission.mockRejectedValue(
      AppError.forbidden('Missing permission: react'),
    );

    await expect(
      service.addReaction(USER_ID, MESSAGE_ID, '👍'),
    ).rejects.toThrow('Missing permission: react');
  });
});

// ---------------------------------------------------------------------------
// removeReaction
// ---------------------------------------------------------------------------

describe('removeReaction', () => {
  it('removes own reaction', async () => {
    mockedRepo.findMessageById.mockResolvedValue(mockMessage() as any);
    mockedRepo.removeReaction.mockResolvedValue({
      id: 'reaction-1',
      messageId: MESSAGE_ID,
      userId: USER_ID,
      emoji: '👍',
      createdAt: new Date(),
    } as any);

    const result = await service.removeReaction(USER_ID, MESSAGE_ID, '👍');

    expect(result.removed).toBe(true);
    expect(mockedRepo.removeReaction).toHaveBeenCalledWith(
      MESSAGE_ID,
      USER_ID,
      '👍',
    );
  });

  it('throws when message not found', async () => {
    mockedRepo.findMessageById.mockResolvedValue(null as any);

    await expect(
      service.removeReaction(USER_ID, 'nonexistent', '👍'),
    ).rejects.toThrow('Message not found');
  });

  it('throws when reaction not found', async () => {
    mockedRepo.findMessageById.mockResolvedValue(mockMessage() as any);
    mockedRepo.removeReaction.mockResolvedValue(null as any);

    await expect(
      service.removeReaction(USER_ID, MESSAGE_ID, '🎉'),
    ).rejects.toThrow('Reaction not found');
  });
});

// ---------------------------------------------------------------------------
// getReactions
// ---------------------------------------------------------------------------

describe('getReactions', () => {
  it('returns grouped reactions for a message', async () => {
    const mockReactions = [
      {
        emoji: '👍',
        count: 2,
        users: [
          { id: 'user-1', username: 'alice', displayName: 'Alice' },
          { id: 'user-2', username: 'bob', displayName: 'Bob' },
        ],
      },
      {
        emoji: '❤️',
        count: 1,
        users: [
          { id: 'user-1', username: 'alice', displayName: 'Alice' },
        ],
      },
    ];
    mockedRepo.getReactionsForMessage.mockResolvedValue(mockReactions);

    const result = await service.getReactions(MESSAGE_ID);

    expect(result).toHaveLength(2);
    expect(result[0].emoji).toBe('👍');
    expect(result[0].count).toBe(2);
    expect(result[1].emoji).toBe('❤️');
    expect(result[1].count).toBe(1);
  });
});
