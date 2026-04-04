#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { extractRouteFromProtocolUrl } = require('../apps/desktop/protocol-route.js');

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/open-desktop-protocol.mjs --url <zktalk://...> [--app-bundle <path/to/zkTalk.app>] [--fresh-launch]
`);
}

function resolveDesktopAppBundle(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.ZKTALK_DESKTOP_APP,
    path.join(process.cwd(), 'apps', 'desktop', 'dist', 'mac-arm64', 'zkTalk.app'),
    path.join(process.cwd(), 'apps', 'desktop', 'dist', 'mac', 'zkTalk.app'),
  ].filter((value) => typeof value === 'string' && value.length > 0);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function getDesktopExecutablePath(appBundlePath) {
  if (!appBundlePath) {
    return null;
  }

  const appName = path.basename(appBundlePath, '.app');
  const executablePath = path.join(appBundlePath, 'Contents', 'MacOS', appName);
  return fs.existsSync(executablePath) ? executablePath : null;
}

function writeStartupRoute(route) {
  const candidates = [
    path.join(process.env.HOME ?? '', 'Library', 'Application Support', '@zktalk', 'desktop', 'startup-route.json'),
    path.join(process.env.HOME ?? '', 'Library', 'Application Support', 'zkTalk', 'startup-route.json'),
  ].filter((value) => value.length > 0);

  for (const candidate of candidates) {
    fs.mkdirSync(path.dirname(candidate), { recursive: true });
    fs.writeFileSync(candidate, JSON.stringify({ route }, null, 2));
  }
}

function openUrl(url, appBundlePath) {
  if (process.platform === 'darwin') {
    if (process.argv.includes('--fresh-launch') && appBundlePath) {
      const launchTarget = url.startsWith('zktalk://')
        ? extractRouteFromProtocolUrl(url) || url
        : url;
      if (launchTarget.startsWith('/')) {
        writeStartupRoute(launchTarget);
      }

      const executablePath = getDesktopExecutablePath(appBundlePath);
      if (executablePath) {
        const child = spawn(executablePath, [launchTarget], {
          detached: true,
          stdio: 'ignore',
          env: process.env,
        });
        child.unref();
        return;
      }

      const child = spawn('open', ['-na', appBundlePath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return;
    }
    if (appBundlePath) {
      const child = spawn('open', ['-a', appBundlePath, url], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return;
    }
    execFileSync('open', [url], { stdio: 'pipe' });
    return;
  }

  if (process.platform === 'win32') {
    execFileSync('cmd', ['/c', 'start', '', url], { stdio: 'pipe' });
    return;
  }

  execFileSync('xdg-open', [url], { stdio: 'pipe' });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true' || !args.url) {
    printUsage();
    if (!args.url) {
      process.exit(args.help === 'true' ? 0 : 1);
    }
    return;
  }

  const appBundlePath = resolveDesktopAppBundle(args['app-bundle']);
  openUrl(args.url, appBundlePath);
  console.log(
    JSON.stringify(
      {
        ok: true,
        url: args.url,
        platform: process.platform,
        ...(appBundlePath ? { appBundlePath } : {}),
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
  printUsage();
  process.exit(1);
}
