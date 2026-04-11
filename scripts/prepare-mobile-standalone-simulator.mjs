#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSimulatorDevice } from './mobile-simulator-device.mjs';

const repoRoot = process.cwd();
const iosRoot = path.join(repoRoot, 'apps', 'mobile', 'ios');
const workspacePath = path.join(iosRoot, 'zkTalk.xcworkspace');
const defaultDerivedDataPath = path.join(repoRoot, '.tmp', 'mobile-ios-derived-data');
const bundleId = 'com.zktalk.mobile';
const podsManifestLockPath = path.join(iosRoot, 'Pods', 'Manifest.lock');
const apiPort = process.env.ZKTALK_API_PORT ?? '4000';
const apiBaseUrl = process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${apiPort}`;

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

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    ...options,
  }).trim();
}

function runStreaming(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runShellStreaming(script, options = {}) {
  execFileSync('/bin/zsh', ['-lc', `set -o pipefail; ${script}`], {
    stdio: 'inherit',
    ...options,
  });
}

function simctl(...args) {
  return run('xcrun', ['simctl', ...args]);
}

function podInstall() {
  runStreaming('pod', ['install'], {
    cwd: iosRoot,
    env: {
      ...process.env,
      LANG: process.env.LANG ?? 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL ?? 'en_US.UTF-8',
      API_URL: apiBaseUrl,
      EXPO_PUBLIC_API_URL: apiBaseUrl,
      ENABLE_SIMULATOR_HARNESS: process.env.ENABLE_SIMULATOR_HARNESS ?? 'true',
      EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS:
        process.env.EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS ?? 'true',
    },
  });
}

function listDevices() {
  const payload = JSON.parse(simctl('list', 'devices', '--json'));
  return Object.entries(payload.devices ?? {}).flatMap(([runtime, devices]) =>
    (Array.isArray(devices) ? devices : []).map((device) => ({
      ...device,
      runtime,
    })),
  );
}

function isUuid(value) {
  return /^[0-9A-F-]{36}$/i.test(value);
}

function pickPreferredAvailableIPhone(devices) {
  const availableIPhones = devices.filter((device) => {
    const haystack = `${device.name ?? ''} ${device.deviceTypeIdentifier ?? ''}`.toLowerCase();
    return device.isAvailable !== false && haystack.includes('iphone');
  });

  const exactIPhone15 = availableIPhones.find((device) => device.name === 'iPhone 15');
  if (exactIPhone15) {
    return exactIPhone15;
  }

  return availableIPhones[0] ?? null;
}

function resolveRequestedDevice(requestedDevice) {
  const devices = listDevices();

  if (!requestedDevice || requestedDevice === 'booted') {
    try {
      return resolveSimulatorDevice('booted', bundleId);
    } catch {
      const fallbackDevice = pickPreferredAvailableIPhone(devices);
      if (!fallbackDevice?.udid) {
        throw new Error('No available iPhone simulator found for the standalone mobile app.');
      }
      return fallbackDevice.udid;
    }
  }

  if (isUuid(requestedDevice)) {
    return requestedDevice;
  }

  const exactMatch = devices.find(
    (device) => device.isAvailable !== false && device.name === requestedDevice,
  );
  if (exactMatch?.udid) {
    return exactMatch.udid;
  }

  const partialMatch = devices.find((device) => {
    if (device.isAvailable === false) return false;
    return (device.name ?? '').toLowerCase().includes(requestedDevice.toLowerCase());
  });
  if (partialMatch?.udid) {
    return partialMatch.udid;
  }

  throw new Error(`Could not find an iOS simulator matching "${requestedDevice}".`);
}

function podsNeedInstall() {
  if (!fs.existsSync(podsManifestLockPath)) {
    return true;
  }

  const contents = fs.readFileSync(podsManifestLockPath, 'utf8');
  const pathMatches = [...contents.matchAll(/^\s*:path:\s+"(.+)"$/gm)];
  if (pathMatches.length === 0) {
    return false;
  }

  return pathMatches.some((match) => {
    const absolutePath = path.resolve(iosRoot, match[1]);
    return !fs.existsSync(absolutePath);
  });
}

function getDeviceInfo(udid) {
  const device = listDevices().find((entry) => entry.udid === udid);
  if (!device) {
    throw new Error(`Could not resolve simulator metadata for ${udid}.`);
  }
  return device;
}

function ensureBooted(udid) {
  const device = getDeviceInfo(udid);
  if (device.state !== 'Booted') {
    try {
      simctl('boot', udid);
    } catch {
      // Ignore boot errors when the simulator is already transitioning to booted.
    }
  }
  runStreaming('xcrun', ['simctl', 'bootstatus', udid, '-b']);
}

function installApp(udid, appPath) {
  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    ensureBooted(udid);

    try {
      runStreaming('xcrun', ['simctl', 'install', udid, appPath]);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes('Unable to lookup in current state: Shutdown') ||
        message.includes('simctl install');

      if (!retryable || attempt === 5) {
        throw error;
      }

      sleepMs(2_000);
    }
  }

  throw lastError;
}

function hasExcpretty() {
  try {
    execFileSync('pnpm', ['--dir', path.join(repoRoot, 'apps', 'mobile'), 'exec', 'excpretty'], {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function buildStandaloneApp({ udid, scheme, configuration, derivedDataPath }) {
  fs.mkdirSync(derivedDataPath, { recursive: true });

  const xcodebuildArgs = [
    '-workspace',
    workspacePath,
    '-scheme',
    scheme,
    '-configuration',
    configuration,
    '-sdk',
    'iphonesimulator',
    '-destination',
    `id=${udid}`,
    '-derivedDataPath',
    derivedDataPath,
    'build',
  ];
  const buildEnv = {
    ...process.env,
    API_URL: apiBaseUrl,
    EXPO_PUBLIC_API_URL: apiBaseUrl,
    ENABLE_SIMULATOR_HARNESS: process.env.ENABLE_SIMULATOR_HARNESS ?? 'true',
    EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS:
      process.env.EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS ?? 'true',
  };

  if (hasExcpretty()) {
    const xcodebuildCommand = ['xcodebuild', ...xcodebuildArgs].map(shellEscape).join(' ');
    const excprettyCommand = ['pnpm', '--dir', path.join(repoRoot, 'apps', 'mobile'), 'exec', 'excpretty']
      .map(shellEscape)
      .join(' ');
    runShellStreaming(`${xcodebuildCommand} 2>&1 | ${excprettyCommand}`, {
      cwd: repoRoot,
      env: buildEnv,
    });
  } else {
    runStreaming('xcodebuild', xcodebuildArgs, {
      env: buildEnv,
    });
  }

  const appPath = path.join(
    derivedDataPath,
    'Build',
    'Products',
    `${configuration}-iphonesimulator`,
    'zkTalk.app',
  );

  if (!fs.existsSync(appPath)) {
    throw new Error(`Expected built standalone app at ${appPath}, but it was not found.`);
  }

  return appPath;
}

function printUsage() {
  console.log(`Usage:
  node scripts/prepare-mobile-standalone-simulator.mjs [--device booted|<udid>|<name>] [--scheme zkTalk] [--configuration Release] [--derived-data-path <path>] [--skip-build] [--pod-install]

