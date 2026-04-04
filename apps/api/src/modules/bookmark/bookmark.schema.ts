import { z } from 'zod';

export const MessageIdParamsSchema = z.object({
  messageId: z.string().min(1),
});

export { CursorPaginationSchema } from '@zktalk/shared';
