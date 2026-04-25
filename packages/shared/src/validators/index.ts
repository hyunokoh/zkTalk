import { z } from 'zod';

const TRANSLATION_LANGUAGE_CODE_REGEX = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
const TranslationLanguageCodeSchema = z
  .string()
  .min(2)
  .max(16)
  .regex(TRANSLATION_LANGUAGE_CODE_REGEX);

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

export const CreateChannelSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    type: z.enum(['chat', 'announcement', 'forum', 'voice']).default('chat'),
    categoryId: z.string().optional(),
    visibility: z.enum(['public', 'role_restricted']).default('public'),
    accessPolicy: z.enum(['public', 'members_only', 'invite_only', 'private']).optional(),
    slowModeSeconds: z.number().int().nonnegative().default(0),
    requireTopic: z.boolean().default(false),
    allowedViewRoleIds: z.array(z.string()).optional(),
    allowedPostRoleIds: z.array(z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.accessPolicy) {
      return;
    }

    const hasViewRoles = (value.allowedViewRoleIds?.length ?? 0) > 0;
    const hasPostRoles = (value.allowedPostRoleIds?.length ?? 0) > 0;

    if (
      (value.accessPolicy === 'public' || value.accessPolicy === 'members_only') &&
      (hasViewRoles || hasPostRoles)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accessPolicy'],
        message: 'Only invite-only or private channels can define allowed roles',
      });
    }

    if (
      (value.accessPolicy === 'invite_only' || value.accessPolicy === 'private') &&
      !hasViewRoles
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowedViewRoleIds'],
        message: 'Invite-only and private channels require at least one allowed view role',
      });
    }
  });

export const UpdateChannelSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    visibility: z.enum(['public', 'role_restricted']).optional(),
    accessPolicy: z.enum(['public', 'members_only', 'invite_only', 'private']).optional(),
    slowModeSeconds: z.number().int().nonnegative().optional(),
    categoryId: z.string().nullable().optional(),
    position: z.number().int().nonnegative().optional(),
    disappearingDuration: z.number().int().nonnegative().nullable().optional(), // seconds, null = disabled
    requireTopic: z.boolean().optional(),
    allowedViewRoleIds: z.array(z.string()).optional(),
    allowedPostRoleIds: z.array(z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.allowedPostRoleIds !== undefined && value.allowedViewRoleIds === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowedViewRoleIds'],
        message:
          'Restricted channel role updates must include allowedViewRoleIds when allowedPostRoleIds is provided',
      });
    }

    if (!value.accessPolicy) {
      return;
    }

    const hasViewRoles = (value.allowedViewRoleIds?.length ?? 0) > 0;
    const hasPostRoles = (value.allowedPostRoleIds?.length ?? 0) > 0;

    if (
      (value.accessPolicy === 'public' || value.accessPolicy === 'members_only') &&
      (hasViewRoles || hasPostRoles)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accessPolicy'],
        message: 'Only invite-only or private channels can define allowed roles',
      });
    }

    if (
      (value.accessPolicy === 'invite_only' || value.accessPolicy === 'private') &&
      value.allowedViewRoleIds !== undefined &&
      !hasViewRoles
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowedViewRoleIds'],
        message: 'Invite-only and private channels require at least one allowed view role',
      });
    }
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

export const TranslationDisplayModeSchema = z.enum([
  'manual_only',
  'target_language_all',
  'target_language_except_readable',
]);

export const TranslationDisplayPresetIdSchema = z.enum([
  'english_only',
  'korean_preferred_english_readable',
  'manual_only',
]);

export const TranslationDisplayPreferenceSchema = z.object({
  uiLocale: TranslationLanguageCodeSchema,
  mode: TranslationDisplayModeSchema,
  targetLanguage: TranslationLanguageCodeSchema.nullable(),
  readableLanguages: z.array(TranslationLanguageCodeSchema),
}).superRefine((value, ctx) => {
  if (value.mode === 'manual_only' && value.targetLanguage !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetLanguage'],
      message: 'Manual-only translation preferences must not set a target language',
    });
  }

  if (value.mode !== 'manual_only' && value.targetLanguage === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetLanguage'],
      message: 'Automatic translation preferences require a target language',
    });
  }

  if (value.mode === 'target_language_all' && value.readableLanguages.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['readableLanguages'],
      message:
        'Target-language-all translation preferences cannot include readable-language exceptions',
    });
  }
});

