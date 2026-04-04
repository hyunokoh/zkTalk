import { z } from 'zod';

export const CreateP2pFileSchema = z.object({
  channelId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  fileName: z.string().min(1).max(500),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(200),
  fileHash: z.string().length(64), // SHA-256 hex = 64 chars
  chunkCount: z.number().int().positive(),
});

export const FileIdParamsSchema = z.object({
  fileId: z.string().min(1),
});
