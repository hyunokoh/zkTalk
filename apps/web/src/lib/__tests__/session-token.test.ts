import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionToken,
  getSessionToken,
  hasDesktopHarnessSession,
  SESSION_TOKEN_CHANGED_EVENT,
  setSessionToken,
} from '../session-token';

describe('session-token', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores session tokens in sessionStorage and removes the legacy localStorage copy', () => {
    setSessionToken('session-token');

    expect(window.sessionStorage.getItem('zktalk_session_token')).toBe('session-token');
    expect(hasDesktopHarnessSession()).toBe(false);
    expect(window.localStorage.getItem('zktalk_session_token')).toBeNull();
  });

  it('marks desktop harness sessions explicitly', () => {
    setSessionToken('session-token', { desktopHarness: true });

    expect(hasDesktopHarnessSession()).toBe(true);
    expect(window.localStorage.getItem('zktalk_session_token')).toBe('session-token');

    clearSessionToken();

    expect(hasDesktopHarnessSession()).toBe(false);
    expect(window.localStorage.getItem('zktalk_session_token')).toBeNull();
  });

  it('migrates a legacy localStorage token into sessionStorage on read', () => {
    window.localStorage.setItem('zktalk_session_token', 'legacy-token');

    expect(getSessionToken()).toBe('legacy-token');
    expect(window.sessionStorage.getItem('zktalk_session_token')).toBe('legacy-token');
    expect(window.localStorage.getItem('zktalk_session_token')).toBeNull();
  });

  it('emits a token change event when the token changes', () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_TOKEN_CHANGED_EVENT, listener);

    setSessionToken('session-token');
    clearSessionToken();

    expect(listener).toHaveBeenCalledTimes(2);

    window.removeEventListener(SESSION_TOKEN_CHANGED_EVENT, listener);
  });
});
