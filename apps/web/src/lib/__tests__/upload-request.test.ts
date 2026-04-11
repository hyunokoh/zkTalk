import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('upload-request', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps same-origin API uploads cookie-first without an authorization header', async () => {
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => false,
    }));
    const getSessionToken = vi.fn(() => 'session-token');
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));

    const { createUploadRequestInit } = await import('../upload-request');

    const requestInit = createUploadRequestInit('/api/upload/files/uploads/assets/users/user-1/avatar.png', {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
      },
    });

    expect(requestInit.credentials).toBe('include');
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
    expect(getSessionToken).not.toHaveBeenCalled();
  });

  it('uses bearer auth for desktop uploads to API-backed relative URLs', async () => {
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => true,
    }));
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken: () => 'desktop-token',
      hasDesktopHarnessSession: () => false,
    }));

    const { createUploadRequestInit } = await import('../upload-request');

    const requestInit = createUploadRequestInit('/api/upload/files/uploads/assets/users/user-1/avatar.png', {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
      },
    });

    expect(requestInit.credentials).toBe('include');
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer desktop-token');
  });

  it('does not leak cookie or bearer auth to absolute storage uploads', async () => {
    vi.doMock('@/lib/runtime-config', () => ({
      getApiBaseUrl: () => window.location.origin,
      isDesktopRuntime: () => true,
    }));
    const getSessionToken = vi.fn(() => 'desktop-token');
    vi.doMock('@/lib/session-token', () => ({
      getSessionToken,
      hasDesktopHarnessSession: () => false,
    }));

    const { createUploadRequestInit } = await import('../upload-request');

    const requestInit = createUploadRequestInit('https://storage.example.com/upload/presigned', {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
      },
    });

    expect(requestInit.credentials).toBe('omit');
    expect(new Headers(requestInit.headers).has('Authorization')).toBe(false);
    expect(getSessionToken).not.toHaveBeenCalled();
  });
});
