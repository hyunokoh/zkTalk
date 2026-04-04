#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSimulatorDevice } from './mobile-simulator-device.mjs';

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

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

function simctl(...parts) {
  return execFileSync('xcrun', ['simctl', ...parts], { encoding: 'utf8' }).trim();
}

function openSimulatorUrl(device, openUrl) {
  execFileSync('xcrun', ['simctl', 'openurl', device, openUrl], {
    stdio: 'ignore',
  });
  return '';
}

function ensureBooted(device) {
  try {
    execFileSync('xcrun', ['simctl', 'boot', device], { stdio: 'ignore' });
  } catch {
    // Ignore boot races when the simulator is already booted or transitioning.
  }

  execFileSync('xcrun', ['simctl', 'bootstatus', device, '-b'], { stdio: 'ignore' });
  try {
    execFileSync('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', device], {
      stdio: 'ignore',
    });
  } catch {
    // Ignore Simulator UI launch failures; simctl bootstatus is the critical path.
  }
}

function launchAppWithRetry(device, bundleId, { attempts = 5, retryDelayMs = 2_000 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    ensureBooted(device);

    try {
      return simctl('launch', device, bundleId);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes('SBMainWorkspace') ||
        message.includes('Unable to lookup in current state: Shutdown') ||
        message.includes('launchd failed to respond') ||
        message.includes('The request was denied by service delegate');

      if (!retryable || attempt === attempts) {
        throw error;
      }

      sleepMs(retryDelayMs);
    }
  }

  throw lastError;
}

function isAppRunning(device, bundleId) {
  try {
    const output = execFileSync('xcrun', ['simctl', 'spawn', device, 'launchctl', 'list'], {
      encoding: 'utf8',
    });
    return output.includes(`UIKitApplication:${bundleId}`);
  } catch {
    return false;
  }
}

function waitForAppRunning(device, bundleId, { timeoutMs = 15_000, pollMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    ensureBooted(device);
    if (isAppRunning(device, bundleId)) {
      return true;
    }
    sleepMs(pollMs);
  }

  return false;
}

function openUrlWithRetry(
  device,
  bundleId,
  openUrl,
  { attempts = 5, retryDelayMs = 2_000, allowRunningFallback = false } = {},
) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    ensureBooted(device);

    try {
      return openSimulatorUrl(device, openUrl);
    } catch (error) {
      lastError = error;
      if (
        allowRunningFallback &&
        waitForAppRunning(device, bundleId, { timeoutMs: 5_000, pollMs: 500 })
      ) {
        return '';
      }
      if (attempt === attempts) {
        throw error;
      }
      sleepMs(retryDelayMs);
    }
  }

  throw lastError;
}

function findExperienceDir(expoDocumentsDir) {
  const anonymousDir = path.join(expoDocumentsDir, 'ExponentExperienceData', '@anonymous');
  if (!fs.existsSync(anonymousDir)) {
    return expoDocumentsDir;
  }

  const children = fs
    .readdirSync(anonymousDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(anonymousDir, entry.name));

  const zktalkDir = children.find((dir) => dir.toLowerCase().includes('zktalk'));
  return zktalkDir ?? children[0] ?? expoDocumentsDir;
}

function resolveHarnessDir(device, app, bundleId) {
  const containerPath = simctl('get_app_container', device, bundleId, 'data');
  const documentsDir = path.join(containerPath, 'Documents');
  return app === 'standalone' ? documentsDir : findExperienceDir(documentsDir);
}

function cleanHarnessFiles(harnessDir) {
  const staleFiles = [
    'auto-login-marker.txt',
    'error-boundary.json',
    'dev-home-action.json',
    'dev-home-result.json',
    'dev-login-action.json',
    'dev-login-result.json',
    'dev-route.json',
    'dev-route-result.json',
    'dev-compose.json',
    'dev-compose-result.json',
    'dev-settings-action.json',
    'dev-settings-result.json',
    'dev-edit-profile-action.json',
    'dev-edit-profile-result.json',
    'dev-create-community-action.json',
    'dev-create-community-result.json',
    'dev-dm-list-action.json',
    'dev-dm-list-result.json',
    'dev-voice-action.json',
    'dev-voice-result.json',
  ];

  const removed = [];
  for (const name of staleFiles) {
    const target = path.join(harnessDir, name);
    if (!fs.existsSync(target)) {
      continue;
    }
    fs.rmSync(target, { force: true });
    removed.push(target);
  }

  return removed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/launch-mobile-simulator-app.mjs [--app expo|standalone] [--device booted|<udid>] [--terminate] [--clean-harness] [--url <link>]

Defaults:
  --app expo
  --device booted
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  const app = args.app ?? 'expo';
  const bundleId = app === 'standalone' ? 'com.zktalk.mobile' : 'host.exp.Exponent';
  const device = resolveSimulatorDevice(args.device ?? 'booted', bundleId);
  const defaultStandaloneUrl = 'zktalk://';
  const openUrl =
    args.url ??
    process.env.EXPO_GO_URL ??
    process.env.MOBILE_SIMULATOR_URL ??
    (app === 'standalone' ? defaultStandaloneUrl : '');
  const shouldCleanHarness = args['clean-harness'] === 'true';

  ensureBooted(device);

  let cleanedHarnessFiles = [];
  if (shouldCleanHarness) {
    try {
      const harnessDir = resolveHarnessDir(device, app, bundleId);
      cleanedHarnessFiles = cleanHarnessFiles(harnessDir);
    } catch {
      // Ignore harness cleanup failures so app launch still works.
    }
  }

  if (args.terminate === 'true') {
    try {
      execFileSync('xcrun', ['simctl', 'terminate', device, bundleId], { stdio: 'ignore' });
    } catch {
      // Ignore terminate failures when the app is not running.
    }
  }

  let launchResult = null;
  let openUrlResult = null;
  let launchStrategy = 'launch';
  const shouldTreatAsGenericStandaloneLaunch =
    app === 'standalone' && (!openUrl || openUrl === defaultStandaloneUrl);

  if (shouldTreatAsGenericStandaloneLaunch) {
    launchResult = launchAppWithRetry(device, bundleId);
  } else {
    launchResult = launchAppWithRetry(device, bundleId);
    if (openUrl) {
      launchStrategy = app === 'standalone' ? 'launch+openurl' : 'openurl';
      openUrlResult = openUrlWithRetry(device, bundleId, openUrl, {
        allowRunningFallback: true,
      });
    }
  }

  if (!waitForAppRunning(device, bundleId)) {
    throw new Error(`Timed out waiting for ${bundleId} to reach the running state on ${device}.`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        app,
        device,
        bundleId,
        launchStrategy,
        launchResult,
        ...(shouldCleanHarness ? { cleanedHarnessFiles } : {}),
        ...(openUrl ? { openUrl, openUrlResult } : {}),
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
