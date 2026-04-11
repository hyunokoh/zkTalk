import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth-mode', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('treats same-host websocket urls as same-origin targets', async () => {
    vi.doMock('@/lib/runtime-config', () => ({
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      hasDesktopHarnessSession: () => false,
    }));

    const { isSameOriginTarget, shouldUseCookieFirstTarget } = await import('../auth-mode');

    expect(isSameOriginTarget(`ws://${window.location.host}/api/ws`)).toBe(true);
    expect(shouldUseCookieFirstTarget(`ws://${window.location.host}/api/ws`)).toBe(true);
  });

  it('keeps same-origin desktop harness targets cookie-first', async () => {
    vi.doMock('@/lib/runtime-config', () => ({
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      hasDesktopHarnessSession: () => true,
    }));

    const { shouldAttachStoredSessionToken } = await import('../auth-mode');

    expect(shouldAttachStoredSessionToken(window.location.origin)).toBe(false);
    expect(shouldAttachStoredSessionToken(`ws://${window.location.host}/api/ws`)).toBe(false);
  });

  it('still allows bearer fallback for cross-origin desktop harness targets', async () => {
    vi.doMock('@/lib/runtime-config', () => ({
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      hasDesktopHarnessSession: () => true,
    }));

    const { shouldAttachStoredSessionToken } = await import('../auth-mode');

    expect(shouldAttachStoredSessionToken('https://api.example.com')).toBe(true);
    expect(shouldAttachStoredSessionToken('wss://api.example.com/api/ws')).toBe(true);
  });
});
