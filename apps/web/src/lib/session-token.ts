const SESSION_TOKEN_KEY = 'zktalk_session_token';
const DESKTOP_HARNESS_SESSION_KEY = 'zktalk_desktop_harness_session';
export const SESSION_TOKEN_CHANGED_EVENT = 'zktalk-session-token-changed';
export const AUTH_SESSION_LOST_EVENT = 'zktalk-auth-session-lost';

function canUseStorage() {
  return (
    typeof window !== 'undefined'
    && typeof window.sessionStorage !== 'undefined'
    && typeof window.localStorage !== 'undefined'
  );
}

function emitSessionTokenChanged(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SESSION_TOKEN_CHANGED_EVENT, {
      detail: { token },
    }),
  );
}

export function emitAuthSessionLost(status?: number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_LOST_EVENT, {
      detail: { status },
    }),
  );
}

export function getSessionToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  const sessionToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (sessionToken && sessionToken.length > 0) {
    return sessionToken;
  }

  const legacyToken = window.localStorage.getItem(SESSION_TOKEN_KEY);
  if (legacyToken && legacyToken.length > 0) {
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, legacyToken);
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    return legacyToken;
  }

  return null;
}

export function hasDesktopHarnessSession(): boolean {
  if (!canUseStorage()) {
    return false;
  }

  return window.sessionStorage.getItem(DESKTOP_HARNESS_SESSION_KEY) === 'true';
}

export function setSessionToken(token: string, options?: { desktopHarness?: boolean }) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  if (options?.desktopHarness) {
    window.sessionStorage.setItem(DESKTOP_HARNESS_SESSION_KEY, 'true');
    // Electron protocol handoff still has consumers that read the legacy key.
    window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(DESKTOP_HARNESS_SESSION_KEY);
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
  }
  emitSessionTokenChanged(token);
}

export function clearSessionToken() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.sessionStorage.removeItem(DESKTOP_HARNESS_SESSION_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  emitSessionTokenChanged(null);
}
