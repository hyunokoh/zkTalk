import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { WebSocketEvent } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import * as repo from './poll.repository.js';
import * as messageRepo from '../message/message.repository.js';
import { realtimeService } from '../realtime/realtime.service.js';

// ---------------------------------------------------------------------------
// Permission helper
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
// Service methods
// ---------------------------------------------------------------------------

async function buildPollView(userId: string, poll: {
  id: string;
  channelId: string;
  messageId: string | null;
  question: string;
  isAnonymous: boolean;
  allowMultiple: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}) {
  const results = await repo.getPollResults(poll.id);
  const userVotes = await repo.getUserVotesForPoll(poll.id, userId);
  const votedOptionIds = new Set(userVotes.map((vote) => vote.optionId));
  const totalVotes = results.reduce((sum, option) => sum + option.voteCount, 0);
  const closed = Boolean(poll.expiresAt && new Date(poll.expiresAt) < new Date());

  return {
    id: poll.id,
    channelId: poll.channelId,
    messageId: poll.messageId,
    question: poll.question,
    options: results.map((option) => ({
      ...option,
      voted: votedOptionIds.has(option.id),
    })),
    totalVotes,
    anonymous: poll.isAnonymous,
    multipleChoice: poll.allowMultiple,
    expiresAt: poll.expiresAt,
    closed,
    createdAt: poll.createdAt,
  };
}

export async function createPoll(
  userId: string,
  channelId: string,
  data: {
    question: string;
    options: string[];
    isAnonymous: boolean;
    allowMultiple: boolean;
    expiresInHours?: number;
  },
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'post_message');

  const pollId = uuidv7();
  const messageId = uuidv7();
  const expiresAt = data.expiresInHours
    ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
    : null;

  const options = data.options.map((text, index) => ({
    id: uuidv7(),
    text,
    position: index,
  }));

  const pollMessage = await messageRepo.createMessage({
    id: messageId,
    communityId: channel.communityId,
    channelId,
    authorUserId: userId,
    bodyMarkdown: '',
    bodyPlaintext: '',
  });

  const poll = await repo.createPoll({
    id: pollId,
    channelId,
    messageId,
    createdByUserId: userId,
    question: data.question,
    isAnonymous: data.isAnonymous,
    allowMultiple: data.allowMultiple,
    expiresAt,
    options,
  });

  const pollOptions = await repo.getPollOptions(pollId);
  const createdMessage = await messageRepo.findMessageById(pollMessage.id);
  if (createdMessage) {
    realtimeService.broadcastToChannel(channelId, WebSocketEvent.MESSAGE_CREATED, createdMessage);
  }

  return { ...poll, options: pollOptions };
}

export async function votePoll(
  userId: string,
  pollId: string,
  optionId: string,
) {
  const poll = await repo.findPollById(pollId);
  if (!poll) {
    throw AppError.notFound('Poll not found');
  }

  // Check if poll has expired
  if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
    throw AppError.badRequest('This poll has expired');
  }

  // Verify the option belongs to this poll
  const option = await repo.findOptionById(optionId);
  if (!option || option.pollId !== pollId) {
    throw AppError.notFound('Poll option not found');
  }

  if (!poll.allowMultiple) {
    const existingVotes = await repo.getUserVotesForPoll(pollId, userId);
    const alreadyVotedOtherOption = existingVotes.some((vote) => vote.optionId !== optionId);
    if (alreadyVotedOtherOption) {
      throw AppError.badRequest('This poll only allows one choice');
    }
  }

  const id = uuidv7();
  const vote = await repo.addVote(id, pollId, optionId, userId);

  if (!vote) {
    throw AppError.conflict('You have already voted for this option');
  }

  return vote;
}

export async function unvotePoll(
  userId: string,
  pollId: string,
  optionId: string,
) {
  const poll = await repo.findPollById(pollId);
  if (!poll) {
    throw AppError.notFound('Poll not found');
  }

  const deleted = await repo.removeVote(pollId, optionId, userId);
  if (!deleted) {
    throw AppError.notFound('Vote not found');
  }
}

export async function getPoll(userId: string, pollId: string) {
  const poll = await repo.findPollById(pollId);
  if (!poll) {
    throw AppError.notFound('Poll not found');
  }

  const channel = await repo.findChannelById(poll.channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channel.id, 'view_channel');

  const pollView = await buildPollView(userId, poll);
  const voters = poll.isAnonymous ? [] : await repo.getPollVoters(pollId);

  return { ...pollView, voters };
}

export async function getChannelPolls(userId: string, channelId: string) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'view_channel');

  const polls = await repo.findPollsByChannel(channelId);
  return Promise.all(polls.map((poll) => buildPollView(userId, poll)));
}

export async function getPollsByMessageIds(userId: string, messageIds: string[]) {
  const polls = await repo.findPollsByMessageIds(messageIds);
  const pollViews = await Promise.all(
    polls.map(async (poll) => {
      const channel = await repo.findChannelById(poll.channelId);
      if (!channel) {
        return null;
      }

      await checkPermission(userId, channel.communityId, channel.id, 'view_channel');
      return buildPollView(userId, poll);
    }),
  );

  const pollsByMessageId: Record<string, Awaited<ReturnType<typeof buildPollView>>> = {};
  for (const poll of pollViews) {
    if (poll?.messageId) {
      pollsByMessageId[poll.messageId] = poll;
    }
  }

  return { pollsByMessageId };
}
