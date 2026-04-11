#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const cacheDir = path.join(rootDir, '.tmp', 'e2e');
const cachePath = path.join(cacheDir, 'ui-seed-v2.json');
const cacheMaxAgeMs = 10 * 60 * 1000;
const baseUrl = process.env.ZKTALK_BASE_URL ?? 'http://127.0.0.1:4000';

function readCachedSeed() {
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const stat = fs.statSync(cachePath);
  if (Date.now() - stat.mtimeMs > cacheMaxAgeMs) {
    return null;
  }

  return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

function writeCache(seed) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(seed, null, 2));
}

function runSeedScript() {
  const output = execFileSync(
    process.execPath,
    ['apps/api/scripts/two-user-messaging-e2e.mjs', '--include-tokens'],
    {
      cwd: rootDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        ZKTALK_BASE_URL: baseUrl,
        ZKTALK_E2E_INCLUDE_TOKENS: '1',
      },
    },
  ).trim();

  const seed = JSON.parse(output);
  writeCache(seed);
  return seed;
}

const seed = readCachedSeed() ?? runSeedScript();
process.stdout.write(`${JSON.stringify(seed, null, 2)}\n`);
