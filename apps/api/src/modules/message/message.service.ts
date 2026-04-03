import { hasPermission, DEFAULT_ROLE_PERMISSIONS, WebSocketEvent } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import { markdownToPlaintext } from '../../lib/markdown.js';
import * as repo from './message.repository.js';
import * as automod from '../automod/automod.service.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { incrementMentionCount } from '../unread/unread.repository.js';
import { sendPushToUsers } from '../push-token/push-token.service.js';

// ---------------------------------------------------------------------------
// Permission helper (delegates to the channel repo helpers already in this
// module's repository so we don't add a cross-module dependency)
// ---------------------------------------------------------------------------

async function checkPermission(
  userId: string,
  communityId: string,
  channelId: string | null,
  requiredPermission: string,
): Promise<void> {
  const membership = await repo.getUserMembership(userId, communityId);
  if (!membership || membership.membershipStatus !== 'active') {
    throw AppError.forbidden('You are not an active member of this community');
  }

  const userRoles = await repo.getUserRolesInCommunity(userId, communityId);
  if (userRoles.length === 0) {
    throw AppError.forbidden('You have no roles in this community');
  }

  let channelPermissions: { roleId: string; permissionKey: string; effect: 'allow' | 'deny' }[] = [];
  if (channelId) {
    channelPermissions = await repo.getChannelPermissions(channelId);
  }

  const allowed = hasPermission(
    userRoles,
    channelPermissions,
    requiredPermission,
    DEFAULT_ROLE_PERMISSIONS,
  );

  if (!allowed) {
    throw AppError.forbidden(`Missing permission: ${requiredPermission}`);
  }
}

// ---------------------------------------------------------------------------
// Simple in-memory idempotency cache (requestId -> messageId, TTL 5 min)
// ---------------------------------------------------------------------------

const idempotencyCache = new Map<string, { messageId: string; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

function pruneIdempotencyCache() {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt < now) {
      idempotencyCache.delete(key);
    }
  }
}

// Prune every minute
setInterval(pruneIdempotencyCache, 60_000).unref();

// ---------------------------------------------------------------------------
// @mention parsing
// ---------------------------------------------------------------------------

const MENTION_REGEX = /@(everyone|here|\w+)/g;

async function processMentions(
  bodyMarkdown: string,
  channelId: string,
  communityId: string,
  authorUserId: string,
): Promise<void> {
  const mentions = [...bodyMarkdown.matchAll(MENTION_REGEX)].map((m) => m[1]);
  if (mentions.length === 0) return;

  const uniqueMentions = [...new Set(mentions)];

  for (const mention of uniqueMentions) {
    try {
      if (mention === 'everyone') {
        // Increment mention count for ALL active members in the community (except author)
        const memberIds = await repo.getCommunityMemberUserIds(communityId);
        await Promise.all(
          memberIds
            .filter((uid) => uid !== authorUserId)
            .map((uid) => incrementMentionCount(channelId, uid)),
        );
      } else if (mention === 'here') {
        // Increment mention count for online members only (except author)
        const onlineUserIds = await realtimeService.getOnlineUsers(communityId);
        await Promise.all(
          onlineUserIds
            .filter((uid) => uid !== authorUserId)
            .map((uid) => incrementMentionCount(channelId, uid)),
        );
      } else {
        // @username: find user by display name and increment
        const user = await repo.findUserByDisplayName(mention);
        if (user && user.id !== authorUserId) {
          await incrementMentionCount(channelId, user.id);
        }
      }
    } catch (err) {
      // Don't fail message creation if mention processing fails
      console.error('[Mention] Failed to process mention:', mention, (err as Error).message);
    }
  }
}

// ---------------------------------------------------------------------------
// Push notification helper
// ---------------------------------------------------------------------------

