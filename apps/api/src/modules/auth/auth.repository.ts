import { eq, and, gt, isNull } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { users, userKeys, userAuthMethods, otpCodes, userSettings } from '../../lib/db/schema.js';
import { uuidv7 } from 'uuidv7';
import type { AuthMethodType } from '@zktalk/shared';
import {
  DEFAULT_TRANSLATION_DISPLAY_PREFERENCE,
  normalizeTranslationDisplayPreference,
} from '@zktalk/shared';

// ── User Queries ─────────────────────────────────────────────────────

export interface CreateUserData {
  email: string;
  displayName: string;
  username: string;
}

export async function findUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createUser(data: CreateUserData) {
  const id = uuidv7();
  const now = new Date();
  const result = await db
    .insert(users)
    .values({
      id,
      email: data.email,
      displayName: data.displayName,
      username: data.username,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return result[0]!;
}

export async function updateUser(
  id: string,
  data: { displayName?: string; bio?: string; avatarUrl?: string | null; username?: string },
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.displayName !== undefined) updates.displayName = data.displayName;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
  if (data.username !== undefined) updates.username = data.username;

  const result = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();
  return result[0]!;
}

// ── User Keys (E2EE) ────────────────────────────────────────────────

export async function upsertUserKey(userId: string, publicKey: string) {
  const existing = await db
    .select()
    .from(userKeys)
    .where(eq(userKeys.userId, userId))
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    const [updated] = await db
      .update(userKeys)
      .set({ publicKey, updatedAt: now })
      .where(eq(userKeys.userId, userId))
      .returning();
    return updated!;
  }

  const id = uuidv7();
  const [created] = await db
    .insert(userKeys)
    .values({ id, userId, publicKey, createdAt: now, updatedAt: now })
    .returning();
  return created!;
}

export async function getUserKey(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ publicKey: userKeys.publicKey })
    .from(userKeys)
    .where(eq(userKeys.userId, userId))
    .limit(1);
  return row?.publicKey ?? null;
}

// ── Auth Methods ─────────────────────────────────────────────────────

export async function findAuthMethod(type: AuthMethodType, identifier: string) {
  const result = await db
    .select()
    .from(userAuthMethods)
    .where(and(eq(userAuthMethods.type, type), eq(userAuthMethods.identifier, identifier)))
    .limit(1);
  return result[0] ?? null;
}

export async function findAuthMethodsByUserId(userId: string) {
  return db
    .select()
    .from(userAuthMethods)
    .where(eq(userAuthMethods.userId, userId))
    .orderBy(userAuthMethods.createdAt);
}

export async function findAuthMethodById(id: string) {
  const result = await db
    .select()
    .from(userAuthMethods)
    .where(eq(userAuthMethods.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createAuthMethod(data: {
  userId: string;
  type: AuthMethodType;
  identifier: string;
  verifiedAt?: Date;
}) {
  const id = uuidv7();
  const now = new Date();
  const result = await db
    .insert(userAuthMethods)
    .values({
      id,
      userId: data.userId,
      type: data.type,
      identifier: data.identifier,
      verifiedAt: data.verifiedAt ?? now,
      createdAt: now,
    })
    .returning();
  return result[0]!;
}

export async function deleteAuthMethod(id: string) {
  await db.delete(userAuthMethods).where(eq(userAuthMethods.id, id));
}

export async function countAuthMethodsByUserId(userId: string): Promise<number> {
  const methods = await db
    .select({ id: userAuthMethods.id })
    .from(userAuthMethods)
    .where(eq(userAuthMethods.userId, userId));
  return methods.length;
}

// ── OTP Codes ────────────────────────────────────────────────────────

export async function createOtpCode(phoneNumber: string, code: string, expiresAt: Date) {
  const id = uuidv7();
  const now = new Date();
  const result = await db
    .insert(otpCodes)
    .values({
      id,
      phoneNumber,
      code,
      expiresAt,
      createdAt: now,
    })
    .returning();
  return result[0]!;
}

export async function findValidOtpCode(phoneNumber: string, code: string) {
  const now = new Date();
  const result = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phoneNumber, phoneNumber),
        eq(otpCodes.code, code),
        gt(otpCodes.expiresAt, now),
        isNull(otpCodes.usedAt),
      ),
    )
    .limit(1);
  return result[0] ?? null;
}

