import { describe, expect, it, vi } from 'vitest';
import { authenticate, createSessionToken, COOKIE_NAME } from '../auth.js';

describe('authenticate', () => {
  it('prefers the session cookie for normal web requests when both cookie and bearer are present', async () => {
    const cookieToken = await createSessionToken({
      id: 'cookie-user',
      email: 'cookie@example.com',
      displayName: 'Cookie User',
      username: 'cookie_user',
    });
    const bearerToken = await createSessionToken({
      id: 'bearer-user',
      email: 'bearer@example.com',
      displayName: 'Bearer User',
      username: 'bearer_user',
    });

    const request = {
      headers: {
        authorization: `Bearer ${bearerToken}`,
      },
      cookies: {
        [COOKIE_NAME]: cookieToken,
      },
    } as any;

    await authenticate(request, {} as any);

    expect(request.user).toEqual(
      expect.objectContaining({
        id: 'cookie-user',
        email: 'cookie@example.com',
      }),
    );
  });

  it('honors explicit bearer override headers during session handoff flows', async () => {
    const cookieToken = await createSessionToken({
      id: 'cookie-user',
      email: 'cookie@example.com',
      displayName: 'Cookie User',
      username: 'cookie_user',
    });
    const bearerToken = await createSessionToken({
      id: 'bearer-user',
      email: 'bearer@example.com',
      displayName: 'Bearer User',
      username: 'bearer_user',
    });

    const request = {
      headers: {
        authorization: `Bearer ${bearerToken}`,
        'x-zktalk-auth-mode': 'bearer',
      },
      cookies: {
        [COOKIE_NAME]: cookieToken,
      },
    } as any;

    await authenticate(request, {} as any);

    expect(request.user).toEqual(
      expect.objectContaining({
        id: 'bearer-user',
        email: 'bearer@example.com',
      }),
    );
  });

  it('falls back to bearer tokens when no session cookie is available', async () => {
    const bearerToken = await createSessionToken({
      id: 'bearer-user',
      email: 'bearer@example.com',
      displayName: 'Bearer User',
      username: 'bearer_user',
    });

    const request = {
      headers: {
        authorization: `Bearer ${bearerToken}`,
      },
      cookies: {},
    } as any;

    await authenticate(request, {} as any);

    expect(request.user).toEqual(
      expect.objectContaining({
        id: 'bearer-user',
        email: 'bearer@example.com',
      }),
    );
  });

  it('rejects unauthenticated requests when neither cookie nor bearer token is available', async () => {
    await expect(
      authenticate(
        {
          headers: {},
          cookies: {},
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('Missing session cookie or authorization header');
  });

  it('rejects invalid explicit bearer overrides instead of silently using a stale cookie', async () => {
    const cookieToken = await createSessionToken({
      id: 'cookie-user',
      email: 'cookie@example.com',
      displayName: 'Cookie User',
      username: 'cookie_user',
    });

    await expect(
      authenticate(
        {
          headers: {
            authorization: 'Bearer invalid-token',
            'x-zktalk-auth-mode': 'bearer',
          },
          cookies: {
            [COOKIE_NAME]: cookieToken,
          },
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('Invalid or expired session');
  });
});
