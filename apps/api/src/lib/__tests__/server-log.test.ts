import { describe, expect, it } from 'vitest';
import {
  buildStartupLogContext,
  classifyRequestLog,
  sanitizeErrorForLogs,
  sanitizeUrlForLogs,
  summarizeConnectionTarget,
} from '../server-log.js';

describe('server-log', () => {
  it('redacts credentials and path details from connection targets', () => {
    expect(summarizeConnectionTarget('redis://user:password@example.com:6379/2')).toBe(
      'redis://example.com:6379',
    );
  });

  it('falls back cleanly for invalid URLs', () => {
    expect(summarizeConnectionTarget('not-a-valid-url')).toBe('configured endpoint');
  });

  it('redacts sensitive query parameters from logged urls', () => {
    expect(
      sanitizeUrlForLogs('/api/ws?token=session-token&channel=general&api_key=secret-key'),
    ).toBe('/api/ws?token=%5Bredacted%5D&channel=general&api_key=%5Bredacted%5D');
  });

  it('redacts sensitive query parameters case-insensitively', () => {
    expect(
      sanitizeUrlForLogs('/api/ws?Authorization=Bearer+abc123&channel=general'),
    ).toBe('/api/ws?Authorization=%5Bredacted%5D&channel=general');
  });

  it('redacts token-like path segments from logged urls', () => {
    expect(sanitizeUrlForLogs('/api/webhooks/whsec_123/execute')).toBe(
      '/api/webhooks/[redacted]/execute',
    );
    expect(sanitizeUrlForLogs('/api/auth/qr/status/qr-token')).toBe('/api/auth/qr/status/[redacted]');
  });

  it('redacts sensitive fields even when the input is not a fully valid URL', () => {
    expect(sanitizeUrlForLogs('/api/messages?access_token=abc123&channel=general')).toBe(
      '/api/messages?access_token=%5Bredacted%5D&channel=general',
    );
  });

  it('keeps sanitized error details concise', () => {
    const error = Object.assign(new Error('Connection failed'), {
      code: 'ECONNREFUSED',
      statusCode: 503,
      stack: 'sensitive stack trace',
    });

    expect(sanitizeErrorForLogs(error)).toEqual({
      type: 'Error',
      message: 'Connection failed',
      code: 'ECONNREFUSED',
      statusCode: 503,
    });
  });

  it('normalizes non-Error log payloads into a stable shape', () => {
    expect(sanitizeErrorForLogs('redis timeout')).toEqual({
      type: 'string',
      message: 'redis timeout',
    });
  });

  it('builds a startup summary without leaking secrets', () => {
    expect(buildStartupLogContext({
      service: 'api',
      host: '0.0.0.0',
      port: 4000,
      logLevel: 'info',
      requiredDependencies: ['database', 'redis'],
      excludedDependencies: [
        {
          name: 'object_storage',
          includedInReadiness: false,
          failureBoundary: 'attachment flows can fail',
          operatorAction: 'verify bucket separately',
        },
        {
          name: 'ai_provider',
          includedInReadiness: false,
          failureBoundary: 'AI routes can fail',
          operatorAction: 'verify provider config separately',
        },
      ],
      dependencyTargets: {
        database: {
          target: summarizeConnectionTarget('postgresql://user:secret@db.example.com:5432/zktalk'),
        },
        ai_provider: {
          provider: 'anthropic',
          status: 'misconfigured',
          keyEnvVar: 'AI_API_KEY',
          issue: 'AI_API_KEY must be set when AI_PROVIDER=anthropic',
        },
      },
    })).toEqual({
      event: 'startup_summary',
      service: 'api',
      listenAddress: {
        host: '0.0.0.0',
        port: 4000,
        url: 'http://0.0.0.0:4000',
      },
      runtime: {
        environment: 'test',
        pid: process.pid,
        nodeVersion: process.version,
        logLevel: 'info',
      },
      healthEndpoints: {
        liveness: '/api/health',
        readiness: '/api/health/ready',
      },
      readiness: {
        requiredDependencies: ['database', 'redis'],
        excludedDependencies: [
          {
            name: 'object_storage',
            failureBoundary: 'attachment flows can fail',
            operatorAction: 'verify bucket separately',
          },
          {
            name: 'ai_provider',
            failureBoundary: 'AI routes can fail',
            operatorAction: 'verify provider config separately',
          },
        ],
      },
      dependencyTargets: {
        database: {
          target: 'postgresql://db.example.com:5432',
        },
        ai_provider: {
          provider: 'anthropic',
          status: 'misconfigured',
          keyEnvVar: 'AI_API_KEY',
          issue: 'AI_API_KEY must be set when AI_PROVIDER=anthropic',
        },
      },
    });
  });

  it('marks 4xx and 5xx responses as operator-visible request logs', () => {
    expect(
      classifyRequestLog({
        method: 'GET',
        rawUrl: '/api/messages?token=secret',
        statusCode: 401,
        responseTimeMs: 45,
      }),
    ).toEqual({
      level: 'warn',
      message: 'Request rejected',
    });

    expect(
      classifyRequestLog({
        method: 'POST',
        rawUrl: '/api/messages',
        statusCode: 500,
        responseTimeMs: 123,
      }),
    ).toEqual({
      level: 'error',
      message: 'Request failed',
    });
  });

  it('only flags slow successful requests outside quiet health and websocket endpoints', () => {
    expect(
      classifyRequestLog({
        method: 'POST',
        rawUrl: '/api/messages',
        statusCode: 201,
        responseTimeMs: 1_250,
      }),
    ).toEqual({
      level: 'warn',
      message: 'Slow request',
    });

    expect(
      classifyRequestLog({
        method: 'GET',
        rawUrl: '/api/health/ready',
        statusCode: 200,
        responseTimeMs: 2_500,
      }),
    ).toBeNull();

    expect(
      classifyRequestLog({
        method: 'GET',
        rawUrl: '/api/ws?token=secret',
        statusCode: 101,
        responseTimeMs: 1_500,
      }),
    ).toBeNull();
  });

  it('does not flag slow OPTIONS preflight requests', () => {
    expect(
      classifyRequestLog({
        method: 'OPTIONS',
        rawUrl: '/api/messages',
        statusCode: 204,
        responseTimeMs: 1_500,
      }),
    ).toBeNull();
  });
});
