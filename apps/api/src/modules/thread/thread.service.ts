import { WebSocketEvent } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import { markdownToPlaintext } from '../../lib/markdown.js';
import { checkPermission } from '../channel/channel.service.js';
import * as repo from './thread.repository.js';
import * as messageRepo from '../message/message.repository.js';
import { realtimeService } from '../realtime/realtime.service.js';

// ---------------------------------------------------------------------------
// Create a thread from an existing chat message
// ---------------------------------------------------------------------------

export async function createThreadFromMessage(userId: string, messageId: string) {
  const message = await repo.findMessageById(messageId);
  if (!message) {
    throw AppError.notFound('Message not found');
  }

  // Verify the message is not already part of a thread
  if (message.threadId) {
    throw AppError.badRequest('Message is already part of a thread');
  }

  const channel = await repo.findChannelById(message.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'create_thread');

  const threadId = uuidv7();
  const thread = await repo.createThread({
    id: threadId,
    channelId: message.channelId,
    rootMessageId: message.id,
    createdByUserId: userId,
  });

  // Auto-follow the creator
  await repo.followThread(threadId, userId);

  realtimeService.broadcastToChannel(channel.id, WebSocketEvent.THREAD_CREATED, {
    thread,
  });

  return thread;
}

// ---------------------------------------------------------------------------
// Create a forum post (thread + root message in one operation)
// ---------------------------------------------------------------------------

export async function createForumPost(
  userId: string,
  channelId: string,
  data: { title: string; bodyMarkdown: string },
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  if (channel.type !== 'forum') {
    throw AppError.badRequest('This channel is not a forum channel');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'create_thread');

  // Create the root message first
  const messageId = uuidv7();
  const threadId = uuidv7();

  const message = await repo.createMessage({
    id: messageId,
    communityId: channel.communityId,
    channelId: channel.id,
    authorUserId: userId,
    bodyMarkdown: data.bodyMarkdown,
    bodyPlaintext: markdownToPlaintext(data.bodyMarkdown),
  });

  const thread = await repo.createThread({
    id: threadId,
    channelId: channel.id,
    rootMessageId: message.id,
    title: data.title,
    createdByUserId: userId,
  });

  // Auto-follow the creator
  await repo.followThread(threadId, userId);

  realtimeService.broadcastToChannel(channel.id, WebSocketEvent.THREAD_CREATED, {
    thread,
  });

  return { thread, rootMessage: message };
}

// ---------------------------------------------------------------------------
// Get threads in a channel (forum view)
// ---------------------------------------------------------------------------

export async function getThreads(
  userId: string,
  channelId: string,
  cursor?: string,
  limit?: number,
  sort?: 'latest' | 'top',
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'view_channel');

  return repo.findThreadsByChannel(channelId, userId, cursor, limit, sort);
}

export async function getThreadSummaries(userId: string, rootMessageIds: string[]) {
  const summaries = await repo.findThreadsByRootMessageIds(rootMessageIds);
  const checkedChannels = new Set<string>();

  for (const summary of summaries) {
    if (checkedChannels.has(summary.thread.channelId)) {
      continue;
    }

    const channel = await repo.findChannelById(summary.thread.channelId);
    if (!channel) {
      throw AppError.notFound('Channel not found');
    }

    await checkPermission(userId, channel.communityId, channel.id, 'view_channel');
    checkedChannels.add(summary.thread.channelId);
  }

  return {
    items: summaries,
  };
}

// ---------------------------------------------------------------------------
// Get messages in a thread
// ---------------------------------------------------------------------------

export async function getThreadMessages(
  userId: string,
  threadId: string,
  cursor?: string,
  limit?: number,
) {
  const result = await repo.findThreadById(threadId);
  if (!result) {
    throw AppError.notFound('Thread not found');
  }

  const channel = await repo.findChannelById(result.thread.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'view_channel');

  return repo.getThreadMessages(threadId, cursor, limit);
}

