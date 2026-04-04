import crypto from 'node:crypto';
import { SystemRole } from '@zktalk/shared';
import { WebSocketEvent } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import { markdownToPlaintext } from '../../lib/markdown.js';
import { realtimeService } from '../realtime/realtime.service.js';
import * as repo from './dm.repository.js';
import * as channelRepo from '../channel/channel.repository.js';
import * as communityService from '../community/community.service.js';
import * as communityRepo from '../community/community.repository.js';
import * as messageRepo from '../message/message.repository.js';
import * as unreadRepo from '../unread/unread.repository.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function broadcastToDmParticipants(
  conversationId: string,
  event: string,
  payload: unknown,
  excludeUserId?: string,
) {
  const participantUserIds = await repo.getParticipantUserIds(conversationId);
  for (const userId of participantUserIds) {
    if (userId !== excludeUserId) {
      realtimeService.sendToUser(userId, event, payload, { conversationId });
    }
  }
}

async function broadcastConversationUpdated(
  conversationId: string,
  excludeUserId?: string,
) {
  const conversation = await repo.findConversationById(conversationId);
  if (!conversation) {
    return;
  }

  const payload = await buildConversationResponse(conversation);
  await broadcastToDmParticipants(
    conversationId,
    WebSocketEvent.DM_CONVERSATION_UPDATED,
    payload,
    excludeUserId,
  );
}

function normalizePromotionName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 100);
}

function derivePromotionCommunityName(
  conversation: NonNullable<Awaited<ReturnType<typeof repo.findConversationById>>>,
) {
  const namedConversation = conversation.conversation.name?.trim();
  if (namedConversation) {
    return normalizePromotionName(namedConversation);
  }

  const participantNames = conversation.participants
    .map((participant) => participant.user.displayName.trim())
    .filter(Boolean);

  if (participantNames.length > 0) {
    return normalizePromotionName(participantNames.join(', '));
  }

  return 'Promoted conversation';
}

function slugifyPromotionName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function buildUniquePromotionSlug(value: string) {
  const base = slugifyPromotionName(value) || 'community';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = `${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`.slice(-8);
    const slug = `${base}-${suffix}`.slice(0, 64);
    const existing = await communityRepo.findBySlug(slug);
    if (!existing) {
      return slug;
    }
  }

  throw AppError.conflict('Could not generate a unique community slug');
}

async function ensurePromotedMemberRole(
  communityId: string,
  userId: string,
  membershipId: string,
) {
  const existingRoles = await communityRepo.getUserRolesInCommunity(communityId, userId);
  if (existingRoles.length > 0) {
    return;
  }

  const { db } = await import('../../lib/db/index.js');
  const { roles } = await import('../../lib/db/schema.js');
  const { eq } = await import('drizzle-orm');
  const communityRoles = await db.select().from(roles).where(eq(roles.communityId, communityId));
  const memberRole =
    communityRoles.find((role) => role.name === SystemRole.MEMBER) ??
    communityRoles.find((role) => role.priority === 20);

  if (memberRole) {
    await communityRepo.assignRole(membershipId, memberRole.id);
  }
}

function buildPromotedDmBody(message: {
  bodyMarkdown: string;
  bodyPlaintext: string;
  isEncrypted: boolean;
  encryptedPayload: string | null;
}) {
  if (!message.isEncrypted) {
    return {
      bodyMarkdown: message.bodyMarkdown,
      bodyPlaintext: message.bodyPlaintext,
      isEncrypted: false,
      encryptedPayload: null as string | null,
    };
  }

  const placeholder = '[Encrypted DM message omitted during community promotion]';
  return {
    bodyMarkdown: placeholder,
    bodyPlaintext: placeholder,
    isEncrypted: false,
    encryptedPayload: null as string | null,
  };
}

