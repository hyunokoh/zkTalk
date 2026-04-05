import { z } from 'zod';

export const UploadSessionRequestSchema = z.object({
  channelId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  targetKind: z.enum(['channel_message', 'thread_reply', 'dm_message', 'user_avatar', 'community_icon']).optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  fileSize: z.number().positive(),
}).refine(
  (value) => {
    const scopedTargets = [value.channelId, value.conversationId].filter(Boolean).length;
    return scopedTargets <= 1;
  },
  {
    message: 'Only one upload target scope is allowed',
    path: ['channelId'],
  },
);

export const PresignRequestSchema = UploadSessionRequestSchema;

export const UploadSessionPartRequestSchema = z.object({
  partNumbers: z.array(z.number().int().positive()).min(1).max(1000),
});

export const CompleteUploadSessionSchema = z.object({
  parts: z.array(z.object({
    partNumber: z.number().int().positive(),
    etag: z.string().min(1),
  })).max(1000),
});

export const SessionIdParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export const AssetPresignRequestSchema = z.object({
  scope: z.enum(['user_avatar', 'community_icon']),
  communityId: z.string().min(1).optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().startsWith('image/').max(127),
  fileSize: z.number().int().positive(),
});

export const CreateAttachmentSchema = z.object({
  messageId: z.string().min(1).optional(),
  dmMessageId: z.string().min(1).optional(),
  uploadSessionId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
}).refine(
  (value) => Boolean(value.messageId) !== Boolean(value.dmMessageId),
  {
    message: 'Exactly one of messageId or dmMessageId is required',
    path: ['messageId'],
  },
);
