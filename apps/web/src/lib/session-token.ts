const SESSION_TOKEN_KEY = 'zktalk_session_token';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getSessionToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  const token = window.localStorage.getItem(SESSION_TOKEN_KEY);
  return token && token.length > 0 ? token : null;
}

export function setSessionToken(token: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}
