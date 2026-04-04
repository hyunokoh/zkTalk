#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { extractRouteFromProtocolUrl } = require('../apps/desktop/protocol-route.js');

const apiPort = process.env.ZKTALK_API_PORT ?? '4000';
const baseUrl = process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const cacheDir = path.join(process.cwd(), '.tmp');
const cachePath = path.join(cacheDir, 'desktop-harness-last-e2e.json');
const resultPath = path.join(cacheDir, 'desktop-harness-last-result.json');
const desktopTestUserDataDir = path.join(cacheDir, 'desktop-harness-user-data');
const desktopTestConfigPath = path.join(desktopTestUserDataDir, 'desktop.config.json');
const desktopTestStartupRoutePath = path.join(desktopTestUserDataDir, 'startup-route.json');
const desktopTestLogPath = path.join(desktopTestUserDataDir, 'logs', 'desktop.log');

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

function runNode(args, options = {}) {
  return execFileSync('node', args, {
    encoding: 'utf8',
    ...options,
  }).trim();
}

async function request(pathname, { token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `GET ${pathname} failed: ${response.status} ${response.statusText}\n${JSON.stringify(payload, null, 2)}`,
    );
  }

  return payload;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function saveLastResult(payload) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify(payload, null, 2));
}

function printUsage() {
  console.log(`Usage:
  node scripts/desktop-harness-regression.mjs [--mode channel|dm|both] [--fresh] [--timeout-ms 20000]

Defaults:
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

async function waitForChannelMessage({ channelId, token, body, timeoutMs, pollMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await request(`/api/channels/${channelId}/messages?limit=20`, { token });
    const messages = result.messages ?? result.items ?? [];
    const found = messages.find((entry) => {
      const message = entry.message ?? entry;
      return message.bodyMarkdown === body || message.bodyPlaintext === body;
    });
    if (found) {
      return true;
    }
    await sleep(pollMs);
  }

  return false;
}

async function waitForDmMessage({ conversationId, token, body, timeoutMs, pollMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await request(`/api/dm/conversations/${conversationId}/messages`, { token });
    const messages = result.messages ?? result.items ?? [];
    const found = messages.find((entry) => {
      const message = entry.message ?? entry;
      return message.bodyMarkdown === body || message.bodyPlaintext === body;
    });
    if (found) {
      return true;
    }
    await sleep(pollMs);
  }

  return false;
}

function buildProtocolUrl({ mode, e2e, body, nonce }) {
  const dmSender = getDmHarnessSender(e2e);
  const dmConversationId = getDmHarnessConversationId(e2e);
  return JSON.parse(
    runNode([
      'scripts/desktop-protocol-message.mjs',
      '--mode',
      mode,
      '--session-token',
      mode === 'channel' ? e2e.userB.sessionToken : dmSender.sessionToken,
      ...(mode === 'channel'
        ? ['--community-slug', e2e.communitySlug, '--channel-id', e2e.channelId]
        : ['--conversation-id', dmConversationId]),
      '--body',
      body,
      '--nonce',
      nonce,
    ]),
  ).url;
}

function openProtocolUrl(url) {
  return openDevDesktopRoute(url);
}

function ensureDesktopTestConfig() {
  fs.mkdirSync(desktopTestUserDataDir, { recursive: true });
  const existing = fs.existsSync(desktopTestConfigPath)
    ? JSON.parse(fs.readFileSync(desktopTestConfigPath, 'utf8'))
    : {};
  const payload = {
    apiUrl: process.env.ZKTALK_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000',
    wsUrl: process.env.ZKTALK_WS_URL ?? process.env.NEXT_PUBLIC_WS_URL ?? 'ws://127.0.0.1:4000/api/ws',
    livekitUrl: process.env.ZKTALK_LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'ws://127.0.0.1:7880',
    webUrl: process.env.ZKTALK_WEB_URL ?? existing.webUrl ?? 'http://127.0.0.1:3000',
  };
  fs.writeFileSync(desktopTestConfigPath, JSON.stringify(payload, null, 2));
}

function openDevDesktopRoute(url) {
  const route = extractRouteFromProtocolUrl(url);
  if (!route) {
    throw new Error(`Could not convert desktop protocol URL to route: ${url}`);
  }

  try {
    execFileSync('pkill', ['-f', desktopTestUserDataDir], { stdio: 'pipe' });
  } catch (_) {
    // Ignore when no desktop harness test instance is running.
  }

  ensureDesktopTestConfig();
  fs.rmSync(desktopTestStartupRoutePath, { force: true });
  fs.rmSync(desktopTestLogPath, { force: true });

  const electronBinary = path.join(
    process.cwd(),
    'apps',
    'desktop',
    'node_modules',
    '.bin',
    'electron',
  );
  const child = spawn(electronBinary, ['.', route], {
    cwd: path.join(process.cwd(), 'apps', 'desktop'),
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ZKTALK_DESKTOP_TEST: '1',
      ZKTALK_USER_DATA_DIR: desktopTestUserDataDir,
      ZKTALK_CONFIG_PATH: desktopTestConfigPath,
      ZKTALK_WEB_URL: process.env.ZKTALK_WEB_URL ?? 'http://127.0.0.1:3000',
    },
  });
  child.unref();

  return {
    desktopMode: 'dev-fallback',
    route,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  const mode = args.mode ?? 'channel';
  const timeoutMs = Number(args['timeout-ms'] ?? 20000);
  const pollMs = Number(args['poll-ms'] ?? 1000);
  if (!['channel', 'dm', 'both'].includes(mode)) {
    throw new Error(`Unsupported mode: ${mode}`);
  }

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

  let channelVerified = false;
  let dmVerified = false;
  let desktopMode = 'packaged';
  let channelUrl = null;
  let dmUrl = null;
  const dmConversationId = getDmHarnessConversationId(e2e);
  const dmSender = getDmHarnessSender(e2e);
  const dmReceiver = getDmHarnessReceiver(e2e);

  if (mode === 'channel' || mode === 'both') {
    const body = `desktop regression channel ${Date.now()}`;
    channelUrl = buildProtocolUrl({
      mode: 'channel',
      e2e,
      body,
      nonce: `${Date.now()}-channel`,
    });
    openProtocolUrl(channelUrl);
    channelVerified = await waitForChannelMessage({
      channelId: e2e.channelId,
      token: e2e.userA.sessionToken,
      body,
      timeoutMs,
      pollMs,
    });
    if (!channelVerified) {
      openDevDesktopRoute(channelUrl);
      desktopMode = 'dev-fallback';
      channelVerified = await waitForChannelMessage({
        channelId: e2e.channelId,
        token: e2e.userA.sessionToken,
        body,
        timeoutMs,
        pollMs,
      });
    }
    if (!channelVerified) {
      throw new Error(`Timed out waiting for desktop channel message: ${body}`);
    }
  }

  if (mode === 'dm' || mode === 'both') {
    const body = `desktop regression dm ${Date.now()}`;
    dmUrl = buildProtocolUrl({
      mode: 'dm',
      e2e,
      body,
      nonce: `${Date.now()}-dm`,
    });
    openProtocolUrl(dmUrl);
    dmVerified = await waitForDmMessage({
      conversationId: dmConversationId,
      token: dmReceiver.sessionToken,
      body,
      timeoutMs,
      pollMs,
    });
    if (!dmVerified) {
      openDevDesktopRoute(dmUrl);
      desktopMode = 'dev-fallback';
      dmVerified = await waitForDmMessage({
        conversationId: dmConversationId,
        token: dmReceiver.sessionToken,
        body,
        timeoutMs,
        pollMs,
      });
    }
    if (!dmVerified) {
      throw new Error(`Timed out waiting for desktop DM message: ${body}`);
    }
  }

  const result = {
    ok: true,
    mode,
    communityId: e2e.communityId,
    communitySlug: e2e.communitySlug,
    channelId: e2e.channelId,
    conversationId: dmConversationId,
    dmSenderUserId: dmSender.id,
    dmReceiverUserId: dmReceiver.id,
    usedCachedE2e: Boolean(cachedE2e),
    usedStaleCachedE2e,
    ...(e2eWarning ? { e2eWarning } : {}),
    e2eCachePath: cachePath,
    resultPath,
    desktopMode,
    ...(channelUrl ? { channelUrl, channelVerified } : {}),
    ...(dmUrl ? { dmUrl, dmVerified } : {}),
    timeoutMs,
  };
  saveLastResult(result);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
});