async function resolveExistingPromotionTarget(
  conversation: NonNullable<Awaited<ReturnType<typeof repo.findConversationById>>>,
) {
  const promotedCommunityId = conversation.conversation.promotedCommunityId;
  if (!promotedCommunityId) {
    return null;
  }

  const community = await communityRepo.findById(promotedCommunityId);
  if (!community) {
    return null;
  }

  let channel = conversation.conversation.promotedChannelId
    ? await channelRepo.findChannelById(conversation.conversation.promotedChannelId)
    : null;

  if (!channel || channel.communityId !== community.id) {
    const fallbackChannel = await channelRepo.findChannelsByCommunity(community.id);
    channel = fallbackChannel[0]?.channel ?? null;
  }

  if (!channel) {
    return null;
  }

  return {
    community,
    channel,
  };
}

async function findPromotionVoiceChannel(communityId: string, sourceDmConversationId: string) {
  const communityChannels = await channelRepo.findChannelsByCommunity(communityId);
  const exactMatch = communityChannels.find(
    ({ channel }) =>
      channel.type === 'voice' && channel.sourceDmConversationId === sourceDmConversationId,
  )?.channel;
  if (exactMatch) {
    return exactMatch;
  }

  return communityChannels.find(({ channel }) => channel.type === 'voice')?.channel ?? null;
}

async function ensurePromotionVoiceChannel(
  communityId: string,
  sourceDmConversationId: string,
) {
  const existingChannel = await findPromotionVoiceChannel(communityId, sourceDmConversationId);
  if (existingChannel) {
    return existingChannel;
  }

  const communityChannels = await channelRepo.findChannelsByCommunity(communityId);
  const lastPosition = communityChannels.reduce(
    (max, entry) => Math.max(max, entry.channel.position ?? 0),
    -1,
  );

  return channelRepo.createChannel({
    communityId,
    sourceDmConversationId,
    name: 'call',
    description: 'Voice and video calls for this conversation',
    type: 'voice',
    position: lastPosition + 1,
  });
}

async function buildConversationResponse(
  conversation: NonNullable<Awaited<ReturnType<typeof repo.findConversationById>>>,
) {
  const promotedTarget = await resolveExistingPromotionTarget(conversation);

  return {
    ...conversation,
    promotedCommunity: promotedTarget?.community ?? null,
    promotedChannel: promotedTarget?.channel
      ? {
          id: promotedTarget.channel.id,
          name: promotedTarget.channel.name,
        }
      : null,
  };
}

async function assertConversationWritable(
  conversation: NonNullable<Awaited<ReturnType<typeof repo.findConversationById>>>,
) {
  const promotedTarget = await resolveExistingPromotionTarget(conversation);
  if (!promotedTarget) {
    return;
  }

  throw AppError.conflict(
    `This conversation has been promoted to ${promotedTarget.community.name}. Continue in #${promotedTarget.channel.name}.`,
    'DM_PROMOTED_READ_ONLY',
  );
}

// ---------------------------------------------------------------------------
// Simple in-memory idempotency cache (requestId -> dmMessageId, TTL 5 min)
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

setInterval(pruneIdempotencyCache, 60_000).unref();

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function createDirectConversation(userId: string, targetUserId: string) {
  // Cannot DM yourself
  if (userId === targetUserId) {
    throw AppError.badRequest('Cannot create a DM conversation with yourself');
  }

  // Check target user exists
  const targetUser = await repo.findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound('Target user not found');
  }

  // Check if a direct conversation already exists
  const existing = await repo.findDirectConversation(userId, targetUserId);
  if (existing) {
    return existing;
  }

  // Create new conversation
  const conversation = await repo.createConversation('direct', userId);
  await repo.addParticipant(conversation.id, userId);
  await repo.addParticipant(conversation.id, targetUserId);

  const result = await repo.findConversationById(conversation.id);

  // Broadcast to target user
  realtimeService.sendToUser(
    targetUserId,
    WebSocketEvent.DM_CONVERSATION_CREATED,
    result,
    { conversationId: conversation.id },
  );

  return result;
}

export async function searchUsers(userId: string, query: string, limit?: number) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  return repo.searchUsers(trimmedQuery, userId, limit);
}

