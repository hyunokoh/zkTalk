import { z } from 'zod';

// ── Webhook schemas ──────────────────────────────────────────────────

export const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  channelId: z.string().min(1),
  avatarUrl: z.string().url().optional(),
});

export const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const ExecuteWebhookSchema = z.object({
  content: z.string().min(1).max(4000),
  username: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

// ── Bot schemas ──────────────────────────────────────────────────────

export const CreateBotSchema = z.object({
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  permissions: z.array(z.string()).optional(),
});

export const UpdateBotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

export const BotSendMessageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

// ── Slash command schemas ────────────────────────────────────────────

export const RegisterSlashCommandSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, 'Command name must be lowercase alphanumeric with hyphens or underscores'),
  description: z.string().max(200).optional(),
});
