#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const defaultPath = `/opt/homebrew/bin:${process.env.PATH ?? ''}`;

export function createChildEnv(overrides = {}) {
  const env = {
    ...process.env,
    PATH: defaultPath,
    ...overrides,
  };

  delete env.NO_COLOR;
  delete env.npm_config_verify_deps_before_run;
  delete env.NPM_CONFIG_VERIFY_DEPS_BEFORE_RUN;

  return env;
}

export function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

export function writeJsonFile(targetPath, payload) {
  writeTextFile(targetPath, JSON.stringify(payload, null, 2));
}

export function writeTextFile(targetPath, contents) {
  ensureDir(path.dirname(targetPath));
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, contents);
  fs.renameSync(tempPath, targetPath);
}

export function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      ...(typeof error.status === 'number' ? { status: error.status } : {}),
    };
  }

  return {
    name: 'Error',
    message: String(error),
    stack: null,
  };
}

export function parseArgs(argv) {
  const flags = {};
  const passthrough = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      passthrough.push(...argv.slice(index + 1));
      break;
    }
    if (!token.startsWith('--')) {
      passthrough.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = 'true';
      continue;
    }
    flags[key] = next;
    index += 1;
  }

  return { flags, passthrough };
}

function canBindPort(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

export async function findAvailablePort(preferredPort, { host = '127.0.0.1', attempts = 100 } = {}) {
  const startingPort = Number(preferredPort);

  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startingPort + offset;
    // eslint-disable-next-line no-await-in-loop
    if (await canBindPort(port, host)) {
      return port;
    }
  }

  throw new Error(`Could not find a free TCP port starting at ${preferredPort}.`);
}

export async function isUrlAvailable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForUrl(url, { timeoutMs = 120_000, pollMs = 500, label = url } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    if (await isUrlAvailable(url)) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(`Timed out waiting for ${label} at ${url}.`);
}

export function runCommand(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    env: createChildEnv(options.env ?? {}),
    ...options,
  });
}

export function startBackgroundProcess({
  command,
  args,
  cwd,
  env,
  logPath,
}) {
  ensureDir(path.dirname(logPath));
  const logFd = fs.openSync(logPath, 'a');
  const child = spawn(command, args, {
    cwd,
    env: createChildEnv(env ?? {}),
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });

  return {
    child,
    logPath,
  };
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function stopBackgroundProcess(processInfo, { graceMs = 5_000 } = {}) {
  if (!processInfo?.child?.pid) {
    return;
  }

  try {
    process.kill(-processInfo.child.pid, 'SIGTERM');
  } catch {
    return;
  }

  sleepSync(graceMs);

  try {
    process.kill(-processInfo.child.pid, 0);
    process.kill(-processInfo.child.pid, 'SIGKILL');
  } catch {
    // The process group is already gone.
  }
}
