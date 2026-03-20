import { z } from 'zod';

export const MessageIdParamsSchema = z.object({
  messageId: z.string().min(1),
});

export const ReactionParamsSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1),
});

export const AddReactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});
