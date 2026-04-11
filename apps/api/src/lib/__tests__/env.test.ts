import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDatabaseUrl,
  getCookieSecret,
  getCookieSecretBytes,
  getEmailLinkSecret,
  getEmailLinkSecretBytes,
  getLivekitApiKey,
  getLivekitApiSecret,
  getMagicLinkSecret,
  getMagicLinkSecretBytes,
  getRedisUrl,
  getS3AccessKey,
  getS3Bucket,
  getS3Endpoint,
  getS3Region,
  getS3SecretKey,
  getServerPort,
} from '../env.js';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the development fallback outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('COOKIE_SECRET', '');

    expect(getCookieSecret()).toBe('dev-cookie-secret-change-in-production');
  });

  it('requires COOKIE_SECRET in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECRET', '');

    expect(() => getCookieSecret()).toThrow('COOKIE_SECRET must be set in production');
  });

  it('rejects the development fallback in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECRET', 'dev-cookie-secret-change-in-production');

    expect(() => getCookieSecret()).toThrow(
      'COOKIE_SECRET must not use the development fallback in production',
    );
  });

  it('returns encoded bytes for a configured secret', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECRET', 'super-secret');

    expect(Array.from(getCookieSecretBytes())).toEqual(
      Array.from(new TextEncoder().encode('super-secret')),
    );
  });

  it('requires MAGIC_LINK_SECRET in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MAGIC_LINK_SECRET', '');

    expect(() => getMagicLinkSecret()).toThrow('MAGIC_LINK_SECRET must be set in production');
  });

  it('requires EMAIL_LINK_SECRET in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EMAIL_LINK_SECRET', '');

    expect(() => getEmailLinkSecret()).toThrow('EMAIL_LINK_SECRET must be set in production');
  });

  it('returns encoded email link bytes for a configured secret', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EMAIL_LINK_SECRET', 'email-secret');

    expect(Array.from(getEmailLinkSecretBytes())).toEqual(
      Array.from(new TextEncoder().encode('email-secret')),
    );
  });

  it('returns encoded magic link bytes for a configured secret', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MAGIC_LINK_SECRET', 'magic-secret');

    expect(Array.from(getMagicLinkSecretBytes())).toEqual(
      Array.from(new TextEncoder().encode('magic-secret')),
    );
  });

  it('requires LiveKit credentials in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LIVEKIT_API_KEY', '');
    vi.stubEnv('LIVEKIT_API_SECRET', '');

    expect(() => getLivekitApiKey()).toThrow('LIVEKIT_API_KEY must be set in production');
    expect(() => getLivekitApiSecret()).toThrow('LIVEKIT_API_SECRET must be set in production');
  });

  it('rejects development LiveKit credentials in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LIVEKIT_API_KEY', 'devkey');
    vi.stubEnv('LIVEKIT_API_SECRET', 'secret');

    expect(() => getLivekitApiKey()).toThrow(
      'LIVEKIT_API_KEY must not use the development fallback in production',
    );
    expect(() => getLivekitApiSecret()).toThrow(
      'LIVEKIT_API_SECRET must not use the development fallback in production',
    );
  });

  it('requires DATABASE_URL and REDIS_URL in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('REDIS_URL', '');

    expect(() => getDatabaseUrl()).toThrow('DATABASE_URL must be set in production');
    expect(() => getRedisUrl()).toThrow('REDIS_URL must be set in production');
  });

  it('requires S3 runtime values in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('S3_REGION', '');
    vi.stubEnv('S3_BUCKET', '');
    vi.stubEnv('S3_ACCESS_KEY', '');
    vi.stubEnv('S3_SECRET_KEY', '');

    expect(() => getS3Region()).toThrow('S3_REGION must be set in production');
    expect(() => getS3Bucket()).toThrow('S3_BUCKET must be set in production');
    expect(() => getS3AccessKey()).toThrow('S3_ACCESS_KEY must be set in production');
    expect(() => getS3SecretKey()).toThrow('S3_SECRET_KEY must be set in production');
  });

  it('does not silently fall back to localhost S3 in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('S3_ENDPOINT', '');

    expect(getS3Endpoint()).toBeUndefined();
  });

  it('rejects a non-absolute S3 endpoint', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('S3_ENDPOINT', 'minio:9000');

    expect(() => getS3Endpoint()).toThrow('S3_ENDPOINT must use one of: http:, https:');
  });

  it('rejects an S3 endpoint with a non-http protocol', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('S3_ENDPOINT', 'ftp://storage.example.com');

    expect(() => getS3Endpoint()).toThrow('S3_ENDPOINT must use one of: http:, https:');
  });

  it('rejects an S3 endpoint with a path suffix', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('S3_ENDPOINT', 'https://storage.example.com/zktalk-uploads');

    expect(() => getS3Endpoint()).toThrow(
      'S3_ENDPOINT must not include a path; use only the endpoint origin',
    );
  });

  it('rejects MinIO development credentials in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('S3_ACCESS_KEY', 'minioadmin');
    vi.stubEnv('S3_SECRET_KEY', 'minioadmin');

    expect(() => getS3AccessKey()).toThrow(
      'S3_ACCESS_KEY must not use the development fallback in production',
    );
    expect(() => getS3SecretKey()).toThrow(
      'S3_SECRET_KEY must not use the development fallback in production',
    );
  });

  it('requires PORT in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PORT', '');

    expect(() => getServerPort()).toThrow('PORT must be set in production');
  });

  it('rejects an invalid PORT value', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PORT', '70000');

    expect(() => getServerPort()).toThrow('PORT must be a valid TCP port');
  });

  it('uses the development default PORT outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PORT', '');

    expect(getServerPort()).toBe(4000);
  });

  it('uses the development S3 endpoint fallback outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('S3_ENDPOINT', '');

    expect(getS3Endpoint()).toBe('http://localhost:9000');
  });
});
