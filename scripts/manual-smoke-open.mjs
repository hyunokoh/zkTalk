#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { serializeError, writeJsonFile } from './smoke-common.mjs';

const rootDir = process.cwd();
const desktopAppPath = '/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/mac-arm64/zkTalk.app';
const checklistPath = '/Users/hyunokoh/Documents/Projects/zkTalk/docs/manual-smoke-checklist-2026-03-27.md';
const statusScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-status.mjs');
const mobileLaunchScriptPath = path.join(rootDir, 'scripts', 'launch-mobile-simulator-app.mjs');
const briefScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-brief.mjs');
const resultPath = path.join(rootDir, '.tmp', 'manual-smoke-open-last-result.json');
const desktopAppDir = path.join(rootDir, 'apps', 'desktop');
const desktopWindowStatePaths = [
  path.join(process.env.HOME || '', 'Library', 'Application Support', '@zktalk', 'desktop', 'window-state.json'),
  path.join(process.env.HOME || '', 'Library', 'Application Support', 'zkTalk', 'window-state.json'),
];
const desktopWindowHealthPaths = [
  path.join(process.env.HOME || '', 'Library', 'Application Support', '@zktalk', 'desktop', 'window-health.json'),
  path.join(process.env.HOME || '', 'Library', 'Application Support', 'zkTalk', 'window-health.json'),
];
const desktopWindowHealthDirs = desktopWindowHealthPaths.map((healthPath) => path.dirname(healthPath));
const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function openTarget(target) {
  run('open', [target]);
}

function openDesktopAppTarget(target) {
  try {
    run('open', ['-na', target]);
  } catch {
    run('open', [target]);
  }
}

function activateApp(appName) {
  try {
    run('osascript', ['-e', `tell application "${appName}" to activate`]);
  } catch {
    // Best-effort activation only.
  }

  try {
    run('osascript', [
      '-e',
      `tell application "System Events" to tell process "${appName}" to set frontmost to true`,
    ]);
  } catch {
    // Some process names are not available through System Events immediately after launch.
  }
}

function activateProcessByPid(pid) {
  if (!pid) {
    return;
  }

  try {
    run('osascript', [
      '-e',
      `tell application "System Events" to tell (first process whose unix id is ${pid}) to set frontmost to true`,
    ]);
  } catch {
    // Best-effort activation only.
  }
}

