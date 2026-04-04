import { z } from 'zod';

export const CommunityIdParamsSchema = z.object({
  communityId: z.string().min(1),
});

export const EmojiIdParamsSchema = z.object({
  emojiId: z.string().min(1),
});

export const CreateEmojiSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Emoji name can only contain letters, numbers, underscores, and hyphens'),
  imageUrl: z.string().url(),
});

export type CreateEmojiInput = z.infer<typeof CreateEmojiSchema>;
