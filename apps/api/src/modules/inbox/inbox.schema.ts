import { z } from 'zod';
import { CursorPaginationSchema } from '@zktalk/shared';

export { CursorPaginationSchema };

export const InboxQuerySchema = CursorPaginationSchema.extend({
  communityId: z.string().optional(),
});
