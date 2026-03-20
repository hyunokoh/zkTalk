import { z } from 'zod';

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(1),
});

export const CreateCommunitySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'invite_only', 'private']).default('public'),
});

export const UpdateCommunitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'invite_only', 'private']).optional(),
});

export const CreateInviteSchema = z.object({
  maxUses: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  position: z.number().int().nonnegative().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const CreateChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['chat', 'announcement', 'forum']).default('chat'),
  categoryId: z.string().optional(),
  visibility: z.enum(['public', 'role_restricted']).default('public'),
  slowModeSeconds: z.number().int().nonnegative().default(0),
});

export const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'role_restricted']).optional(),
  slowModeSeconds: z.number().int().nonnegative().optional(),
  categoryId: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const CreateMessageSchema = z.object({
  bodyMarkdown: z.string().min(1).max(4000),
  parentMessageId: z.string().optional(),
});

export const UpdateMessageSchema = z.object({
  bodyMarkdown: z.string().min(1).max(4000),
});

export const CreateReactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});

export const CreateReportSchema = z.object({
  messageId: z.string().optional(),
  reportedUserId: z.string().optional(),
  reasonCode: z.string().min(1),
  reasonText: z.string().max(1000).optional(),
});

export const SearchMessagesSchema = z.object({
  q: z.string().min(1).max(200),
  communityId: z.string(),
  channelId: z.string().optional(),
  authorId: z.string().optional(),
  hasAttachment: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