Defaults:
  --device booted
  --scheme zkTalk
  --configuration Release
  --derived-data-path .tmp/mobile-ios-derived-data
  --pod-install auto
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  if (!fs.existsSync(workspacePath)) {
    throw new Error(`iOS workspace not found at ${workspacePath}`);
  }

  const requestedDevice = args.device ?? 'booted';
  const scheme = args.scheme ?? 'zkTalk';
  const configuration = args.configuration ?? 'Release';
  const derivedDataPath = path.resolve(args['derived-data-path'] ?? defaultDerivedDataPath);
  const skipBuild = args['skip-build'] === 'true';
  const shouldPodInstall = args['pod-install'] === 'true' || podsNeedInstall();

  const udid = resolveRequestedDevice(requestedDevice);
  if (shouldPodInstall) {
    podInstall();
  }
  ensureBooted(udid);
  const device = getDeviceInfo(udid);

  const appPath = skipBuild
    ? path.join(
        derivedDataPath,
        'Build',
        'Products',
        `${configuration}-iphonesimulator`,
        'zkTalk.app',
      )
    : buildStandaloneApp({ udid, scheme, configuration, derivedDataPath });

  if (!fs.existsSync(appPath)) {
    throw new Error(`Standalone app not found at ${appPath}. Re-run without --skip-build.`);
  }

  installApp(udid, appPath);

  console.log(
    JSON.stringify(
      {
        ok: true,
        device: {
          udid,
          name: device.name,
          runtime: device.runtime,
          state: getDeviceInfo(udid).state,
        },
        bundleId,
        scheme,
        configuration,
        podInstallRan: shouldPodInstall,
        apiBaseUrl,
        derivedDataPath,
        appPath,
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
