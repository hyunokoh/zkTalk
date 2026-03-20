import { z } from 'zod';

export const PresignRequestSchema = z.object({
  channelId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  fileSize: z.number().int().positive(),
});

export const CreateAttachmentSchema = z.object({
  messageId: z.string().min(1),
  storageKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
