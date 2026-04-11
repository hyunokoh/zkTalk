import type { ReadinessBoundaryDependency } from './health.js';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

const QUIET_SUCCESS_PATHS = new Set([
  '/api/health',
  '/api/health/ready',
  '/api/ws',
]);

const SLOW_REQUEST_THRESHOLD_MS = 1_000;

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'authorization',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'id_token',
  'secret',
  'signature',
]);

const SENSITIVE_PATH_REPLACERS: ReadonlyArray<{
  pattern: RegExp;
  replace(pathname: string): string;
}> = [
  {
    pattern: /^\/api\/auth\/qr\/status\/[^/]+$/i,
    replace(pathname) {
      return pathname.replace(/\/[^/]+$/, '/[redacted]');
    },
  },
  {
    pattern: /^\/api\/webhooks\/[^/]+\/execute$/i,
    replace(pathname) {
      return pathname.replace(/^\/api\/webhooks\/[^/]+\/execute$/i, '/api/webhooks/[redacted]/execute');
    },
  },
];

function sanitizeSensitivePath(pathname: string): string {
  for (const { pattern, replace } of SENSITIVE_PATH_REPLACERS) {
    if (pattern.test(pathname)) {
      return replace(pathname);
    }
  }

  return pathname;
}

function getSanitizedPathname(rawUrl: string): string {
  const [pathname] = sanitizeUrlForLogs(rawUrl).split('?', 1);
  return pathname || '/';
}

export function summarizeConnectionTarget(rawTarget: string): string {
  try {
    const target = new URL(rawTarget);
    const port = target.port ? `:${target.port}` : '';
    return `${target.protocol}//${target.hostname}${port}`;
  } catch {
    return 'configured endpoint';
  }
}

export function sanitizeUrlForLogs(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const sanitized = new URL(parsed.pathname, 'http://localhost');
    sanitized.pathname = sanitizeSensitivePath(parsed.pathname);

    for (const [key, value] of parsed.searchParams.entries()) {
      sanitized.searchParams.set(
        key,
        SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? '[redacted]' : value,
      );
    }

    return `${sanitized.pathname}${sanitized.search}`;
  } catch {
    const [rawPathname, rawQuery] = rawUrl.split('?', 2);
    const pathname = sanitizeSensitivePath(rawPathname);
    if (!rawQuery) {
      return pathname;
    }

    const searchParams = new URLSearchParams(rawQuery);
    for (const key of [...searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        searchParams.set(key, '[redacted]');
      }
    }

    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }
}

export function sanitizeErrorForLogs(
  error: unknown,
): { type: string; message: string } & Record<string, unknown> {
  if (error instanceof Error) {
    const details: { type: string; message: string } & Record<string, unknown> = {
      type: error.name,
      message: error.message,
    };

    const code = Reflect.get(error, 'code');
    const statusCode = Reflect.get(error, 'statusCode');

    if (typeof code === 'string' && code.length > 0) {
      details.code = code;
    }

    if (typeof statusCode === 'number') {
      details.statusCode = statusCode;
    }

    return details;
  }

  return {
    type: typeof error,
    message: toErrorMessage(error),
  };
}

export function classifyRequestLog(options: {
  method: string;
  rawUrl: string;
  statusCode: number;
  responseTimeMs?: number;
}): { level: 'warn' | 'error'; message: string } | null {
  const { method, rawUrl, statusCode, responseTimeMs } = options;
  const pathname = getSanitizedPathname(rawUrl);

  if (statusCode >= 500) {
    return {
      level: 'error',
      message: 'Request failed',
    };
  }

  if (statusCode >= 400) {
    return {
      level: 'warn',
      message: statusCode === 429 ? 'Request rate limited' : 'Request rejected',
    };
  }

  if (
    method.toUpperCase() !== 'OPTIONS' &&
    typeof responseTimeMs === 'number' &&
    responseTimeMs >= SLOW_REQUEST_THRESHOLD_MS &&
    !QUIET_SUCCESS_PATHS.has(pathname) &&
    statusCode < 400 &&
    statusCode !== 101
  ) {
    return {
      level: 'warn',
      message: 'Slow request',
    };
  }

  return null;
}

export function buildStartupLogContext(options: {
  service: string;
  host: string;
  port: number;
  logLevel: string;
  requiredDependencies: string[];
  excludedDependencies: ReadinessBoundaryDependency[];
  dependencyTargets?: Record<string, Record<string, unknown>>;
}) {
  return {
    event: 'startup_summary',
    service: options.service,
    listenAddress: {
      host: options.host,
      port: options.port,
      url: `http://${options.host}:${options.port}`,
    },
    runtime: {
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      nodeVersion: process.version,
      logLevel: options.logLevel,
    },
    healthEndpoints: {
      liveness: '/api/health',
      readiness: '/api/health/ready',
    },
    readiness: {
      requiredDependencies: options.requiredDependencies,
      excludedDependencies: options.excludedDependencies.map((dependency) => ({
        name: dependency.name,
        failureBoundary: dependency.failureBoundary,
        operatorAction: dependency.operatorAction,
      })),
    },
    dependencyTargets: options.dependencyTargets ?? {},
  };
}

export function logServerInfo(scope: string, message: string, context?: Record<string, unknown>) {
  if (context) {
    console.info(`[${scope}] ${message}`, context);
    return;
  }

  console.info(`[${scope}] ${message}`);
}

export function logServerError(
  scope: string,
  message: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  console.error(`[${scope}] ${message}`, {
    ...(context ?? {}),
    error: sanitizeErrorForLogs(error),
  });
}
