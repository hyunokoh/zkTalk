'use client';

export interface SharedProfileData {
  userId: string;
  displayName: string;
  username: string;
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[),.!?]+$/u, '');
}

export function parseSharedProfileText(rawValue: string): SharedProfileData | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const matchedCandidate =
    trimmed.match(/zktalk:\/\/user\/[^\s]+/iu)?.[0]
    ?? trimmed.match(/https?:\/\/[^\s]+\/user\/[^\s]+/iu)?.[0]
    ?? trimmed;
  const candidate = stripTrailingPunctuation(matchedCandidate);

  try {
    const url = new URL(candidate);
    let userId = '';

    if (url.protocol === 'zktalk:' && url.host === 'user') {
      userId = decodeURIComponent(url.pathname.replace(/^\/+/u, ''));
    } else if (
      (url.protocol === 'http:' || url.protocol === 'https:')
      && url.pathname.startsWith('/user/')
    ) {
      userId = decodeURIComponent(url.pathname.replace(/^\/user\//u, ''));
    } else {
      return null;
    }

    if (!userId || userId.includes('/')) {
      return null;
    }

    return {
      userId,
      displayName: url.searchParams.get('displayName')?.trim() ?? '',
      username: url.searchParams.get('username')?.trim() ?? '',
    };
  } catch {
    return null;
  }
}

export function buildSharedProfileHref(
  profile: SharedProfileData,
  currentSearchParams?: { toString(): string },
): string {
  const nextParams = new URLSearchParams(currentSearchParams?.toString() ?? '');
  nextParams.set('profileUserId', profile.userId);

  if (profile.displayName) {
    nextParams.set('displayName', profile.displayName);
  } else {
    nextParams.delete('displayName');
  }

  if (profile.username) {
    nextParams.set('username', profile.username);
  } else {
    nextParams.delete('username');
  }

  return `/friends?${nextParams.toString()}`;
}
