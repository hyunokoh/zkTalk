/**
 * HTTP client for calling the zkTalk REST API.
 * Reads ZKTALK_API_URL and ZKTALK_SESSION_TOKEN from environment.
 */

const API_URL = process.env.ZKTALK_API_URL || 'http://localhost:4000';
const SESSION_TOKEN = process.env.ZKTALK_SESSION_TOKEN || '';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<ApiResponse<T>> {
  const url = new URL(path, API_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (SESSION_TOKEN) {
    headers['Cookie'] = `zktalk_session=${SESSION_TOKEN}`;
    headers['Authorization'] = `Bearer ${SESSION_TOKEN}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: T;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = (await response.json()) as T;
  } else {
    data = (await response.text()) as unknown as T;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function get<T = unknown>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>('GET', path, undefined, query);
}

export function post<T = unknown>(
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return apiRequest<T>('POST', path, body);
}

export function patch<T = unknown>(
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return apiRequest<T>('PATCH', path, body);
}

export function del<T = unknown>(
  path: string,
): Promise<ApiResponse<T>> {
  return apiRequest<T>('DELETE', path);
}

/**
 * Helper to format API response for MCP tool output.
 */
export function formatResponse(response: ApiResponse): string {
  if (!response.ok) {
    const errData = response.data as { error?: string; message?: string };
    return JSON.stringify(
      {
        error: true,
        status: response.status,
        message: errData?.message || errData?.error || 'Request failed',
      },
      null,
      2,
    );
  }
  return JSON.stringify(response.data, null, 2);
}
