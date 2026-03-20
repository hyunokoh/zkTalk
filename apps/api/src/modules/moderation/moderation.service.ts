import { SystemRole } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import * as moderationRepo from './moderation.repository.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requirePermission(
  userId: string,
  communityId: string,
  allowedRoles: string[],
) {
  const userRoles = await moderationRepo.getUserRolesInCommunity(userId, communityId);
  const hasRole = userRoles.some((r) => allowedRoles.includes(r.roleName));
  if (!hasRole) {
    throw AppError.forbidden('You do not have permission to perform this action');
  }
}

const MODERATE_ROLES = [SystemRole.OWNER, SystemRole.ADMIN, SystemRole.MODERATOR];
const ADMIN_ROLES = [SystemRole.OWNER, SystemRole.ADMIN];
const PROTECTED_ROLES: readonly string[] = [SystemRole.OWNER, SystemRole.ADMIN];

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function reportContent(
  userId: string,
  data: {
    communityId: string;
    messageId?: string;
    reportedUserId?: string;
    reasonCode: string;
    reasonText?: string;
  },
) {
  // Verify reporter is a community member
  const membership = await moderationRepo.findMembership(data.communityId, userId);
  if (!membership || membership.membershipStatus !== 'active') {
    throw AppError.forbidden('You must be an active member of this community to report content');
  }

  // Create report
  const report = await moderationRepo.createReport({
    communityId: data.communityId,
    messageId: data.messageId,
    reportedUserId: data.reportedUserId,
    reporterUserId: userId,
    reasonCode: data.reasonCode,
    reasonText: data.reasonText,
  });

  // Log moderation action
  await moderationRepo.createModerationAction({
    communityId: data.communityId,
    actorUserId: userId,
    targetUserId: data.reportedUserId,
    targetMessageId: data.messageId,
    actionType: 'report_created',
  });

  return report;
}

export async function getReports(
  userId: string,
  communityId: string,
  status?: string,
  cursor?: string,
  limit?: number,
) {
  await requirePermission(userId, communityId, MODERATE_ROLES);
  return moderationRepo.findReportsByCommunity(communityId, status, cursor, limit);
}

export async function resolveReport(
  userId: string,
  reportId: string,
  action: 'resolved' | 'dismissed',
) {
  const report = await moderationRepo.findReportById(reportId);
  if (!report) {
    throw AppError.notFound('Report not found');
  }

  await requirePermission(userId, report.communityId, MODERATE_ROLES);

  const updated = await moderationRepo.resolveReport(reportId, userId, action);

  // Log moderation action
  await moderationRepo.createModerationAction({
    communityId: report.communityId,
    actorUserId: userId,
    actionType: `report_${action}`,
    reason: `Report ${reportId} ${action}`,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Member moderation
// ---------------------------------------------------------------------------

async function validateModerationAction(actorUserId: string, membershipId: string) {
  const target = await moderationRepo.findMembershipById(membershipId);
  if (!target) {
    throw AppError.notFound('Membership not found');
  }

  const communityId = target.membership.communityId;

  // Check actor has moderate_members permission
  await requirePermission(actorUserId, communityId, MODERATE_ROLES);

  // Can't moderate owner or admin
  const targetRoles = await moderationRepo.getTargetUserRoles(membershipId);
  const isProtected = targetRoles.some((r) => PROTECTED_ROLES.includes(r.roleName));
  if (isProtected) {
    throw AppError.forbidden('Cannot moderate an owner or admin');
  }

  return target;
}

export async function muteMember(
  actorUserId: string,
  membershipId: string,
  reason?: string,
) {
  const target = await validateModerationAction(actorUserId, membershipId);

  await moderationRepo.muteMember(membershipId);

  await moderationRepo.createModerationAction({
    communityId: target.membership.communityId,
    actorUserId,
    targetUserId: target.membership.userId,
    actionType: 'member_muted',
    reason,
  });

  return { success: true };
}

export async function kickMember(
  actorUserId: string,
  membershipId: string,
  reason?: string,
) {
  const target = await validateModerationAction(actorUserId, membershipId);

  await moderationRepo.kickMember(membershipId);

  await moderationRepo.createModerationAction({
    communityId: target.membership.communityId,
    actorUserId,
    targetUserId: target.membership.userId,
    actionType: 'member_kicked',
    reason,
  });

  return { success: true };
}

export async function banMember(
  actorUserId: string,
  membershipId: string,
  reason?: string,
) {
  const target = await validateModerationAction(actorUserId, membershipId);

  await moderationRepo.banMember(membershipId);

  await moderationRepo.createModerationAction({
    communityId: target.membership.communityId,
    actorUserId,
    targetUserId: target.membership.userId,
    actionType: 'member_banned',
    reason,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export async function getAuditLog(
  userId: string,
  communityId: string,
  cursor?: string,
  limit?: number,
) {
  await requirePermission(userId, communityId, ADMIN_ROLES);
  return moderationRepo.findModerationActions(communityId, cursor, limit);
}
