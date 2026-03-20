import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import { markdownToPlaintext } from '../../lib/markdown.js';
import * as repo from './message.repository.js';

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
// Service methods
// ---------------------------------------------------------------------------

export async function createMessage(
  userId: string,
  channelId: string,
  data: { bodyMarkdown: string; parentMessageId?: string },
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

  // Build plaintext from markdown
  const bodyPlaintext = markdownToPlaintext(data.bodyMarkdown);

  const messageId = uuidv7();
  const created = await repo.createMessage({
    id: messageId,
    communityId: channel.communityId,
    channelId,
    parentMessageId: data.parentMessageId ?? null,
    authorUserId: userId,
    bodyMarkdown: data.bodyMarkdown,
    bodyPlaintext,
  });

  // Store in idempotency cache
  if (requestId) {
    idempotencyCache.set(requestId, {
      messageId: created.id,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
  }

  // Return with author info
  const result = await repo.findMessageById(created.id);
  return result;
}

export async function getMessages(
  userId: string,
  channelId: string,
  cursor?: string,
  limit?: number,
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'view_channel');

  return repo.findMessagesByChannel(channelId, cursor, limit);
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
  return repo.findMessageById(updated!.id);
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
