export interface ProfileShareIdentity {
  userId: string;
  displayName?: string | null;
  username?: string | null;
}

export function buildProfileDeepLink({
  userId,
  displayName,
  username,
}: ProfileShareIdentity): string {
  const params = new URLSearchParams();
  if (displayName) {
    params.set('displayName', displayName);
  }
  if (username) {
    params.set('username', username);
  }
  const query = params.toString();
  return `zktalk://user/${encodeURIComponent(userId)}${query ? `?${query}` : ''}`;
}

export function buildProfileWebLink(origin: string, userId: string): string {
  return `${origin.replace(/\/+$/u, '')}/user/${encodeURIComponent(userId)}`;
}
