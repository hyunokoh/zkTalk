import { z } from 'zod';

// ---------------------------------------------------------------------------
// Param schemas
// ---------------------------------------------------------------------------

export const CommunityIdParamsSchema = z.object({
  communityId: z.string().min(1),
});

export const CategoryIdParamsSchema = z.object({
  categoryId: z.string().min(1),
});

export const ChannelIdParamsSchema = z.object({
  channelId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Body schemas (re-export from shared for convenience)
// ---------------------------------------------------------------------------

export {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateChannelSchema,
  UpdateChannelSchema,
} from '@zktalk/shared';
