#!/usr/bin/env node

import path from 'node:path';
import {
  createChildEnv,
  findAvailablePort,
  parseArgs,
  runCommand,
  serializeError,
  startBackgroundProcess,
  stopBackgroundProcess,
  waitForUrl,
  writeJsonFile,
} from './smoke-common.mjs';

async function main() {
  const repoRoot = process.cwd();
  const { passthrough } = parseArgs(process.argv.slice(2));
  const requestedSpecs = passthrough.filter((token) => token.endsWith('.spec.ts'));
  const extraArgs = passthrough.filter((token) => !token.endsWith('.spec.ts'));
  const specs = requestedSpecs.length > 0
    ? requestedSpecs
    : [
        'tests/dm-promotion.smoke.spec.ts',
        'tests/moderation.smoke.spec.ts',
      ];
  const resultPath = path.join(repoRoot, '.tmp', 'isolated-lanes-last-result.json');
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const apiPort = process.env.ZKTALK_API_PORT ?? String(await findAvailablePort(4616));
  const webPort = process.env.ZKTALK_WEB_PORT ?? String(await findAvailablePort(3616));
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  const wsBaseUrl = `ws://127.0.0.1:${apiPort}/api/ws`;
  const webBaseUrl = `http://127.0.0.1:${webPort}`;

  const apiLogPath = path.join(repoRoot, '.tmp', 'isolated-lanes-api.log');
  const webLogPath = path.join(repoRoot, '.tmp', 'isolated-lanes-web.log');

  /** @type {{ child: import('node:child_process').ChildProcess, logPath: string } | undefined} */
  let apiProcess;
  /** @type {{ child: import('node:child_process').ChildProcess, logPath: string } | undefined} */
  let webProcess;

  try {
    runCommand('pnpm', ['local:commercial:stack'], { cwd: repoRoot });

    apiProcess = startBackgroundProcess({
      command: 'node',
      args: ['--import', 'tsx', 'src/server.ts'],
      cwd: path.join(repoRoot, 'apps', 'api'),
      env: createChildEnv({
        NODE_ENV: 'test',
        PORT: apiPort,
      }),
      logPath: apiLogPath,
    });
    await waitForUrl(`${apiBaseUrl}/api/health`, { timeoutMs: 120_000, label: 'API health' });

    webProcess = startBackgroundProcess({
      command: 'pnpm',
      args: ['exec', 'next', 'dev', '--hostname', '127.0.0.1', '--port', webPort],
      cwd: path.join(repoRoot, 'apps', 'web'),
      env: createChildEnv({
        NODE_ENV: 'test',
        PORT: webPort,
        HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_API_URL: apiBaseUrl,
        NEXT_PUBLIC_WS_URL: wsBaseUrl,
        NEXT_PUBLIC_LIVEKIT_URL: 'ws://127.0.0.1:7880',
      }),
      logPath: webLogPath,
    });
    await waitForUrl(`${webBaseUrl}/login`, { timeoutMs: 180_000, label: 'Web login' });

    const args = [
      '--dir',
      'e2e',
      'exec',
      'playwright',
      'test',
      '--config',
      'playwright.config.ts',
      ...specs,
      '--project',
      'chromium',
      '--trace=off',
      ...extraArgs,
    ];

    runCommand('pnpm', args, {
      cwd: repoRoot,
      env: createChildEnv({
        ZKTALK_API_PORT: apiPort,
        ZKTALK_WEB_PORT: webPort,
        ZKTALK_SKIP_WEBSERVER: '1',
      }),
    });

    writeJsonFile(resultPath, {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      apiPort,
      webPort,
      apiLogPath,
      webLogPath,
      specs,
    });
  } catch (error) {
    writeJsonFile(resultPath, {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      apiPort,
      webPort,
      apiLogPath,
      webLogPath,
      specs,
      error: serializeError(error),
    });
    throw error;
  } finally {
    stopBackgroundProcess(webProcess);
    stopBackgroundProcess(apiProcess);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
