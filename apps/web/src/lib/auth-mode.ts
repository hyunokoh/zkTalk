import { isDesktopRuntime } from '@/lib/runtime-config';
import { hasDesktopHarnessSession } from '@/lib/session-token';

export type AuthMode = 'auto' | 'bearer' | 'cookie';

function toComparableOrigin(target: URL): string {
  const comparableUrl = new URL(target.toString());

  if (comparableUrl.protocol === 'ws:') {
    comparableUrl.protocol = 'http:';
  } else if (comparableUrl.protocol === 'wss:') {
    comparableUrl.protocol = 'https:';
  }

  return comparableUrl.origin;
}

export function isSameOriginTarget(target: string | URL): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const resolvedTarget = target instanceof URL
      ? new URL(target.toString(), window.location.origin)
      : new URL(target, window.location.origin);

    return toComparableOrigin(resolvedTarget) === window.location.origin;
  } catch {
    return false;
  }
}

export function shouldUseCookieFirstTarget(target: string | URL): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return isSameOriginTarget(target) && !isDesktopRuntime();
}

export function shouldAttachStoredSessionToken(
  target: string | URL,
  authMode: AuthMode = 'auto',
): boolean {
  if (authMode === 'bearer') {
    return true;
  }

  if (authMode === 'cookie') {
    return false;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  if (!isSameOriginTarget(target)) {
    return true;
  }

  if (isDesktopRuntime()) {
    return true;
  }

  if (hasDesktopHarnessSession()) {
    return !isSameOriginTarget(target);
  }

  return false;
}
