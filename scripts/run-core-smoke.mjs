#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');
const contractPath = path.join(repoRoot, 'e2e', 'core-smoke-contract.json');

function loadContract() {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

  if (!Array.isArray(contract.specs) || contract.specs.length === 0) {
    throw new Error(`Core smoke contract at ${contractPath} must declare at least one spec`);
  }

  for (const spec of contract.specs) {
    const specPath = path.join(repoRoot, 'e2e', spec);
    if (!fs.existsSync(specPath)) {
      throw new Error(`Core smoke contract references missing spec: ${spec}`);
    }
  }

  return contract;
}

function main() {
  const contract = loadContract();
  const passthrough = process.argv.slice(2);
  const apiPort = String(process.env.ZKTALK_API_PORT ?? '4000');
  const webPort = String(process.env.ZKTALK_WEB_PORT ?? '3000');
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  const wsBaseUrl = `ws://127.0.0.1:${apiPort}/api/ws`;
  const command = [
    '--dir',
    'e2e',
    'exec',
    'playwright',
    'test',
    '--config',
    'playwright.config.ts',
    ...contract.specs,
    ...passthrough,
  ];

  console.log(
    JSON.stringify(
      {
        contract: contract.id,
        command: contract.command,
        specs: contract.specs,
        journeys: contract.journeys,
        prerequisites: contract.prerequisites,
      },
      null,
      2,
    ),
  );

  const buildResult = spawnSync(
    'pnpm',
    [
      '--dir',
      'apps/web',
      'exec',
      'next',
      'build',
      '--no-lint',
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiBaseUrl,
        NEXT_PUBLIC_WS_URL: wsBaseUrl,
        NEXT_PUBLIC_LIVEKIT_URL: 'ws://127.0.0.1:7880',
      },
    },
  );

  if (buildResult.status !== 0) {
    process.exit(typeof buildResult.status === 'number' ? buildResult.status : 1);
  }

  const result = spawnSync('pnpm', command, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  process.exit(1);
}

main();
