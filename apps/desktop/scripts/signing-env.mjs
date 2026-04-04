import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');

export const defaultSigningEnvPath = path.join(desktopDir, 'signing.env');
export const resolvedSigningEnvPath = process.env.ZKTALK_SIGNING_ENV_PATH || defaultSigningEnvPath;

const placeholderMatchers = [
  /^you@example\.com$/i,
  /^xxxx(?:-xxxx)+$/i,
  /^TEAMID1234$/i,
  /^\/absolute\/path\/to\/certificate\.p12$/i,
  /^your-password$/i,
];

export function parseEnvFile(content) {
  const result = {};

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

export function loadSigningEnv(filePath = resolvedSigningEnvPath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseEnvFile(readFileSync(filePath, 'utf8'));
}

export function getEnvValueStatus(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'MISSING';
  }

  const normalized = value.trim();
  if (placeholderMatchers.some((matcher) => matcher.test(normalized))) {
    return 'EXAMPLE';
  }

  return 'OK';
}

export function getCertificateLinkStatus(value) {
  return inspectCertificateLink(value).status;
}

export function combineEnvStatuses(...statuses) {
  if (statuses.includes('OK')) {
    return 'OK';
  }
  if (statuses.includes('INVALID_PATH')) {
    return 'INVALID_PATH';
  }
  if (statuses.includes('EXAMPLE')) {
    return 'EXAMPLE';
  }
  return 'MISSING';
}

export function inspectCertificateLink(value) {
  const baseStatus = getEnvValueStatus(value);
  if (baseStatus !== 'OK') {
    return {
      status: baseStatus,
      resolvedPath: null,
    };
  }

  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized) || /^file:\/\//i.test(normalized)) {
    return {
      status: 'OK',
      resolvedPath: normalized,
    };
  }

  const resolvedPath = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(desktopDir, normalized);

  return {
    status: existsSync(resolvedPath) ? 'OK' : 'INVALID_PATH',
    resolvedPath,
  };
}
