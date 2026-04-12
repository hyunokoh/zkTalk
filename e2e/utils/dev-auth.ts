import type { APIRequestContext } from '@playwright/test';

const apiPort = Number(process.env.ZKTALK_API_PORT ?? '4000');
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

interface MagicLinkRequestResponse {
  token: string;
}

interface MagicLinkVerifyResponse {
  sessionToken: string;
}

interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
  };
}

export interface DevAuthSession {
  sessionToken: string;
  user: CurrentUserResponse['user'];
}

async function createSessionForEmail(
  request: APIRequestContext,
  email: string,
): Promise<DevAuthSession> {
  const token = await requestMagicLinkTokenForEmail(request, email);
  const verifyResponse = await request.post(`${apiBaseUrl}/api/auth/magic-link/verify`, {
    data: { token },
  });
  if (!verifyResponse.ok()) {
    throw new Error(`Magic link verify failed with ${verifyResponse.status()}`);
  }

  const verifyPayload = (await verifyResponse.json()) as MagicLinkVerifyResponse;
  if (!verifyPayload.sessionToken) {
    throw new Error('Session token missing from magic link verify response');
  }

  const meResponse = await request.get(`${apiBaseUrl}/api/me`, {
    headers: {
      Authorization: `Bearer ${verifyPayload.sessionToken}`,
    },
  });
  if (!meResponse.ok()) {
    throw new Error(`/api/me failed with ${meResponse.status()}`);
  }

  const mePayload = (await meResponse.json()) as CurrentUserResponse;
  if (!mePayload.user?.id) {
    throw new Error('Current user payload missing user id');
  }

  return {
    sessionToken: verifyPayload.sessionToken,
    user: mePayload.user,
  };
}

export async function requestMagicLinkTokenForEmail(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const requestResponse = await request.post(`${apiBaseUrl}/api/auth/magic-link/request`, {
    data: { email },
  });
  if (!requestResponse.ok()) {
    throw new Error(`Magic link request failed with ${requestResponse.status()}`);
  }

  const requestPayload = (await requestResponse.json()) as MagicLinkRequestResponse;
  if (!requestPayload.token) {
    throw new Error('Magic link token missing from dev auth response');
  }
  return requestPayload.token;
}

export async function createDevAuthSession(
  request: APIRequestContext,
  label: string,
): Promise<DevAuthSession> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  return createSessionForEmail(request, email);
}

export async function createDevAuthSessionForEmail(
  request: APIRequestContext,
  email: string,
): Promise<DevAuthSession> {
  return createSessionForEmail(request, email);
}
