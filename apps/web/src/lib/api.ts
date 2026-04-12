import { getApiBaseUrl } from '@/lib/runtime-config';
import {
  AuthMode,
  shouldAttachStoredSessionToken,
  shouldUseCookieFirstTarget,
} from '@/lib/auth-mode';
import {
  clearSessionToken,
  emitAuthSessionLost,
  getSessionToken,
} from '@/lib/session-token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  authMode?: AuthMode;
}

const AUTH_MODE_HEADER = 'x-zktalk-auth-mode';

async function createApiErrorFromResponse(
  res: Response,
  fallbackMessage?: string,
): Promise<ApiError> {
  let message = fallbackMessage ?? res.statusText ?? `Request failed with status ${res.status}`;
  let code: string | undefined;

  try {
    const json = await res.json();
    if (typeof json?.message === 'string' && json.message.trim()) {
      message = json.message;
    } else if (typeof json?.error === 'string' && json.error.trim()) {
      message = json.error;
    }
    code = typeof json?.error === 'string' ? json.error : undefined;
  } catch {
    // Keep the fallback message when the response body is empty or non-JSON.
  }

  return new ApiError(res.status, message, code);
}

export function shouldAttachBearerToken(
  apiUrl: string,
  authMode: RequestOptions['authMode'] = 'auto',
): boolean {
  return shouldAttachStoredSessionToken(apiUrl, authMode);
}

export function createAuthHeaders(
  apiUrl: string,
  customHeaders?: HeadersInit,
  authMode: RequestOptions['authMode'] = 'auto',
): Headers {
  const headers = new Headers(customHeaders);
  const shouldPreferBearerMode = authMode === 'bearer'
    || (authMode === 'auto' && !shouldUseCookieFirstTarget(apiUrl));

  if (authMode === 'bearer') {
    headers.set(AUTH_MODE_HEADER, 'bearer');
  } else if (authMode === 'cookie') {
    headers.delete(AUTH_MODE_HEADER);
    headers.delete('Authorization');
  }

  if (shouldAttachBearerToken(apiUrl, authMode) && !headers.has('Authorization')) {
    const sessionToken = getSessionToken();
    if (sessionToken) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
      if (shouldPreferBearerMode) {
        headers.set(AUTH_MODE_HEADER, 'bearer');
      }
    }
  }

  return headers;
}

export async function assertOkResponse(
  res: Response,
  fallbackMessage?: string,
): Promise<Response> {
  if (res.ok) {
    return res;
  }

  if (res.status === 401) {
    clearSessionToken();
    emitAuthSessionLost(res.status);
  }

  throw await createApiErrorFromResponse(res, fallbackMessage);
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, authMode = 'auto', ...rest } = options;
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new Error('API base URL is not configured');
  }

  const headers = createAuthHeaders(apiUrl, customHeaders, authMode);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${apiUrl}${path}`, {
    credentials: 'include',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });

  await assertOkResponse(res);

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
