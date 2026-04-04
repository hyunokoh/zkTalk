import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../../lib/errors.js';

// Mock the repository module
vi.mock('../thread.repository.js', () => ({
  findMessageById: vi.fn(),
  findChannelById: vi.fn(),
  createThread: vi.fn(),
  findThreadById: vi.fn(),
  findThreadsByChannel: vi.fn(),
  getThreadMessages: vi.fn(),
  incrementReplyCount: vi.fn(),
  updateThreadActivity: vi.fn(),
  lockThread: vi.fn(),
  followThread: vi.fn(),
  unfollowThread: vi.fn(),
  isFollowing: vi.fn(),
  getFollowers: vi.fn(),
  updateLastReadMessage: vi.fn(),
  createMessage: vi.fn(),
}));

// Mock channel service checkPermission
vi.mock('../../channel/channel.service.js', () => ({
  checkPermission: vi.fn(),
}));

// Mock markdown utility
vi.mock('../../../lib/markdown.js', () => ({
  markdownToPlaintext: vi.fn((md: string) => md),
}));

import * as repo from '../thread.repository.js';
import * as service from '../thread.service.js';
import { checkPermission } from '../../channel/channel.service.js';

const mockedRepo = vi.mocked(repo);
const mockedCheckPermission = vi.mocked(checkPermission);

const USER_ID = 'user-1';
const CHANNEL_ID = 'channel-1';
const COMMUNITY_ID = 'community-1';
const THREAD_ID = 'thread-1';
const MESSAGE_ID = 'message-1';

function mockChannel(overrides: Record<string, unknown> = {}) {
  return {
    id: CHANNEL_ID,
    communityId: COMMUNITY_ID,
    name: 'general',
    type: 'chat' as const,
    visibility: 'public' as const,
    isArchived: false,
    ...overrides,
  };
}

function mockMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: MESSAGE_ID,
    communityId: COMMUNITY_ID,
    channelId: CHANNEL_ID,
    threadId: null,
    authorUserId: USER_ID,
    bodyMarkdown: 'Hello world',
    bodyPlaintext: 'Hello world',
    messageType: 'user' as const,
    isEdited: false,
    isDeleted: false,
    isSealed: false,
    isEncrypted: false,
    encryptedPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    parentMessageId: null,
    forwardedFromMessageId: null,
    topic: null,
    expiresAt: null,
    ...overrides,
  };
}

function mockThreadResult(overrides: Record<string, unknown> = {}) {
  return {
    thread: {
      id: THREAD_ID,
      channelId: CHANNEL_ID,
      rootMessageId: MESSAGE_ID,
      title: null,
      createdByUserId: USER_ID,
      isLocked: false,
      isPinned: false,
      replyCount: 0,
      lastActivityAt: new Date(),
      ...overrides,
    },
    creator: {
      id: USER_ID,
      displayName: 'Test User',
      username: 'testuser',
      avatarUrl: null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedCheckPermission.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createThreadFromMessage
// ---------------------------------------------------------------------------

describe('createThreadFromMessage', () => {
  it('creates a thread from an existing message', async () => {
    mockedRepo.findMessageById.mockResolvedValue(mockMessage());
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);
    mockedRepo.createThread.mockResolvedValue(mockThreadResult().thread as any);
    mockedRepo.followThread.mockResolvedValue(undefined);

    const result = await service.createThreadFromMessage(USER_ID, MESSAGE_ID);

    expect(result).toBeDefined();
    expect(mockedRepo.createThread).toHaveBeenCalledTimes(1);
    expect(mockedRepo.followThread).toHaveBeenCalledWith(
      expect.any(String),
      USER_ID,
    );
    expect(mockedCheckPermission).toHaveBeenCalledWith(
      USER_ID,
      COMMUNITY_ID,
      CHANNEL_ID,
      'create_thread',
    );
  });

  it('throws when message not found', async () => {
    mockedRepo.findMessageById.mockResolvedValue(null as any);

    await expect(
      service.createThreadFromMessage(USER_ID, 'nonexistent'),
    ).rejects.toThrow('Message not found');
  });

  it('throws when message is already in a thread', async () => {
    mockedRepo.findMessageById.mockResolvedValue(
      mockMessage({ threadId: 'existing-thread' }),
    );

    await expect(
      service.createThreadFromMessage(USER_ID, MESSAGE_ID),
    ).rejects.toThrow('Message is already part of a thread');
  });
});

// ---------------------------------------------------------------------------
// createForumPost
// ---------------------------------------------------------------------------

describe('createForumPost', () => {
  it('creates a forum post with thread and root message', async () => {
    mockedRepo.findChannelById.mockResolvedValue(
      mockChannel({ type: 'forum' }) as any,
    );
    mockedRepo.createMessage.mockResolvedValue(mockMessage() as any);
    mockedRepo.createThread.mockResolvedValue(mockThreadResult().thread as any);
    mockedRepo.followThread.mockResolvedValue(undefined);

    const result = await service.createForumPost(USER_ID, CHANNEL_ID, {
      title: 'My Post',
      bodyMarkdown: 'Post body content',
    });

    expect(result.thread).toBeDefined();
    expect(result.rootMessage).toBeDefined();
    expect(mockedRepo.createMessage).toHaveBeenCalledTimes(1);
    expect(mockedRepo.createThread).toHaveBeenCalledTimes(1);
    expect(mockedRepo.followThread).toHaveBeenCalled();
  });

  it('throws when channel is not a forum', async () => {
    mockedRepo.findChannelById.mockResolvedValue(
      mockChannel({ type: 'chat' }) as any,
    );

    await expect(
      service.createForumPost(USER_ID, CHANNEL_ID, {
        title: 'My Post',
        bodyMarkdown: 'Content',
      }),
    ).rejects.toThrow('This channel is not a forum channel');
  });

  it('throws when channel not found', async () => {
    mockedRepo.findChannelById.mockResolvedValue(null as any);

    await expect(
      service.createForumPost(USER_ID, 'nonexistent', {
        title: 'My Post',
        bodyMarkdown: 'Content',
      }),
    ).rejects.toThrow('Channel not found');
  });
});

// ---------------------------------------------------------------------------
// postToThread
// ---------------------------------------------------------------------------

describe('postToThread', () => {
  it('posts a reply to an unlocked thread', async () => {
    mockedRepo.findThreadById.mockResolvedValue(mockThreadResult() as any);
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);
    mockedRepo.createMessage.mockResolvedValue(mockMessage() as any);
    mockedRepo.incrementReplyCount.mockResolvedValue(undefined);
    mockedRepo.updateThreadActivity.mockResolvedValue(undefined);
    mockedRepo.isFollowing.mockResolvedValue(false);
    mockedRepo.followThread.mockResolvedValue(undefined);

    const result = await service.postToThread(USER_ID, THREAD_ID, {
      bodyMarkdown: 'My reply',
    });

    expect(result).toBeDefined();
    expect(mockedRepo.createMessage).toHaveBeenCalledTimes(1);
    expect(mockedRepo.incrementReplyCount).toHaveBeenCalledWith(THREAD_ID);
    expect(mockedRepo.updateThreadActivity).toHaveBeenCalledWith(THREAD_ID);
    expect(mockedRepo.followThread).toHaveBeenCalledWith(THREAD_ID, USER_ID);
  });

  it('does not re-follow if already following', async () => {
    mockedRepo.findThreadById.mockResolvedValue(mockThreadResult() as any);
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);
    mockedRepo.createMessage.mockResolvedValue(mockMessage() as any);
    mockedRepo.incrementReplyCount.mockResolvedValue(undefined);
    mockedRepo.updateThreadActivity.mockResolvedValue(undefined);
    mockedRepo.isFollowing.mockResolvedValue(true);

    await service.postToThread(USER_ID, THREAD_ID, {
      bodyMarkdown: 'Another reply',
    });

    expect(mockedRepo.followThread).not.toHaveBeenCalled();
  });

  it('throws when thread is locked', async () => {
    mockedRepo.findThreadById.mockResolvedValue(
      mockThreadResult({ isLocked: true }) as any,
    );

    await expect(
      service.postToThread(USER_ID, THREAD_ID, { bodyMarkdown: 'Reply' }),
    ).rejects.toThrow('This thread is locked');
  });

  it('throws when thread not found', async () => {
    mockedRepo.findThreadById.mockResolvedValue(null as any);

    await expect(
      service.postToThread(USER_ID, 'nonexistent', { bodyMarkdown: 'Reply' }),
    ).rejects.toThrow('Thread not found');
  });
});

