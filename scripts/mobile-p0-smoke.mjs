#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
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

function parseTrailingJson(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error('Expected JSON output, but received an empty string.');
  }

  const jsonStart = trimmed.startsWith('{') ? 0 : trimmed.lastIndexOf('\n{');
  const jsonText = jsonStart <= 0 ? trimmed : trimmed.slice(jsonStart + 1);
  return JSON.parse(jsonText);
}

function ensureStandalonePrepared(device) {
  const skipBuildArgs = [
    'scripts/prepare-mobile-standalone-simulator.mjs',
    '--device',
    device,
    '--skip-build',
  ];

  try {
    return parseTrailingJson(runNode(skipBuildArgs));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Re-run without --skip-build')) {
      throw error;
    }

    return parseTrailingJson(
      runNode(['scripts/prepare-mobile-standalone-simulator.mjs', '--device', device]),
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

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

function writeJson(targetPath, payload) {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2));
}

function writeText(targetPath, contents) {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, contents);
}

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, { force: true });
}

async function waitFor(check, { timeoutMs = 30_000, pollMs = 500, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await check();
    if (value) {
      return value;
    }
    await sleep(pollMs);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function request(pathname, { method = 'GET', token, body, headers } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${pathname} failed: ${response.status} ${response.statusText}\n${JSON.stringify(json, null, 2)}`,
    );
  }

  return json;
}

async function isMetroAvailable() {
  for (const candidate of [
    'http://127.0.0.1:8081/status',
    'http://localhost:8081/status',
    'http://[::1]:8081/status',
  ]) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        continue;
      }
      const text = await response.text();
      if (text.toLowerCase().includes('packager-status:running')) {
        return true;
      }
    } catch {
      // Try the next loopback candidate.
    }
  }

  return false;
}

const cacheDir = path.join(process.cwd(), '.tmp');
const cachePath = path.join(cacheDir, 'mobile-harness-last-e2e.json');

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
  ensureDir(cacheDir);
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2));
}

function printUsage() {
  console.log(`Usage:
  node scripts/mobile-p0-smoke.mjs [--app standalone|expo] [--device booted|<udid>] [--fresh] [--launch] [--expo-url <link>] [--timeout-ms 90000]

Defaults:
  --app standalone
  --device iPhone 15
  --launch true
`);
}

function pickMessageList(result) {
  return result.items ?? result.messages ?? [];
}

function flattenMessageBody(entry) {
  const message = entry?.message ?? entry;
  return message?.bodyMarkdown ?? message?.bodyPlaintext ?? null;
}

function getHarnessPaths(harnessDir) {
  return {
    sessionToken: path.join(harnessDir, 'dev-session-token.txt'),
    autoLoginMarker: path.join(harnessDir, 'auto-login-marker.txt'),
    route: path.join(harnessDir, 'dev-route.json'),
    routeResult: path.join(harnessDir, 'dev-route-result.json'),
    compose: path.join(harnessDir, 'dev-compose.json'),
    composeResult: path.join(harnessDir, 'dev-compose-result.json'),
    settingsAction: path.join(harnessDir, 'dev-settings-action.json'),
    settingsResult: path.join(harnessDir, 'dev-settings-result.json'),
    loginAction: path.join(harnessDir, 'dev-login-action.json'),
    loginResult: path.join(harnessDir, 'dev-login-result.json'),
    dmListAction: path.join(harnessDir, 'dev-dm-list-action.json'),
    dmListResult: path.join(harnessDir, 'dev-dm-list-result.json'),
    createCommunityAction: path.join(harnessDir, 'dev-create-community-action.json'),
    createCommunityResult: path.join(harnessDir, 'dev-create-community-result.json'),
    editProfileAction: path.join(harnessDir, 'dev-edit-profile-action.json'),
    editProfileResult: path.join(harnessDir, 'dev-edit-profile-result.json'),
  };
}

function clearHarnessFiles(paths) {
  Object.values(paths).forEach((targetPath) => removeIfExists(targetPath));
}

async function waitForJsonFile(targetPath, predicate, options) {
  return waitFor(() => {
    const parsed = readJsonIfExists(targetPath);
    return parsed && predicate(parsed) ? parsed : null;
  }, { ...options, label: options?.label ?? path.basename(targetPath) });
}

async function waitForFileRemoval(targetPath, options) {
  return waitFor(
    () => !fs.existsSync(targetPath),
    { ...options, label: options?.label ?? `${path.basename(targetPath)} removal` },
  );
}

async function routeAndWait(paths, routeData, matched, timeoutMs) {
  removeIfExists(paths.route);
  removeIfExists(paths.routeResult);
  writeJson(paths.route, routeData);
  const result = await waitForJsonFile(
    paths.routeResult,
    (data) => data.matched === matched,
    { timeoutMs, label: `route ${matched}` },
  );
  removeIfExists(paths.routeResult);
  return result;
}

async function waitForChannelMessage(channelId, token, body, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/channels/${channelId}/messages?limit=30`, { token });
    return pickMessageList(response).find((entry) => flattenMessageBody(entry) === body) ?? null;
  }, { timeoutMs, label: 'channel message delivery' });
}

