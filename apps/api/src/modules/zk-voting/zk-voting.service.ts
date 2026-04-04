import { createHash } from 'crypto';
import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import * as repo from './zk-voting.repository.js';
import * as pollRepo from '../poll/poll.repository.js';

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

/**
 * Create a ZK poll (reuses the existing poll infrastructure).
 */
export async function createZkPoll(
  userId: string,
  channelId: string,
  data: { question: string; options: string[] },
) {
  const channel = await repo.findChannelById(channelId);
  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'post_message');

  const pollId = uuidv7();
  const options = data.options.map((text, index) => ({
    id: uuidv7(),
    text,
    position: index,
  }));

  const poll = await pollRepo.createPoll({
    id: pollId,
    channelId,
    createdByUserId: userId,
    question: data.question,
    isAnonymous: true,
    allowMultiple: false,
    expiresAt: null,
    options,
  });

  const pollOptions = await repo.getPollOptions(pollId);

  return { ...poll, options: pollOptions };
}

/**
 * Submit an anonymous ZK vote.
 * The client sends a voteHash (SHA256(secret+optionId)) and a nullifier
 * (SHA256(userId+pollId)) which prevents double-voting without revealing identity.
 */
export async function submitZkVote(
  pollId: string,
  data: { voteHash: string; nullifier: string; optionId: string },
) {
  const poll = await repo.findPollById(pollId);
  if (!poll) {
    throw AppError.notFound('Poll not found');
  }

  if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
    throw AppError.badRequest('This poll has expired');
  }

  // Verify the optionId belongs to this poll
  const option = await repo.findOptionById(data.optionId);
  if (!option || option.pollId !== pollId) {
    throw AppError.notFound('Poll option not found');
  }

  // Check nullifier uniqueness (prevents double-voting)
  const existing = await repo.findZkVoteByNullifier(pollId, data.nullifier);
  if (existing) {
    throw AppError.conflict('You have already voted on this poll');
  }

  const vote = await repo.createZkVote({
    id: uuidv7(),
    pollId,
    voteHash: data.voteHash,
    nullifier: data.nullifier,
    optionId: data.optionId,
  });

  if (!vote) {
    throw AppError.conflict('Vote already submitted with this nullifier');
  }

  return vote;
}

/**
 * Get vote results (counts per option) for a ZK poll.
 */
export async function getZkPollResults(pollId: string) {
  const poll = await repo.findPollById(pollId);
  if (!poll) {
    throw AppError.notFound('Poll not found');
  }

  const options = await repo.getZkVoteResults(pollId);
  const totalVotes = await repo.getZkVoteTotalCount(pollId);

  return {
    poll,
    options,
    totalVotes,
  };
}

/**
 * Verify a ZK vote by recomputing the hash.
 * The client provides the secret and optionId; server recomputes
 * hash = SHA256(secret + optionId) and checks it matches a stored vote.
 */
export async function verifyZkVote(
  pollId: string,
  data: { nullifier: string; secret: string; optionId: string },
) {
  const poll = await repo.findPollById(pollId);
  if (!poll) {
    throw AppError.notFound('Poll not found');
  }

  const existingVote = await repo.findZkVoteByNullifier(pollId, data.nullifier);
  if (!existingVote) {
    throw AppError.notFound('No vote found with this nullifier');
  }

  // Recompute hash
  const recomputedHash = createHash('sha256')
    .update(data.secret + data.optionId)
    .digest('hex');

  const verified = recomputedHash === existingVote.voteHash;

  return {
    verified,
    optionId: existingVote.optionId,
    matchesClaimedOption: existingVote.optionId === data.optionId,
  };
}
