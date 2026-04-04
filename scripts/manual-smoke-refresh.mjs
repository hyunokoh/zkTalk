#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createChildEnv, parseArgs, serializeError, writeJsonFile } from './smoke-common.mjs';

const rootDir = process.cwd();
const openScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-open.mjs');
const captureScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-capture.mjs');
const briefScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-brief.mjs');
const reportScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-report.mjs');
const statusScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-status.mjs');
const resultPath = path.join(rootDir, '.tmp', 'manual-smoke-refresh-last-result.json');

function runJson(command, args) {
  return JSON.parse(
    execFileSync(command, args, {
      encoding: 'utf8',
      env: createChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
}

function printUsage() {
  console.log(`Usage:
  node scripts/manual-smoke-refresh.mjs [--no-web] [--no-desktop] [--no-mobile] [--no-doc] [--with-targets] [--with-desktop-targets] [--with-brief]

Defaults:
  Reopens the current desktop/mobile QA surfaces, captures the latest desktop/mobile screenshots, regenerates the manual smoke brief and report history, and prints the latest manual smoke status.
`);
}

function buildOpenArgs(args) {
  const openArgs = [openScriptPath];

  for (const key of ['no-web', 'no-desktop', 'no-mobile', 'no-doc', 'with-targets', 'with-desktop-targets']) {
    if (args[key] === 'true') {
      openArgs.push(`--${key}`);
    }
  }

  openArgs.push('--with-brief');
  return openArgs;
}

function buildCaptureArgs(args) {
  const captureArgs = [captureScriptPath];

  for (const key of ['no-desktop', 'no-mobile']) {
    if (args[key] === 'true') {
      captureArgs.push(`--${key}`);
    }
  }

  return captureArgs;
}

function main() {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const { flags: args } = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  try {
    const open = runJson('node', buildOpenArgs(args));
    const capture = runJson('node', buildCaptureArgs(args));
    const brief = runJson('node', [briefScriptPath]);
    const report = runJson('node', [reportScriptPath]);
    const basePayload = {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      resultPath,
      open,
      capture,
      brief,
      report,
    };
    writeJsonFile(resultPath, basePayload);
    const status = runJson('node', [statusScriptPath, '--json']);
    const payload = {
      ...basePayload,
      status,
    };
    writeJsonFile(resultPath, payload);
    console.log(JSON.stringify(payload, null, 2));
  } catch (error) {
    const payload = {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      resultPath,
      error: serializeError(error),
    };
    writeJsonFile(resultPath, payload);
    throw error;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
