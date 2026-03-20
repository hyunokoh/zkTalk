import * as jose from 'jose';
import { findUserByEmail, findUserById, createUser } from './auth.repository.js';
import { createSessionToken } from '../../middleware/auth.js';
import { AppError } from '../../lib/errors.js';

function getMagicLinkSecret(): Uint8Array {
  const secret = process.env.MAGIC_LINK_SECRET || 'dev-magic-link-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

function generateUsername(email: string): string {
  const base = email.split('@')[0]!.replace(/[^a-zA-Z0-9_-]/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}_${suffix}`;
}

export async function requestMagicLink(email: string): Promise<string> {
  const secret = getMagicLinkSecret();
  const token = await new jose.SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
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

  try {
    const { payload } = await jose.jwtVerify(token, getMagicLinkSecret(), {
      issuer: 'zktalk',
      audience: 'zktalk-magic-link',
    });
    email = payload.email as string;
  } catch {
    throw AppError.unauthorized('Invalid or expired magic link token');
  }

  if (!email) {
    throw AppError.unauthorized('Invalid magic link token: missing email');
  }

  let user = await findUserByEmail(email);

  if (!user) {
    const username = generateUsername(email);
    const displayName = email.split('@')[0]!;
    user = await createUser({ email, displayName, username });
  }

  const sessionToken = await createSessionToken({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
  });

  return sessionToken;
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return user;
}
