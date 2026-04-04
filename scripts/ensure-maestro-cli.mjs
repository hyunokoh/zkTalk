#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const defaultInstalledPath = path.join(os.homedir(), '.maestro', 'bin', 'maestro');

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    ...options,
  }).trim();
}

function hasExecutable(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveMaestroPath() {
  const explicit = process.env.MAESTRO_BIN?.trim();
  if (explicit && hasExecutable(explicit)) {
    return explicit;
  }

  if (hasExecutable(defaultInstalledPath)) {
    return defaultInstalledPath;
  }

  try {
    const fromPath = run('/bin/zsh', ['-lc', 'command -v maestro']);
    if (fromPath && hasExecutable(fromPath)) {
      return fromPath;
    }
  } catch {
    // Keep looking.
  }

  return null;
}

function installMaestro() {
  const version = process.env.MAESTRO_VERSION?.trim();
  const installCommand = version
    ? `export MAESTRO_VERSION=${JSON.stringify(version)}; curl -fsSL "https://get.maestro.mobile.dev" | bash`
    : 'curl -fsSL "https://get.maestro.mobile.dev" | bash';

  execFileSync('/bin/zsh', ['-lc', installCommand], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:${process.env.PATH ?? ''}`,
    },
  });
}

function main() {
  const before = resolveMaestroPath();
  if (before) {
    const version = run(before, ['--version'], {
      env: {
        ...process.env,
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
        MAESTRO_CLI_NO_ANALYTICS: '1',
      },
    });
    console.log(
      JSON.stringify(
        {
          ok: true,
          installed: false,
          binPath: before,
          version,
        },
        null,
        2,
      ),
    );
    return;
  }

  installMaestro();

  const after = resolveMaestroPath();
  if (!after) {
    throw new Error(
      `Maestro CLI install finished, but no executable was found on PATH or at ${defaultInstalledPath}.`,
    );
  }

  const version = run(after, ['--version'], {
    env: {
      ...process.env,
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      MAESTRO_CLI_NO_ANALYTICS: '1',
    },
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        installed: true,
        binPath: after,
        version,
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
