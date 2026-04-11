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
