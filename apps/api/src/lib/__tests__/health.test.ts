import { describe, expect, it, vi } from 'vitest';
import { buildLivenessReport, buildReadinessReport, runDependencyCheck } from '../health.js';

describe('health', () => {
  it('builds a process-only liveness report', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
    const uptimeSpy = vi.spyOn(process, 'uptime').mockReturnValue(12.8);

    expect(buildLivenessReport('api', {
      checkedDependencies: ['database', 'redis'],
      excludedDependencies: [
        {
          name: 'object_storage',
          includedInReadiness: false,
          failureBoundary: 'attachment flows can fail',
          operatorAction: 'verify bucket separately',
        },
      ],
    })).toEqual({
      status: 'ok',
      service: 'api',
      scope: 'process',
      timestamp: '2026-04-07T12:00:00.000Z',
      runtime: {
        environment: 'test',
        pid: process.pid,
        uptimeSeconds: 12,
        nodeVersion: process.version,
      },
      operator: {
        healthEndpoints: {
          liveness: '/api/health',
          readiness: '/api/health/ready',
        },
        trafficGate: {
          shouldReceiveTraffic: false,
          reason: 'Traffic should stay blocked until readiness is confirmed.',
          nextCheck: '/api/health/ready',
        },
        readinessScope: {
          requiredDependencies: ['database', 'redis'],
          excludedDependencies: ['object_storage'],
        },
        immediateActions: [
          'Confirm /api/health/ready before routing baseline traffic to this instance.',
        ],
      },
    });

    uptimeSpy.mockRestore();
    vi.useRealTimers();
  });

  it('marks a dependency as ok when the check succeeds', async () => {
    await expect(
      runDependencyCheck('redis', async () => {
        return 'PONG';
      }),
    ).resolves.toEqual({
      name: 'redis',
      status: 'ok',
    });
  });

  it('captures dependency failures without throwing', async () => {
    await expect(
      runDependencyCheck('database', async () => {
        throw new Error('connection failed');
      }),
    ).resolves.toEqual({
      name: 'database',
      status: 'error',
      detail: 'connection failed',
    });
  });

  it('captures non-Error dependency failures with a stable fallback message', async () => {
    await expect(
      runDependencyCheck('redis', async () => {
        throw 'timeout';
      }),
    ).resolves.toEqual({
      name: 'redis',
      status: 'error',
      detail: 'Unknown error',
    });
  });

  it('returns ready when all dependency checks succeed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
    const uptimeSpy = vi.spyOn(process, 'uptime').mockReturnValue(4.2);

    const checks = [
      { name: 'database', check: async () => 'ok' },
      { name: 'redis', check: async () => 'PONG' },
    ];
    const excludedDependencies = [
      {
        name: 'object_storage',
        includedInReadiness: false,
        failureBoundary: 'attachment flows can fail',
        operatorAction: 'verify bucket separately',
      },
    ];
    const report = await buildReadinessReport('api', checks, {
      excludedDependencies,
    });

    expect(report).toEqual({
      service: 'api',
      status: 'ready',
      scope: 'required_runtime_dependencies',
      timestamp: '2026-04-07T12:00:00.000Z',
      runtime: {
        environment: 'test',
        pid: process.pid,
        uptimeSeconds: 4,
        nodeVersion: process.version,
      },
      summary: {
        total: 2,
        ok: 2,
        error: 0,
        failingDependencies: [],
      },
      dependencies: [
        { name: 'database', status: 'ok' },
        { name: 'redis', status: 'ok' },
      ],
      boundary: {
        checkedDependencies: ['database', 'redis'],
        excludedDependencies: [
          {
            name: 'object_storage',
            includedInReadiness: false,
            failureBoundary: 'attachment flows can fail',
            operatorAction: 'verify bucket separately',
          },
        ],
      },
      operator: {
        healthEndpoints: {
          liveness: '/api/health',
          readiness: '/api/health/ready',
        },
        trafficGate: {
          shouldReceiveTraffic: true,
          reason: 'Required runtime dependencies are ready for baseline API traffic.',
          nextCheck: '/api/health/ready',
        },
        readinessScope: {
          requiredDependencies: ['database', 'redis'],
          excludedDependencies: ['object_storage'],
        },
        immediateActions: [
          'Baseline API traffic can be enabled after this readiness result is confirmed for the target deploy.',
          'object_storage: verify bucket separately',
        ],
      },
    });

    uptimeSpy.mockRestore();
    vi.useRealTimers();
  });

  it('returns not_ready when any dependency check fails', async () => {
    const uptimeSpy = vi.spyOn(process, 'uptime').mockReturnValue(7.9);
    const report = await buildReadinessReport('api', [
      { name: 'database', check: async () => 'ok' },
      {
        name: 'redis',
        check: async () => {
          throw new Error('timeout');
        },
      },
    ]);

    expect(report.status).toBe('not_ready');
    expect(report.scope).toBe('required_runtime_dependencies');
    expect(report.summary).toEqual({
      total: 2,
      ok: 1,
      error: 1,
      failingDependencies: ['redis'],
    });
    expect(report.dependencies).toContainEqual({
      name: 'redis',
      status: 'error',
      detail: 'timeout',
    });
    expect(report.boundary).toEqual({
      checkedDependencies: ['database', 'redis'],
      excludedDependencies: [],
    });
    expect(report.operator).toEqual({
      healthEndpoints: {
        liveness: '/api/health',
        readiness: '/api/health/ready',
      },
      trafficGate: {
        shouldReceiveTraffic: false,
        reason: 'Required runtime dependencies failed: redis.',
        nextCheck: '/api/health/ready',
      },
      readinessScope: {
        requiredDependencies: ['database', 'redis'],
        excludedDependencies: [],
      },
      immediateActions: [
        'Keep traffic blocked until required dependencies recover: redis.',
        'Re-run /api/health/ready after restoring the failing required dependencies.',
      ],
    });
    expect(report.runtime).toEqual({
      environment: 'test',
      pid: process.pid,
      uptimeSeconds: 7,
      nodeVersion: process.version,
    });
    uptimeSpy.mockRestore();
  });

  it('returns ready when no required dependency checks are configured', async () => {
    const report = await buildReadinessReport('api', []);

    expect(report.status).toBe('ready');
    expect(report.summary).toEqual({
      total: 0,
      ok: 0,
      error: 0,
      failingDependencies: [],
    });
    expect(report.dependencies).toEqual([]);
    expect(report.operator.trafficGate).toEqual({
      shouldReceiveTraffic: true,
      reason: 'Required runtime dependencies are ready for baseline API traffic.',
      nextCheck: '/api/health/ready',
    });
    expect(report.operator.immediateActions).toEqual([
      'Baseline API traffic can be enabled after this readiness result is confirmed for the target deploy.',
    ]);
  });
});
