import * as jose from 'jose';
import crypto from 'node:crypto';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  upsertUserKey,
  getUserKey,
  findAuthMethod,
  findAuthMethodsByUserId,
  findAuthMethodById,
  createAuthMethod,
  deleteAuthMethod,
  countAuthMethodsByUserId,
  createOtpCode,
  findValidOtpCode,
  markOtpCodeUsed,
  countRecentOtpCodes,
  ensureUserSettings,
  parseCommunityOrder,
  parseLastVisited,
  parseTranslationDisplay,
  upsertUserSettings,
} from './auth.repository.js';
import { createSessionToken } from '../../middleware/auth.js';
import { AppError } from '../../lib/errors.js';
import { redis } from '../../lib/redis.js';
import { getEmailLinkSecretBytes, getMagicLinkSecretBytes } from '../../lib/env.js';
import type { AuthMethodType } from '@zktalk/shared';
import { normalizeTranslationDisplayPreference } from '@zktalk/shared';
import { assertCanAccessChannel } from '../channel/channel-access.service.js';
import * as dmRepo from '../dm/dm.repository.js';
import * as communityRepo from '../community/community.repository.js';

// ── Helpers ──────────────────────────────────────────────────────────

function generateUsername(base: string): string {
  const clean = base.replace(/[^a-zA-Z0-9_-]/g, '') || 'user';
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${clean}_${suffix}`;
}

function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

function getConfiguredAudiences(...values: Array<string | undefined>): string[] {
  return values
    .flatMap((value) => (value ? value.split(',') : []))
    .map((value) => value.trim())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}

async function sanitizeLastVisited(
  userId: string,
  lastVisited: {
    kind: 'community' | 'channel' | 'thread' | 'dm';
    communityId?: string;
    channelId?: string;
    threadId?: string;
    conversationId?: string;
  } | null,
) {
  if (!lastVisited) {
    return null;
  }

  if ((lastVisited.kind === 'channel' || lastVisited.kind === 'thread') && lastVisited.channelId) {
    try {
      await assertCanAccessChannel(userId, lastVisited.channelId);
      return lastVisited;
    } catch {
      return null;
    }
  }

  if (lastVisited.kind === 'community' && lastVisited.communityId) {
    try {
      const community = await communityRepo.findById(lastVisited.communityId);
      if (!community) {
        return null;
      }

      const membership = await communityRepo.findMembership(lastVisited.communityId, userId);
      if (membership?.membershipStatus === 'active' || community.visibility === 'public') {
        return lastVisited;
      }

      return null;
    } catch {
      return null;
    }
  }

  if (lastVisited.kind === 'dm' && lastVisited.conversationId) {
    try {
      const isParticipant = await dmRepo.isParticipant(lastVisited.conversationId, userId);
      return isParticipant ? lastVisited : null;
    } catch {
      return null;
    }
  }

  return lastVisited;
}

// ── Find or Create User by Auth ──────────────────────────────────────

interface AuthProfile {
  email?: string;
  displayName?: string;
  name?: string;
}

interface VerifiedAuthIdentity {
  identifier: string;
  profile?: AuthProfile;
}

async function findOrCreateUserByAuth(
  type: AuthMethodType,
  identifier: string,
  profile?: AuthProfile,
) {
  // Check if auth method already exists
  const existingMethod = await findAuthMethod(type, identifier);
  if (existingMethod) {
    const user = await findUserById(existingMethod.userId);
    if (!user) throw AppError.notFound('User not found');
    return user;
  }

  // For email type: check if user already exists by email (migration from old auth)
  if (type === 'email') {
    const existingUser = await findUserByEmail(identifier);
    if (existingUser) {
      // Link existing user to new auth method
      await createAuthMethod({
        userId: existingUser.id,
        type,
        identifier,
        verifiedAt: new Date(),
      });
      return existingUser;
    }
  }

  // Create new user + auth method
  let email: string;
  let displayName: string;
  let username: string;

  switch (type) {
    case 'phone': {
      email = `phone_${identifier.replace(/[^0-9]/g, '')}@zktalk.local`;
      displayName = 'User';
      username = generateUsername(identifier.replace(/[^0-9]/g, '').slice(-6));
      break;
    }
    case 'email': {
      email = identifier;
      displayName = identifier.split('@')[0]!;
      username = generateUsername(identifier.split('@')[0]!);
      break;
    }
    case 'google':
    case 'apple': {
      email = profile?.email ?? `${type}_${identifier.substring(0, 10)}@zktalk.local`;
      displayName = profile?.displayName ?? profile?.name ?? 'User';
      username = generateUsername(profile?.email?.split('@')[0] ?? type);
      break;
    }
  }

  const user = await createUser({ email, displayName, username });
  await createAuthMethod({
    userId: user.id,
    type,
    identifier,
    verifiedAt: new Date(),
  });

  return user;
}

async function createSessionForUser(user: {
  id: string;
  email: string;
  displayName: string;
  username: string;
}): Promise<string> {
  return createSessionToken({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
  });
}

// ── Magic Link (existing) ────────────────────────────────────────────

export async function requestMagicLink(email: string): Promise<string> {
  const secret = getMagicLinkSecretBytes();
  const jti = crypto.randomUUID();
  const token = await new jose.SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuer('zktalk')
    .setAudience('zktalk-magic-link')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);

  // In a real app, we would send an email here.
  // For MVP, just return the token.
  return token;
}

export async function verifyMagicLink(token: string): Promise<string> {
  let email: string;
  let jti: string | undefined;

  try {
    const { payload } = await jose.jwtVerify(token, getMagicLinkSecretBytes(), {
      issuer: 'zktalk',
      audience: 'zktalk-magic-link',
    });
    email = payload.email as string;
    jti = payload.jti;
  } catch {
    throw AppError.unauthorized('Invalid or expired magic link token');
  }

  if (!email) {
    throw AppError.unauthorized('Invalid magic link token: missing email');
  }

  // Enforce single-use: check if this token was already consumed
  if (jti) {
    const usedKey = `magic-link:used:${jti}`;
    const alreadyUsed = await redis.get(usedKey);
    if (alreadyUsed) {
      throw AppError.unauthorized('Magic link has already been used');
    }
    // Mark as used with a TTL matching the token expiry (15 minutes)
    await redis.set(usedKey, '1', 'EX', 15 * 60);
  }

  // Use findOrCreateUserByAuth for consistent flow
  const user = await findOrCreateUserByAuth('email', email);
  return createSessionForUser(user);
}

export async function requestEmailLink(
  userId: string,
  email: string,
): Promise<{ sent: true; token?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const existingMethod = await findAuthMethod('email', normalizedEmail);

  if (existingMethod) {
    if (existingMethod.userId === userId) {
      throw AppError.conflict('This email is already linked to your account');
    }

    throw AppError.conflict('This email is already linked to another account');
  }

  const jti = crypto.randomUUID();
  const token = await new jose.SignJWT({ email: normalizedEmail, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuer('zktalk')
    .setAudience('zktalk-link-email')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getEmailLinkSecretBytes());

  if (process.env.NODE_ENV !== 'production') {
    return { sent: true, token };
  }

  return { sent: true };
}

export async function verifyEmailLink(userId: string, token: string) {
  let email: string;
  let tokenUserId: string;
  let jti: string | undefined;

  try {
    const { payload } = await jose.jwtVerify(token, getEmailLinkSecretBytes(), {
      issuer: 'zktalk',
      audience: 'zktalk-link-email',
    });
    email = payload.email as string;
    tokenUserId = payload.userId as string;
    jti = payload.jti;
  } catch {
    throw AppError.unauthorized('Invalid or expired email link token');
  }

  if (!email || !tokenUserId) {
    throw AppError.unauthorized('Invalid email link token');
  }

  if (tokenUserId !== userId) {
    throw AppError.forbidden('This email link is for a different account');
  }

  if (jti) {
    const usedKey = `email-link:used:${jti}`;
    const alreadyUsed = await redis.get(usedKey);
    if (alreadyUsed) {
      throw AppError.unauthorized('Email link has already been used');
    }
    await redis.set(usedKey, '1', 'EX', 15 * 60);
  }

  return linkAuthMethod(userId, 'email', email.trim().toLowerCase());
}

// ── SMS OTP ──────────────────────────────────────────────────────────

export async function requestPhoneOtp(phoneNumber: string): Promise<{ sent: true; code?: string }> {
  // Rate limit: max 3 requests per phone per 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentCount = await countRecentOtpCodes(phoneNumber, tenMinutesAgo);
  if (recentCount >= 3) {
    throw AppError.tooManyRequests('Too many OTP requests. Please wait 10 minutes.');
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  await createOtpCode(phoneNumber, code, expiresAt);

  // In production, send SMS here via Twilio/etc.
  // In dev mode, return the code for testing
  if (process.env.NODE_ENV !== 'production') {
    return { sent: true, code };
  }

  return { sent: true };
}

export async function requestPhoneLink(
  userId: string,
  phoneNumber: string,
): Promise<{ sent: true; code?: string }> {
  const existingMethod = await findAuthMethod('phone', phoneNumber);
  if (existingMethod) {
    if (existingMethod.userId === userId) {
      throw AppError.conflict('This phone number is already linked to your account');
    }

    throw AppError.conflict('This phone number is already linked to another account');
  }

  return requestPhoneOtp(phoneNumber);
}

export async function verifyPhoneOtp(phoneNumber: string, code: string): Promise<string> {
  // Rate limit failed OTP verification attempts per phone number
  const failKey = `otp:fail:${phoneNumber}`;
  const failCount = parseInt(await redis.get(failKey) || '0', 10);
  if (failCount >= 5) {
    throw AppError.tooManyRequests('Too many failed verification attempts. Please wait 10 minutes.');
  }

  const otpRecord = await findValidOtpCode(phoneNumber, code);
  if (!otpRecord) {
    // Track failed attempt
    await redis.incr(failKey);
    await redis.expire(failKey, 600); // 10 minute window
    throw AppError.unauthorized('Invalid or expired verification code');
  }

  // Clear fail counter on success
  await redis.del(failKey);

  await markOtpCodeUsed(otpRecord.id);

  const user = await findOrCreateUserByAuth('phone', phoneNumber);
  return createSessionForUser(user);
}

export async function verifyPhoneLink(userId: string, phoneNumber: string, code: string) {
  const failKey = `otp:linkfail:${phoneNumber}`;
  const failCount = parseInt(await redis.get(failKey) || '0', 10);
  if (failCount >= 5) {
    throw AppError.tooManyRequests('Too many failed verification attempts. Please wait 10 minutes.');
  }

  const otpRecord = await findValidOtpCode(phoneNumber, code);
  if (!otpRecord) {
    await redis.incr(failKey);
    await redis.expire(failKey, 600);
    throw AppError.unauthorized('Invalid or expired verification code');
  }

  const existingMethod = await findAuthMethod('phone', phoneNumber);
  if (existingMethod) {
    if (existingMethod.userId === userId) {
      throw AppError.conflict('This phone number is already linked to your account');
    }

    throw AppError.conflict('This phone number is already linked to another account');
  }

  await redis.del(failKey);
  await markOtpCodeUsed(otpRecord.id);
  return linkAuthMethod(userId, 'phone', phoneNumber);
}

// ── OAuth: Google ────────────────────────────────────────────────────

export async function verifyGoogleOAuth(idToken: string): Promise<string> {
  const identity = await verifyGoogleIdentityToken(idToken);
  const user = await findOrCreateUserByAuth('google', identity.identifier, identity.profile);
  return createSessionForUser(user);
}

async function verifyGoogleIdentityToken(idToken: string): Promise<VerifiedAuthIdentity> {
  const googleClientIds = getConfiguredAudiences(
    process.env.GOOGLE_CLIENT_IDS,
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
  );

  if (googleClientIds.length === 0) {
    throw AppError.badRequest('Google OAuth is not configured');
  }

  let payload: jose.JWTPayload;

  try {
    // Fetch Google's public JWK set and verify the token signature, issuer, and audience
    const JWKS = jose.createRemoteJWKSet(
      new URL('https://www.googleapis.com/oauth2/v3/certs'),
    );
    const result = await jose.jwtVerify(idToken, JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: googleClientIds,
    });
    payload = result.payload;
  } catch {
    throw AppError.unauthorized('Invalid Google ID token');
  }

  const sub = payload.sub;
  const email = payload.email as string | undefined;
  const name = payload.name as string | undefined;

  if (!sub) {
    throw AppError.unauthorized('Invalid Google ID token: missing sub');
  }

  return {
    identifier: sub,
    profile: {
      email,
      displayName: name,
    },
  };
}

// ── OAuth: Apple ─────────────────────────────────────────────────────

export async function verifyAppleOAuth(idToken: string, name?: string): Promise<string> {
  const identity = await verifyAppleIdentityToken(idToken, name);
  const user = await findOrCreateUserByAuth('apple', identity.identifier, identity.profile);
  return createSessionForUser(user);
}

async function verifyAppleIdentityToken(
  idToken: string,
  name?: string,
): Promise<VerifiedAuthIdentity> {
  const appleClientIds = getConfiguredAudiences(
    process.env.APPLE_CLIENT_IDS,
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_IOS_CLIENT_ID,
    process.env.APPLE_SERVICE_ID,
  );

  if (appleClientIds.length === 0) {
    throw AppError.badRequest('Apple OAuth is not configured');
  }

  let payload: jose.JWTPayload;

  try {
    // Fetch Apple's public JWK set and verify the token signature, issuer, and audience
    const JWKS = jose.createRemoteJWKSet(
      new URL('https://appleid.apple.com/auth/keys'),
    );
    const result = await jose.jwtVerify(idToken, JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: appleClientIds,
    });
    payload = result.payload;
  } catch {
    throw AppError.unauthorized('Invalid Apple ID token');
  }

  const sub = payload.sub;
  const email = payload.email as string | undefined;

  if (!sub) {
    throw AppError.unauthorized('Invalid Apple ID token: missing sub');
  }

  return {
    identifier: sub,
    profile: {
      email,
      displayName: name,
    },
  };
}

// ── QR Code Login ────────────────────────────────────────────────────

const QR_TOKEN_PREFIX = 'qr:';
const QR_TTL_SECONDS = 5 * 60; // 5 minutes

export async function generateQrToken(): Promise<{ qrToken: string; expiresAt: string }> {
  const qrToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);

  // Store in Redis: qr:{token} -> "pending"
  await redis.set(`${QR_TOKEN_PREFIX}${qrToken}`, 'pending', 'EX', QR_TTL_SECONDS);

  return { qrToken, expiresAt: expiresAt.toISOString() };
}

export async function confirmQrToken(qrToken: string, userId: string): Promise<void> {
  const key = `${QR_TOKEN_PREFIX}${qrToken}`;
  const status = await redis.get(key);

  if (!status) {
    throw AppError.notFound('QR token expired or not found');
  }

  if (status !== 'pending') {
    throw AppError.conflict('QR token already confirmed');
  }

  // Get the remaining TTL
  const ttl = await redis.ttl(key);
  if (ttl <= 0) {
    throw AppError.notFound('QR token expired');
  }

  // Update value to the userId
  await redis.set(key, userId, 'EX', ttl);
}

export async function checkQrTokenStatus(
  qrToken: string,
): Promise<{ status: 'pending' | 'confirmed'; sessionToken?: string }> {
  const key = `${QR_TOKEN_PREFIX}${qrToken}`;
  const value = await redis.get(key);

  if (!value) {
    throw AppError.notFound('QR token expired or not found');
  }

  if (value === 'pending') {
    return { status: 'pending' };
  }

  // value is a userId - create a session
  const user = await findUserById(value);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const sessionToken = await createSessionForUser(user);

  // Delete the QR token after use
  await redis.del(key);

  return { status: 'confirmed', sessionToken };
}

// ── Account Linking ──────────────────────────────────────────────────

export async function linkAuthMethod(
  userId: string,
  type: AuthMethodType,
  identifier: string,
) {
  // Check if this auth method is already linked to another user
  const existing = await findAuthMethod(type, identifier);
  if (existing) {
    if (existing.userId === userId) {
      throw AppError.conflict('This auth method is already linked to your account');
    }
    throw AppError.conflict('This auth method is already linked to another account');
  }

  return createAuthMethod({
    userId,
    type,
    identifier,
    verifiedAt: new Date(),
  });
}

export async function linkGoogleAuthMethod(userId: string, idToken: string) {
  const identity = await verifyGoogleIdentityToken(idToken);
  return linkAuthMethod(userId, 'google', identity.identifier);
}

export async function linkAppleAuthMethod(userId: string, idToken: string, name?: string) {
  const identity = await verifyAppleIdentityToken(idToken, name);
  return linkAuthMethod(userId, 'apple', identity.identifier);
}

export async function getAuthMethods(userId: string) {
  return findAuthMethodsByUserId(userId);
}

export async function unlinkAuthMethod(userId: string, methodId: string) {
  const method = await findAuthMethodById(methodId);
  if (!method) {
    throw AppError.notFound('Auth method not found');
  }

  if (method.userId !== userId) {
    throw AppError.forbidden('Not authorized to unlink this auth method');
  }

  // Must keep at least one auth method
  const count = await countAuthMethodsByUserId(userId);
  if (count <= 1) {
    throw AppError.badRequest('Cannot unlink the last auth method. You must keep at least one.');
  }

  await deleteAuthMethod(methodId);
}

// ── User Profile ─────────────────────────────────────────────────────

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return user;
}

export async function updateProfile(
  userId: string,
  data: { displayName?: string; bio?: string; avatarUrl?: string | null; username?: string },
) {
  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found');
  return updateUser(userId, data);
}

export async function getSettings(userId: string) {
  const settings = await ensureUserSettings(userId);
  const lastVisited = await sanitizeLastVisited(userId, parseLastVisited(settings.lastVisited));
  return {
    communityOrder: parseCommunityOrder(settings.communityOrder),
    collapsedSections: (() => {
      try {
        return JSON.parse(settings.collapsedSections) as Record<string, boolean>;
      } catch {
        return {};
      }
    })(),
    lastVisited,
    translationDisplay: parseTranslationDisplay(settings.translationDisplay),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function updateSettings(
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
  },
) {
  const sanitizedLastVisited = data.lastVisited === undefined
    ? undefined
    : await sanitizeLastVisited(userId, data.lastVisited);
  const translationDisplay = data.translationDisplay === undefined
    ? undefined
    : normalizeTranslationDisplayPreference(data.translationDisplay);
  const settings = await upsertUserSettings(userId, {
    ...data,
    lastVisited: sanitizedLastVisited,
    translationDisplay,
  });
  const lastVisited = await sanitizeLastVisited(userId, parseLastVisited(settings.lastVisited));
  return {
    communityOrder: parseCommunityOrder(settings.communityOrder),
    collapsedSections: (() => {
      try {
        return JSON.parse(settings.collapsedSections) as Record<string, boolean>;
      } catch {
        return {};
      }
    })(),
    lastVisited,
    translationDisplay: parseTranslationDisplay(settings.translationDisplay),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

// ── E2EE Key Management ─────────────────────────────────────────────

export async function setPublicKey(userId: string, publicKey: string) {
  return upsertUserKey(userId, publicKey);
}

export async function getPublicKey(userId: string): Promise<string | null> {
  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found');
  return getUserKey(userId);
}
