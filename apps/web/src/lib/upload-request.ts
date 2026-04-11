import { createAuthHeaders } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/runtime-config';

export function resolveUploadUrl(uploadUrl: string): string {
  return uploadUrl.startsWith('http')
    ? uploadUrl
    : `${getApiBaseUrl()}${uploadUrl}`;
}

export function createUploadRequestInit(
  uploadUrl: string,
  init: Omit<RequestInit, 'credentials' | 'headers'> & {
    headers?: HeadersInit;
  },
): RequestInit {
  const resolvedUrl = resolveUploadUrl(uploadUrl);
  const isAbsoluteStorageUrl = /^https?:\/\//i.test(uploadUrl);

  return {
    ...init,
    credentials: isAbsoluteStorageUrl ? 'omit' : 'include',
    headers: isAbsoluteStorageUrl
      ? init.headers
      : createAuthHeaders(resolvedUrl, init.headers),
  };
}
