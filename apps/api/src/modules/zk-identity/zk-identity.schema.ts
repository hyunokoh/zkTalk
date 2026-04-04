import { z } from 'zod';

export const UserIdParamsSchema = z.object({
  userId: z.string().min(1),
});

export const CreateZkCredentialSchema = z.object({
  credentialType: z.string().min(1).max(100),
  credentialHash: z.string().min(1),
  metadata: z.string().optional(), // JSON string
});