async function sendPushNotificationsForMessage(
  communityId: string,
  channelId: string,
  authorUserId: string,
  bodyPlaintext: string,
) {
  try {
    // Get all active members in the community except the author
    const memberIds = await repo.getCommunityMemberUserIds(communityId);
    const recipientIds = memberIds.filter((uid) => uid !== authorUserId);

    if (recipientIds.length === 0) return;

    // Exclude users who are currently online (they receive WS events)
    const onlineUserIds = await realtimeService.getOnlineUsers(communityId);
    const onlineSet = new Set(onlineUserIds);
    const offlineRecipients = recipientIds.filter((uid) => !onlineSet.has(uid));

    if (offlineRecipients.length === 0) return;

    // Get author info for the notification title
    const author = await repo.findUserByUserId(authorUserId);
    const authorName = author?.displayName ?? 'Someone';

    // Truncate body for push notification
    const truncatedBody =
      bodyPlaintext.length > 200
        ? bodyPlaintext.slice(0, 197) + '...'
        : bodyPlaintext;

    await sendPushToUsers(offlineRecipients, {
      title: authorName,
      body: truncatedBody,
      data: {
        communityId,
        channelId,
        channelName: '', // Could be enriched later
      },
    });
  } catch (err) {
    console.error('[Push] Error sending push notifications:', (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

export async function createMessage(
  userId: string,
  channelId: string,
  data: {
    bodyMarkdown: string;
    parentMessageId?: string;
    topic?: string;
    forwardedFromMessageId?: string;
    uploadSessionIds?: string[];
  },
  requestId?: string,
) {
  // Look up channel to get communityId
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  if (channel.isArchived) {
    throw AppError.badRequest('Cannot post in an archived channel');
  }

  // Topic requirement check
  if (channel.requireTopic && !data.topic?.trim()) {
    throw AppError.badRequest('This channel requires a topic for every message');
  }

  // Permission check
  await checkPermission(userId, channel.communityId, channelId, 'post_message');

  // Idempotency: if requestId was already seen, return existing message
  if (requestId) {
    const cached = idempotencyCache.get(requestId);
    if (cached && cached.expiresAt > Date.now()) {
      const existing = await repo.findMessageById(cached.messageId);
      if (existing) {
        return existing;
      }
    }
  }

  // Slow mode check
  if (channel.slowModeSeconds > 0) {
    const lastMessage = await repo.findLastMessageByUser(channelId, userId);
    if (lastMessage) {
      const elapsed = (Date.now() - lastMessage.createdAt.getTime()) / 1000;
      if (elapsed < channel.slowModeSeconds) {
        const waitSeconds = Math.ceil(channel.slowModeSeconds - elapsed);
        throw AppError.tooManyRequests(
          `Slow mode active. Please wait ${waitSeconds} second(s) before posting again.`,
        );
      }
    }
  }

  // AutoMod check — before saving
  const automodResult = await automod.checkMessage(channel.communityId, data.bodyMarkdown, userId);
  if (!automodResult.allowed) {
    if (automodResult.action === 'block') {
      throw AppError.badRequest(
        automodResult.reason ?? 'Message blocked by AutoMod',
        'AUTOMOD_BLOCKED',
      );
    }
    // For 'flag' and 'mute': save message but also create auto-report below
  }

  // Build plaintext from markdown
  const bodyPlaintext = markdownToPlaintext(data.bodyMarkdown);

  // Compute expiresAt for disappearing messages
  let expiresAt: Date | null = null;
  if (channel.disappearingDuration && channel.disappearingDuration > 0) {
    expiresAt = new Date(Date.now() + channel.disappearingDuration * 1000);
  }

  const messageId = uuidv7();
  const created = await repo.createMessage({
    id: messageId,
    communityId: channel.communityId,
    channelId,
    parentMessageId: data.parentMessageId ?? null,
    forwardedFromMessageId: data.forwardedFromMessageId ?? null,
    authorUserId: userId,
    bodyMarkdown: data.bodyMarkdown,
    bodyPlaintext,
    expiresAt,
    topic: data.topic ?? null,
  });

  if (data.uploadSessionIds && data.uploadSessionIds.length > 0) {
    const uniqueUploadSessionIds = [...new Set(data.uploadSessionIds)];
    if (uniqueUploadSessionIds.length !== data.uploadSessionIds.length) {
      throw AppError.badRequest('Duplicate upload sessions are not allowed');
    }
  }

  // If AutoMod flagged the message, create an auto-report
  if (!automodResult.allowed && automodResult.action === 'flag') {
    await automod.createAutoReport(
      channel.communityId,
      created.id,
      userId,
      automodResult.reason ?? 'Flagged by AutoMod',
    );
  }

  // Store in idempotency cache
  if (requestId) {
    idempotencyCache.set(requestId, {
      messageId: created.id,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
  }

  // Process @mentions asynchronously (don't block message creation)
  processMentions(data.bodyMarkdown, channelId, channel.communityId, userId).catch((err) => {
    console.error('[Message] Failed to process mentions:', (err as Error).message);
  });

  // Send push notifications to offline channel members (async, non-blocking)
  sendPushNotificationsForMessage(
    channel.communityId,
    channelId,
    userId,
    bodyPlaintext,
  ).catch((err) => {
    console.error('[Message] Failed to send push notifications:', (err as Error).message);
  });

  // Return with author info
  const result = await repo.findMessageById(created.id);
  if (result) {
    realtimeService.broadcastToChannel(
      channelId,
      WebSocketEvent.MESSAGE_CREATED,
      result,
    );
  }
  return result;
}

export async function forwardMessage(
  userId: string,
  messageId: string,
  targetChannelId: string,
) {
  const source = await repo.findMessageById(messageId);
  if (!source) {
    throw AppError.notFound('Message not found');
  }

  if (source.message.isDeleted) {
    throw AppError.badRequest('Cannot forward a deleted message');
  }

  if (source.message.isSealed || source.message.isEncrypted) {
    throw AppError.badRequest('Cannot forward this message type');
  }

  await checkPermission(
    userId,
    source.message.communityId,
    source.message.channelId,
    'view_channel',
  );

  return createMessage(
    userId,
    targetChannelId,
    {
      bodyMarkdown: source.message.bodyMarkdown,
      topic: source.message.topic ?? undefined,
      forwardedFromMessageId: source.message.id,
    },
  );
}

// ---------------------------------------------------------------------------
// Sealed Sender message — server does NOT know the real author
// ---------------------------------------------------------------------------

export async function createSealedMessage(
  userId: string,
  channelId: string,
  data: { encryptedPayload: string },
  requestId?: string,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  if (channel.isArchived) {
    throw AppError.badRequest('Cannot post in an archived channel');
  }

  // Permission check — we still verify the sender is a member even though
  // authorUserId in the stored row will be the sender's own ID.  The content
  // (and real identity) lives inside the encrypted payload.
  await checkPermission(userId, channel.communityId, channelId, 'post_message');

  // Idempotency
  if (requestId) {
    const cached = idempotencyCache.get(requestId);
    if (cached && cached.expiresAt > Date.now()) {
      const existing = await repo.findMessageById(cached.messageId);
      if (existing) return existing;
    }
  }

  const messageId = uuidv7();
  const created = await repo.createMessage({
    id: messageId,
    communityId: channel.communityId,
    channelId,
    authorUserId: userId, // stored but clients should ignore this for sealed messages
    bodyMarkdown: '[sealed]',
    bodyPlaintext: '[sealed]',
    isSealed: true,
    encryptedPayload: data.encryptedPayload,
  });

  if (requestId) {
    idempotencyCache.set(requestId, {
      messageId: created.id,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
  }

  return repo.findMessageById(created.id);
}

export async function getMessages(
  userId: string,
  channelId: string,
  cursor?: string,
  limit?: number,
  topic?: string,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'view_channel');

  const result = await repo.findMessagesByChannel(channelId, cursor, limit, topic);

  // Compute KakaoTalk-style unread counts per message
  const messageIds = result.messages.map((r) => r.message.id);
  const messageAuthorMap: Record<string, string> = {};
  for (const row of result.messages) {
    messageAuthorMap[row.message.id] = row.message.authorUserId;
  }
  const unreadCounts = await repo.getUnreadCountsForMessages(
    channelId,
    channel.communityId,
    messageIds,
    messageAuthorMap,
  );

  return {
    ...result,
    unreadCounts,
  };
}

/**
 * Get distinct topics for a channel (Zulip-style topic threading).
 */
export async function getChannelTopics(userId: string, channelId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'view_channel');

  return repo.findDistinctTopics(channelId);
}

export async function editMessage(
  userId: string,
  messageId: string,
  data: { bodyMarkdown: string },
) {
  const existing = await repo.findMessageById(messageId);
  if (!existing) {
    throw AppError.notFound('Message not found');
  }

  if (existing.message.isDeleted) {
    throw AppError.notFound('Message not found');
  }

  // Only the author can edit their own message
  if (existing.message.authorUserId !== userId) {
    throw AppError.forbidden('You can only edit your own messages');
  }

  const bodyPlaintext = markdownToPlaintext(data.bodyMarkdown);

  const updated = await repo.updateMessage(messageId, {
    bodyMarkdown: data.bodyMarkdown,
    bodyPlaintext,
    isEdited: true,
  });

  // Re-fetch with author info
  const result = await repo.findMessageById(updated!.id);
  if (result) {
    realtimeService.broadcastToChannel(
      existing.message.channelId,
      WebSocketEvent.MESSAGE_UPDATED,
      result,
    );
  }
  return result;
}

export async function deleteMessage(userId: string, messageId: string) {
  const existing = await repo.findMessageById(messageId);
  if (!existing) {
    throw AppError.notFound('Message not found');
  }

  if (existing.message.isDeleted) {
    throw AppError.notFound('Message not found');
  }

  const isAuthor = existing.message.authorUserId === userId;

  if (!isAuthor) {
    // Non-authors need manage_messages permission
    await checkPermission(
      userId,
      existing.message.communityId,
      existing.message.channelId,
      'manage_messages',
    );
  }

  await repo.softDeleteMessage(messageId);
  realtimeService.broadcastToChannel(
    existing.message.channelId,
    WebSocketEvent.MESSAGE_DELETED,
    {
      messageId,
      channelId: existing.message.channelId,
    },
  );
}

export async function getMessage(userId: string, messageId: string) {
  const existing = await repo.findMessageById(messageId);
  if (!existing) {
    throw AppError.notFound('Message not found');
  }

  // Verify user can view the channel
  await checkPermission(
    userId,
    existing.message.communityId,
    existing.message.channelId,
    'view_channel',
  );

  return existing;
}
