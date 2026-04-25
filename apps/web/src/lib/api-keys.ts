import { api } from '@/lib/api';

export interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface IssuedApiKey extends Omit<ApiKey, 'lastUsedAt' | 'revokedAt'> {
  plaintextKey: string; // shown once at creation
}

export interface ListApiKeysResponse {
  keys: ApiKey[];
  availableScopes: string[];
}

export async function listApiKeys(): Promise<ListApiKeysResponse> {
  return api<ListApiKeysResponse>('/api/api-keys');
}

export async function createApiKey(input: {
  name: string;
  scopes: string[];
  expiresAt?: string | null;
}): Promise<IssuedApiKey> {
  const res = await api<{ key: IssuedApiKey }>('/api/api-keys', {
    method: 'POST',
    body: input,
  });
  return res.key;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await api(`/api/api-keys/${keyId}`, { method: 'DELETE' });
}
