#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveSimulatorDevice,
  shutdownOtherBootedSimulators,
} from './mobile-simulator-device.mjs';

const apiPort = process.env.ZKTALK_API_PORT ?? '4000';
const baseUrl = process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${apiPort}`;

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

function runNode(args, options = {}) {
  return execFileSync('node', args, {
    encoding: 'utf8',
    ...options,
  }).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const cacheDir = path.join(process.cwd(), '.tmp');
const cachePath = path.join(cacheDir, 'mobile-harness-last-e2e.json');

function readJsonIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch {
    return null;
  }
}

function removeIfExists(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { force: true });
}

function loadCachedE2e(maxAgeMs) {
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const stat = fs.statSync(cachePath);
  if (Date.now() - stat.mtimeMs > maxAgeMs) {
    return null;
  }

  return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

function saveCachedE2e(payload) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2));
}

function printUsage() {
  console.log(`Usage:
  node scripts/mobile-harness-regression.mjs [--app expo|standalone] [--device booted|<udid>] [--mode channel|dm|both] [--fresh] [--launch] [--expo-url <link>] [--timeout-ms 60000] [--strict-consume]

Defaults:
  --app expo
  --device iPhone 15 for standalone, booted for Expo Go
  --mode channel
`);
}

function getDmHarnessConversationId(e2e) {
  return e2e.harnessConversationId ?? e2e.directConversationId ?? e2e.conversationId;
}

function getDmHarnessSender(e2e) {
  return e2e.dmHarnessSender ?? e2e.userB;
}

function getDmHarnessReceiver(e2e) {
  return e2e.dmHarnessReceiver ?? e2e.userA;
}

function queueRegressionMessage({ mode, harnessDir, e2e }) {
  if (mode === 'channel') {
    runNode([
      'scripts/mobile-simulator-message.mjs',
      '--dir',
      harnessDir,
      '--mode',
      'channel',
      '--session-token',
      e2e.userB.sessionToken,
      '--channel-id',
      e2e.channelId,
      '--community-id',
      e2e.communityId,
      '--channel-name',
      e2e.channelName,
      '--body',
      `mobile regression channel ${Date.now()}`,
    ]);
    return;
  }

  const dmSender = getDmHarnessSender(e2e);
  const dmReceiver = getDmHarnessReceiver(e2e);

  runNode([
    'scripts/mobile-simulator-message.mjs',
    '--dir',
    harnessDir,
    '--mode',
    'dm',
    '--session-token',
    dmSender.sessionToken,
    '--conversation-id',
    getDmHarnessConversationId(e2e),
    '--user-id',
    dmReceiver.id,
    '--display-name',
    dmReceiver.displayName ?? 'QA user',
    '--body',
    `mobile regression dm ${Date.now()}`,
  ]);
}

function buildNextSuggestedRun({ mode, shouldLaunch, consumeWarning }) {
  if (shouldLaunch && consumeWarning) {
    return mode === 'both'
      ? 'Open the zkTalk screen in the simulator and rerun with --mode both after dev-route.json and dev-compose.json are consumed.'
      : mode === 'channel'
      ? 'Open the zkTalk screen in the simulator and rerun with --mode dm after dev-route.json and dev-compose.json are consumed.'
      : 'Open the zkTalk screen in the simulator and rerun with --mode channel after dev-route.json and dev-compose.json are consumed.';
  }

  return mode === 'both'
    ? 'If the simulator was open, DM was queued after channel consumption.'
    : mode === 'channel'
    ? 'Run again with --mode dm after the simulator consumes the channel message.'
    : 'Run again with --mode channel after the simulator consumes the DM message.';
}

async function waitForHarnessConsumption(harnessDir, timeoutMs, pollMs) {
  const pendingPaths = [
    path.join(harnessDir, 'dev-route.json'),
    path.join(harnessDir, 'dev-compose.json'),
  ];
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const remaining = pendingPaths.filter((target) => fs.existsSync(target));
    if (remaining.length === 0) {
      return {
        ok: true,
        remaining: [],
      };
    }
    await sleep(pollMs);
  }

  const remaining = pendingPaths.filter((target) => fs.existsSync(target));
  return {
    ok: false,
    remaining,
    message: `Simulator did not consume harness files within ${timeoutMs}ms`,
  };
}

async function waitForJsonFile(targetPath, predicate, timeoutMs, pollMs, label) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const parsed = readJsonIfExists(targetPath);
    if (parsed && predicate(parsed)) {
      return {
        ok: true,
        data: parsed,
      };
    }
    await sleep(pollMs);
  }

  return {
    ok: false,
    data: readJsonIfExists(targetPath),
    message: `Simulator did not produce ${label} within ${timeoutMs}ms`,
  };
}

export function interpretAutoLoginMarker(data) {
  if (!data || typeof data !== 'object') {
    return {
      terminal: false,
      ok: false,
      reason: null,
    };
  }

  // Session restore success still hinges on `data?.loggedIn === true || data?.stage === 'already-logged-in'`.
  if (data.loggedIn === true || data.stage === 'already-logged-in') {
    return {
      terminal: true,
      ok: true,
      reason: null,
    };
  }

  if (typeof data.error === 'string' && data.error.trim().length > 0) {
    return {
      terminal: true,
      ok: false,
      reason: `Simulator auto-login failed: ${data.error.trim()}`,
    };
  }

  const knownFailureStage = {
    'failed-needs-new-token': 'Simulator auto-login failed and needs a fresh session token.',
    'skipped-retrying-known-bad-token':
      'Simulator auto-login skipped because the last seeded session token already failed.',
    'no-token': 'Simulator auto-login could not start because no seeded session token was available.',
  }[data.stage];

  if (knownFailureStage) {
    return {
      terminal: true,
      ok: false,
      reason: knownFailureStage,
    };
  }

  return {
    terminal: false,
    ok: false,
    reason: null,
  };
}

export async function waitForAutoLoginMarker(targetPath, timeoutMs, pollMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const parsed = readJsonIfExists(targetPath);
    const markerState = interpretAutoLoginMarker(parsed);
    if (markerState.terminal) {
      return markerState.ok
        ? {
            ok: true,
            data: parsed,
          }
        : {
            ok: false,
            data: parsed,
            message: markerState.reason,
          };
    }
    await sleep(pollMs);
  }

  return {
    ok: false,
    data: readJsonIfExists(targetPath),
    message: `Simulator did not produce auto-login marker within ${timeoutMs}ms`,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  const app = args.app ?? 'expo';
  const bundleId = app === 'standalone' ? 'com.zktalk.mobile' : 'host.exp.Exponent';
  const requestedDevice = args.device ?? (app === 'standalone' ? 'iPhone 15' : 'booted');
  const device = resolveSimulatorDevice(requestedDevice, bundleId);
  const shutdownOtherBootedDevices = shutdownOtherBootedSimulators(device);
  const mode = args.mode ?? 'channel';
  const shouldLaunch = args.launch === 'true';
  const strictConsume = args['strict-consume'] === 'true';
  const expoUrl = args['expo-url'] ?? process.env.EXPO_GO_URL ?? '';
  const timeoutMs = Number(args['timeout-ms'] ?? 60000);
  const pollMs = Number(args['poll-ms'] ?? 1000);

  if (strictConsume && !shouldLaunch) {
    throw new Error('--strict-consume requires --launch so route consumption is actually verified.');
  }

  if (!['channel', 'dm', 'both'].includes(mode)) {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const harness = JSON.parse(
    runNode(['scripts/find-mobile-simulator-harness.mjs', '--app', app, '--device', device]),
  );

  const staleCachedE2e = loadCachedE2e(Number.MAX_SAFE_INTEGER);
  const cachedE2e = args.fresh === 'true' ? null : loadCachedE2e(10 * 60 * 1000);
  let e2e = cachedE2e;
  let usedStaleCachedE2e = false;
  let e2eWarning = null;

  if (!e2e) {
    try {
      e2e = JSON.parse(
        runNode(
          ['apps/api/scripts/two-user-messaging-e2e.mjs', '--include-tokens'],
          {
            env: {
              ...process.env,
              ZKTALK_BASE_URL: baseUrl,
              ZKTALK_E2E_INCLUDE_TOKENS: '1',
            },
          },
        ),
      );
    } catch (error) {
      if (!staleCachedE2e) {
        throw error;
      }

      e2e = staleCachedE2e;
      usedStaleCachedE2e = true;
      e2eWarning = 'Fell back to stale cached E2E data because fresh setup failed.';
    }
  }

  if (!cachedE2e && !usedStaleCachedE2e) {
    saveCachedE2e(e2e);
  }

  let consumeVerified = !shouldLaunch;
  let consumeWarning = null;
  let autoLoginVerified = !shouldLaunch;
  let autoLoginWarning = null;
  let autoLoginMarker = null;
  const dmConversationId = getDmHarnessConversationId(e2e);
  const dmSender = getDmHarnessSender(e2e);
  const dmReceiver = getDmHarnessReceiver(e2e);
  const autoLoginMarkerPath = path.join(harness.harnessDir, 'auto-login-marker.txt');

  async function launchAndVerifyAutoLogin() {
    removeIfExists(autoLoginMarkerPath);

    const launchArgs = [
      'scripts/launch-mobile-simulator-app.mjs',
      '--app',
      app,
      '--device',
      device,
      '--terminate',
    ];
    if (expoUrl) {
      launchArgs.push('--url', expoUrl);
    }
    runNode(launchArgs);

    const markerResult = await waitForAutoLoginMarker(autoLoginMarkerPath, timeoutMs, pollMs);

    if (!markerResult.ok) {
      autoLoginVerified = false;
      autoLoginWarning = markerResult.message;
      autoLoginMarker = markerResult.data;
      if (strictConsume) {
        throw new Error(autoLoginWarning);
      }
      return;
    }

    autoLoginVerified = true;
    autoLoginMarker = markerResult.data;
  }

  if (mode === 'both') {
    queueRegressionMessage({ mode: 'channel', harnessDir: harness.harnessDir, e2e });
    if (shouldLaunch) {
      await launchAndVerifyAutoLogin();
    }
    const firstConsume = await waitForHarnessConsumption(harness.harnessDir, timeoutMs, pollMs);
    if (shouldLaunch && !firstConsume.ok) {
      consumeVerified = false;
      consumeWarning = `${firstConsume.message}: ${firstConsume.remaining.join(', ')}`;
      if (strictConsume) {
        throw new Error(consumeWarning);
      }
    } else {
      consumeVerified = true;
    }
    queueRegressionMessage({ mode: 'dm', harnessDir: harness.harnessDir, e2e });
    if (shouldLaunch) {
      await launchAndVerifyAutoLogin();
      const secondConsume = await waitForHarnessConsumption(harness.harnessDir, timeoutMs, pollMs);
      if (!secondConsume.ok) {
        consumeVerified = false;
        consumeWarning = `${secondConsume.message}: ${secondConsume.remaining.join(', ')}`;
        if (strictConsume) {
          throw new Error(consumeWarning);
        }
      } else if (!consumeWarning) {
        consumeVerified = true;
      }
    }
  } else {
    queueRegressionMessage({ mode, harnessDir: harness.harnessDir, e2e });
    if (shouldLaunch) {
      await launchAndVerifyAutoLogin();
      const consumeResult = await waitForHarnessConsumption(harness.harnessDir, timeoutMs, pollMs);
      if (!consumeResult.ok) {
        consumeVerified = false;
        consumeWarning = `${consumeResult.message}: ${consumeResult.remaining.join(', ')}`;
        if (strictConsume) {
          throw new Error(consumeWarning);
        }
      } else {
        consumeVerified = true;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        app,
        device,
        ...(shutdownOtherBootedDevices.length > 0 ? { shutdownOtherBootedDevices } : {}),
        mode,
        harnessDir: harness.harnessDir,
        communityId: e2e.communityId,
        channelId: e2e.channelId,
        conversationId: dmConversationId,
        mobileSessionUserId: e2e.userB.id,
        dmSessionUserId: dmSender.id,
        dmReceiverUserId: dmReceiver.id,
        usedCachedE2e: Boolean(cachedE2e),
        usedStaleCachedE2e,
        e2eCachePath: cachePath,
        launchedApp: shouldLaunch,
        relaunchedApp: shouldLaunch,
        ...(expoUrl ? { expoUrl } : {}),
        consumeVerified,
        autoLoginVerified,
        ...(autoLoginWarning ? { autoLoginWarning } : {}),
        ...(autoLoginMarker ? { autoLoginMarker } : {}),
        ...(e2eWarning ? { e2eWarning } : {}),
        ...(consumeWarning ? { consumeWarning } : {}),
        timeoutMs,
        nextSuggestedRun: buildNextSuggestedRun({ mode, shouldLaunch, consumeWarning }),
      },
      null,
      2,
    ),
  );
}

const entryFilePath = fileURLToPath(import.meta.url);
const isDirectRun =
  typeof process.argv[1] === 'string' && path.resolve(process.argv[1]) === entryFilePath;

if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printUsage();
    process.exit(1);
  }
}
