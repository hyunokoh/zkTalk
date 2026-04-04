import { z } from 'zod';
import { CursorPaginationSchema } from '@zktalk/shared';

export { CursorPaginationSchema };

const InboxTypeSchema = z.enum(['all', 'mentions', 'threads']);

export const InboxQuerySchema = CursorPaginationSchema.extend({
  communityId: z.string().optional(),
  q: z.string().trim().optional(),
});

export const InboxMessageParamsSchema = z.object({
  messageId: z.string().min(1),
});

export const InboxSummaryQuerySchema = z.object({
  communityId: z.string().optional(),
});

export const InboxMarkAllReadSchema = z.object({
  communityId: z.string().optional(),
  type: InboxTypeSchema.optional(),
});
