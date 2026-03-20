import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../lib/errors.js';

// ---------------------------------------------------------------------------
// Mock the repository module
// ---------------------------------------------------------------------------
vi.mock('../message.repository.js', () => ({
  createMessage: vi.fn(),
  findMessageById: vi.fn(),
  findMessagesByChannel: vi.fn(),
  updateMessage: vi.fn(),
  softDeleteMessage: vi.fn(),
  countMessagesAfter: vi.fn(),
  findLastMessageByUser: vi.fn(),
  findChannelById: vi.fn(),
  getUserMembership: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  getChannelPermissions: vi.fn(),
}));

import * as repo from '../message.repository.js';
import * as service from '../message.service.js';

const mockedRepo = vi.mocked(repo);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COMMUNITY_ID = 'community-1';
const CHANNEL_ID = 'channel-1';
const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const MESSAGE_ID = 'msg-1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockChannel(overrides: Record<string, unknown> = {}) {
  mockedRepo.findChannelById.mockResolvedValue({
    id: CHANNEL_ID,
    communityId: COMMUNITY_ID,
    categoryId: null,
    name: 'general',
    description: null,
    type: 'chat',
    visibility: 'public',
    slowModeSeconds: 0,
    position: 0,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any);
}

function mockActiveMember() {
  mockedRepo.getUserMembership.mockResolvedValue({
    id: 'membership-1',
    communityId: COMMUNITY_ID,
    userId: USER_ID,
    joinedAt: new Date(),
    membershipStatus: 'active',
    lastReadInboxAt: null,
  } as any);
}

function mockMemberRole() {
  mockedRepo.getUserRolesInCommunity.mockResolvedValue([
    { roleId: 'role-member', roleName: 'member', priority: 10 },
  ]);
}

function mockModeratorRole() {
  mockedRepo.getUserRolesInCommunity.mockResolvedValue([
    { roleId: 'role-mod', roleName: 'moderator', priority: 50 },
  ]);
}

function mockNoChannelOverrides() {
  mockedRepo.getChannelPermissions.mockResolvedValue([]);
}

function mockExistingMessage(overrides: Record<string, unknown> = {}) {
  const msg = {
    message: {
      id: MESSAGE_ID,
      communityId: COMMUNITY_ID,
      channelId: CHANNEL_ID,
      threadId: null,
      parentMessageId: null,
      authorUserId: USER_ID,
      bodyMarkdown: '**Hello** world',
      bodyPlaintext: 'Hello world',
      messageType: 'user',
      isEdited: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
    author: {
      id: USER_ID,
      displayName: 'Test User',
      username: 'testuser',
      avatarUrl: null,
    },
  };
  mockedRepo.findMessageById.mockResolvedValue(msg as any);
  return msg;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockNoChannelOverrides();
});

// ---------------------------------------------------------------------------
// createMessage
// ---------------------------------------------------------------------------

