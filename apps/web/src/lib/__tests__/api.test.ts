import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('api', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers the user-facing message over the internal error code', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => 'http://127.0.0.1:4000',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
    }));
    const { ApiError, api } = await import('../api');

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED',
          message: 'Session expired',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(api('/api/me')).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Session expired',
      }),
    );
    expect(clearSessionToken).toHaveBeenCalledTimes(1);
    expect(emitAuthSessionLost).toHaveBeenCalledWith(401);
  });

  it('uses the error code as a fallback when the server omits a message', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => 'http://127.0.0.1:4000',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
    }));
    const { ApiError, api } = await import('../api');

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'RATE_LIMITED',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(api('/api/me')).rejects.toEqual(
      expect.objectContaining({
        status: 429,
        code: 'RATE_LIMITED',
        message: 'RATE_LIMITED',
      }),
    );
  });

  it('parses structured errors for direct fetch responses without clearing auth on 403', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => 'http://127.0.0.1:4000',
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken: () => 'session-token',
      hasDesktopHarnessSession: () => false,
    }));
    const { assertOkResponse } = await import('../api');

    const response = new Response(
      JSON.stringify({
        error: 'FORBIDDEN_ATTACHMENT',
        message: 'Attachment access denied',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    await expect(assertOkResponse(response)).rejects.toEqual(
      expect.objectContaining({
        status: 403,
        code: 'FORBIDDEN_ATTACHMENT',
        message: 'Attachment access denied',
      }),
    );
    expect(clearSessionToken).not.toHaveBeenCalled();
    expect(emitAuthSessionLost).not.toHaveBeenCalled();
  });

  it('fails clearly when the runtime API URL is missing', async () => {
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => '',
    }));

    const { api: apiWithoutBaseUrl } = await import('../api');

    await expect(apiWithoutBaseUrl('/api/me')).rejects.toThrow('API base URL is not configured');
  });

  it('does not attach a bearer token for same-origin web requests', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => false,
    }));
    const getSessionToken = vi.fn(() => 'session-token');
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me');

    expect(fetchSpy).toHaveBeenCalledWith(
      `${window.location.origin}/api/me`,
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      }),
    );
    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
    expect(getSessionToken).not.toHaveBeenCalled();
  });

  it('does not attach a bearer token for normal cross-origin web requests', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => 'http://127.0.0.1:4000',
      isDesktopRuntime: () => false,
    }));
    const getSessionToken = vi.fn(() => 'session-token');
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me');

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
    expect(getSessionToken).not.toHaveBeenCalled();
  });

  it('attaches a bearer token for cross-origin desktop harness web requests', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => 'http://127.0.0.1:4000',
      isDesktopRuntime: () => false,
    }));
    const getSessionToken = vi.fn(() => 'session-token');
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => true,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me');

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer session-token');
    expect(new Headers(requestInit.headers).get('x-zktalk-auth-mode')).toBeNull();
    expect(getSessionToken).toHaveBeenCalled();
  });

  it('keeps same-origin desktop harness web requests cookie-first', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    const getSessionToken = vi.fn(() => 'session-token');
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => false,
    }));
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => true,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me');

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
    expect(getSessionToken).not.toHaveBeenCalled();
  });

  it('can force bearer auth for same-origin token-driven requests', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => false,
    }));
    const getSessionToken = vi.fn(() => 'session-token');
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me', { authMode: 'bearer' });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer session-token');
    expect(new Headers(requestInit.headers).get('x-zktalk-auth-mode')).toBe('bearer');
    expect(getSessionToken).toHaveBeenCalled();
  });

  it('attaches a bearer token for same-origin desktop runtime requests', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => true,
    }));
    const getSessionToken = vi.fn(() => 'desktop-session-token');
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me');

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer desktop-session-token');
    expect(getSessionToken).toHaveBeenCalled();
  });

  it('honors explicit cookie auth mode even in desktop runtime', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    const getSessionToken = vi.fn(() => 'desktop-session-token');
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => true,
    }));
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me', { authMode: 'cookie' });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
    expect(new Headers(requestInit.headers).has('x-zktalk-auth-mode')).toBe(false);
    expect(getSessionToken).not.toHaveBeenCalled();
  });

  it('removes a caller-provided authorization header when cookie auth is forced', async () => {
    const clearSessionToken = vi.fn();
    const emitAuthSessionLost = vi.fn();
    const getSessionToken = vi.fn(() => 'desktop-session-token');
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => true,
    }));
    vi.doMock('@/lib/session-token', () => ({
      clearSessionToken,
      emitAuthSessionLost,
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));
    const { api } = await import('../api');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await api('/api/me', {
      authMode: 'cookie',
      headers: {
        Authorization: 'Bearer stale-token',
      },
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
    expect(getSessionToken).not.toHaveBeenCalled();
  });
});
