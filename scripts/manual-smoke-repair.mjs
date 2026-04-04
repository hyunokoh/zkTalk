#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createChildEnv, parseArgs, serializeError, writeJsonFile } from './smoke-common.mjs';

const rootDir = process.cwd();
const resultPath = path.join(rootDir, '.tmp', 'ui-smoke-repair-last-result.json');

function runJson(scriptPath, extraArgs = []) {
  return JSON.parse(
    execFileSync('node', [scriptPath, '--json', ...extraArgs], {
      cwd: rootDir,
      encoding: 'utf8',
      env: createChildEnv(),
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  );
}

function buildForwardArgs(flags, keys) {
  const args = [];

  for (const key of keys) {
    const value = flags[key];
    if (value == null) {
      continue;
    }
    args.push(`--${key}`);
    if (value !== 'true') {
      args.push(String(value));
    }
  }

  return args;
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const dryRun = flags['dry-run'] === 'true';

  try {
    const verifyArgs = buildForwardArgs(flags, ['max-age-minutes']);
    const rerunArgs = buildForwardArgs(flags, ['max-age-minutes', 'include', 'force', 'dry-run', 'device']);
    const before = runJson('scripts/manual-smoke-verify.mjs', verifyArgs);
    const shouldRerun = dryRun
      ? true
      : flags.force === 'true' || before.failingSuites.length > 0 || Boolean(flags.include);

    const rerun = shouldRerun
      ? runJson('scripts/manual-smoke-rerun.mjs', rerunArgs)
      : {
          ok: true,
          skipped: true,
          reason: 'verify passed and no force/include requested',
          selectedSuites: [],
          plannedCommands: [],
        };
    const after = dryRun || rerun.skipped
      ? before
      : runJson('scripts/manual-smoke-verify.mjs', verifyArgs);
    const capture = dryRun
      ? {
          ok: true,
          skipped: true,
        }
      : runJson('scripts/manual-smoke-capture.mjs');
    const report = dryRun
      ? {
          ok: true,
          skipped: true,
        }
      : runJson('scripts/manual-smoke-report.mjs');
    const brief = dryRun
      ? {
          ok: true,
          skipped: true,
        }
      : runJson('scripts/manual-smoke-brief.mjs');
    const payload = {
      ok: before.ok && rerun.ok && after.ok && capture.ok && brief.ok && report.ok,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      dryRun,
      before,
      rerun,
      after,
      capture,
      brief,
      report,
    };

    writeJsonFile(resultPath, payload);
    console.log(JSON.stringify(payload, null, 2));

    if (!payload.ok) {
      process.exit(1);
    }
  } catch (error) {
    const payload = {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      dryRun,
      error: serializeError(error),
    };
    writeJsonFile(resultPath, payload);
    throw error;
  }
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