export async function createGroupConversation(
  userId: string,
  participantUserIds: string[],
  name?: string,
) {
  // Ensure creator is included
  const allUserIds = new Set([userId, ...participantUserIds]);

  // Validate all user IDs exist
  const foundUsers = await repo.findUsersByIds([...allUserIds]);
  if (foundUsers.length !== allUserIds.size) {
    throw AppError.notFound('One or more users not found');
  }

  // Create conversation
  const conversation = await repo.createConversation('group', userId, name);

  // Add all participants
  for (const uid of allUserIds) {
    await repo.addParticipant(conversation.id, uid);
  }

  const result = await repo.findConversationById(conversation.id);

  // Broadcast to all other participants
  for (const uid of allUserIds) {
    if (uid !== userId) {
      realtimeService.sendToUser(
        uid,
        WebSocketEvent.DM_CONVERSATION_CREATED,
        result,
        { conversationId: conversation.id },
      );
    }
  }

  return result;
}

export async function getConversations(userId: string) {
  const conversations = await repo.findConversationsForUser(userId);

  // Attach unread counts
  const results = [];
  for (const conv of conversations) {
    const unreadCount = await repo.getUnreadCount(conv.conversation.id, userId);
    const participants = conv.participants.map((participant) => ({
      ...participant,
      user: {
        ...participant.user,
        isOnline: realtimeService.isUserOnline(participant.user.id),
      },
    }));
    const promotedTarget = await resolveExistingPromotionTarget(conv);
    results.push({
      ...conv,
      participants,
      unreadCount,
      promotedCommunity: promotedTarget?.community ?? null,
      promotedChannel: promotedTarget?.channel
        ? {
            id: promotedTarget.channel.id,
            name: promotedTarget.channel.name,
          }
        : null,
    });
  }

  return results;
}

export async function getConversation(userId: string, conversationId: string) {
  const isParticipant = await repo.isParticipant(conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }

  const conversation = await repo.findConversationById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  return buildConversationResponse(conversation);
}

export async function promoteConversationToCommunity(
  userId: string,
  conversationId: string,
  data: {
    communityName?: string;
    channelName?: string;
  } = {},
) {
  const conversation = await getConversation(userId, conversationId);
  const existingPromotion = await resolveExistingPromotionTarget(conversation);
  if (existingPromotion) {
    const voiceChannel = await ensurePromotionVoiceChannel(
      existingPromotion.community.id,
      conversationId,
    );
    return {
      community: existingPromotion.community,
      channel: existingPromotion.channel,
      voiceChannel,
      importedMessageCount: 0,
      participantCount: conversation.participants.length,
      alreadyPromoted: true,
    };
  }

  const desiredCommunityName = data.communityName?.trim()
    ? normalizePromotionName(data.communityName)
    : derivePromotionCommunityName(conversation);
  const slug = await buildUniquePromotionSlug(desiredCommunityName);
  const desiredChannelName = data.channelName?.trim()
    ? normalizePromotionName(data.channelName)
    : 'general';

  const community = await communityService.createCommunity(userId, {
    name: desiredCommunityName,
    slug,
    description: `Promoted from ${conversation.conversation.type} conversation`,
    visibility: 'private',
  });

  const createdChannels = await channelRepo.findChannelsByCommunity(community.id);
  const initialChannel = createdChannels[0]?.channel ?? null;
  if (!initialChannel) {
    throw AppError.badRequest('Initial community channel was not created');
  }

  const promotionChannelPatch: {
    name?: string;
    sourceDmConversationId: string;
  } = {
    sourceDmConversationId: conversationId,
  };
  if (initialChannel.name !== desiredChannelName) {
    promotionChannelPatch.name = desiredChannelName;
  }

  const channel =
    (await channelRepo.updateChannel(initialChannel.id, promotionChannelPatch)) ?? initialChannel;
  const voiceChannel = await ensurePromotionVoiceChannel(community.id, conversationId);

  for (const participant of conversation.participants) {
    if (participant.userId === userId) {
      continue;
    }

    const membership = await communityRepo.createMembership(community.id, participant.userId);
    await ensurePromotedMemberRole(community.id, participant.userId, membership.id);
  }

  const dmMessages = await repo.findAllDmMessagesForExport(conversationId);
  let lastImportedMessageId: string | null = null;

  for (const row of dmMessages) {
    const promotedBody = buildPromotedDmBody(row.message);
    const created = await messageRepo.createMessage({
      communityId: community.id,
      channelId: channel.id,
      authorUserId: row.message.authorUserId,
      bodyMarkdown: row.message.isDeleted ? '' : promotedBody.bodyMarkdown,
      bodyPlaintext: row.message.isDeleted ? '' : promotedBody.bodyPlaintext,
      messageType: row.message.messageType,
      isEdited: row.message.isEdited,
      isDeleted: row.message.isDeleted,
      isEncrypted: promotedBody.isEncrypted,
      encryptedPayload: promotedBody.encryptedPayload,
      isSealed: row.message.isSealed,
      createdAt: row.message.createdAt,
      updatedAt: row.message.updatedAt,
    });
    lastImportedMessageId = created.id;
  }

  if (lastImportedMessageId) {
    for (const participant of conversation.participants) {
      await unreadRepo.upsertChannelRead(channel.id, participant.userId, lastImportedMessageId);
    }
  }

  await repo.markConversationPromoted(conversationId, community.id, channel.id);
  await broadcastConversationUpdated(conversationId);

  return {
    community,
    channel,
    voiceChannel,
    importedMessageCount: dmMessages.length,
    participantCount: conversation.participants.length,
    alreadyPromoted: false,
  };
}

