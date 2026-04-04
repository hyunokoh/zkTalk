import { z } from 'zod';

// ---------------------------------------------------------------------------
// Param schemas
// ---------------------------------------------------------------------------

export const MessageIdParamsSchema = z.object({
  messageId: z.string().min(1),
});

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const ThreadIdParamsSchema = z.object({
  threadId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

export const ThreadListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['latest', 'top']).optional().default('latest'),
});

export const ThreadMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const ThreadSummaryQuerySchema = z.object({
  rootMessageIds: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine((items) => items.length > 0 && items.length <= 100, {
      message: 'Provide between 1 and 100 rootMessageIds',
    }),
});

// ---------------------------------------------------------------------------
// Body schemas
// ---------------------------------------------------------------------------

export const CreateForumPostSchema = z.object({
  title: z.string().min(1).max(300),
  bodyMarkdown: z.string().min(1).max(40000),
});

export const PostToThreadSchema = z.object({
  bodyMarkdown: z.string().min(1).max(40000),
});

export const MarkThreadReadSchema = z.object({
  messageId: z.string().min(1),
});
