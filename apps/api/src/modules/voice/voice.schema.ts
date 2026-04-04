import { z } from 'zod';

export const VoiceTokenParamsSchema = z.object({
  channelId: z.string().min(1),
});
