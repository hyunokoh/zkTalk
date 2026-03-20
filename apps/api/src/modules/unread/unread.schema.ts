import { z } from 'zod';

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const CommunityIdParamsSchema = z.object({
  communityId: z.string().min(1),
});

export const MarkReadSchema = z.object({
  lastMessageId: z.string().min(1),
});
