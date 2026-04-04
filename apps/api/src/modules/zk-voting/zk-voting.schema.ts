import { z } from 'zod';

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

export const PollIdParamsSchema = z.object({
  pollId: z.string().min(1),
});

export const CreateZkPollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
});

export const ZkVoteSchema = z.object({
  voteHash: z.string().min(1),
  nullifier: z.string().min(1),
  optionId: z.string().min(1),
});

export const ZkVerifySchema = z.object({
  nullifier: z.string().min(1),
  secret: z.string().min(1),
  optionId: z.string().min(1),
});
