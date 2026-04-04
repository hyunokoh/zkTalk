#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, parseArgs, writeJsonFile } from './smoke-common.mjs';

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, '.tmp');
const defaultMaxAgeMinutes = 24 * 60;
const verifyResultPath = path.join(tmpDir, 'ui-smoke-verify-last-result.json');

const suiteDefinitions = [
  {
    id: 'playwrightWeb',
    label: 'Playwright web',
    resultPath: path.join(tmpDir, 'ui-smoke-playwright-web-last-result.json'),
  },
  {
    id: 'playwrightDesktop',
    label: 'Playwright desktop',
    resultPath: path.join(tmpDir, 'ui-smoke-playwright-desktop-last-result.json'),
  },
  {
    id: 'mobile',
    label: 'Mobile wrapper',
    resultPath: path.join(tmpDir, 'ui-smoke-mobile-last-result.json'),
  },
  {
    id: 'macos',
    label: 'macOS wrapper',
    resultPath: path.join(tmpDir, 'ui-smoke-macos-last-result.json'),
  },
  {
    id: 'all',
    label: 'Full UI smoke',
    resultPath: path.join(tmpDir, 'ui-smoke-all-last-result.json'),
  },
];

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function formatDurationMs(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return '';
  }

  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }

  const totalSeconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatAgeMs(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return '';
  }

  const totalMinutes = Math.floor(ageMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${Math.max(minutes, 0)}m`;
}

function getTimestampMs(result, resultPath) {
  const finishedAtMs = Date.parse(result?.finishedAt ?? '');
  if (Number.isFinite(finishedAtMs)) {
    return finishedAtMs;
  }

  if (fs.existsSync(resultPath)) {
    try {
      return fs.statSync(resultPath).mtimeMs;
    } catch {
      return null;
    }
  }

  return null;
}

function buildSuiteResult(definition, maxAgeMs) {
  const result = readJsonIfExists(definition.resultPath);

  if (!result) {
    return {
      id: definition.id,
      label: definition.label,
      ok: false,
      status: 'missing',
      stale: false,
      age: '',
      finishedAt: '',
      duration: '',
      resultPath: definition.resultPath,
      issues: ['missing result manifest'],
    };
  }

  const timestampMs = getTimestampMs(result, definition.resultPath);
  const ageMs = Number.isFinite(timestampMs) ? Math.max(0, Date.now() - timestampMs) : null;
  const stale = Number.isFinite(ageMs) ? ageMs > maxAgeMs : false;
  const issues = [];

  if (!result.ok) {
    issues.push('last run failed');
  }

  if (!Number.isFinite(timestampMs)) {
    issues.push('missing finished timestamp');
  }

  if (stale) {
    issues.push('result is stale');
  }

  return {
    id: definition.id,
    label: definition.label,
    ok: issues.length === 0,
    status: result.ok ? 'pass' : 'fail',
    stale,
    age: Number.isFinite(ageMs) ? formatAgeMs(ageMs) : '',
    finishedAt: result.finishedAt ?? '',
    duration: formatDurationMs(result.durationMs),
    resultPath: definition.resultPath,
    issues,
  };
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const maxAgeMinutesRaw = Number(flags['max-age-minutes'] ?? defaultMaxAgeMinutes);
  const maxAgeMinutes =
    Number.isFinite(maxAgeMinutesRaw) && maxAgeMinutesRaw > 0
      ? maxAgeMinutesRaw
      : defaultMaxAgeMinutes;
  const maxAgeMs = maxAgeMinutes * 60_000;
  const checkedAt = new Date().toISOString();
  const suites = Object.fromEntries(
    suiteDefinitions.map((definition) => [
      definition.id,
      buildSuiteResult(definition, maxAgeMs),
    ]),
  );
  const failingSuites = Object.values(suites).filter((suite) => !suite.ok);
  const payload = {
    ok: failingSuites.length === 0,
    checkedAt,
    maxAgeMinutes,
    suites,
    failingSuites: failingSuites.map((suite) => suite.id),
  };

  ensureDir(tmpDir);
  writeJsonFile(verifyResultPath, payload);

  if (flags.json === 'true') {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`UI smoke verify: ${payload.ok ? 'pass' : 'fail'}`);
    console.log(`checkedAt: ${checkedAt}`);
    console.log(`maxAgeMinutes: ${maxAgeMinutes}`);
    console.log(`resultPath: ${verifyResultPath}`);

    for (const suite of Object.values(suites)) {
      const details = [
        suite.status,
        suite.duration ? `duration ${suite.duration}` : null,
        suite.age ? `age ${suite.age}` : null,
        suite.stale ? 'stale' : 'fresh',
      ]
        .filter(Boolean)
        .join(', ');
      console.log(`- ${suite.label}: ${details}`);
      if (suite.issues.length > 0) {
        console.log(`  issues: ${suite.issues.join('; ')}`);
      }
    }
  }

  if (!payload.ok) {
    process.exit(1);
  }
}

main();
