import { afterEach, describe, expect, it, vi } from 'vitest';

describe('runtime-config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete window.zkTalkDesktopConfig;
    delete window.zkTalkDesktop;
  });

  it('uses localhost fallbacks in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_LIVEKIT_URL', '');

    const { getApiBaseUrl, getWebSocketUrl, getLivekitUrl } = await import('../runtime-config');

    expect(getApiBaseUrl()).toBe('http://localhost:4000');
    expect(getWebSocketUrl()).toBe('ws://localhost:4000/api/ws');
    expect(getLivekitUrl()).toBe('ws://localhost:7880');
  });

  it('uses the current browser hostname for development fallbacks', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_LIVEKIT_URL', '');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: '127.0.0.1',
        protocol: 'http:',
      },
    });

    const { getApiBaseUrl, getWebSocketUrl, getLivekitUrl } = await import('../runtime-config');

    expect(getApiBaseUrl()).toBe('http://127.0.0.1:4000');
    expect(getWebSocketUrl()).toBe('ws://127.0.0.1:4000/api/ws');
    expect(getLivekitUrl()).toBe('ws://127.0.0.1:7880');
  });

  it('does not silently fall back to localhost in production web mode', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_WS_URL', '');
    vi.stubEnv('NEXT_PUBLIC_LIVEKIT_URL', '');

    const { getApiBaseUrl, getWebSocketUrl, getLivekitUrl } = await import('../runtime-config');

    expect(getApiBaseUrl()).toBe('');
    expect(getWebSocketUrl()).toBe('');
    expect(getLivekitUrl()).toBe('');
  });

  it('prefers desktop-injected config in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.zkTalkDesktopConfig = {
      apiUrl: 'https://desktop-api.example.com',
      wsUrl: 'wss://desktop-api.example.com/api/ws',
      livekitUrl: 'wss://livekit.example.com',
      localAgentLanguagePreset: 'english_only',
    };

    const { getApiBaseUrl, getDesktopLocalAgentLanguagePreset, getWebSocketUrl, getLivekitUrl } =
      await import('../runtime-config');

    expect(getApiBaseUrl()).toBe('https://desktop-api.example.com');
    expect(getWebSocketUrl()).toBe('wss://desktop-api.example.com/api/ws');
    expect(getLivekitUrl()).toBe('wss://livekit.example.com');
    expect(getDesktopLocalAgentLanguagePreset()).toBe('english_only');
  });

  it('exposes desktop runtime detection when injected desktop config exists', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.zkTalkDesktopConfig = {
      apiUrl: 'https://desktop-api.example.com',
    };

    const { isDesktopRuntime } = await import('../runtime-config');

    expect(isDesktopRuntime()).toBe(true);
  });

  it('does not mark the normal browser runtime as desktop by default', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { isDesktopRuntime } = await import('../runtime-config');

    expect(isDesktopRuntime()).toBe(false);
  });

  it('detects desktop runtime when only the desktop bridge object is injected', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.zkTalkDesktop = {
      retryLoad: vi.fn(),
    };

    const { isDesktopRuntime } = await import('../runtime-config');

    expect(isDesktopRuntime()).toBe(true);
  });
});