export async function getConversationCallTarget(userId: string, conversationId: string) {
  const conversation = await getConversation(userId, conversationId);
  let promotion = await resolveExistingPromotionTarget(conversation);
  if (!promotion) {
    const promoted = await promoteConversationToCommunity(userId, conversationId);
    promotion = {
      community: promoted.community,
      channel: promoted.channel,
    };
  }

  const voiceChannel = await ensurePromotionVoiceChannel(promotion.community.id, conversationId);

  return {
    community: promotion.community,
    channel: promotion.channel,
    voiceChannel,
    alreadyPromoted: !!conversation.conversation.promotedCommunityId,
  };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function sendMessage(
  userId: string,
  conversationId: string,
  bodyMarkdown: string,
  isEncrypted = false,
  encryptedPayload?: string,
  requestId?: string,
) {
  const conversation = await repo.findConversationById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }
  const isParticipant = conversation.participants.some((participant) => participant.userId === userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }
  await assertConversationWritable(conversation);

  if (requestId) {
    const cached = idempotencyCache.get(requestId);
    if (cached && cached.expiresAt > Date.now()) {
      const existingMessage = await repo.findDmMessageById(cached.messageId);
      if (existingMessage) {
        return existingMessage;
      }
    }
  }

  // For encrypted messages, plaintext is not meaningful — store a placeholder
  const bodyPlaintext = isEncrypted ? '[encrypted]' : markdownToPlaintext(bodyMarkdown);

  const message = await repo.createDmMessage(
    conversationId,
    userId,
    bodyMarkdown,
    bodyPlaintext,
    isEncrypted,
    encryptedPayload,
  );

  // Update conversation timestamp
  await repo.updateConversationTimestamp(conversationId);

  // Broadcast to all participants
  await broadcastToDmParticipants(
    conversationId,
    WebSocketEvent.DM_MESSAGE_CREATED,
    message,
  );

  if (requestId) {
    idempotencyCache.set(requestId, {
      messageId: message.message.id,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
  }

  return message;
}

export async function getMessages(
  userId: string,
  conversationId: string,
  cursor?: string,
  limit?: number,
) {
  const isParticipant = await repo.isParticipant(conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }

  const result = await repo.findDmMessages(conversationId, cursor, limit);

  // Compute KakaoTalk-style unread counts per message
  const messageIds = result.messages.map((r) => r.message.id);
  const messageAuthorMap: Record<string, string> = {};
  for (const row of result.messages) {
    messageAuthorMap[row.message.id] = row.message.authorUserId;
  }
  const unreadCounts = await repo.getDmUnreadCountsForMessages(
    conversationId,
    messageIds,
    messageAuthorMap,
  );

  return {
    ...result,
    unreadCounts,
  };
}

export async function getMessage(userId: string, messageId: string) {
  const message = await repo.findDmMessageById(messageId);
  if (!message) {
    throw AppError.notFound('Message not found');
  }

  const isParticipant = await repo.isParticipant(message.message.conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }

  return message;
}

export async function editMessage(
  userId: string,
  messageId: string,
  bodyMarkdown: string,
  isEncrypted = false,
  encryptedPayload?: string,
) {
  const existing = await repo.findDmMessageById(messageId);
  if (!existing) {
    throw AppError.notFound('Message not found');
  }

  if (existing.message.isDeleted) {
    throw AppError.notFound('Message not found');
  }

  if (existing.message.authorUserId !== userId) {
    throw AppError.forbidden('You can only edit your own messages');
  }

  const conversation = await repo.findConversationById(existing.message.conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }
  await assertConversationWritable(conversation);

  const bodyPlaintext = isEncrypted ? '[encrypted]' : markdownToPlaintext(bodyMarkdown);

  await repo.updateDmMessage(
    messageId,
    bodyMarkdown,
    bodyPlaintext,
    isEncrypted,
    encryptedPayload,
  );

  const updated = await repo.findDmMessageById(messageId);

  // Broadcast to all participants
  await broadcastToDmParticipants(
    existing.message.conversationId,
    WebSocketEvent.DM_MESSAGE_UPDATED,
    updated,
  );

  return updated;
}

export async function deleteMessage(userId: string, messageId: string) {
  const existing = await repo.findDmMessageById(messageId);
  if (!existing) {
    throw AppError.notFound('Message not found');
  }

  if (existing.message.isDeleted) {
    throw AppError.notFound('Message not found');
  }

  if (existing.message.authorUserId !== userId) {
    throw AppError.forbidden('You can only delete your own messages');
  }

  const conversation = await repo.findConversationById(existing.message.conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }
  await assertConversationWritable(conversation);

  await repo.softDeleteDmMessage(messageId);

  // Broadcast to all participants
  await broadcastToDmParticipants(
    existing.message.conversationId,
    WebSocketEvent.DM_MESSAGE_DELETED,
    { messageId, conversationId: existing.message.conversationId },
  );
}

// ---------------------------------------------------------------------------
// Read tracking
// ---------------------------------------------------------------------------

export async function getReadStatus(
  userId: string,
  conversationId: string,
): Promise<Record<string, string | null>> {
  const isParticipant = await repo.isParticipant(conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }

  return repo.getLastReadMessageIds(conversationId);
}

export async function markAsRead(
  userId: string,
  conversationId: string,
  messageId: string,
) {
  const isParticipant = await repo.isParticipant(conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }

  await repo.updateLastRead(conversationId, userId, messageId);
  await broadcastConversationUpdated(conversationId);
}

// ---------------------------------------------------------------------------
// Group member management
// ---------------------------------------------------------------------------

export async function addGroupMember(
  userId: string,
  conversationId: string,
  targetUserId: string,
) {
  const conversation = await repo.findConversationById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  if (conversation.conversation.type !== 'group') {
    throw AppError.badRequest('Can only add members to group conversations');
  }
  await assertConversationWritable(conversation);

  const isParticipant = await repo.isParticipant(conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }

  // Check target user exists
  const targetUser = await repo.findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound('Target user not found');
  }

  // Check if already a participant
  const alreadyParticipant = await repo.isParticipant(conversationId, targetUserId);
  if (alreadyParticipant) {
    throw new AppError(409, 'CONFLICT', 'User is already a participant');
  }

  await repo.addParticipant(conversationId, targetUserId);

  const updated = await repo.findConversationById(conversationId);

  // Notify the new member
  realtimeService.sendToUser(
    targetUserId,
    WebSocketEvent.DM_CONVERSATION_CREATED,
    updated,
    { conversationId },
  );

  await broadcastConversationUpdated(conversationId, targetUserId);

  return updated;
}

export async function leaveGroup(userId: string, conversationId: string) {
  const conversation = await repo.findConversationById(conversationId);
  if (!conversation) {
    throw AppError.notFound('Conversation not found');
  }

  if (conversation.conversation.type !== 'group') {
    throw AppError.badRequest('Can only leave group conversations');
  }

  const isParticipant = await repo.isParticipant(conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You are not a participant of this conversation');
  }

  await repo.removeParticipant(conversationId, userId);
  await broadcastConversationUpdated(conversationId, userId);
}
