import { z } from 'zod';

// ---------------------------------------------------------------------------
// Param schemas
// ---------------------------------------------------------------------------

export const DmConversationIdParamsSchema = z.object({
  conversationId: z.string().min(1),
});

export const DmMessageIdParamsSchema = z.object({
  messageId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Body schemas
// ---------------------------------------------------------------------------

export const CreateDirectDmSchema = z.object({
  targetUserId: z.string().min(1),
});

export const CreateGroupDmSchema = z.object({
  participantUserIds: z.array(z.string().min(1)).min(2),
  name: z.string().min(1).max(100).optional(),
});

export const SendDmMessageSchema = z.object({
  bodyMarkdown: z.string().min(1),
  isEncrypted: z.boolean().optional().default(false),
  encryptedPayload: z.string().min(1).max(16000).optional(),
}).superRefine((data, ctx) => {
  if (data.isEncrypted && !data.encryptedPayload) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'encryptedPayload is required for encrypted messages',
      path: ['encryptedPayload'],
    });
  }
});

export const UpdateDmMessageSchema = z.object({
  bodyMarkdown: z.string().min(1),
  isEncrypted: z.boolean().optional().default(false),
  encryptedPayload: z.string().min(1).max(16000).optional(),
}).superRefine((data, ctx) => {
  if (data.isEncrypted && !data.encryptedPayload) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'encryptedPayload is required for encrypted messages',
      path: ['encryptedPayload'],
    });
  }
});

export const AddDmMemberSchema = z.object({
  userId: z.string().min(1),
});

export const MarkReadSchema = z.object({
  messageId: z.string().min(1),
});

export const PromoteDmToCommunitySchema = z.object({
  communityName: z.string().trim().min(1).max(100).optional(),
  channelName: z.string().trim().min(1).max(100).optional(),
});

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

export const DmPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const DmUserSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
