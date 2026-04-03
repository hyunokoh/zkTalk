import { eq, and, desc, lt } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import {
  reports,
  moderationActions,
  communityMemberships,
  users,
  communities,
  roles,
  membershipRoles,
  messages,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateReportData {
  id?: string;
  communityId: string;
  messageId?: string | null;
  reportedUserId?: string | null;
  reporterUserId: string;
  reasonCode: string;
  reasonText?: string | null;
}

export interface CreateModerationActionData {
  id?: string;
  communityId: string;
  actorUserId: string;
  targetUserId?: string | null;
  targetMessageId?: string | null;
  actionType: string;
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function createReport(data: CreateReportData) {
  const id = data.id ?? uuidv7();
  const [report] = await db
    .insert(reports)
    .values({
      id,
      communityId: data.communityId,
      messageId: data.messageId ?? null,
      reportedUserId: data.reportedUserId ?? null,
      reporterUserId: data.reporterUserId,
      reasonCode: data.reasonCode,
      reasonText: data.reasonText ?? null,
    })
    .returning();
  return report!;
}

export async function findReportById(id: string) {
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findReportsByCommunity(
  communityId: string,
  status?: string,
  cursor?: string,
  limit = 50,
) {
  const queryLimit = limit + 1;
  const conditions = [eq(reports.communityId, communityId)];

  if (status) {
    conditions.push(eq(reports.status, status as 'open' | 'resolved' | 'dismissed'));
  }
  if (cursor) {
    conditions.push(lt(reports.id, cursor));
  }

  const rows = await db
    .select({
      report: reports,
      message: {
        id: messages.id,
        channelId: messages.channelId,
        authorUserId: messages.authorUserId,
        bodyPlaintext: messages.bodyPlaintext,
        isDeleted: messages.isDeleted,
        isEncrypted: messages.isEncrypted,
      },
      reporter: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
      },
    })
    .from(reports)
    .leftJoin(messages, eq(reports.messageId, messages.id))
    .leftJoin(users, eq(reports.reporterUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(reports.id))
    .limit(queryLimit);

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    reports: resultRows,
    hasMore,
  };
}

export async function resolveReport(
  id: string,
  resolvedByUserId: string,
  status: 'resolved' | 'dismissed',
) {
  const [report] = await db
    .update(reports)
    .set({
      status,
      resolvedByUserId,
    })
    .where(eq(reports.id, id))
    .returning();
  return report ?? null;
}

// ---------------------------------------------------------------------------
// Moderation Actions (Audit Log)
// ---------------------------------------------------------------------------

export async function createModerationAction(data: CreateModerationActionData) {
  const id = data.id ?? uuidv7();
  const [action] = await db
    .insert(moderationActions)
    .values({
      id,
      communityId: data.communityId,
      actorUserId: data.actorUserId,
      targetUserId: data.targetUserId ?? null,
      targetMessageId: data.targetMessageId ?? null,
      actionType: data.actionType,
      reason: data.reason ?? null,
    })
    .returning();
  return action!;
}

export async function findModerationActions(
  communityId: string,
  cursor?: string,
  limit = 50,
) {
  const queryLimit = limit + 1;
  const conditions = [eq(moderationActions.communityId, communityId)];

  if (cursor) {
    conditions.push(lt(moderationActions.id, cursor));
  }

  const rows = await db
    .select({
      action: moderationActions,
      actor: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
      },
      message: {
        id: messages.id,
        channelId: messages.channelId,
        bodyPlaintext: messages.bodyPlaintext,
        isDeleted: messages.isDeleted,
        isEncrypted: messages.isEncrypted,
      },
    })
    .from(moderationActions)
    .innerJoin(users, eq(moderationActions.actorUserId, users.id))
    .leftJoin(messages, eq(moderationActions.targetMessageId, messages.id))
    .where(and(...conditions))
    .orderBy(desc(moderationActions.id))
    .limit(queryLimit);

  const hasMore = rows.length > limit;
  const resultRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    actions: resultRows,
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Member Moderation
// ---------------------------------------------------------------------------

export async function muteMember(membershipId: string) {
  const [membership] = await db
    .update(communityMemberships)
    .set({ membershipStatus: 'muted' })
    .where(eq(communityMemberships.id, membershipId))
    .returning();
  return membership ?? null;
}

export async function kickMember(membershipId: string) {
  const [membership] = await db
    .update(communityMemberships)
    .set({ membershipStatus: 'left' })
    .where(eq(communityMemberships.id, membershipId))
    .returning();
  return membership ?? null;
}

export async function banMember(membershipId: string) {
  const [membership] = await db
    .update(communityMemberships)
    .set({ membershipStatus: 'banned' })
    .where(eq(communityMemberships.id, membershipId))
    .returning();
  return membership ?? null;
}

export async function findMembershipById(membershipId: string) {
  const rows = await db
    .select({
      membership: communityMemberships,
      user: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
      },
      community: {
        id: communities.id,
        name: communities.name,
        ownerUserId: communities.ownerUserId,
      },
    })
    .from(communityMemberships)
    .innerJoin(users, eq(communityMemberships.userId, users.id))
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(eq(communityMemberships.id, membershipId))
    .limit(1);

  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Role helpers (used for permission checks in service layer)
// ---------------------------------------------------------------------------

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

export async function getTargetUserRoles(membershipId: string) {
  return db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      priority: roles.priority,
    })
    .from(membershipRoles)
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(eq(membershipRoles.membershipId, membershipId));
}

export async function findMembership(communityId: string, userId: string) {
  const rows = await db
    .select()
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