async function waitForDmMessage(conversationId, token, body, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/dm/conversations/${conversationId}/messages?limit=30`, {
      token,
    });
    return pickMessageList(response).find((entry) => flattenMessageBody(entry) === body) ?? null;
  }, { timeoutMs, label: 'dm message delivery' });
}

async function loadE2eData({ fresh }) {
  const staleCachedE2e = loadCachedE2e(Number.MAX_SAFE_INTEGER);
  const cachedE2e = fresh ? null : loadCachedE2e(10 * 60 * 1000);

  if (cachedE2e) {
    return {
      e2e: cachedE2e,
      usedCached: true,
      usedStaleFallback: false,
    };
  }

  try {
    const e2e = JSON.parse(
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
    saveCachedE2e(e2e);
    return {
      e2e,
      usedCached: false,
      usedStaleFallback: false,
    };
  } catch (error) {
    if (!staleCachedE2e) {
      throw error;
    }

    return {
      e2e: staleCachedE2e,
      usedCached: true,
      usedStaleFallback: true,
    };
  }
}

function launchMobileApp({ app, device, expoUrl }) {
  const args = [
    'scripts/launch-mobile-simulator-app.mjs',
    '--app',
    app,
    '--device',
    device,
    '--terminate',
    '--clean-harness',
  ];

  if (expoUrl && app !== 'standalone') {
    args.push('--url', expoUrl);
  }

  return JSON.parse(runNode(args));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  const app = args.app ?? 'standalone';
  const bundleId = app === 'standalone' ? 'com.zktalk.mobile' : 'host.exp.Exponent';
  const requestedDevice = args.device ?? (app === 'standalone' ? 'iPhone 15' : 'booted');
  const device = resolveSimulatorDevice(requestedDevice, bundleId);
  const shutdownOtherBootedDevices = shutdownOtherBootedSimulators(device);
  const shouldLaunch = args.launch === undefined ? true : args.launch === 'true';
  const timeoutMs = Number(args['timeout-ms'] ?? 90_000);
  const expoUrl = args['expo-url'] ?? process.env.EXPO_GO_URL ?? '';

  const metroAvailable = await isMetroAvailable();
  if (!metroAvailable) {
    throw new Error(
      'Metro dev server is not running on http://127.0.0.1:8081/status. Start it from /Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile with `npm run start` before running mobile:smoke.',
    );
  }
  let standalonePrepare = null;
  if (app === 'standalone') {
    standalonePrepare = ensureStandalonePrepared(device);
  }
  if (shouldLaunch && app === 'standalone') {
    launchMobileApp({ app, device, expoUrl });
  }
  const harness = JSON.parse(
    runNode(['scripts/find-mobile-simulator-harness.mjs', '--app', app, '--device', device]),
  );
  const { e2e, usedCached, usedStaleFallback } = await loadE2eData({
    fresh: args.fresh === 'true',
  });
  const harnessPaths = getHarnessPaths(harness.harnessDir);
  clearHarnessFiles(harnessPaths);

  const summary = {
    app,
    device,
    ...(shutdownOtherBootedDevices.length > 0 ? { shutdownOtherBootedDevices } : {}),
    harnessDir: harness.harnessDir,
    usedCachedE2e: usedCached,
    usedStaleCachedFallback: usedStaleFallback,
    ...(standalonePrepare ? { standalonePrepare } : {}),
    steps: [],
  };

  writeText(harnessPaths.sessionToken, e2e.userA.sessionToken);

  let launchResult = null;
  if (shouldLaunch) {
    launchResult = launchMobileApp({ app, device, expoUrl });
    summary.launch = launchResult;
  }

  const homeRouteResult = await routeAndWait(
    harnessPaths,
    { type: 'home', communityId: e2e.communityId },
    'home',
    timeoutMs,
  );
  summary.steps.push({
    step: 'open-home',
    ok: true,
    communityId: e2e.communityId,
    marker: readJsonIfExists(harnessPaths.autoLoginMarker),
    routeResult: homeRouteResult,
  });

  removeIfExists(harnessPaths.sessionToken);
  writeJson(harnessPaths.loginAction, {
    type: 'emailMagicLinkLogin',
    email: e2e.userA.email,
  });
  writeJson(harnessPaths.settingsAction, { type: 'logout' });
  await routeAndWait(harnessPaths, { type: 'settings' }, 'settings', timeoutMs);
  const logoutResult = await waitForJsonFile(
    harnessPaths.settingsResult,
    (data) => data.ok === true && data.action === 'logout',
    { timeoutMs, label: 'logout result' },
  );
  summary.steps.push({ step: 'logout', ok: true, result: logoutResult });

  const loginResult = await waitForJsonFile(
    harnessPaths.loginResult,
    (data) => data.ok === true && data.action === 'emailMagicLinkLogin',
    { timeoutMs, label: 'login result' },
  );
  writeText(harnessPaths.sessionToken, e2e.userA.sessionToken);
  summary.steps.push({ step: 'login', ok: true, result: loginResult });

  await routeAndWait(
    harnessPaths,
    { type: 'home', communityId: e2e.communityId },
    'home',
    timeoutMs,
  );

  const channelBody = `mobile-p0-channel-${Date.now()}`;
  await routeAndWait(
    harnessPaths,
    {
      type: 'channel',
      channelId: e2e.channelId,
      communityId: e2e.communityId,
      channelName: e2e.channelName,
    },
    'channel',
    timeoutMs,
  );
  writeJson(harnessPaths.compose, {
    channelId: e2e.channelId,
    body: channelBody,
  });
  await waitForFileRemoval(harnessPaths.compose, { timeoutMs, label: 'channel compose consumption' });
  await waitForChannelMessage(e2e.channelId, e2e.userB.sessionToken, channelBody, timeoutMs);
  summary.steps.push({ step: 'channel-send', ok: true, body: channelBody });

  writeJson(harnessPaths.dmListAction, { type: 'openFirst' });
  await routeAndWait(harnessPaths, { type: 'dmList' }, 'dmList', timeoutMs);
  const dmListResult = await waitForJsonFile(
    harnessPaths.dmListResult,
    (data) => data.ok === true && data.action === 'openFirst',
    { timeoutMs, label: 'dm list result' },
  );
  summary.steps.push({ step: 'open-dm-list', ok: true, result: dmListResult });

  const dmBody = `mobile-p0-dm-${Date.now()}`;
  await routeAndWait(
    harnessPaths,
    {
      type: 'dm',
      conversationId: e2e.harnessConversationId,
      userId: e2e.dmHarnessSender.id,
      displayName: e2e.dmHarnessSender.displayName,
    },
    'dm',
    timeoutMs,
  );
  removeIfExists(harnessPaths.compose);
  writeJson(harnessPaths.compose, {
    conversationId: e2e.harnessConversationId,
    body: dmBody,
  });
  await waitForFileRemoval(harnessPaths.compose, { timeoutMs, label: 'dm compose consumption' });
  await waitForDmMessage(
    e2e.harnessConversationId,
    e2e.dmHarnessSender.sessionToken,
    dmBody,
    timeoutMs,
  );
  summary.steps.push({ step: 'dm-send', ok: true, body: dmBody });

  const nextDisplayName = `Mobile QA ${String(Date.now()).slice(-6)}`;
  const nextBio = `mobile smoke bio ${Date.now()}`;
  writeJson(harnessPaths.editProfileAction, {
    type: 'save',
    displayName: nextDisplayName,
    bio: nextBio,
  });
  await routeAndWait(harnessPaths, { type: 'editProfile' }, 'editProfile', timeoutMs);
  const editProfileResult = await waitForJsonFile(
    harnessPaths.editProfileResult,
    (data) => data.ok === true && data.action === 'save',
    { timeoutMs, label: 'edit profile result' },
  );
  const meAfterEdit = await request('/api/me', { token: e2e.userA.sessionToken });
  assert(
    meAfterEdit.user?.displayName === nextDisplayName,
    `Profile displayName mismatch: expected ${nextDisplayName}, received ${meAfterEdit.user?.displayName}`,
  );
  assert(
    (meAfterEdit.user?.bio ?? '') === nextBio,
    `Profile bio mismatch: expected ${nextBio}, received ${meAfterEdit.user?.bio ?? ''}`,
  );
  summary.steps.push({ step: 'edit-profile', ok: true, result: editProfileResult });

  writeJson(harnessPaths.createCommunityAction, {
    type: 'preview',
    name: 'Mobile QA Community',
    slugInput: 'Mobile QA 2026!!!',
  });
  await routeAndWait(harnessPaths, { type: 'createCommunity' }, 'createCommunity', timeoutMs);
  const previewResult = await waitForJsonFile(
    harnessPaths.createCommunityResult,
    (data) => data.ok === true && data.action === 'preview',
    { timeoutMs, label: 'create community preview result' },
  );
  assert(
    previewResult.slug === 'mobile-qa-2026',
    `Slug preview should sanitize to mobile-qa-2026, received ${previewResult.slug}`,
  );
  assert(
    previewResult.slugFeedback === 'converted',
    `Slug preview should report converted feedback, received ${previewResult.slugFeedback}`,
  );
  assert(previewResult.canSubmit === true, 'Slug preview should remain submittable');
  summary.steps.push({ step: 'preview-community-slug', ok: true, result: previewResult });

  await routeAndWait(
    harnessPaths,
    { type: 'home', communityId: e2e.communityId },
    'home',
    timeoutMs,
  );
  removeIfExists(harnessPaths.createCommunityResult);
  const communityName = `Mobile Smoke ${Date.now()}`;
  writeJson(harnessPaths.createCommunityAction, {
    type: 'create',
    name: communityName,
    visibility: 'public',
  });
  await routeAndWait(harnessPaths, { type: 'createCommunity' }, 'createCommunity', timeoutMs);
  const createCommunityResult = await waitForJsonFile(
    harnessPaths.createCommunityResult,
    (data) => data.ok === true && typeof data.communityId === 'string',
    { timeoutMs, label: 'create community result' },
  );
  const createdCommunity = await request(`/api/communities/${createCommunityResult.communityId}`, {
    token: e2e.userA.sessionToken,
  });
  assert(
    createdCommunity.community?.name === communityName,
    `Created community name mismatch: expected ${communityName}, received ${createdCommunity.community?.name}`,
  );
  summary.steps.push({
    step: 'create-community',
    ok: true,
    result: createCommunityResult,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        ...summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
