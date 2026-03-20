import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../moderation.repository.js', () => ({
  createReport: vi.fn(),
  findReportById: vi.fn(),
  findReportsByCommunity: vi.fn(),
  resolveReport: vi.fn(),
  createModerationAction: vi.fn(),
  findModerationActions: vi.fn(),
  muteMember: vi.fn(),
  kickMember: vi.fn(),
  banMember: vi.fn(),
  findMembershipById: vi.fn(),
  getUserRolesInCommunity: vi.fn(),
  getTargetUserRoles: vi.fn(),
  findMembership: vi.fn(),
}));

import * as moderationService from '../moderation.service.js';
import * as moderationRepo from '../moderation.repository.js';

const mockRepo = vi.mocked(moderationRepo);

describe('moderation.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // reportContent
  // -------------------------------------------------------------------------

  describe('reportContent', () => {
    it('should create a report when user is an active member', async () => {
      mockRepo.findMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: 'community-1',
        userId: 'user-1',
        joinedAt: new Date(),
        membershipStatus: 'active',
        lastReadInboxAt: null,
      });

      const mockReport = {
        id: 'report-1',
        communityId: 'community-1',
        messageId: 'msg-1',
        reportedUserId: 'user-2',
        reporterUserId: 'user-1',
        reasonCode: 'spam',
        reasonText: 'This is spam',
        status: 'open' as const,
        createdAt: new Date(),
        resolvedByUserId: null,
      };
      mockRepo.createReport.mockResolvedValue(mockReport);
      mockRepo.createModerationAction.mockResolvedValue({
        id: 'action-1',
        communityId: 'community-1',
        actorUserId: 'user-1',
        targetUserId: 'user-2',
        targetMessageId: 'msg-1',
        actionType: 'report_created',
        reason: null,
        createdAt: new Date(),
      });

      const result = await moderationService.reportContent('user-1', {
        communityId: 'community-1',
        messageId: 'msg-1',
        reportedUserId: 'user-2',
        reasonCode: 'spam',
        reasonText: 'This is spam',
      });

      expect(result.id).toBe('report-1');
      expect(mockRepo.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 'community-1',
          reporterUserId: 'user-1',
          reasonCode: 'spam',
        }),
      );
      expect(mockRepo.createModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'report_created' }),
      );
    });

    it('should throw if reporter is not an active member', async () => {
      mockRepo.findMembership.mockResolvedValue(null as any);

      await expect(
        moderationService.reportContent('user-1', {
          communityId: 'community-1',
          reasonCode: 'spam',
        }),
      ).rejects.toThrow('You must be an active member of this community to report content');
    });

    it('should throw if reporter is muted', async () => {
      mockRepo.findMembership.mockResolvedValue({
        id: 'membership-1',
        communityId: 'community-1',
        userId: 'user-1',
        joinedAt: new Date(),
        membershipStatus: 'muted',
        lastReadInboxAt: null,
      });

      await expect(
        moderationService.reportContent('user-1', {
          communityId: 'community-1',
          reasonCode: 'spam',
        }),
      ).rejects.toThrow('You must be an active member of this community to report content');
    });
  });

  // -------------------------------------------------------------------------
  // getReports
  // -------------------------------------------------------------------------

  describe('getReports', () => {
    it('should return reports for moderator', async () => {
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-3', roleName: 'moderator', priority: 60 },
      ]);
      mockRepo.findReportsByCommunity.mockResolvedValue({
        reports: [],
        hasMore: false,
      });

      const result = await moderationService.getReports('user-1', 'community-1');
      expect(result.reports).toEqual([]);
    });

    it('should throw forbidden for regular member', async () => {
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-4', roleName: 'member', priority: 20 },
      ]);

      await expect(
        moderationService.getReports('user-1', 'community-1'),
      ).rejects.toThrow('You do not have permission to perform this action');
    });
  });

  // -------------------------------------------------------------------------
  // resolveReport
  // -------------------------------------------------------------------------

  describe('resolveReport', () => {
    it('should resolve a report', async () => {
      const report = {
        id: 'report-1',
        communityId: 'community-1',
        messageId: null,
        reportedUserId: null,
        reporterUserId: 'user-2',
        reasonCode: 'spam',
        reasonText: null,
        status: 'open' as const,
        createdAt: new Date(),
        resolvedByUserId: null,
      };
      mockRepo.findReportById.mockResolvedValue(report);
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-3', roleName: 'moderator', priority: 60 },
      ]);
      mockRepo.resolveReport.mockResolvedValue({ ...report, status: 'resolved' as const, resolvedByUserId: 'user-1' });
      mockRepo.createModerationAction.mockResolvedValue({
        id: 'action-1',
        communityId: 'community-1',
        actorUserId: 'user-1',
        targetUserId: null,
        targetMessageId: null,
        actionType: 'report_resolved',
        reason: 'Report report-1 resolved',
        createdAt: new Date(),
      });

      const result = await moderationService.resolveReport('user-1', 'report-1', 'resolved');
      expect(result!.status).toBe('resolved');
    });

    it('should throw not found for nonexistent report', async () => {
      mockRepo.findReportById.mockResolvedValue(null as any);

      await expect(
        moderationService.resolveReport('user-1', 'nonexistent', 'resolved'),
      ).rejects.toThrow('Report not found');
    });
  });

  // -------------------------------------------------------------------------
  // muteMember
  // -------------------------------------------------------------------------

  describe('muteMember', () => {
    it('should mute a regular member', async () => {
      mockRepo.findMembershipById.mockResolvedValue({
        membership: {
          id: 'membership-2',
          communityId: 'community-1',
          userId: 'user-2',
          joinedAt: new Date(),
          membershipStatus: 'active',
          lastReadInboxAt: null,
        },
        user: { id: 'user-2', displayName: 'User 2', username: 'user2' },
        community: { id: 'community-1', name: 'Test', ownerUserId: 'user-owner' },
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-3', roleName: 'moderator', priority: 60 },
      ]);

      mockRepo.getTargetUserRoles.mockResolvedValue([
        { roleId: 'role-4', roleName: 'member', priority: 20 },
      ]);

      mockRepo.muteMember.mockResolvedValue({
        id: 'membership-2',
        communityId: 'community-1',
        userId: 'user-2',
        joinedAt: new Date(),
        membershipStatus: 'muted',
        lastReadInboxAt: null,
      });

      mockRepo.createModerationAction.mockResolvedValue({
        id: 'action-1',
        communityId: 'community-1',
        actorUserId: 'user-1',
        targetUserId: 'user-2',
        targetMessageId: null,
        actionType: 'member_muted',
        reason: 'Spamming',
        createdAt: new Date(),
      });

      const result = await moderationService.muteMember('user-1', 'membership-2', 'Spamming');
      expect(result.success).toBe(true);
      expect(mockRepo.muteMember).toHaveBeenCalledWith('membership-2');
    });

    it('should throw forbidden when trying to mute an admin', async () => {
      mockRepo.findMembershipById.mockResolvedValue({
        membership: {
          id: 'membership-2',
          communityId: 'community-1',
          userId: 'user-2',
          joinedAt: new Date(),
          membershipStatus: 'active',
          lastReadInboxAt: null,
        },
        user: { id: 'user-2', displayName: 'Admin', username: 'admin' },
        community: { id: 'community-1', name: 'Test', ownerUserId: 'user-owner' },
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-3', roleName: 'moderator', priority: 60 },
      ]);

      mockRepo.getTargetUserRoles.mockResolvedValue([
        { roleId: 'role-2', roleName: 'admin', priority: 80 },
      ]);

      await expect(
        moderationService.muteMember('user-1', 'membership-2'),
      ).rejects.toThrow('Cannot moderate an owner or admin');
    });

    it('should throw forbidden when trying to mute an owner', async () => {
      mockRepo.findMembershipById.mockResolvedValue({
        membership: {
          id: 'membership-2',
          communityId: 'community-1',
          userId: 'user-owner',
          joinedAt: new Date(),
          membershipStatus: 'active',
          lastReadInboxAt: null,
        },
        user: { id: 'user-owner', displayName: 'Owner', username: 'owner' },
        community: { id: 'community-1', name: 'Test', ownerUserId: 'user-owner' },
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-2', roleName: 'admin', priority: 80 },
      ]);

      mockRepo.getTargetUserRoles.mockResolvedValue([
        { roleId: 'role-1', roleName: 'owner', priority: 100 },
      ]);

      await expect(
        moderationService.muteMember('user-1', 'membership-2'),
      ).rejects.toThrow('Cannot moderate an owner or admin');
    });

    it('should throw not found for nonexistent membership', async () => {
      mockRepo.findMembershipById.mockResolvedValue(null as any);

      await expect(
        moderationService.muteMember('user-1', 'nonexistent'),
      ).rejects.toThrow('Membership not found');
    });

    it('should throw forbidden for regular member trying to mute', async () => {
      mockRepo.findMembershipById.mockResolvedValue({
        membership: {
          id: 'membership-2',
          communityId: 'community-1',
          userId: 'user-2',
          joinedAt: new Date(),
          membershipStatus: 'active',
          lastReadInboxAt: null,
        },
        user: { id: 'user-2', displayName: 'User 2', username: 'user2' },
        community: { id: 'community-1', name: 'Test', ownerUserId: 'user-owner' },
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-4', roleName: 'member', priority: 20 },
      ]);

      await expect(
        moderationService.muteMember('user-1', 'membership-2'),
      ).rejects.toThrow('You do not have permission to perform this action');
    });
  });

  // -------------------------------------------------------------------------
  // kickMember
  // -------------------------------------------------------------------------

  describe('kickMember', () => {
    it('should kick a regular member', async () => {
      mockRepo.findMembershipById.mockResolvedValue({
        membership: {
          id: 'membership-2',
          communityId: 'community-1',
          userId: 'user-2',
          joinedAt: new Date(),
          membershipStatus: 'active',
          lastReadInboxAt: null,
        },
        user: { id: 'user-2', displayName: 'User 2', username: 'user2' },
        community: { id: 'community-1', name: 'Test', ownerUserId: 'user-owner' },
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-3', roleName: 'moderator', priority: 60 },
      ]);

      mockRepo.getTargetUserRoles.mockResolvedValue([
        { roleId: 'role-4', roleName: 'member', priority: 20 },
      ]);

      mockRepo.kickMember.mockResolvedValue({
        id: 'membership-2',
        communityId: 'community-1',
        userId: 'user-2',
        joinedAt: new Date(),
        membershipStatus: 'left',
        lastReadInboxAt: null,
      });

      mockRepo.createModerationAction.mockResolvedValue({
        id: 'action-1',
        communityId: 'community-1',
        actorUserId: 'user-1',
        targetUserId: 'user-2',
        targetMessageId: null,
        actionType: 'member_kicked',
        reason: null,
        createdAt: new Date(),
      });

      const result = await moderationService.kickMember('user-1', 'membership-2');
      expect(result.success).toBe(true);
      expect(mockRepo.kickMember).toHaveBeenCalledWith('membership-2');
    });
  });

  // -------------------------------------------------------------------------
  // banMember
  // -------------------------------------------------------------------------

  describe('banMember', () => {
    it('should ban a regular member', async () => {
      mockRepo.findMembershipById.mockResolvedValue({
        membership: {
          id: 'membership-2',
          communityId: 'community-1',
          userId: 'user-2',
          joinedAt: new Date(),
          membershipStatus: 'active',
          lastReadInboxAt: null,
        },
        user: { id: 'user-2', displayName: 'User 2', username: 'user2' },
        community: { id: 'community-1', name: 'Test', ownerUserId: 'user-owner' },
      });

      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-2', roleName: 'admin', priority: 80 },
      ]);

      mockRepo.getTargetUserRoles.mockResolvedValue([
        { roleId: 'role-4', roleName: 'member', priority: 20 },
      ]);

      mockRepo.banMember.mockResolvedValue({
        id: 'membership-2',
        communityId: 'community-1',
        userId: 'user-2',
        joinedAt: new Date(),
        membershipStatus: 'banned',
        lastReadInboxAt: null,
      });

      mockRepo.createModerationAction.mockResolvedValue({
        id: 'action-1',
        communityId: 'community-1',
        actorUserId: 'user-1',
        targetUserId: 'user-2',
        targetMessageId: null,
        actionType: 'member_banned',
        reason: 'Repeated violations',
        createdAt: new Date(),
      });

      const result = await moderationService.banMember('user-1', 'membership-2', 'Repeated violations');
      expect(result.success).toBe(true);
      expect(mockRepo.banMember).toHaveBeenCalledWith('membership-2');
    });
  });

  // -------------------------------------------------------------------------
  // getAuditLog
  // -------------------------------------------------------------------------

  describe('getAuditLog', () => {
    it('should return audit log for admin', async () => {
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-2', roleName: 'admin', priority: 80 },
      ]);
      mockRepo.findModerationActions.mockResolvedValue({
        actions: [],
        hasMore: false,
      });

      const result = await moderationService.getAuditLog('user-1', 'community-1');
      expect(result.actions).toEqual([]);
    });

    it('should throw forbidden for moderator trying to view audit log', async () => {
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-3', roleName: 'moderator', priority: 60 },
      ]);

      await expect(
        moderationService.getAuditLog('user-1', 'community-1'),
      ).rejects.toThrow('You do not have permission to perform this action');
    });

    it('should throw forbidden for regular member', async () => {
      mockRepo.getUserRolesInCommunity.mockResolvedValue([
        { roleId: 'role-4', roleName: 'member', priority: 20 },
      ]);

      await expect(
        moderationService.getAuditLog('user-1', 'community-1'),
      ).rejects.toThrow('You do not have permission to perform this action');
    });
  });
});