export async function getThread(userId: string, threadId: string) {
  const result = await repo.findThreadById(threadId);
  if (!result) {
    throw AppError.notFound('Thread not found');
  }

  const channel = await repo.findChannelById(result.thread.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'view_channel');

  const rootMessage = await messageRepo.findMessageById(result.thread.rootMessageId);
  const followState = await repo.getFollowState(threadId, userId);
  const isFollowing = !!followState;

  let canPostReply = false;
  let canModerateThread = false;

  try {
    await checkPermission(userId, channel.communityId, channel.id, 'post_message');
    canPostReply = true;
  } catch {
    canPostReply = false;
  }

  try {
    await checkPermission(userId, channel.communityId, channel.id, 'moderate_members');
    canModerateThread = true;
  } catch {
    canModerateThread = false;
  }

  return {
    thread: result.thread,
    creator: result.creator,
    rootMessage,
    isFollowing,
    lastReadMessageId: followState?.lastReadMessageId ?? null,
    permissions: {
      canPostReply,
      canModerateThread,
    },
  };
}

// ---------------------------------------------------------------------------
// Post a reply to a thread
// ---------------------------------------------------------------------------

export async function postToThread(
  userId: string,
  threadId: string,
  data: { bodyMarkdown: string },
) {
  const result = await repo.findThreadById(threadId);
  if (!result) {
    throw AppError.notFound('Thread not found');
  }

  if (result.thread.isLocked) {
    throw AppError.forbidden('This thread is locked');
  }

  const channel = await repo.findChannelById(result.thread.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'post_message');

  const messageId = uuidv7();
  const message = await repo.createMessage({
    id: messageId,
    communityId: channel.communityId,
    channelId: channel.id,
    threadId,
    authorUserId: userId,
    bodyMarkdown: data.bodyMarkdown,
    bodyPlaintext: markdownToPlaintext(data.bodyMarkdown),
  });

  await repo.incrementReplyCount(threadId);
  await repo.updateThreadActivity(threadId);

  // Auto-follow the poster if not already following
  const following = await repo.isFollowing(threadId, userId);
  if (!following) {
    await repo.followThread(threadId, userId);
  }

  const refreshed = await repo.findThreadById(threadId);
  if (refreshed) {
    realtimeService.broadcastToChannel(channel.id, WebSocketEvent.THREAD_UPDATED, {
      thread: refreshed.thread,
    });
  }

  return (await messageRepo.findMessageById(message.id)) ?? message;
}

// ---------------------------------------------------------------------------
// Follow / unfollow
// ---------------------------------------------------------------------------

export async function followThread(userId: string, threadId: string) {
  const result = await repo.findThreadById(threadId);
  if (!result) {
    throw AppError.notFound('Thread not found');
  }

  await repo.followThread(threadId, userId);
  return { followed: true };
}

export async function unfollowThread(userId: string, threadId: string) {
  const result = await repo.findThreadById(threadId);
  if (!result) {
    throw AppError.notFound('Thread not found');
  }

  await repo.unfollowThread(threadId, userId);
  return { followed: false };
}

export async function markThreadRead(
  userId: string,
  threadId: string,
  messageId: string,
) {
  const result = await repo.findThreadById(threadId);
  if (!result) {
    throw AppError.notFound('Thread not found');
  }

  const channel = await repo.findChannelById(result.thread.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'view_channel');

  const message = await repo.findMessageById(messageId);
  if (!message || message.threadId !== threadId) {
    throw AppError.badRequest('Message does not belong to this thread');
  }

  await repo.followThread(threadId, userId);
  await repo.updateLastReadMessage(threadId, userId, messageId);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Lock thread (moderation)
// ---------------------------------------------------------------------------

export async function lockThread(userId: string, threadId: string) {
  const result = await repo.findThreadById(threadId);
  if (!result) {
    throw AppError.notFound('Thread not found');
  }

  const channel = await repo.findChannelById(result.thread.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'moderate_members');

  const thread = await repo.lockThread(threadId);
  if (thread) {
    realtimeService.broadcastToChannel(channel.id, WebSocketEvent.THREAD_LOCKED, {
      thread,
    });
  }
  return thread;
}
