const INSECURE_COOKIE_SECRET = 'dev-cookie-secret-change-in-production';
const INSECURE_MAGIC_LINK_SECRET = 'dev-magic-link-secret-change-in-production';
const INSECURE_EMAIL_LINK_SECRET = 'dev-email-link-secret-change-in-production';
const INSECURE_LIVEKIT_API_KEY = 'devkey';
const INSECURE_LIVEKIT_API_SECRET = 'secret';
const DEFAULT_DATABASE_URL = 'postgresql://zktalk:zktalk@localhost:5432/zktalk';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_S3_ENDPOINT = 'http://localhost:9000';
const DEFAULT_S3_REGION = 'us-east-1';
const DEFAULT_S3_ACCESS_KEY = 'minioadmin';
const DEFAULT_S3_SECRET_KEY = 'minioadmin';
const DEFAULT_S3_BUCKET = 'zktalk-uploads';
const DEFAULT_SERVER_PORT = 4000;

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getConfiguredSecret(
  envName: string,
  fallbackValue: string,
  options?: {
    fallbackEnvNames?: string[];
  },
): string {
  const directValue = process.env[envName]?.trim();
  if (directValue) {
    if (isProductionEnv() && directValue === fallbackValue) {
      throw new Error(`${envName} must not use the development fallback in production`);
    }
    return directValue;
  }

  for (const fallbackEnvName of options?.fallbackEnvNames ?? []) {
    const fallbackEnvValue = process.env[fallbackEnvName]?.trim();
    if (fallbackEnvValue) {
      if (isProductionEnv() && fallbackEnvValue === fallbackValue) {
        throw new Error(`${fallbackEnvName} must not use the development fallback in production`);
      }
      return fallbackEnvValue;
    }
  }

  if (isProductionEnv()) {
    throw new Error(`${envName} must be set in production`);
  }

  return fallbackValue;
}

function getConfiguredValue(
  envName: string,
  fallbackValue: string,
  options?: {
    requireInProduction?: boolean;
    rejectFallbackInProduction?: boolean;
  },
): string {
  const configuredValue = process.env[envName]?.trim();
  if (configuredValue) {
    if (isProductionEnv() && options?.rejectFallbackInProduction && configuredValue === fallbackValue) {
      throw new Error(`${envName} must not use the development fallback in production`);
    }
    return configuredValue;
  }

  if (isProductionEnv() && options?.requireInProduction) {
    throw new Error(`${envName} must be set in production`);
  }

  return fallbackValue;
}

function validateUrlLikeSetting(
  envName: string,
  value: string,
  options?: {
    allowedProtocols?: string[];
    allowPathname?: boolean;
  },
): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid absolute URL`);
  }

  if (options?.allowedProtocols && !options.allowedProtocols.includes(parsed.protocol)) {
    throw new Error(`${envName} must use one of: ${options.allowedProtocols.join(', ')}`);
  }

  if (!options?.allowPathname && parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error(`${envName} must not include a path; use only the endpoint origin`);
  }

  if (parsed.search || parsed.hash) {
    throw new Error(`${envName} must not include query or hash fragments`);
  }

  return value;
}

export function getCookieSecret(): string {
  return getConfiguredSecret('COOKIE_SECRET', INSECURE_COOKIE_SECRET);
}

export function getCookieSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getCookieSecret());
}

export function getMagicLinkSecret(): string {
  return getConfiguredSecret('MAGIC_LINK_SECRET', INSECURE_MAGIC_LINK_SECRET);
}

export function getMagicLinkSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getMagicLinkSecret());
}

export function getEmailLinkSecret(): string {
  return getConfiguredSecret('EMAIL_LINK_SECRET', INSECURE_EMAIL_LINK_SECRET);
}

export function getEmailLinkSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getEmailLinkSecret());
}

export function getLivekitApiKey(): string {
  return getConfiguredSecret('LIVEKIT_API_KEY', INSECURE_LIVEKIT_API_KEY);
}

export function getLivekitApiSecret(): string {
  return getConfiguredSecret('LIVEKIT_API_SECRET', INSECURE_LIVEKIT_API_SECRET);
}

export function getDatabaseUrl(): string {
  return getConfiguredValue('DATABASE_URL', DEFAULT_DATABASE_URL, {
    requireInProduction: true,
  });
}

export function getRedisUrl(): string {
  return getConfiguredValue('REDIS_URL', DEFAULT_REDIS_URL, {
    requireInProduction: true,
  });
}

export function getS3Endpoint(): string | undefined {
  const configuredValue = process.env.S3_ENDPOINT?.trim();
  if (configuredValue) {
    return validateUrlLikeSetting('S3_ENDPOINT', configuredValue, {
      allowedProtocols: ['http:', 'https:'],
    });
  }

  if (isProductionEnv()) {
    return undefined;
  }

  return DEFAULT_S3_ENDPOINT;
}

export function getS3Region(): string {
  return getConfiguredValue('S3_REGION', DEFAULT_S3_REGION, {
    requireInProduction: true,
  });
}

export function getS3AccessKey(): string {
  return getConfiguredValue('S3_ACCESS_KEY', DEFAULT_S3_ACCESS_KEY, {
    requireInProduction: true,
    rejectFallbackInProduction: true,
  });
}

export function getS3SecretKey(): string {
  return getConfiguredValue('S3_SECRET_KEY', DEFAULT_S3_SECRET_KEY, {
    requireInProduction: true,
    rejectFallbackInProduction: true,
  });
}

export function getS3Bucket(): string {
  return getConfiguredValue('S3_BUCKET', DEFAULT_S3_BUCKET, {
    requireInProduction: true,
  });
}

export function getServerPort(): number {
  const configuredValue = process.env.PORT?.trim();
  if (!configuredValue) {
    if (isProductionEnv()) {
      throw new Error('PORT must be set in production');
    }

    return DEFAULT_SERVER_PORT;
  }

  const port = Number.parseInt(configuredValue, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  return port;
}
