import { z } from 'zod';
import {
  MagicLinkRequestSchema,
  MagicLinkVerifySchema,
  PhoneRequestSchema,
  PhoneVerifySchema,
  OAuthGoogleSchema,
  OAuthAppleSchema,
  QrConfirmSchema,
  LinkAuthMethodSchema,
  UpdateUserSettingsSchema,
} from '@zktalk/shared';

export {
  MagicLinkRequestSchema,
  MagicLinkVerifySchema,
  PhoneRequestSchema,
  PhoneVerifySchema,
  OAuthGoogleSchema,
  OAuthAppleSchema,
  QrConfirmSchema,
  LinkAuthMethodSchema,
};

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  // Allow `null` so the client can clear an existing bio. Without this the
  // ProfileEditor sends `null` for cleared text and the server rejects it.
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens').optional(),
}).strict();

export const SetPublicKeySchema = z.object({
  publicKey: z.string().min(1).max(2048),
});

export const UserIdParamsSchema = z.object({
  userId: z.string().min(1),
});

export const QrTokenParamsSchema = z.object({
  token: z.string().min(1),
});

export const AuthMethodIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const EmailLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const EmailLinkVerifySchema = z.object({
  token: z.string().min(1),
});

export { UpdateUserSettingsSchema };
