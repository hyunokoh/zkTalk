import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as moderationService from './moderation.service.js';
import {
  CreateReportBodySchema,
  CommunityIdParamsSchema,
  ReportIdParamsSchema,
  MembershipIdParamsSchema,
  ResolveReportBodySchema,
  ModerationActionBodySchema,
  ReportsQuerySchema,
  CursorPaginationSchema,
} from './moderation.schema.js';

export default async function moderationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // POST /api/reports - create a report
  app.post('/api/reports', async (request, reply) => {
    const body = CreateReportBodySchema.parse(request.body);
    const report = await moderationService.reportContent(request.user.id, body);
    return reply.status(201).send({ report });
  });

  // GET /api/communities/:communityId/reports - list reports (mod+)
  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/reports',
    async (request, reply) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const { status, cursor, limit } = ReportsQuerySchema.parse(request.query);
      const result = await moderationService.getReports(
        request.user.id,
        communityId,
        status,
        cursor,
        limit,
      );
      return reply.send(result);
    },
  );

  // PATCH /api/reports/:reportId - resolve/dismiss a report (mod+)
  app.patch<{ Params: { reportId: string } }>(
    '/api/reports/:reportId',
    async (request, reply) => {
      const { reportId } = ReportIdParamsSchema.parse(request.params);
      const { status } = ResolveReportBodySchema.parse(request.body);
      const report = await moderationService.resolveReport(
        request.user.id,
        reportId,
        status,
      );
      return reply.send({ report });
    },
  );

  // POST /api/members/:membershipId/mute - mute a member (mod+)
  app.post<{ Params: { membershipId: string } }>(
    '/api/members/:membershipId/mute',
    async (request, reply) => {
      const { membershipId } = MembershipIdParamsSchema.parse(request.params);
      const { reason } = ModerationActionBodySchema.parse(request.body ?? {});
      const result = await moderationService.muteMember(
        request.user.id,
        membershipId,
        reason,
      );
      return reply.send(result);
    },
  );

  // POST /api/members/:membershipId/kick - kick a member (mod+)
  app.post<{ Params: { membershipId: string } }>(
    '/api/members/:membershipId/kick',
    async (request, reply) => {
      const { membershipId } = MembershipIdParamsSchema.parse(request.params);
      const { reason } = ModerationActionBodySchema.parse(request.body ?? {});
      const result = await moderationService.kickMember(
        request.user.id,
        membershipId,
        reason,
      );
      return reply.send(result);
    },
  );

  // POST /api/members/:membershipId/ban - ban a member (mod+)
  app.post<{ Params: { membershipId: string } }>(
    '/api/members/:membershipId/ban',
    async (request, reply) => {
      const { membershipId } = MembershipIdParamsSchema.parse(request.params);
      const { reason } = ModerationActionBodySchema.parse(request.body ?? {});
      const result = await moderationService.banMember(
        request.user.id,
        membershipId,
        reason,
      );
      return reply.send(result);
    },
  );

  // GET /api/communities/:communityId/audit-log - audit log (admin+)
  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/audit-log',
    async (request, reply) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const { cursor, limit } = CursorPaginationSchema.parse(request.query);
      const result = await moderationService.getAuditLog(
        request.user.id,
        communityId,
        cursor,
        limit,
      );
      return reply.send(result);
    },
  );
}
