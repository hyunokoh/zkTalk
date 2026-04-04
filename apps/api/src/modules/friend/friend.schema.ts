import { z } from 'zod';

export const SendFriendRequestSchema = z.object({
  userId: z.string().min(1),
});

export const FriendListQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'blocked']).optional(),
});

export const FriendUserSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
