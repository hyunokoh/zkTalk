#!/usr/bin/env node

import path from 'node:path';
import { parseArgs, runCommand, serializeError, writeJsonFile } from './smoke-common.mjs';

async function main() {
  const repoRoot = process.cwd();
  const { flags } = parseArgs(process.argv.slice(2));
  const resultPath = path.join(repoRoot, '.tmp', 'ui-smoke-all-last-result.json');
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const macosArgs = ['scripts/run-ui-smoke-macos.mjs'];

  if (flags.device) {
    macosArgs.push('--device', flags.device);
  }

  try {
    runCommand('node', ['scripts/run-playwright-smoke.mjs', '--suite', 'web'], {
      cwd: repoRoot,
    });
    runCommand('node', macosArgs, {
      cwd: repoRoot,
    });

    writeJsonFile(resultPath, {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      device: flags.device ?? 'iPhone 15',
      steps: ['web-playwright', 'macos-wrapper'],
    });
  } catch (error) {
    writeJsonFile(resultPath, {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      device: flags.device ?? 'iPhone 15',
      steps: ['web-playwright', 'macos-wrapper'],
      error: serializeError(error),
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
