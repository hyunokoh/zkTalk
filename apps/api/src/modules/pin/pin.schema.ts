import { z } from 'zod';

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const MessageIdParamsSchema = z.object({
  messageId: z.string().min(1),
});

export const PinParamsSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
});
