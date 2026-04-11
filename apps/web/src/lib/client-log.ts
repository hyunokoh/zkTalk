const DEBUG_LOGS_SESSION_KEY = 'zktalk_debug_logs';

function isOperatorHarnessPathname(pathname: string | undefined): boolean {
  return pathname === '/desktop-harness';
}

function getExplicitDebugLoggingPreference(search: string | undefined): boolean | null {
  if (!search) {
    return null;
  }

  const params = new URLSearchParams(search);
  const value = params.get('debugLogs')?.trim().toLowerCase();
  if (value === '1' || value === 'true') {
    return true;
  }

  if (value === '0' || value === 'false') {
    return false;
  }

  return null;
}

function readDebugLoggingSessionFlag(): boolean {
  try {
    return window.sessionStorage.getItem(DEBUG_LOGS_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDebugLoggingSessionFlag(enabled: boolean): void {
  try {
    if (enabled) {
      window.sessionStorage.setItem(DEBUG_LOGS_SESSION_KEY, '1');
      return;
    }

    window.sessionStorage.removeItem(DEBUG_LOGS_SESSION_KEY);
  } catch {
    // Ignore storage failures and fall back to the current page context.
  }
}

function scrubDebugLogsQueryParam(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('debugLogs')) {
      return;
    }

    url.searchParams.delete('debugLogs');
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  } catch {
    // Ignore URL rewrite failures and keep runtime behavior best-effort only.
  }
}

function syncExplicitDebugLoggingPreference(): boolean | null {
  const preference = getExplicitDebugLoggingPreference(window.location?.search);
  if (preference === null) {
    return null;
  }

  writeDebugLoggingSessionFlag(preference);
  scrubDebugLogsQueryParam();
  return preference;
}

function isDevelopmentLoggingEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  if (isOperatorHarnessPathname(window.location?.pathname)) {
    return true;
  }

  const explicitPreference = syncExplicitDebugLoggingPreference();
  if (explicitPreference !== null) {
    return explicitPreference;
  }

  return readDebugLoggingSessionFlag();
}

export function devLogInfo(message: string, ...args: unknown[]): void {
  if (isDevelopmentLoggingEnabled()) {
    console.info(message, ...args);
  }
}

export function devLogWarn(message: string, ...args: unknown[]): void {
  if (isDevelopmentLoggingEnabled()) {
    console.warn(message, ...args);
  }
}

export function devLogError(message: string, ...args: unknown[]): void {
  if (isDevelopmentLoggingEnabled()) {
    console.error(message, ...args);
  }
}
