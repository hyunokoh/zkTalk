import { z } from 'zod';

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(1),
});

export const CreateCommunitySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'invite_only', 'private']).default('public'),
});

export const UpdateCommunitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'invite_only', 'private']).optional(),
  iconUrl: z.string().url().max(2048).nullable().optional(),
});

export const CreateInviteSchema = z.object({
  maxUses: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  position: z.number().int().nonnegative().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const CreateChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['chat', 'announcement', 'forum', 'voice']).default('chat'),
  categoryId: z.string().optional(),
  visibility: z.enum(['public', 'role_restricted']).default('public'),
  slowModeSeconds: z.number().int().nonnegative().default(0),
  requireTopic: z.boolean().default(false),
  allowedViewRoleIds: z.array(z.string()).optional(),
  allowedPostRoleIds: z.array(z.string()).optional(),
});

export const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'role_restricted']).optional(),
  slowModeSeconds: z.number().int().nonnegative().optional(),
  categoryId: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  disappearingDuration: z.number().int().nonnegative().nullable().optional(), // seconds, null = disabled
  requireTopic: z.boolean().optional(),
  allowedViewRoleIds: z.array(z.string()).optional(),
  allowedPostRoleIds: z.array(z.string()).optional(),
});

export const CreateMessageSchema = z.object({
  bodyMarkdown: z.string().min(1).max(32000),
  parentMessageId: z.string().optional(),
  topic: z.string().max(200).optional(),
  uploadSessionIds: z.array(z.string().min(1)).max(20).optional(),
});

export const UpdateMessageSchema = z.object({
  bodyMarkdown: z.string().min(1).max(32000),
});

export const CreateReactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});

export const CreateReportSchema = z.object({
  messageId: z.string().optional(),
  reportedUserId: z.string().optional(),
  reasonCode: z.string().min(1),
  reasonText: z.string().max(1000).optional(),
});

export const SearchMessagesSchema = z.object({
  q: z.string().min(1).max(200),
  communityId: z.string(),
  channelId: z.string().optional(),
  authorId: z.string().optional(),
  author: z.string().min(1).max(100).optional(),
  hasAttachment: z.coerce.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Sealed Sender ────────────────────────────────────────────────────

export const CreateSealedMessageSchema = z.object({
  encryptedPayload: z.string().min(1).max(16000),
});

// ── Backup / Restore ─────────────────────────────────────────────────

export const RestoreBackupSchema = z.object({
  encryptedData: z.string().min(1),
});

// ── Multi-method Auth Schemas ────────────────────────────────────────

export const PhoneRequestSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format'),
});

export const PhoneVerifySchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format'),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const OAuthGoogleSchema = z.object({
  idToken: z.string().min(1),
});

export const OAuthAppleSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().optional(),
});

export const QrConfirmSchema = z.object({
  qrToken: z.string().min(1),
});

export const AuthMethodTypeSchema = z.enum(['phone', 'email', 'google', 'apple']);

export const LinkAuthMethodSchema = z.object({
  type: AuthMethodTypeSchema,
  identifier: z.string().min(1),
  verificationToken: z.string().optional(),
});

export const LastVisitedLocationSchema = z.object({
  kind: z.enum(['community', 'channel', 'thread', 'dm']),
  communityId: z.string().optional(),
  channelId: z.string().optional(),
  threadId: z.string().optional(),
  conversationId: z.string().optional(),
});

export const UserSettingsSchema = z.object({
  communityOrder: z.array(z.string()),
  collapsedSections: z.record(z.string(), z.boolean()),
  lastVisited: LastVisitedLocationSchema.nullable(),
  updatedAt: z.string().datetime(),
});

export const UpdateUserSettingsSchema = z.object({
  communityOrder: z.array(z.string()).optional(),
  collapsedSections: z.record(z.string(), z.boolean()).optional(),
  lastVisited: LastVisitedLocationSchema.nullable().optional(),
}).strict();