export const MachineTypeSchema = z.enum(['desktop', 'laptop', 'buildbox', 'other']);

export const MachinePresenceStatusSchema = z.enum([
  'online',
  'busy',
  'offline',
  'auth_missing',
  'bridge_missing',
]);

export const MachineCodexAuthStateSchema = z.enum(['auth_present', 'auth_missing']);

export const MachineExecutionIntentSchema = z.enum(['analyze', 'edit', 'run', 'summarize']);

export const MachineCommandStatusSchema = z.enum([
  'queued',
  'accepted',
  'streaming',
  'completed',
  'failed',
  'rejected',
]);

export const MachineNameSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/, 'Machine names must be lowercase slugs');

export const RegisterLocalMachineSchema = z.object({
  name: MachineNameSchema,
  type: MachineTypeSchema,
  bridgeIdentifier: z.string().min(8).max(200),
});

export const LocalMachinePresenceSchema = z
  .object({
    machineId: z.string().min(1),
    ownerUserId: z.string().min(1),
    status: MachinePresenceStatusSchema,
    codexAuthState: MachineCodexAuthStateSchema,
    activeCommandId: z.string().min(1).nullable(),
    lastSeenAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'busy' && !value.activeCommandId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activeCommandId'],
        message: 'Busy machine presence requires activeCommandId',
      });
    }

    if (value.status !== 'busy' && value.activeCommandId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activeCommandId'],
        message: 'Only busy machine presence may include activeCommandId',
      });
    }

    if (value.status === 'auth_missing' && value.codexAuthState !== 'auth_missing') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codexAuthState'],
        message: 'auth_missing machine presence requires auth_missing codexAuthState',
      });
    }

    if (
      (value.status === 'online' || value.status === 'busy') &&
      value.codexAuthState !== 'auth_present'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codexAuthState'],
        message: 'Runnable machine presence requires auth_present codexAuthState',
      });
    }
  });

export const LocalMachineCommandSourceSchema = z
  .object({
    kind: z.enum(['channel', 'thread', 'dm', 'control']),
    communityId: z.string().min(1).nullable().optional(),
    channelId: z.string().min(1).nullable().optional(),
    threadId: z.string().min(1).nullable().optional(),
    conversationId: z.string().min(1).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.kind === 'channel' || value.kind === 'thread') && !value.channelId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['channelId'],
        message: 'Channel and thread commands require channelId',
      });
    }

    if (value.kind === 'thread' && !value.threadId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['threadId'],
        message: 'Thread commands require threadId',
      });
    }

    if (value.kind === 'dm' && !value.conversationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['conversationId'],
        message: 'DM commands require conversationId',
      });
    }
  });

export const LocalMachineSelectedMessageExcerptSchema = z.object({
  messageId: z.string().min(1),
  authorUserId: z.string().min(1),
  bodyPlaintext: z.string().min(1).max(8000),
  createdAt: z.string().datetime(),
});

export const LocalMachineAttachmentReferenceSchema = z.object({
  attachmentId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  downloadUrl: z.string().url().max(4096),
});

export const LocalMachineCommandEnvelopeSchema = z.object({
  id: z.string().min(1),
  targetMachineId: z.string().min(1),
  owningUserId: z.string().min(1),
  source: LocalMachineCommandSourceSchema,
  instruction: z.string().min(1).max(12000),
  intent: MachineExecutionIntentSchema,
  selectedMessages: z.array(LocalMachineSelectedMessageExcerptSchema).max(20).default([]),
  attachmentReferences: z.array(LocalMachineAttachmentReferenceSchema).max(20).default([]),
  createdAt: z.string().datetime(),
});

export const LocalMachineCommandUpdateSchema = z
  .object({
    commandId: z.string().min(1),
    targetMachineId: z.string().min(1),
    owningUserId: z.string().min(1),
    status: MachineCommandStatusSchema,
    summary: z.string().max(4000).nullable(),
    outputText: z.string().max(32000).nullable(),
    errorCode: z
      .enum(['offline', 'busy', 'auth_missing', 'bridge_missing', 'timed_out', 'rejected'])
      .nullable(),
    createdAt: z.string().datetime(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.status === 'accepted' || value.status === 'streaming' || value.status === 'completed') &&
      value.errorCode
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['errorCode'],
        message: `Local machine command status "${value.status}" cannot include an error code`,
      });
    }

    if (value.status === 'failed' && !value.errorCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['errorCode'],
        message: 'Failed local machine command updates require an explicit error code',
      });
    }

    if (value.status === 'failed' && value.errorCode === 'rejected') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['errorCode'],
        message: 'Failed local machine command updates cannot use the "rejected" error code',
      });
    }

    if (value.status === 'rejected' && value.errorCode !== 'rejected') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['errorCode'],
        message: 'Rejected local machine command updates must use the "rejected" error code',
      });
    }
  });

