import { z } from 'zod';

export const CommunityIdParamsSchema = z.object({
  communityId: z.string().min(1),
});

export const RuleIdParamsSchema = z.object({
  ruleId: z.string().min(1),
});

export const CreateAutoModRuleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['keyword_filter', 'spam_filter', 'link_filter']),
  config: z.record(z.unknown()),
  isEnabled: z.boolean().optional().default(true),
  action: z.enum(['block', 'flag', 'mute']),
});

export const UpdateAutoModRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.record(z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
  action: z.enum(['block', 'flag', 'mute']).optional(),
});

export type CreateAutoModRuleInput = z.infer<typeof CreateAutoModRuleSchema>;
export type UpdateAutoModRuleInput = z.infer<typeof UpdateAutoModRuleSchema>;
