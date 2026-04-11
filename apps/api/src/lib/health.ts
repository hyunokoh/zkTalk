export interface LivenessReport {
  status: 'ok';
  service: string;
  scope: 'process';
  timestamp: string;
  runtime: HealthRuntimeSnapshot;
  operator: HealthOperatorSnapshot;
}

export interface DependencyHealth {
  name: string;
  status: 'ok' | 'error';
  detail?: string;
}

export interface ReadinessBoundaryDependency {
  name: string;
  includedInReadiness: boolean;
  failureBoundary: string;
  operatorAction: string;
}

export interface ReadinessReport {
  service: string;
  status: 'ready' | 'not_ready';
  scope: 'required_runtime_dependencies';
  timestamp: string;
  runtime: HealthRuntimeSnapshot;
  summary: {
    total: number;
    ok: number;
    error: number;
    failingDependencies: string[];
  };
  dependencies: DependencyHealth[];
  boundary: {
    checkedDependencies: string[];
    excludedDependencies: ReadinessBoundaryDependency[];
  };
  operator: HealthOperatorSnapshot;
}

export interface HealthRuntimeSnapshot {
  environment: string;
  pid: number;
  uptimeSeconds: number;
  nodeVersion: string;
}

export interface HealthOperatorSnapshot {
  healthEndpoints: {
    liveness: string;
    readiness: string;
  };
  trafficGate: {
    shouldReceiveTraffic: boolean;
    reason: string;
    nextCheck: string;
  };
  readinessScope: {
    requiredDependencies: string[];
    excludedDependencies: string[];
  };
  immediateActions: string[];
}

function buildRuntimeSnapshot(): HealthRuntimeSnapshot {
  return {
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
  };
}

function buildOperatorSnapshot(options?: {
  checkedDependencies?: string[];
  excludedDependencies?: ReadinessBoundaryDependency[];
  shouldReceiveTraffic?: boolean;
  reason?: string;
  nextCheck?: string;
  immediateActions?: string[];
}): HealthOperatorSnapshot {
  return {
    healthEndpoints: {
      liveness: '/api/health',
      readiness: '/api/health/ready',
    },
    trafficGate: {
      shouldReceiveTraffic: options?.shouldReceiveTraffic ?? false,
      reason: options?.reason ?? 'Traffic should stay blocked until readiness is confirmed.',
      nextCheck: options?.nextCheck ?? '/api/health/ready',
    },
    readinessScope: {
      requiredDependencies: options?.checkedDependencies ?? [],
      excludedDependencies: (options?.excludedDependencies ?? []).map(({ name }) => name),
    },
    immediateActions: options?.immediateActions ?? [],
  };
}

export function buildLivenessReport(
  service: string,
  options?: {
    checkedDependencies?: string[];
    excludedDependencies?: ReadinessBoundaryDependency[];
  },
): LivenessReport {
  return {
    status: 'ok',
    service,
    scope: 'process',
    timestamp: new Date().toISOString(),
    runtime: buildRuntimeSnapshot(),
    operator: buildOperatorSnapshot({
      ...options,
      immediateActions: [
        'Confirm /api/health/ready before routing baseline traffic to this instance.',
      ],
    }),
  };
}

export async function runDependencyCheck(
  name: string,
  check: () => Promise<unknown>,
): Promise<DependencyHealth> {
  try {
    await check();
    return { name, status: 'ok' };
  } catch (error) {
    return {
      name,
      status: 'error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function buildReadinessReport(
  service: string,
  checks: Array<{ name: string; check: () => Promise<unknown> }>,
  options?: {
    excludedDependencies?: ReadinessBoundaryDependency[];
  },
): Promise<ReadinessReport> {
  const dependencies = await Promise.all(
    checks.map(({ name, check }) => runDependencyCheck(name, check)),
  );
  const checkedDependencies = checks.map(({ name }) => name);
  const failingDependencies = dependencies
    .filter((dependency) => dependency.status === 'error')
    .map((dependency) => dependency.name);
  const ok = dependencies.filter((dependency) => dependency.status === 'ok').length;
  const error = dependencies.length - ok;
  const immediateActions =
    error === 0
      ? [
          'Baseline API traffic can be enabled after this readiness result is confirmed for the target deploy.',
          ...(options?.excludedDependencies?.map(
            (dependency) => `${dependency.name}: ${dependency.operatorAction}`,
          ) ?? []),
        ]
      : [
          `Keep traffic blocked until required dependencies recover: ${failingDependencies.join(', ')}.`,
          'Re-run /api/health/ready after restoring the failing required dependencies.',
        ];

  return {
    service,
    status: error > 0 ? 'not_ready' : 'ready',
    scope: 'required_runtime_dependencies',
    timestamp: new Date().toISOString(),
    runtime: buildRuntimeSnapshot(),
    summary: {
      total: dependencies.length,
      ok,
      error,
      failingDependencies,
    },
    dependencies,
    boundary: {
      checkedDependencies,
      excludedDependencies: options?.excludedDependencies ?? [],
    },
    operator: buildOperatorSnapshot({
      checkedDependencies,
      excludedDependencies: options?.excludedDependencies,
      shouldReceiveTraffic: error === 0,
      reason:
        error === 0
          ? 'Required runtime dependencies are ready for baseline API traffic.'
          : `Required runtime dependencies failed: ${failingDependencies.join(', ')}.`,
      nextCheck: error === 0 ? '/api/health/ready' : '/api/health/ready',
      immediateActions,
    }),
  };
}
