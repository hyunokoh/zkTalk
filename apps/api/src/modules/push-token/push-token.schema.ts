import { z } from 'zod';

export const RegisterPushTokenSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['ios', 'android', 'web']),
});

export type RegisterPushTokenInput = z.infer<typeof RegisterPushTokenSchema>;
