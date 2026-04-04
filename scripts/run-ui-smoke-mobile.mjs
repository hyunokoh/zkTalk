#!/usr/bin/env node

import path from 'node:path';
import {
  findAvailablePort,
  isUrlAvailable,
  parseArgs,
  runCommand,
  serializeError,
  startBackgroundProcess,
  stopBackgroundProcess,
  waitForUrl,
  writeJsonFile,
} from './smoke-common.mjs';

async function isMetroAvailable() {
  for (const candidate of [
    'http://127.0.0.1:8081/status',
    'http://localhost:8081/status',
    'http://[::1]:8081/status',
  ]) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        continue;
      }
      const text = await response.text();
      if (text.toLowerCase().includes('packager-status:running')) {
        return true;
      }
    } catch {
      // Try the next loopback candidate.
    }
  }

  return false;
}

async function waitForMetro({ timeoutMs = 120_000, pollMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    if (await isMetroAvailable()) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error('Timed out waiting for Metro on port 8081.');
}

async function main() {
  const repoRoot = process.cwd();
  const { flags } = parseArgs(process.argv.slice(2));
  const requestedDevice = flags.device ?? 'iPhone 15';
  const resultPath = path.join(repoRoot, '.tmp', 'ui-smoke-mobile-last-result.json');
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const apiPort = process.env.ZKTALK_API_PORT ?? String(await findAvailablePort(4416));
  const apiBaseUrl = process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
  const apiHealthUrl = `${apiBaseUrl}/api/health`;
  const env = {
    ...process.env,
    ZKTALK_API_PORT: apiPort,
    ZKTALK_BASE_URL: apiBaseUrl,
    MAESTRO_DRIVER_STARTUP_TIMEOUT:
      process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT ?? '240000',
  };

  const startedProcesses = [];
  const startedArtifacts = [];

  try {
    if (!(await isUrlAvailable(apiHealthUrl))) {
      const apiProcess = startBackgroundProcess({
        command: 'npm',
        args: ['run', 'dev'],
        cwd: path.join(repoRoot, 'apps', 'api'),
        env: {
          ...env,
          NODE_ENV: 'test',
          PORT: apiPort,
        },
        logPath: path.join(repoRoot, '.tmp', 'logs', `mobile-ui-smoke-api-${apiPort}.log`),
      });
      startedProcesses.push(apiProcess);
      startedArtifacts.push({ type: 'api', logPath: apiProcess.logPath, port: apiPort });
      await waitForUrl(apiHealthUrl, { label: 'mobile smoke API health' });
    }

    if (!(await isMetroAvailable())) {
      const metroProcess = startBackgroundProcess({
        command: 'pnpm',
        args: ['--dir', 'apps/mobile', 'exec', 'expo', 'start', '--port', '8081', '--host', 'localhost'],
        cwd: repoRoot,
        env,
        logPath: path.join(repoRoot, '.tmp', 'logs', 'mobile-ui-smoke-metro.log'),
      });
      startedProcesses.push(metroProcess);
      startedArtifacts.push({ type: 'metro', logPath: metroProcess.logPath, port: 8081 });
      await waitForMetro();
    }

    console.log(
      JSON.stringify(
        {
          apiPort,
          apiBaseUrl,
          device: requestedDevice,
          startedArtifacts,
        },
        null,
        2,
      ),
    );

    runCommand('npm', ['run', 'mobile:maestro:install'], {
      cwd: repoRoot,
      env,
    });
    runCommand('npm', ['run', 'mobile:standalone:prepare', '--', '--device', requestedDevice], {
      cwd: repoRoot,
      env,
    });
    runCommand(
      'npm',
      [
        'run',
        'mobile:smoke',
        '--',
        '--app',
        'standalone',
        '--device',
        requestedDevice,
        '--timeout-ms',
        '120000',
      ],
      {
        cwd: repoRoot,
        env,
      },
    );
    runCommand('npm', [
      'run',
      'mobile:maestro:smoke',
      '--',
      '--app',
      'standalone',
      '--device',
      requestedDevice,
      '--mode',
      'both',
      '--timeout-ms',
      '120000',
      '--maestro-timeout-ms',
      '30000',
    ], {
      cwd: repoRoot,
      env,
    });

    writeJsonFile(resultPath, {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      apiPort,
      apiBaseUrl,
      device: requestedDevice,
      startedArtifacts,
      steps: [
        'mobile:maestro:install',
        'mobile:standalone:prepare',
        'mobile:smoke',
        'mobile:maestro:smoke --mode both',
      ],
    });
  } catch (error) {
    writeJsonFile(resultPath, {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      apiPort,
      apiBaseUrl,
      device: requestedDevice,
      startedArtifacts,
      error: serializeError(error),
    });
    throw error;
  } finally {
    for (const processInfo of startedProcesses.reverse()) {
      stopBackgroundProcess(processInfo);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
