import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('client-log', () => {
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    infoSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('emits logs in non-production runtimes', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const { devLogInfo, devLogWarn, devLogError } = await import('../client-log');

    devLogInfo('info message');
    devLogWarn('warn message');
    devLogError('error message');

    expect(infoSpy).toHaveBeenCalledWith('info message');
    expect(warnSpy).toHaveBeenCalledWith('warn message');
    expect(errorSpy).toHaveBeenCalledWith('error message');
  });

  it('suppresses logs for normal production user routes', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const { devLogInfo, devLogWarn, devLogError } = await import('../client-log');

    devLogInfo('info message');
    devLogWarn('warn message');
    devLogError('error message');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('allows logs on the operator desktop harness route in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.history.replaceState({}, '', '/desktop-harness?mode=channel');

    const { devLogWarn } = await import('../client-log');

    devLogWarn('harness warning');

    expect(warnSpy).toHaveBeenCalledWith('harness warning');
  });

  it('allows explicit debug logging requests in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.history.replaceState({}, '', '/settings?debugLogs=1&tab=backup');

    const { devLogError } = await import('../client-log');

    devLogError('debug error');

    expect(errorSpy).toHaveBeenCalledWith('debug error');
    expect(window.location.pathname).toBe('/settings');
    expect(window.location.search).toBe('?tab=backup');
    expect(window.sessionStorage.getItem('zktalk_debug_logs')).toBe('1');
  });

  it('keeps explicit production debug logging scoped to the active session after the URL is scrubbed', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.history.replaceState({}, '', '/settings?debugLogs=true');

    const { devLogWarn } = await import('../client-log');

    devLogWarn('session warning');
    window.history.replaceState({}, '', '/communities/general');
    devLogWarn('follow-up warning');

    expect(warnSpy).toHaveBeenNthCalledWith(1, 'session warning');
    expect(warnSpy).toHaveBeenNthCalledWith(2, 'follow-up warning');
    expect(window.location.pathname).toBe('/communities/general');
    expect(window.location.search).toBe('');
  });

  it('allows an explicit production URL flag to disable session debug logging again', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.sessionStorage.setItem('zktalk_debug_logs', '1');
    window.history.replaceState({}, '', '/settings?debugLogs=0');

    const { devLogInfo } = await import('../client-log');

    devLogInfo('info message');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/settings');
    expect(window.location.search).toBe('');
    expect(window.sessionStorage.getItem('zktalk_debug_logs')).toBeNull();
  });
});