// ---------------------------------------------------------------------------
// lockThread
// ---------------------------------------------------------------------------

describe('lockThread', () => {
  it('locks a thread when user has moderate_members permission', async () => {
    mockedRepo.findThreadById.mockResolvedValue(mockThreadResult() as any);
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);
    mockedRepo.lockThread.mockResolvedValue({
      ...mockThreadResult().thread,
      isLocked: true,
    } as any);

    const result = await service.lockThread(USER_ID, THREAD_ID);

    expect(result.isLocked).toBe(true);
    expect(mockedCheckPermission).toHaveBeenCalledWith(
      USER_ID,
      COMMUNITY_ID,
      CHANNEL_ID,
      'moderate_members',
    );
  });

  it('throws when user lacks moderate_members permission', async () => {
    mockedRepo.findThreadById.mockResolvedValue(mockThreadResult() as any);
    mockedRepo.findChannelById.mockResolvedValue(mockChannel() as any);
    mockedCheckPermission.mockRejectedValue(
      AppError.forbidden('Missing permission: moderate_members'),
    );

    await expect(
      service.lockThread(USER_ID, THREAD_ID),
    ).rejects.toThrow('Missing permission: moderate_members');
  });

  it('throws when thread not found', async () => {
    mockedRepo.findThreadById.mockResolvedValue(null as any);

    await expect(
      service.lockThread(USER_ID, 'nonexistent'),
    ).rejects.toThrow('Thread not found');
  });
});

// ---------------------------------------------------------------------------
// followThread / unfollowThread
// ---------------------------------------------------------------------------

describe('followThread', () => {
  it('follows a thread', async () => {
    mockedRepo.findThreadById.mockResolvedValue(mockThreadResult() as any);
    mockedRepo.followThread.mockResolvedValue(undefined);

    const result = await service.followThread(USER_ID, THREAD_ID);
    expect(result.followed).toBe(true);
  });

  it('throws when thread not found', async () => {
    mockedRepo.findThreadById.mockResolvedValue(null as any);

    await expect(
      service.followThread(USER_ID, 'nonexistent'),
    ).rejects.toThrow('Thread not found');
  });
});

describe('unfollowThread', () => {
  it('unfollows a thread', async () => {
    mockedRepo.findThreadById.mockResolvedValue(mockThreadResult() as any);
    mockedRepo.unfollowThread.mockResolvedValue(undefined);

    const result = await service.unfollowThread(USER_ID, THREAD_ID);
    expect(result.followed).toBe(false);
  });
});