export async function markOtpCodeUsed(id: string) {
  await db
    .update(otpCodes)
    .set({ usedAt: new Date() })
    .where(eq(otpCodes.id, id));
}

export async function countRecentOtpCodes(phoneNumber: string, since: Date): Promise<number> {
  const codes = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phoneNumber, phoneNumber),
        gt(otpCodes.createdAt, since),
      ),
    );
  return codes.length;
}

export async function getUserSettings(userId: string) {
  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertUserSettings(
  userId: string,
  data: {
    communityOrder?: string[];
    collapsedSections?: Record<string, boolean>;
    lastVisited?: {
      kind: 'community' | 'channel' | 'thread' | 'dm';
      communityId?: string;
      channelId?: string;
      threadId?: string;
      conversationId?: string;
    } | null;
    translationDisplay?: {
      uiLocale: string;
      mode: 'manual_only' | 'target_language_all' | 'target_language_except_readable';
      targetLanguage: string | null;
      readableLanguages: string[];
    };
    useAgentForTranslation?: boolean;
  },
) {
  const existing = await getUserSettings(userId);
  const now = new Date();
  const communityOrder = data.communityOrder ?? (() => {
    if (!existing) {
      return [];
    }

    try {
      return JSON.parse(existing.communityOrder) as string[];
    } catch {
      return [];
    }
  })();
  const collapsedSections = data.collapsedSections ?? (() => {
    if (!existing) {
      return {};
    }

    try {
      return JSON.parse(existing.collapsedSections) as Record<string, boolean>;
    } catch {
      return {};
    }
  })();
  const lastVisited = data.lastVisited === undefined
    ? existing?.lastVisited ?? null
    : data.lastVisited === null
      ? null
      : JSON.stringify(data.lastVisited);
  const translationDisplay = JSON.stringify(
    data.translationDisplay
      ?? parseTranslationDisplay(existing?.translationDisplay ?? null),
  );

  const useAgentForTranslation =
    data.useAgentForTranslation ?? existing?.useAgentForTranslation ?? false;

  const values = {
    communityOrder: JSON.stringify(communityOrder),
    collapsedSections: JSON.stringify(collapsedSections),
    lastVisited,
    translationDisplay,
    useAgentForTranslation,
    updatedAt: now,
  };

  const insertValues = {
    userId,
    communityOrder: JSON.stringify(communityOrder),
    collapsedSections: JSON.stringify(collapsedSections),
    lastVisited,
    translationDisplay,
    useAgentForTranslation,
    createdAt: now,
    updatedAt: now,
  };

  if (existing) {
    const [updated] = await db
      .update(userSettings)
      .set(values)
      .where(eq(userSettings.userId, userId))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(userSettings)
    .values(insertValues)
    .returning();
  return created!;
}

export async function ensureUserSettings(userId: string) {

  const existing = await getUserSettings(userId);
  if (existing) {
    return existing;
  }

  return upsertUserSettings(userId, { communityOrder: [] });
}

export function parseCommunityOrder(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function parseLastVisited(value: string | null): {
  kind: 'community' | 'channel' | 'thread' | 'dm';
  communityId?: string;
  channelId?: string;
  threadId?: string;
  conversationId?: string;
} | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as { kind?: unknown }).kind !== 'string') {
      return null;
    }
    return parsed as {
      kind: 'community' | 'channel' | 'thread' | 'dm';
      communityId?: string;
      channelId?: string;
      threadId?: string;
      conversationId?: string;
    };
  } catch {
    return null;
  }
}

export function parseTranslationDisplay(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_TRANSLATION_DISPLAY_PREFERENCE;
  }

  try {
    return normalizeTranslationDisplayPreference(JSON.parse(value));
  } catch {
    return DEFAULT_TRANSLATION_DISPLAY_PREFERENCE;
  }
}
