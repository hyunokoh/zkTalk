import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  zkVotes,
  polls,
  pollOptions,
  channels,
  communityMemberships,
  membershipRoles,
  roles,
  channelRolePermissions,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// ZK Vote CRUD
// ---------------------------------------------------------------------------

export async function createZkVote(data: {
  id: string;
  pollId: string;
  voteHash: string;
  nullifier: string;
  optionId: string;
}) {
  const [vote] = await db
    .insert(zkVotes)
    .values({
      id: data.id,
      pollId: data.pollId,
      voteHash: data.voteHash,
      nullifier: data.nullifier,
      optionId: data.optionId,
    })
    .onConflictDoNothing({
      target: [zkVotes.pollId, zkVotes.nullifier],
    })
    .returning();
  return vote ?? null;
}

export async function findZkVoteByNullifier(pollId: string, nullifier: string) {
  const [vote] = await db
    .select()
    .from(zkVotes)
    .where(and(eq(zkVotes.pollId, pollId), eq(zkVotes.nullifier, nullifier)))
    .limit(1);
  return vote ?? null;
}

export async function getZkVoteResults(pollId: string) {
  const results = await db
    .select({
      id: pollOptions.id,
      text: pollOptions.text,
      position: pollOptions.position,
      voteCount: sql<number>`count(${zkVotes.id})::int`,
    })
    .from(pollOptions)
    .leftJoin(zkVotes, eq(pollOptions.id, zkVotes.optionId))
    .where(eq(pollOptions.pollId, pollId))
    .groupBy(pollOptions.id, pollOptions.text, pollOptions.position)
    .orderBy(pollOptions.position);

  return results;
}

export async function getZkVoteTotalCount(pollId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(zkVotes)
    .where(eq(zkVotes.pollId, pollId));
  return result?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Poll helpers (re-used from poll module)
// ---------------------------------------------------------------------------

export async function findPollById(id: string) {
  const [poll] = await db
    .select()
    .from(polls)
    .where(eq(polls.id, id))
    .limit(1);
  return poll ?? null;
}

export async function findOptionById(optionId: string) {
  const [option] = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .limit(1);
  return option ?? null;
}

export async function getPollOptions(pollId: string) {
  return db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(pollOptions.position);
}

// ---------------------------------------------------------------------------
// Channel / Permission helpers
// ---------------------------------------------------------------------------

export async function findChannelById(id: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, id))
    .limit(1);
  return channel ?? null;
}

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
