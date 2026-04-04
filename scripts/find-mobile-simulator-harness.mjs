#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSimulatorDevice } from './mobile-simulator-device.mjs';

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
    // Ignore Simulator UI launch failures; the harness lookup only needs the target device booted.
  }
}

function findExperienceDir(expoDocumentsDir) {
  const anonymousDir = path.join(expoDocumentsDir, 'ExponentExperienceData', '@anonymous');
  if (!fs.existsSync(anonymousDir)) {
    return expoDocumentsDir;
  }

  const children = fs.readdirSync(anonymousDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(anonymousDir, entry.name));

  const zktalkDir = children.find((dir) => dir.toLowerCase().includes('zktalk'));
  return zktalkDir ?? children[0] ?? expoDocumentsDir;
}

function printUsage() {
  console.log(`Usage:
  node scripts/find-mobile-simulator-harness.mjs [--app expo|standalone] [--device booted|<udid>]

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
  ensureBooted(device);
  const containerPath = simctl('get_app_container', device, bundleId, 'data');

  if (!containerPath) {
    throw new Error(`Could not resolve data container for ${bundleId}`);
  }

  const documentsDir = path.join(containerPath, 'Documents');
  const harnessDir = app === 'standalone'
    ? documentsDir
    : findExperienceDir(documentsDir);
  fs.mkdirSync(harnessDir, { recursive: true });

  const result = {
    app,
    device,
    bundleId,
    containerPath,
    documentsDir,
    harnessDir,
  };

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