function getAppWindowCount(appName) {
  try {
    const output = run('osascript', [
      '-e',
      `tell application "System Events" to tell process "${appName}" to return count of windows`,
    ]);
    const count = Number.parseInt(output, 10);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

function readDesktopWindowHealth() {
  let latest = null;

  for (const healthPath of desktopWindowHealthPaths) {
    try {
      if (!fs.existsSync(healthPath)) {
        continue;
      }

      const raw = fs.readFileSync(healthPath, 'utf8');
      const parsed = JSON.parse(raw);
      const stat = fs.statSync(healthPath);
      if (!latest || stat.mtimeMs > latest.mtimeMs) {
        latest = {
          path: healthPath,
          mtimeMs: stat.mtimeMs,
          data: parsed,
        };
      }
    } catch {
      // Ignore malformed health files and keep checking.
    }
  }

  return latest?.data ?? null;
}

function readDesktopWindowHealthByPid(pid) {
  if (!pid) {
    return null;
  }

  let latest = null;

  for (const healthDir of desktopWindowHealthDirs) {
    const healthPath = path.join(healthDir, `window-health-${pid}.json`);
    try {
      if (!fs.existsSync(healthPath)) {
        continue;
      }

      const raw = fs.readFileSync(healthPath, 'utf8');
      const parsed = JSON.parse(raw);
      const stat = fs.statSync(healthPath);
      if (!latest || stat.mtimeMs > latest.mtimeMs) {
        latest = {
          mtimeMs: stat.mtimeMs,
          data: parsed,
        };
      }
    } catch {
      // Ignore malformed snapshot files and keep checking.
    }
  }

  return latest?.data ?? null;
}

function isMatchingPackagedHealth(health, startedAtMs, expectedPackagedPid = '') {
  if (!health?.visible) {
    return false;
  }

  const updatedAtMs = health?.updatedAt ? Date.parse(health.updatedAt) : 0;
  if (!updatedAtMs || updatedAtMs < startedAtMs) {
    return false;
  }

  if (!expectedPackagedPid) {
    return true;
  }

  return String(health?.pid ?? '') === String(expectedPackagedPid);
}

function normalizeAppWindow(appName, width = 1440, height = 960) {
  const script = `
tell application "System Events"
  if exists process "${appName}" then
    tell process "${appName}"
      repeat with w in windows
        try
          set position of w to {60, 60}
        end try
        try
          set size of w to {${width}, ${height}}
        end try
      end repeat
      try
        set frontmost to true
      end try
    end tell
  end if
end tell
`;

  try {
    run('osascript', ['-e', script]);
    return true;
  } catch {
    return false;
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDesktopWindowVisible(startedAtMs = Date.now(), expectedPackagedPid = '') {
  const recoveryUrls = ['zktalk://open-home', 'zktalk://retry'];
  const pollForWindow = async (durationMs) => {
    const deadline = Date.now() + durationMs;
    while (Date.now() < deadline) {
      const health = readDesktopWindowHealthByPid(expectedPackagedPid) || readDesktopWindowHealth();
      const packagedWindowCount = getAppWindowCount('zkTalk');
      const devWindowCount = getAppWindowCount('Electron');
      const matchingPackagedHealth = isMatchingPackagedHealth(
        health,
        startedAtMs,
        expectedPackagedPid,
      );
      if (packagedWindowCount > 0 || devWindowCount > 0 || matchingPackagedHealth) {
        return {
          packagedWindowCount,
          devWindowCount,
          healthVisible: matchingPackagedHealth,
          healthBounds: health?.bounds ?? null,
          healthReason: health?.reason ?? '',
          healthUpdatedAtMs: health?.updatedAt ? Date.parse(health.updatedAt) : 0,
          healthPid: String(health?.pid ?? ''),
        };
      }
      await wait(600);
    }
    const finalHealth = readDesktopWindowHealthByPid(expectedPackagedPid) || readDesktopWindowHealth();
    const matchingPackagedHealth = isMatchingPackagedHealth(
      finalHealth,
      startedAtMs,
      expectedPackagedPid,
    );
    return {
      packagedWindowCount: getAppWindowCount('zkTalk'),
      devWindowCount: getAppWindowCount('Electron'),
      healthVisible: matchingPackagedHealth,
      healthBounds: finalHealth?.bounds ?? null,
      healthReason: finalHealth?.reason ?? '',
      healthUpdatedAtMs: finalHealth?.updatedAt ? Date.parse(finalHealth.updatedAt) : 0,
      healthPid: String(finalHealth?.pid ?? ''),
    };
  };

  for (let attempt = 0; attempt <= recoveryUrls.length; attempt += 1) {
    const windowState = await pollForWindow(attempt === 0 ? 7000 : 4000);
    const {
      packagedWindowCount,
      devWindowCount,
      healthVisible,
      healthBounds,
      healthReason,
      healthUpdatedAtMs,
      healthPid,
    } = windowState;

    if (packagedWindowCount > 0 || devWindowCount > 0 || healthVisible) {
      return {
        packagedWindowCount,
        devWindowCount,
        healthVisible,
        healthBounds,
        healthReason,
        healthUpdatedAtMs,
        healthPid,
        recovered: attempt > 0,
      };
    }

    if (attempt < recoveryUrls.length) {
      openTarget(recoveryUrls[attempt]);
      await wait(1200);
      activateApp('zkTalk');
      activateApp('Electron');
    }
  }

  return {
    packagedWindowCount: getAppWindowCount('zkTalk'),
    devWindowCount: getAppWindowCount('Electron'),
    healthVisible: false,
    healthBounds: null,
    healthReason: '',
    healthUpdatedAtMs: 0,
    healthPid: '',
    recovered: false,
  };
}

function launchDevDesktop() {
  const child = spawn('npm', ['run', 'start:devserver'], {
    cwd: desktopAppDir,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function findFirstPid(pattern) {
  try {
    const output = run('pgrep', ['-f', pattern]);
    return output.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  } catch {
    return '';
  }
}

function getDesktopProcessInfo() {
  const packagedDesktopPid = findFirstPid('zkTalk.app/Contents/MacOS/zkTalk');
  const devDesktopPid = findFirstPid('apps/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');

  return {
    packagedDesktopPid,
    devDesktopPid,
    activePid: devDesktopPid || packagedDesktopPid,
  };
}

function resetDesktopWindowState() {
  const defaultState = {
    width: 1440,
    height: 960,
    x: undefined,
    y: undefined,
    isMaximized: false,
  };

  let updated = 0;
  for (const statePath of desktopWindowStatePaths) {
    try {
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2));
      updated += 1;
    } catch {
      // Best-effort reset only.
    }
  }

  return updated;
}

function terminatePid(pid) {
  if (!pid) {
    return false;
  }

  try {
    run('kill', ['-TERM', pid]);
    return true;
  } catch {
    return false;
  }
}

function printUsage() {
  console.log(`Usage:
  node scripts/manual-smoke-open.mjs [--no-web] [--no-desktop] [--no-mobile] [--no-doc] [--with-targets] [--with-desktop-targets] [--with-brief]

Defaults:
  Opens the web login page, web home page, packaged desktop app, booted standalone mobile app, and the manual smoke checklist.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  const opened = [];
  const status = JSON.parse(run('node', [statusScriptPath, '--json']));
  let briefPath = null;
  let desktopResolution = '';
  let mobileResolution = '';

  if (args['with-brief'] === 'true') {
    briefPath = JSON.parse(run('node', [briefScriptPath])).briefPath;
  }

  if (args['no-web'] !== 'true') {
    openTarget(status.webLogin);
    openTarget(status.webHome);
    if (args['with-targets'] === 'true') {
      if (status.webCommunity) openTarget(status.webCommunity);
      if (status.webChannel) openTarget(status.webChannel);
      if (status.webDm) openTarget(status.webDm);
    }
    opened.push('web');
  }

  if (args['no-desktop'] !== 'true') {
    const desktopLaunchStartedAtMs = Date.now();
    const resetWindowStateCount = resetDesktopWindowState();
    const desktopProcess = getDesktopProcessInfo();
    let terminatedPackagedDesktop = false;
    let terminatedDevDesktop = false;
    if (desktopProcess.devDesktopPid) {
      terminatedDevDesktop = terminatePid(desktopProcess.devDesktopPid);
    }
    if (desktopProcess.packagedDesktopPid) {
      terminatedPackagedDesktop = terminatePid(desktopProcess.packagedDesktopPid);
    }
    openDesktopAppTarget(desktopAppPath);
    await wait(1800);
    if (args['with-desktop-targets'] === 'true') {
      if (status.desktopChannelDeepLink) openTarget(status.desktopChannelDeepLink);
      if (status.desktopDmDeepLink) openTarget(status.desktopDmDeepLink);
    }
    const refreshedDesktopProcess = getDesktopProcessInfo();
    const desktopWindowState = await ensureDesktopWindowVisible(
      desktopLaunchStartedAtMs,
      refreshedDesktopProcess.packagedDesktopPid,
    );
    if (
      desktopWindowState.packagedWindowCount === 0
      && desktopWindowState.devWindowCount === 0
      && !desktopWindowState.healthVisible
    ) {
      launchDevDesktop();
      await wait(2500);
    }
    const finalDesktopProcess = getDesktopProcessInfo();
    const finalHealth = readDesktopWindowHealth();
    const finalDesktopWindowState = {
      packagedWindowCount: getAppWindowCount('zkTalk'),
      devWindowCount: getAppWindowCount('Electron'),
      healthVisible: isMatchingPackagedHealth(
        finalHealth,
        desktopLaunchStartedAtMs,
        finalDesktopProcess.packagedDesktopPid,
      ),
      healthPid: String(finalHealth?.pid ?? ''),
    };
    activateProcessByPid(finalDesktopProcess.packagedDesktopPid);
    activateProcessByPid(finalDesktopProcess.devDesktopPid);
    activateApp('zkTalk');
    activateApp('Electron');
    const normalizedPackagedWindow = normalizeAppWindow('zkTalk');
    const normalizedDevWindow = normalizeAppWindow('Electron');
    desktopResolution = finalDesktopProcess.packagedDesktopPid
      ? 'restarted desktop and foregrounded packaged app'
      : finalDesktopProcess.devDesktopPid
      ? 'restarted desktop and foregrounded dev app'
      : 'opened packaged desktop';
    if (resetWindowStateCount > 0) {
      desktopResolution += ` after resetting ${resetWindowStateCount} window-state file(s)`;
    }
    if (normalizedPackagedWindow || normalizedDevWindow) {
      desktopResolution += ' and normalizing live desktop window bounds';
    }
    if (desktopWindowState.recovered) {
      desktopResolution += ` after recovering a missing desktop window (packaged=${desktopWindowState.packagedWindowCount}, dev=${desktopWindowState.devWindowCount}, healthVisible=${desktopWindowState.healthVisible}, healthPid=${desktopWindowState.healthPid || 'none'})`;
    } else {
      desktopResolution += ` with window counts packaged=${desktopWindowState.packagedWindowCount}, dev=${desktopWindowState.devWindowCount}, healthVisible=${desktopWindowState.healthVisible}, healthPid=${desktopWindowState.healthPid || 'none'}`;
    }
    if (
      finalDesktopWindowState.packagedWindowCount === 0
      && finalDesktopWindowState.devWindowCount > 0
      && !finalDesktopWindowState.healthVisible
    ) {
      desktopResolution += ` and falling back to dev desktop (final packaged=${finalDesktopWindowState.packagedWindowCount}, dev=${finalDesktopWindowState.devWindowCount}, finalHealthVisible=${finalDesktopWindowState.healthVisible}, finalHealthPid=${finalDesktopWindowState.healthPid || 'none'})`;
    } else if (
      finalDesktopWindowState.packagedWindowCount !== desktopWindowState.packagedWindowCount
      || finalDesktopWindowState.devWindowCount !== desktopWindowState.devWindowCount
      || finalDesktopWindowState.healthVisible !== desktopWindowState.healthVisible
    ) {
      desktopResolution += ` with final window counts packaged=${finalDesktopWindowState.packagedWindowCount}, dev=${finalDesktopWindowState.devWindowCount}, finalHealthVisible=${finalDesktopWindowState.healthVisible}, finalHealthPid=${finalDesktopWindowState.healthPid || 'none'}`;
    }
    if (terminatedDevDesktop || terminatedPackagedDesktop) {
      desktopResolution += ` (terminated ${[
        terminatedDevDesktop ? 'dev' : '',
        terminatedPackagedDesktop ? 'packaged' : '',
      ]
        .filter(Boolean)
        .join(' + ')} desktop process${terminatedDevDesktop && terminatedPackagedDesktop ? 'es' : ''} first)`;
    }
    opened.push('desktop');
  }

  if (args['no-mobile'] !== 'true') {
    const mobileResult = JSON.parse(
      run('node', [mobileLaunchScriptPath, '--app', 'standalone', '--clean-harness']),
    );
    activateApp('Simulator');
    mobileResolution = mobileResult.cleanedHarnessFiles?.length
      ? `reopened standalone mobile and cleaned ${mobileResult.cleanedHarnessFiles.length} stale harness files`
      : 'reopened standalone mobile';
    opened.push(`mobile:${mobileResult.device}`);
  }

  if (args['no-doc'] !== 'true') {
    openTarget(checklistPath);
    opened.push('checklist');
  }

  if (briefPath) {
    openTarget(briefPath);
    opened.push('brief');
  }

  const basePayload = {
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    resultPath,
    opened,
    ...(desktopResolution ? { desktopResolution } : {}),
    ...(mobileResolution ? { mobileResolution } : {}),
    ...(briefPath ? { briefPath } : {}),
  };
  writeJsonFile(resultPath, basePayload);
  const refreshedStatus = JSON.parse(run('node', [statusScriptPath, '--json']));
  const payload = {
    ...basePayload,
    status: refreshedStatus,
  };
  writeJsonFile(resultPath, payload);
  console.log(JSON.stringify(payload, null, 2));
}

try {
  await main();
} catch (error) {
  writeJsonFile(resultPath, {
    ok: false,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    resultPath,
    error: serializeError(error),
  });
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