export const UserSettingsSchema = z.object({
  communityOrder: z.array(z.string()),
  collapsedSections: z.record(z.string(), z.boolean()),
  lastVisited: LastVisitedLocationSchema.nullable(),
  translationDisplay: TranslationDisplayPreferenceSchema,
  useAgentForTranslation: z.boolean(),
  useAgentForAi: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const UpdateUserSettingsSchema = z
  .object({
    communityOrder: z.array(z.string()).optional(),
    collapsedSections: z.record(z.string(), z.boolean()).optional(),
    lastVisited: LastVisitedLocationSchema.nullable().optional(),
    translationDisplay: TranslationDisplayPreferenceSchema.optional(),
    useAgentForTranslation: z.boolean().optional(),
    useAgentForAi: z.boolean().optional(),
  })
  .strict();

// ── Phase 9B: Agent Devices & Commands ─────────────────────────────

export const DevicePlatformSchema = z.enum(['macos', 'linux', 'windows', 'mobile', 'other']);
export const DeviceStateSchema = z.enum(['online', 'busy', 'degraded', 'offline', 'suspended']);
export const CommandExecutionStatusSchema = z.enum([
  'queued',
  'awaiting_approval',
  'approved',
  'running',
  'completed',
  'failed',
  'rejected',
  'timeout',
  'cancelled',
]);

// slug: lowercase, digits, dashes — used inside `/<device>.<agent>` grammar
export const DeviceSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'slug must be kebab-case lowercase');

export const AgentSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'agent slug must be kebab-case lowercase');

export const RegisterAgentDeviceSchema = z
  .object({
    name: z.string().min(1).max(64),
    slug: DeviceSlugSchema,
    platform: DevicePlatformSchema,
    devicePublicKey: z.string().min(1).max(2048).optional(),
  })
  .strict();

export const UpdateAgentDeviceSchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    sharedWithCommunityId: z.string().nullable().optional(),
    sharedAllowedRoleIds: z.array(z.string()).optional(),
  })
  .strict();

export const RegisterDeviceAgentSchema = z
  .object({
    agentSlug: AgentSlugSchema,
    displayName: z.string().min(1).max(64),
    version: z.string().max(32).optional(),
    defaultVerb: z.string().min(1).max(32).default('exec'),
    scopes: z.array(z.string().max(256)).max(32).optional(),
  })
  .strict();

export const DeviceHeartbeatSchema = z
  .object({
    at: z.string().datetime(),
    cpu: z.number().min(0).max(1),
    ramUsed: z.number().int().nonnegative(),
    ramTotal: z.number().int().positive(),
    runningCount: z.number().int().nonnegative(),
    agents: z.array(z.string().max(96)).max(64),
  })
  .strict();

export const CommandApprovalPolicySchema = z
  .object({
    kind: z.enum(['self', 'owner', 'n_of_m', 'role']),
    n: z.number().int().positive().optional(),
    m: z.number().int().positive().optional(),
    roleIds: z.array(z.string()).optional(),
  })
  .strict();

export const QueueCommandSchema = z
  .object({
    deviceSlug: DeviceSlugSchema.optional(),
    deviceId: z.string().optional(),
    agentSlug: AgentSlugSchema,
    verb: z.string().min(1).max(32).optional(),
    args: z.string().max(4000).default(''),
    rawCommand: z.string().min(1).max(4096),
    channelId: z.string().nullable().optional(),
    dmConversationId: z.string().nullable().optional(),
    agentThreadId: z.string().nullable().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.deviceSlug ?? v.deviceId), {
    message: 'deviceSlug or deviceId required',
    path: ['deviceSlug'],
  });

export const ApproveCommandSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
  })
  .strict();

/**
 * Submitted by the desktop bridge after executing a claimed command. The API
 * derives `status` (`completed` | `failed`) from `exitCode`.
 */
export const SubmitCommandResultSchema = z
  .object({
    exitCode: z.number().int(),
    stdoutTrunc: z.string().max(32_000).nullable().optional(),
    stderrTrunc: z.string().max(32_000).nullable().optional(),
  })
  .strict();
