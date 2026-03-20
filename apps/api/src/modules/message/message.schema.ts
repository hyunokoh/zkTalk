import { z } from 'zod';

// ---------------------------------------------------------------------------
// Param schemas
// ---------------------------------------------------------------------------

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const MessageIdParamsSchema = z.object({
  messageId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Body / query schemas (re-export from shared for convenience)
// ---------------------------------------------------------------------------

export {
  CreateMessageSchema,
  UpdateMessageSchema,
  CursorPaginationSchema,
} from '@zktalk/shared';
