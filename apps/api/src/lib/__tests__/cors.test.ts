import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAllowedCorsOriginSet,
  getConfiguredCorsOrigins,
  isAllowedLoopbackOrigin,
  isCorsOriginAllowed,
} from '../cors.js';

describe('cors', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses configured origins from comma-separated env text', () => {
    expect(
      getConfiguredCorsOrigins(' https://app.example.com, https://admin.example.com ,'),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('allows loopback origins automatically outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(isAllowedLoopbackOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedLoopbackOrigin('http://[::1]:3000')).toBe(true);
    expect(isCorsOriginAllowed('http://localhost:5555', '')).toBe(true);
    expect(createAllowedCorsOriginSet('').has('http://localhost:3000')).toBe(true);
  });

  it('does not auto-allow loopback origins in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(isCorsOriginAllowed('http://localhost:3000', '')).toBe(false);
    expect(createAllowedCorsOriginSet('').has('http://localhost:3000')).toBe(false);
  });

  it('allows explicitly configured production origins', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(
      isCorsOriginAllowed(
        'https://app.example.com',
        'https://app.example.com,https://admin.example.com',
      ),
    ).toBe(true);
  });

  it('allows loopback in production only when explicitly configured', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(isCorsOriginAllowed('http://localhost:3000', 'http://localhost:3000')).toBe(true);
  });
});
