import { eq, and, desc, sql, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  polls,
  pollOptions,
  pollVotes,
  users,
  channels,
  communityMemberships,
  membershipRoles,
  roles,
  channelRolePermissions,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreatePollInput {
  id: string;
  channelId: string;
  messageId?: string | null;
  createdByUserId: string;
  question: string;
  isAnonymous: boolean;
  allowMultiple: boolean;
  expiresAt: Date | null;
  options: { id: string; text: string; position: number }[];
}

// ---------------------------------------------------------------------------
// Poll CRUD
// ---------------------------------------------------------------------------

export async function createPoll(data: CreatePollInput) {
  const [poll] = await db
    .insert(polls)
    .values({
      id: data.id,
      channelId: data.channelId,
      messageId: data.messageId ?? null,
      createdByUserId: data.createdByUserId,
      question: data.question,
      isAnonymous: data.isAnonymous,
      allowMultiple: data.allowMultiple,
      expiresAt: data.expiresAt,
    })
    .returning();

  if (data.options.length > 0) {
    await db.insert(pollOptions).values(
      data.options.map((opt) => ({
        id: opt.id,
        pollId: data.id,
        text: opt.text,
        position: opt.position,
      })),
    );
  }

  return poll;
}

export async function findPollById(id: string) {
  const [poll] = await db
    .select()
    .from(polls)
    .where(eq(polls.id, id))
    .limit(1);
  return poll ?? null;
}

export async function findPollsByChannel(channelId: string) {
  return db
    .select()
    .from(polls)
    .where(eq(polls.channelId, channelId))
    .orderBy(desc(polls.createdAt));
}

export async function findPollsByMessageIds(messageIds: string[]) {
  if (messageIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(polls)
    .where(and(isNotNull(polls.messageId), inArray(polls.messageId, messageIds)));
}

export async function addVote(
  id: string,
  pollId: string,
  optionId: string,
  userId: string,
) {
  const [vote] = await db
    .insert(pollVotes)
    .values({ id, pollId, optionId, userId })
    .onConflictDoNothing({
      target: [pollVotes.userId, pollVotes.optionId],
    })
    .returning();
  return vote ?? null;
}

export async function removeVote(
  pollId: string,
  optionId: string,
  userId: string,
) {
  const [vote] = await db
    .delete(pollVotes)
    .where(
      and(
        eq(pollVotes.pollId, pollId),
        eq(pollVotes.optionId, optionId),
        eq(pollVotes.userId, userId),
      ),
    )
    .returning();
  return vote ?? null;
}

export async function getPollOptions(pollId: string) {
  return db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(pollOptions.position);
}

export async function getPollResults(pollId: string) {
  // Get options with vote counts
  const options = await db
    .select({
      id: pollOptions.id,
      text: pollOptions.text,
      position: pollOptions.position,
      voteCount: sql<number>`count(${pollVotes.id})::int`,
    })
    .from(pollOptions)
    .leftJoin(pollVotes, eq(pollOptions.id, pollVotes.optionId))
    .where(eq(pollOptions.pollId, pollId))
    .groupBy(pollOptions.id, pollOptions.text, pollOptions.position)
    .orderBy(pollOptions.position);

  return options;
}

export async function getPollVoters(pollId: string) {
  return db
    .select({
      optionId: pollVotes.optionId,
      userId: pollVotes.userId,
      username: users.username,
      displayName: users.displayName,
    })
    .from(pollVotes)
    .innerJoin(users, eq(pollVotes.userId, users.id))
    .where(eq(pollVotes.pollId, pollId));
}

export async function getUserVotesForPoll(pollId: string, userId: string) {
  return db
    .select({
      optionId: pollVotes.optionId,
    })
    .from(pollVotes)
    .where(
      and(
        eq(pollVotes.pollId, pollId),
        eq(pollVotes.userId, userId),
      ),
    );
}

export async function findOptionById(optionId: string) {
  const [option] = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .limit(1);
  return option ?? null;
}

// ---------------------------------------------------------------------------
// Channel lookup
// ---------------------------------------------------------------------------

export async function findChannelById(id: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, id))
    .limit(1);
  return channel ?? null;
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

export async function getUserMembership(userId: string, communityId: string) {
  const [membership] = await db
    .select()
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
      ),
    )
    .limit(1);
  return membership ?? null;
}

export async function getUserRolesInCommunity(userId: string, communityId: string) {
  return db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      priority: roles.priority,
    })
    .from(communityMemberships)
    .innerJoin(membershipRoles, eq(communityMemberships.id, membershipRoles.membershipId))
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    );
}

export async function getChannelPermissions(channelId: string) {
  return db
    .select()
    .from(channelRolePermissions)
    .where(eq(channelRolePermissions.channelId, channelId));
}
