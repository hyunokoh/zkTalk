import type { FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';
import { AppError } from '../lib/errors.js';
import { getCookieSecretBytes } from '../lib/env.js';

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
const AUTH_MODE_HEADER = 'x-zktalk-auth-mode';

function getBearerToken(request: FastifyRequest): string | undefined {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return undefined;
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const cookieToken = request.cookies[COOKIE_NAME];
  const bearerToken = getBearerToken(request);
  const authModeHeader = request.headers[AUTH_MODE_HEADER];
  const wantsBearerOverride =
    typeof authModeHeader === 'string' && authModeHeader.toLowerCase() === 'bearer';
  const token = wantsBearerOverride ? bearerToken : cookieToken ?? bearerToken;

  if (!token) {
    throw AppError.unauthorized('Missing session cookie or authorization header');
  }

  try {
    const { payload } = await jose.jwtVerify(token, getCookieSecretBytes(), {
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
  const secret = getCookieSecretBytes();
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
