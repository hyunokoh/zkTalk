import { isProductionEnv } from './env.js';

const DEFAULT_LOOPBACK_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8081',
];

export function getConfiguredCorsOrigins(rawCorsOrigin: string | undefined): string[] {
  return (rawCorsOrigin ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedLoopbackOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin);
}

export function createAllowedCorsOriginSet(rawCorsOrigin: string | undefined): Set<string> {
  const configuredOrigins = getConfiguredCorsOrigins(rawCorsOrigin);
  const defaultOrigins = isProductionEnv() ? [] : DEFAULT_LOOPBACK_ORIGINS;
  return new Set([...defaultOrigins, ...configuredOrigins]);
}

export function isCorsOriginAllowed(origin: string, rawCorsOrigin: string | undefined): boolean {
  const allowedOrigins = createAllowedCorsOriginSet(rawCorsOrigin);
  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (!isProductionEnv() && isAllowedLoopbackOrigin(origin)) {
    return true;
  }

  return false;
}
