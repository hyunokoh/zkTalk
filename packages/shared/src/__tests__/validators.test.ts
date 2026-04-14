import { describe, it, expect } from 'vitest';
import {
  MagicLinkRequestSchema,
  CreateCommunitySchema,
  CreateMessageSchema,
  CreateChannelSchema,
  UpdateChannelSchema,
  RegisterLocalMachineSchema,
  LocalMachinePresenceSchema,
  LocalMachineCommandEnvelopeSchema,
  LocalMachineCommandUpdateSchema,
  TranslationDisplayPresetIdSchema,
  UpdateUserSettingsSchema,
} from '../validators/index.js';

describe('MagicLinkRequestSchema', () => {
  it('accepts valid email', () => {
    const result = MagicLinkRequestSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = MagicLinkRequestSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('CreateCommunitySchema', () => {
  it('accepts valid community', () => {
    const result = CreateCommunitySchema.safeParse({
      name: 'My Community',
      slug: 'my-community',
    });
    expect(result.success).toBe(true);
  });

  it('rejects slug with uppercase', () => {
    const result = CreateCommunitySchema.safeParse({
      name: 'Test',
      slug: 'InvalidSlug',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateMessageSchema', () => {
  it('accepts valid message', () => {
    const result = CreateMessageSchema.safeParse({ bodyMarkdown: 'Hello world' });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = CreateMessageSchema.safeParse({ bodyMarkdown: '' });
    expect(result.success).toBe(false);
  });
});

describe('CreateChannelSchema', () => {
  it('rejects open channel policies with explicit role lists', () => {
    const result = CreateChannelSchema.safeParse({
      name: 'General',
      accessPolicy: 'members_only',
      allowedViewRoleIds: ['role-1'],
    });
    expect(result.success).toBe(false);
  });

  it('requires view roles for invite-only channels', () => {
    const result = CreateChannelSchema.safeParse({
      name: 'Staff',
      accessPolicy: 'invite_only',
    });
    expect(result.success).toBe(false);
  });

  it('accepts private channel policy with explicit roles', () => {
    const result = CreateChannelSchema.safeParse({
      name: 'Leads',
      accessPolicy: 'private',
      allowedViewRoleIds: ['role-1'],
      allowedPostRoleIds: ['role-1'],
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateChannelSchema', () => {
  it('rejects restricted role updates that omit allowed view roles', () => {
    const result = UpdateChannelSchema.safeParse({
      accessPolicy: 'invite_only',
      allowedPostRoleIds: ['role-1'],
    });

    expect(result.success).toBe(false);
  });

  it('accepts restricted role updates when view roles are supplied explicitly', () => {
    const result = UpdateChannelSchema.safeParse({
      accessPolicy: 'invite_only',
      allowedViewRoleIds: ['role-1'],
      allowedPostRoleIds: ['role-2'],
    });

    expect(result.success).toBe(true);
  });
});

describe('UpdateUserSettingsSchema', () => {
  it('accepts translation display preferences independently from app locale', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      translationDisplay: {
        uiLocale: 'ko',
        mode: 'target_language_except_readable',
        targetLanguage: 'ko',
        readableLanguages: ['ko', 'en'],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown translation display modes', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      translationDisplay: {
        uiLocale: 'en',
        mode: 'everything',
        targetLanguage: 'en',
        readableLanguages: ['en'],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects translation display language codes that do not match the product ISO-style input contract', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      translationDisplay: {
        uiLocale: 'english_us',
        mode: 'target_language_except_readable',
        targetLanguage: 'ko',
        readableLanguages: ['en', 'bad_code'],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects manual-only translation preferences that still set a target language', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      translationDisplay: {
        uiLocale: 'en',
        mode: 'manual_only',
        targetLanguage: 'en',
        readableLanguages: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects automatic translation preferences without a target language', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      translationDisplay: {
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: null,
        readableLanguages: ['en'],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects readable-language exceptions when translating everything into the target language', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      translationDisplay: {
        uiLocale: 'en',
        mode: 'target_language_all',
        targetLanguage: 'pt-BR',
        readableLanguages: ['en'],
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('TranslationDisplayPresetIdSchema', () => {
  it('accepts the stable preset ids used by desktop bridge flows', () => {
    expect(TranslationDisplayPresetIdSchema.safeParse('english_only').success).toBe(true);
    expect(
      TranslationDisplayPresetIdSchema.safeParse('korean_preferred_english_readable').success,
    ).toBe(true);
    expect(TranslationDisplayPresetIdSchema.safeParse('manual_only').success).toBe(true);
  });

  it('rejects unknown preset ids', () => {
    expect(TranslationDisplayPresetIdSchema.safeParse('korean_only').success).toBe(false);
  });
});

describe('Local machine bridge schemas', () => {
  it('accepts addressable machine registration names', () => {
    const result = RegisterLocalMachineSchema.safeParse({
      name: 'mac-studio',
      type: 'desktop',
      bridgeIdentifier: 'bridge-public-id-123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects machine names that are not stable slugs', () => {
    const result = RegisterLocalMachineSchema.safeParse({
      name: 'Mac Studio',
      type: 'desktop',
      bridgeIdentifier: 'bridge-public-id-123',
    });

    expect(result.success).toBe(false);
  });

  it('requires source identifiers that match the command scope', () => {
    const result = LocalMachineCommandEnvelopeSchema.safeParse({
      id: 'command-1',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      source: {
        kind: 'thread',
        channelId: 'channel-1',
      },
      instruction: 'Summarize the selected debugging thread',
      intent: 'summarize',
      selectedMessages: [],
      attachmentReferences: [],
      createdAt: '2026-04-10T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('keeps busy and auth-missing machine presence states internally consistent', () => {
    expect(
      LocalMachinePresenceSchema.safeParse({
        machineId: 'machine-1',
        ownerUserId: 'user-1',
        status: 'busy',
        codexAuthState: 'auth_present',
        activeCommandId: 'command-1',
        lastSeenAt: '2026-04-10T00:00:00.000Z',
        expiresAt: '2026-04-10T00:01:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      LocalMachinePresenceSchema.safeParse({
        machineId: 'machine-1',
        ownerUserId: 'user-1',
        status: 'busy',
        codexAuthState: 'auth_present',
        activeCommandId: null,
        lastSeenAt: '2026-04-10T00:00:00.000Z',
        expiresAt: '2026-04-10T00:01:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      LocalMachinePresenceSchema.safeParse({
        machineId: 'machine-1',
        ownerUserId: 'user-1',
        status: 'auth_missing',
        codexAuthState: 'auth_present',
        activeCommandId: null,
        lastSeenAt: '2026-04-10T00:00:00.000Z',
        expiresAt: '2026-04-10T00:01:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('accepts explicit accepted, streaming, completed, and auth-missing result updates', () => {
    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-1',
        targetMachineId: 'machine-1',
        owningUserId: 'user-1',
        status: 'accepted',
        summary: 'Worker accepted the command.',
        outputText: null,
        errorCode: null,
        createdAt: '2026-04-10T00:00:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-1',
        targetMachineId: 'machine-1',
        owningUserId: 'user-1',
        status: 'streaming',
        summary: null,
        outputText: 'Partial stdout',
        errorCode: null,
        createdAt: '2026-04-10T00:01:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-1',
        targetMachineId: 'machine-1',
        owningUserId: 'user-1',
        status: 'completed',
        summary: 'Completed successfully.',
        outputText: 'Final output',
        errorCode: null,
        createdAt: '2026-04-10T00:02:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-2',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
        summary: 'Local Codex auth is missing.',
        outputText: null,
        errorCode: 'auth_missing',
        createdAt: '2026-04-10T00:03:00.000Z',
      }).success,
    ).toBe(true);

    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-3',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
        summary: 'Local Codex command timed out.',
        outputText: 'Partial output before timeout',
        errorCode: 'timed_out',
        createdAt: '2026-04-10T00:03:30.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects impossible local machine command error-code combinations', () => {
    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-3',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'accepted',
        summary: 'Worker accepted the command.',
        outputText: null,
        errorCode: 'busy',
        createdAt: '2026-04-10T00:04:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-4',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
        summary: 'Policy rejected the command.',
        outputText: null,
        errorCode: 'rejected',
        createdAt: '2026-04-10T00:05:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      LocalMachineCommandUpdateSchema.safeParse({
        commandId: 'command-5',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'rejected',
        summary: 'Policy rejected the command.',
        outputText: null,
        errorCode: 'rejected',
        createdAt: '2026-04-10T00:06:00.000Z',
      }).success,
    ).toBe(true);
  });
});
