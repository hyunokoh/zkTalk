import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import { checkPermission } from '../channel/channel.service.js';
import * as repo from './reaction.repository.js';

// ---------------------------------------------------------------------------
// Add a reaction to a message
// ---------------------------------------------------------------------------

export async function addReaction(
  userId: string,
  messageId: string,
  emoji: string,
) {
  const message = await repo.findMessageById(messageId);
  if (!message) {
    throw AppError.notFound('Message not found');
  }

  if (message.isDeleted) {
    throw AppError.badRequest('Cannot react to a deleted message');
  }

  const channel = await repo.findChannelById(message.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'react');

  const id = uuidv7();
  const reaction = await repo.addReaction({ id, messageId, userId, emoji });

  // If null, the reaction already existed (onConflictDoNothing)
  if (!reaction) {
    throw AppError.conflict('You have already reacted with this emoji');
  }

  return reaction;
}

// ---------------------------------------------------------------------------
// Remove a reaction from a message
// ---------------------------------------------------------------------------

export async function removeReaction(
  userId: string,
  messageId: string,
  emoji: string,
) {
  const message = await repo.findMessageById(messageId);
  if (!message) {
    throw AppError.notFound('Message not found');
  }

  const deleted = await repo.removeReaction(messageId, userId, emoji);
  if (!deleted) {
    throw AppError.notFound('Reaction not found');
  }

  return { removed: true };
}

// ---------------------------------------------------------------------------
// Get reactions for a message
// ---------------------------------------------------------------------------

export async function getReactions(messageId: string) {
  return repo.getReactionsForMessage(messageId);
}
