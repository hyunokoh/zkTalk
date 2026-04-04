import { z } from 'zod';

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const PollIdParamsSchema = z.object({
  pollId: z.string().min(1),
});

export const PollMessageQuerySchema = z.object({
  messageIds: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
});

export const VoteParamsSchema = z.object({
  pollId: z.string().min(1),
  optionId: z.string().min(1),
});

export const CreatePollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  isAnonymous: z.boolean().optional().default(false),
  allowMultiple: z.boolean().optional().default(false),
  expiresInHours: z.number().int().positive().max(24 * 30).optional(),
});

export const VotePollSchema = z.object({
  optionId: z.string().min(1),
});