describe('createMessage', () => {
  it('creates a message and extracts plaintext from markdown', async () => {
    mockChannel();
    mockActiveMember();
    mockMemberRole();
    mockedRepo.findLastMessageByUser.mockResolvedValue(null as any);

    const rawMessage = {
      id: MESSAGE_ID,
      communityId: COMMUNITY_ID,
      channelId: CHANNEL_ID,
      threadId: null,
      parentMessageId: null,
      authorUserId: USER_ID,
      bodyMarkdown: '**Hello** world',
      bodyPlaintext: 'Hello world',
      messageType: 'user',
      isEdited: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockedRepo.createMessage.mockResolvedValue(rawMessage as any);

    const messageWithAuthor = {
      message: rawMessage,
      author: {
        id: USER_ID,
        displayName: 'Test User',
        username: 'testuser',
        avatarUrl: null,
      },
    };
    mockedRepo.findMessageById.mockResolvedValue(messageWithAuthor as any);

    const result = await service.createMessage(USER_ID, CHANNEL_ID, {
      bodyMarkdown: '**Hello** world',
    });

    expect(mockedRepo.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: CHANNEL_ID,
        communityId: COMMUNITY_ID,
        authorUserId: USER_ID,
        bodyMarkdown: '**Hello** world',
        bodyPlaintext: 'Hello world',
      }),
    );
    expect(result).toEqual(messageWithAuthor);
  });

  it('throws not found when channel does not exist', async () => {
    mockedRepo.findChannelById.mockResolvedValue(null as any);

    await expect(
      service.createMessage(USER_ID, 'nonexistent', { bodyMarkdown: 'test' }),
    ).rejects.toThrow('Channel not found');
  });

  it('throws bad request when channel is archived', async () => {
    mockChannel({ isArchived: true });

    await expect(
      service.createMessage(USER_ID, CHANNEL_ID, { bodyMarkdown: 'test' }),
    ).rejects.toThrow('Cannot post in an archived channel');
  });

  it('throws forbidden when user lacks post_message permission', async () => {
    mockChannel();
    mockedRepo.getUserMembership.mockResolvedValue({
      id: 'membership-1',
      communityId: COMMUNITY_ID,
      userId: USER_ID,
      joinedAt: new Date(),
      membershipStatus: 'active',
      lastReadInboxAt: null,
    } as any);
    mockedRepo.getUserRolesInCommunity.mockResolvedValue([
      { roleId: 'role-guest', roleName: 'guest', priority: 0 },
    ]);

    await expect(
      service.createMessage(USER_ID, CHANNEL_ID, { bodyMarkdown: 'test' }),
    ).rejects.toThrow('Missing permission: post_message');
  });

  it('enforces slow mode', async () => {
    mockChannel({ slowModeSeconds: 30 });
    mockActiveMember();
    mockMemberRole();

    // Last message was 5 seconds ago
    mockedRepo.findLastMessageByUser.mockResolvedValue({
      id: 'msg-prev',
      createdAt: new Date(Date.now() - 5000),
    } as any);

    await expect(
      service.createMessage(USER_ID, CHANNEL_ID, { bodyMarkdown: 'test' }),
    ).rejects.toThrow(/Slow mode active/);
  });

  it('allows message when slow mode has elapsed', async () => {
    mockChannel({ slowModeSeconds: 10 });
    mockActiveMember();
    mockMemberRole();

    // Last message was 15 seconds ago
    mockedRepo.findLastMessageByUser.mockResolvedValue({
      id: 'msg-prev',
      createdAt: new Date(Date.now() - 15_000),
    } as any);

    const rawMessage = {
      id: MESSAGE_ID,
      communityId: COMMUNITY_ID,
      channelId: CHANNEL_ID,
      authorUserId: USER_ID,
      bodyMarkdown: 'test',
      bodyPlaintext: 'test',
    };
    mockedRepo.createMessage.mockResolvedValue(rawMessage as any);
    mockedRepo.findMessageById.mockResolvedValue({
      message: rawMessage,
      author: { id: USER_ID, displayName: 'Test', username: 'test', avatarUrl: null },
    } as any);

    await expect(
      service.createMessage(USER_ID, CHANNEL_ID, { bodyMarkdown: 'test' }),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// editMessage
// ---------------------------------------------------------------------------

describe('editMessage', () => {
  it('allows the author to edit their own message', async () => {
    mockExistingMessage();

    const updatedRaw = {
      id: MESSAGE_ID,
      bodyMarkdown: '**Updated**',
      bodyPlaintext: 'Updated',
      isEdited: true,
    };
    mockedRepo.updateMessage.mockResolvedValue(updatedRaw as any);

    // After update, findMessageById is called again for the return value
    const updatedWithAuthor = {
      message: { ...updatedRaw, authorUserId: USER_ID },
      author: { id: USER_ID, displayName: 'Test', username: 'test', avatarUrl: null },
    };
    // First call returns existing, second call returns updated
    mockedRepo.findMessageById
      .mockResolvedValueOnce({
        message: {
          id: MESSAGE_ID,
          authorUserId: USER_ID,
          isDeleted: false,
        },
        author: { id: USER_ID },
      } as any)
      .mockResolvedValueOnce(updatedWithAuthor as any);

    const result = await service.editMessage(USER_ID, MESSAGE_ID, {
      bodyMarkdown: '**Updated**',
    });

    expect(mockedRepo.updateMessage).toHaveBeenCalledWith(MESSAGE_ID, {
      bodyMarkdown: '**Updated**',
      bodyPlaintext: 'Updated',
      isEdited: true,
    });
    expect(result).toEqual(updatedWithAuthor);
  });

  it('throws forbidden when non-author tries to edit', async () => {
    mockedRepo.findMessageById.mockResolvedValue({
      message: {
        id: MESSAGE_ID,
        authorUserId: USER_ID,
        isDeleted: false,
      },
      author: { id: USER_ID },
    } as any);

    await expect(
      service.editMessage(OTHER_USER_ID, MESSAGE_ID, { bodyMarkdown: 'hack' }),
    ).rejects.toThrow('You can only edit your own messages');
  });

  it('throws not found when message does not exist', async () => {
    mockedRepo.findMessageById.mockResolvedValue(null as any);

    await expect(
      service.editMessage(USER_ID, 'nonexistent', { bodyMarkdown: 'test' }),
    ).rejects.toThrow('Message not found');
  });

  it('throws not found when message is soft-deleted', async () => {
    mockedRepo.findMessageById.mockResolvedValue({
      message: {
        id: MESSAGE_ID,
        authorUserId: USER_ID,
        isDeleted: true,
      },
      author: { id: USER_ID },
    } as any);

    await expect(
      service.editMessage(USER_ID, MESSAGE_ID, { bodyMarkdown: 'test' }),
    ).rejects.toThrow('Message not found');
  });
});

// ---------------------------------------------------------------------------
// deleteMessage
// ---------------------------------------------------------------------------

describe('deleteMessage', () => {
  it('allows the author to delete their own message', async () => {
    mockedRepo.findMessageById.mockResolvedValue({
      message: {
        id: MESSAGE_ID,
        communityId: COMMUNITY_ID,
        channelId: CHANNEL_ID,
        authorUserId: USER_ID,
        isDeleted: false,
      },
      author: { id: USER_ID },
    } as any);
    mockedRepo.softDeleteMessage.mockResolvedValue({} as any);

    await expect(service.deleteMessage(USER_ID, MESSAGE_ID)).resolves.toBeUndefined();
    expect(mockedRepo.softDeleteMessage).toHaveBeenCalledWith(MESSAGE_ID);
  });

  it('allows a moderator to delete another user message', async () => {
    mockedRepo.findMessageById.mockResolvedValue({
      message: {
        id: MESSAGE_ID,
        communityId: COMMUNITY_ID,
        channelId: CHANNEL_ID,
        authorUserId: OTHER_USER_ID,
        isDeleted: false,
      },
      author: { id: OTHER_USER_ID },
    } as any);

    // Mock moderator permission check
    mockActiveMember();
    mockModeratorRole();
    mockedRepo.softDeleteMessage.mockResolvedValue({} as any);

    await expect(service.deleteMessage(USER_ID, MESSAGE_ID)).resolves.toBeUndefined();
    expect(mockedRepo.softDeleteMessage).toHaveBeenCalledWith(MESSAGE_ID);
  });

  it('throws forbidden when non-author member tries to delete', async () => {
    mockedRepo.findMessageById.mockResolvedValue({
      message: {
        id: MESSAGE_ID,
        communityId: COMMUNITY_ID,
        channelId: CHANNEL_ID,
        authorUserId: OTHER_USER_ID,
        isDeleted: false,
      },
      author: { id: OTHER_USER_ID },
    } as any);

    // Regular member without manage_messages
    mockActiveMember();
    mockMemberRole();

    await expect(service.deleteMessage(USER_ID, MESSAGE_ID)).rejects.toThrow(
      'Missing permission: manage_messages',
    );
  });

  it('throws not found for already-deleted message', async () => {
    mockedRepo.findMessageById.mockResolvedValue({
      message: {
        id: MESSAGE_ID,
        authorUserId: USER_ID,
        isDeleted: true,
      },
      author: { id: USER_ID },
    } as any);

    await expect(service.deleteMessage(USER_ID, MESSAGE_ID)).rejects.toThrow(
      'Message not found',
    );
  });
});

// ---------------------------------------------------------------------------
// getMessages (cursor pagination)
// ---------------------------------------------------------------------------

describe('getMessages', () => {
  it('returns messages with hasMore when there are more results', async () => {
    mockChannel();
    mockActiveMember();
    mockMemberRole();

    const fakeMessages = Array.from({ length: 3 }, (_, i) => ({
      message: { id: `msg-${i}` },
      author: { id: USER_ID },
    }));

    mockedRepo.findMessagesByChannel.mockResolvedValue({
      messages: fakeMessages,
      hasMore: true,
    } as any);

    const result = await service.getMessages(USER_ID, CHANNEL_ID, undefined, 3);

    expect(result.hasMore).toBe(true);
    expect(result.messages).toHaveLength(3);
    expect(mockedRepo.findMessagesByChannel).toHaveBeenCalledWith(CHANNEL_ID, undefined, 3);
  });

  it('returns messages with hasMore false at the end', async () => {
    mockChannel();
    mockActiveMember();
    mockMemberRole();

    mockedRepo.findMessagesByChannel.mockResolvedValue({
      messages: [{ message: { id: 'msg-0' }, author: { id: USER_ID } }],
      hasMore: false,
    } as any);

    const result = await service.getMessages(USER_ID, CHANNEL_ID);
    expect(result.hasMore).toBe(false);
  });

  it('passes cursor to repository', async () => {
    mockChannel();
    mockActiveMember();
    mockMemberRole();

    mockedRepo.findMessagesByChannel.mockResolvedValue({
      messages: [],
      hasMore: false,
    } as any);

    await service.getMessages(USER_ID, CHANNEL_ID, 'cursor-abc', 25);
    expect(mockedRepo.findMessagesByChannel).toHaveBeenCalledWith(CHANNEL_ID, 'cursor-abc', 25);
  });

  it('throws not found for nonexistent channel', async () => {
    mockedRepo.findChannelById.mockResolvedValue(null as any);

    await expect(
      service.getMessages(USER_ID, 'nonexistent'),
    ).rejects.toThrow('Channel not found');
  });

  it('throws forbidden when user lacks view_channel permission', async () => {
    mockChannel();
    mockedRepo.getUserMembership.mockResolvedValue({
      id: 'membership-1',
      communityId: COMMUNITY_ID,
      userId: USER_ID,
      joinedAt: new Date(),
      membershipStatus: 'active',
      lastReadInboxAt: null,
    } as any);
    mockedRepo.getUserRolesInCommunity.mockResolvedValue([]);

    await expect(
      service.getMessages(USER_ID, CHANNEL_ID),
    ).rejects.toThrow('You have no roles in this community');
  });
});
