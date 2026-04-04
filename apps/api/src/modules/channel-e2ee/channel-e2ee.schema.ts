import { z } from 'zod';

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const InitE2eeSchema = z.object({
  // Map of userId -> encryptedGroupKey (base64)
  memberKeys: z.record(z.string(), z.string().min(1)),
  keyVersion: z.number().int().positive().default(1),
});

export const RotateKeySchema = z.object({
  // Map of userId -> newEncryptedGroupKey (base64)
  memberKeys: z.record(z.string(), z.string().min(1)),
  keyVersion: z.number().int().positive(),
});

export const AddMemberKeySchema = z.object({
  userId: z.string().min(1),
  encryptedGroupKey: z.string().min(1),
  keyVersion: z.number().int().positive(),
});
