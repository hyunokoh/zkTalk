#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  createChildEnv,
  parseArgs,
  runCommand,
  serializeError,
  writeJsonFile,
} from './smoke-common.mjs';

const rootDir = process.cwd();
const resultPath = path.join(rootDir, '.tmp', 'ui-smoke-rerun-last-result.json');

const suiteCommands = {
  playwrightWeb: {
    label: 'Playwright web',
    command: ['node', ['scripts/run-playwright-smoke.mjs', '--suite', 'web']],
  },
  playwrightDesktop: {
    label: 'Playwright desktop',
    command: ['node', ['scripts/run-playwright-smoke.mjs', '--suite', 'desktop']],
  },
  mobile: {
    label: 'Mobile wrapper',
    command: ['node', ['scripts/run-ui-smoke-mobile.mjs']],
  },
  macos: {
    label: 'macOS wrapper',
    command: ['node', ['scripts/run-ui-smoke-macos.mjs']],
  },
  all: {
    label: 'Full UI smoke',
    command: ['node', ['scripts/run-ui-smoke-all.mjs']],
  },
};

function runVerify({ maxAgeMinutes }) {
  const args = [
    'scripts/manual-smoke-verify.mjs',
    '--json',
  ];

  if (maxAgeMinutes) {
    args.push('--max-age-minutes', String(maxAgeMinutes));
  }

  return JSON.parse(
    execFileSync('node', args, {
      cwd: rootDir,
      encoding: 'utf8',
      env: createChildEnv(),
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  );
}

function parseSuiteList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeSelectedSuites(requestedSuites) {
  const selected = new Set(requestedSuites.filter((suiteId) => suiteCommands[suiteId]));

  if (selected.has('all')) {
    return ['all'];
  }

  if (selected.has('macos')) {
    selected.delete('playwrightDesktop');
    selected.delete('mobile');
  }

  return Object.keys(suiteCommands).filter((suiteId) => selected.has(suiteId));
}

function appendDeviceArgs(args, device) {
  if (!device) {
    return args;
  }

  return [...args, '--device', device];
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const maxAgeMinutes = flags['max-age-minutes']
    ? Number(flags['max-age-minutes'])
    : undefined;
  const force = flags.force === 'true';
  const dryRun = flags['dry-run'] === 'true';
  const requestedIncludeSuites = parseSuiteList(flags.include);

  try {
    const verify = runVerify({ maxAgeMinutes });
    const suiteIdsNeedingRerun = force
      ? requestedIncludeSuites
      : requestedIncludeSuites.length > 0
        ? requestedIncludeSuites
        : verify.failingSuites;
    const selectedSuites = normalizeSelectedSuites(suiteIdsNeedingRerun);
    const plannedCommands = selectedSuites.map((suiteId) => {
      const [command, baseArgs] = suiteCommands[suiteId].command;
      return {
        suiteId,
        label: suiteCommands[suiteId].label,
        command,
        args: appendDeviceArgs(baseArgs, flags.device),
      };
    });

    if (dryRun) {
      const payload = {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
        dryRun: true,
        force,
        maxAgeMinutes: Number.isFinite(maxAgeMinutes) ? maxAgeMinutes : null,
        verifyOk: verify.ok,
        requestedIncludeSuites,
        failingSuites: verify.failingSuites,
        selectedSuites,
        plannedCommands,
      };
      writeJsonFile(resultPath, payload);
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    for (const plannedCommand of plannedCommands) {
      runCommand(plannedCommand.command, plannedCommand.args, {
        cwd: rootDir,
      });
    }

    const payload = {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      dryRun: false,
      force,
      maxAgeMinutes: Number.isFinite(maxAgeMinutes) ? maxAgeMinutes : null,
      verifyOk: verify.ok,
      requestedIncludeSuites,
      failingSuites: verify.failingSuites,
      selectedSuites,
      plannedCommands,
    };
    writeJsonFile(resultPath, payload);
    console.log(JSON.stringify(payload, null, 2));
  } catch (error) {
    const payload = {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      dryRun,
      force,
      maxAgeMinutes: Number.isFinite(maxAgeMinutes) ? maxAgeMinutes : null,
      requestedIncludeSuites,
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
