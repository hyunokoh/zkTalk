import * as repo from './unread.repository.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { WebSocketEvent } from '@zktalk/shared';
import {
  assertCanAccessChannel,
  getAccessibleChannelIdsForCommunity,
} from '../channel/channel-access.service.js';

// ---------------------------------------------------------------------------
// Mark a channel as read
// ---------------------------------------------------------------------------

export async function markChannelRead(
  userId: string,
  channelId: string,
  lastMessageId?: string,
) {
  const channel = await assertCanAccessChannel(userId, channelId);

  const resolvedLastMessageId =
    lastMessageId ?? (await repo.findLatestMessageId(channelId));

  const result = await repo.upsertChannelRead(channelId, userId, resolvedLastMessageId);
  realtimeService.broadcastToChannel(
    channelId,
    WebSocketEvent.CHANNEL_UPDATED,
    {
      channelId,
      reason: 'read_state_changed',
      userId,
      lastMessageId: resolvedLastMessageId ?? null,
    },
  );
  return result;
}

// ---------------------------------------------------------------------------
// Get unread summary for all channels in a community
// ---------------------------------------------------------------------------

export async function getUnreadSummary(userId: string, communityId: string) {
  const accessibleChannelIds = await getAccessibleChannelIdsForCommunity(userId, communityId);
  return repo.getUnreadSummary(communityId, userId, accessibleChannelIds);
}

// ---------------------------------------------------------------------------
// Called after a new message is created to update unread counts
// ---------------------------------------------------------------------------

export async function onNewMessage(message: {
  id: string;
  channelId: string;
  authorUserId: string;
  bodyPlaintext: string;
}) {
  // Increment unread count for all channel readers except the author
  await repo.incrementUnreadForChannel(message.channelId, message.authorUserId);

  // Parse @mentions from plaintext and increment mention counts
  const mentionPattern = /@(\w+)/g;
  const mentions = new Set<string>();
  let match;
  while ((match = mentionPattern.exec(message.bodyPlaintext)) !== null) {
    mentions.add(match[1]);
  }

  // Note: In a full implementation, we would resolve usernames to user IDs
  // and call incrementMentionCount for each mentioned user. For MVP, the
  // mention counting is handled at the route/service layer when the caller
  // provides explicit mention user IDs.
}

/**
 * Increment mention count for specific users mentioned in a message.
 * Called by the message creation service with resolved user IDs.
 */
export async function recordMentions(
  channelId: string,
  mentionedUserIds: string[],
) {
  for (const userId of mentionedUserIds) {
    await repo.incrementMentionCount(channelId, userId);
  }
}
