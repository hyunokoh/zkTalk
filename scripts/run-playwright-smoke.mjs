#!/usr/bin/env node

import path from 'node:path';
import {
  createChildEnv,
  findAvailablePort,
  parseArgs,
  runCommand,
  serializeError,
  writeJsonFile,
} from './smoke-common.mjs';

async function main() {
  const repoRoot = process.cwd();
  const { flags, passthrough } = parseArgs(process.argv.slice(2));
  const suite = flags.suite ?? 'web';
  const resultPath = path.join(repoRoot, '.tmp', `ui-smoke-playwright-${suite}-last-result.json`);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const apiPort =
    process.env.ZKTALK_API_PORT ?? String(await findAvailablePort(suite === 'desktop' ? 4316 : 4216));
  const webPort =
    process.env.ZKTALK_WEB_PORT ?? String(await findAvailablePort(suite === 'desktop' ? 3316 : 3216));

  const args = ['--dir', 'e2e', 'exec', 'playwright', 'test', '--config', 'playwright.config.ts'];

  if (suite === 'desktop') {
    args.push('tests/desktop-shell.smoke.spec.ts');
  }

  if (!passthrough.includes('--project')) {
    args.push('--project', 'chromium');
  }

  if (!passthrough.includes('--trace') && !passthrough.some((token) => token.startsWith('--trace='))) {
    args.push('--trace=off');
  }

  args.push(...passthrough);

  console.log(
    JSON.stringify(
      {
        suite,
        apiPort,
        webPort,
      },
      null,
      2,
    ),
  );

  try {
    runCommand('pnpm', args, {
      cwd: repoRoot,
      env: createChildEnv({
        ZKTALK_API_PORT: apiPort,
        ZKTALK_WEB_PORT: webPort,
      }),
    });

    writeJsonFile(resultPath, {
      ok: true,
      suite,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      apiPort,
      webPort,
      command: ['pnpm', ...args],
    });
  } catch (error) {
    writeJsonFile(resultPath, {
      ok: false,
      suite,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      apiPort,
      webPort,
      command: ['pnpm', ...args],
      error: serializeError(error),
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
