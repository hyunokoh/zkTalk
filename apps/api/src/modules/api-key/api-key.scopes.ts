// v1 scope catalogue. Keep small — every new scope is a public-API
// promise we have to support indefinitely.
export const API_KEY_SCOPES = [
  'me:read',
  'communities:read',
  'channels:read',
  'messages:read',
  'messages:write',
  'dm:read',
  'dm:write',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function isValidScope(s: string): s is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(s);
}
