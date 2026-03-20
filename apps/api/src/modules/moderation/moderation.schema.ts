import { z } from 'zod';
import { CreateReportSchema, CursorPaginationSchema } from '@zktalk/shared';

export { CreateReportSchema, CursorPaginationSchema };

export const CommunityIdParamsSchema = z.object({
  communityId: z.string().min(1),
});

export const ReportIdParamsSchema = z.object({
  reportId: z.string().min(1),
});

export const MembershipIdParamsSchema = z.object({
  membershipId: z.string().min(1),
});

export const ResolveReportBodySchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
});

export const ModerationActionBodySchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const ReportsQuerySchema = CursorPaginationSchema.extend({
  status: z.enum(['open', 'resolved', 'dismissed']).optional(),
});

export const CreateReportBodySchema = CreateReportSchema.extend({
  communityId: z.string().min(1),
});
