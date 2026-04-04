import type { FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';
import { AppError } from '../lib/errors.js';

export interface RequestUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: RequestUser;
  }
}

const COOKIE_NAME = 'zktalk_session';

function getCookieSecret(): Uint8Array {
  const secret = process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Prefer an explicit Bearer token so desktop/mobile harness flows
  // can override a stale browser cookie during session handoff.
  let token: string | undefined;

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    token = request.cookies[COOKIE_NAME];
  }

  if (!token) {
    throw AppError.unauthorized('Missing session cookie or authorization header');
  }

  try {
    const { payload } = await jose.jwtVerify(token, getCookieSecret(), {
      issuer: 'zktalk',
      audience: 'zktalk-session',
    });

    request.user = {
      id: payload.sub as string,
      email: payload.email as string,
      displayName: payload.displayName as string,
      username: payload.username as string,
    };
  } catch {
    throw AppError.unauthorized('Invalid or expired session');
  }
}

export async function createSessionToken(user: {
  id: string;
  email: string;
  displayName: string;
  username: string;
}): Promise<string> {
  const secret = getCookieSecret();
  return new jose.SignJWT({
    email: user.email,
    displayName: user.displayName,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('zktalk')
    .setAudience('zktalk-session')
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export { COOKIE_NAME };
