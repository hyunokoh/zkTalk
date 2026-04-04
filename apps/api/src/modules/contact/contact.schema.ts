import { z } from 'zod';

export const ContactSyncSchema = z.object({
  hashes: z.array(z.string().regex(/^[a-f0-9]{64}$/, 'Must be SHA-256 hex hash')).min(1).max(1000),
});

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});
