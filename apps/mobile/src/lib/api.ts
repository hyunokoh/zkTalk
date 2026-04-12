import { API_ORIGIN } from './network-config';
import {
  isSimulatorHarnessEnabled,
  writeSimulatorHarnessJson,
} from './simulator-harness';
import { getToken } from './storage';

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
}

async function recordSimulatorApiIssue(payload: Record<string, unknown>): Promise<void> {
  if (!isSimulatorHarnessEnabled) {
    return;
  }

  await writeSimulatorHarnessJson(
    'last-api-error.json',
    {
      timestamp: new Date().toISOString(),
      ...payload,
    },
    true,
  );
}

async function recordSimulatorApiRequest(payload: Record<string, unknown>): Promise<void> {
  if (!isSimulatorHarnessEnabled) {
    return;
  }

  await writeSimulatorHarnessJson(
    'last-api-request.json',
    {
      timestamp: new Date().toISOString(),
      ...payload,
    },
    true,
  );
}

export function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_ORIGIN) {
    throw new Error('Mobile API URL is not configured. Set EXPO_PUBLIC_API_URL before building the app.');
  }

  const { body, headers: customHeaders, ...rest } = options;

  const token = await getToken();

  const headers: HeadersInit = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(token ? { 'x-zktalk-auth-mode': 'bearer' } : {}),
    ...customHeaders,
  };

  await recordSimulatorApiRequest({
    path,
    method: rest.method ?? 'GET',
    hasToken: Boolean(token),
    tokenLength: token?.length ?? 0,
  });

  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}${path}`, {
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...rest,
    });
  } catch (error) {
    await recordSimulatorApiIssue({
      kind: 'network',
      path,
      method: rest.method ?? 'GET',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const json = await res.json();
      message = json.error ?? json.message ?? message;
      code = typeof json.error === 'string' ? json.error : undefined;
    } catch {
      // keep statusText
    }
    await recordSimulatorApiIssue({
      kind: 'http',
      path,
      method: rest.method ?? 'GET',
      status: res.status,
      message,
      code,
    });
    throw new ApiError(res.status, message, code);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
