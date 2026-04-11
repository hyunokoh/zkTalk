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
const cacheDir = path.join(process.cwd(), '.tmp');
const cachePath = path.join(cacheDir, 'mobile-harness-last-e2e.json');
const defaultMaestroBinPath = path.join(
  process.cwd(),
  '.tmp',
  'tools',
  'maestro',
  'maestro',
  'bin',
  'maestro',
);
const defaultChannelFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-send-smoke.yaml',
);
const defaultImeFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-ime-smoke.yaml',
);
const defaultDmFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/dm-send-smoke.yaml',
);
const defaultSelectedMessageAiFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-selected-message-ai-smoke.yaml',
);
const defaultDmSelectedMessageAiFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/dm-selected-message-ai-smoke.yaml',
);
const defaultThreadSelectedMessageAiFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/thread-selected-message-ai-smoke.yaml',
);
const defaultDmAttachmentSendFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/dm-attachment-send-smoke.yaml',
);
const defaultDmDocumentSendFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/dm-document-send-smoke.yaml',
);
const defaultDmCameraSendFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/dm-camera-send-smoke.yaml',
);
const defaultAttachmentOpenFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-attachment-open-smoke.yaml',
);
const defaultAttachmentCloseFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-attachment-close-smoke.yaml',
);
const defaultAttachmentSendFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-attachment-send-smoke.yaml',
);
const defaultDocumentSendFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-document-send-smoke.yaml',
);
const defaultCameraSendFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-camera-send-smoke.yaml',
);
const defaultAttachmentFlowPath = path.join(
  process.cwd(),
  'apps/mobile/maestro/flows/channel-attachment-preview-smoke.yaml',
);
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sM1n8kAAAAASUVORK5CYII=',
  'base64',
);
const TINY_PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  'utf8',
);

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

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    ...options,
  }).trim();
}

function runNode(args, options = {}) {
  return runCommand('node', args, options);
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

async function loadE2eData({ fresh }) {
  const staleCachedE2e = loadCachedE2e(Number.MAX_SAFE_INTEGER);
  const cachedE2e = fresh ? null : loadCachedE2e(10 * 60 * 1000);
  const forceCachedE2e = process.env.ZKTALK_E2E_FORCE_CACHE === '1';

  if (forceCachedE2e) {
    if (!staleCachedE2e) {
      throw new Error(
        'ZKTALK_E2E_FORCE_CACHE=1 was set, but no cached mobile harness E2E payload exists.',
      );
    }

    return {
      e2e: staleCachedE2e,
      usedCached: true,
      usedStaleFallback: true,
    };
  }

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

function getHarnessPaths(harnessDir) {
  return {
    sessionToken: path.join(harnessDir, 'dev-session-token.txt'),
    autoLoginMarker: path.join(harnessDir, 'auto-login-marker.txt'),
    filePickerAction: path.join(harnessDir, 'dev-file-picker-action.json'),
    lightboxAction: path.join(harnessDir, 'dev-attachment-lightbox-action.json'),
    lightboxResult: path.join(harnessDir, 'dev-attachment-lightbox-result.json'),
    route: path.join(harnessDir, 'dev-route.json'),
    routeResult: path.join(harnessDir, 'dev-route-result.json'),
    compose: path.join(harnessDir, 'dev-compose.json'),
    composeResult: path.join(harnessDir, 'dev-compose-result.json'),
    errorBoundary: path.join(harnessDir, 'error-boundary.json'),
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

function launchMobileApp({
  app,
  device,
  expoUrl,
  terminate = true,
  cleanHarness = true,
} = {}) {
  const args = ['scripts/launch-mobile-simulator-app.mjs', '--app', app, '--device', device];

  if (terminate) {
    args.push('--terminate');
  }

  if (cleanHarness) {
    args.push('--clean-harness');
  }

  if (app !== 'standalone' && expoUrl) {
    args.push('--url', expoUrl);
  }

  return JSON.parse(runNode(args));
}

function foregroundMobileApp({ app, device, expoUrl }) {
  return launchMobileApp({
    app,
    device,
    expoUrl,
    terminate: false,
    cleanHarness: false,
  });
}

function resolveMaestroBinary() {
  const candidates = [
    process.env.MAESTRO_BIN?.trim() || null,
    fs.existsSync(defaultMaestroBinPath) ? defaultMaestroBinPath : null,
  ].filter(Boolean);

  try {
    const pathBinary = runCommand('zsh', ['-lc', 'command -v maestro']);
    if (pathBinary) {
      candidates.unshift(pathBinary);
    }
  } catch {
    // Ignore missing PATH binary and continue with explicit candidates.
  }

  for (const candidate of candidates) {
    try {
      const version = runCommand(candidate, ['--version'], {
        env: {
          ...process.env,
          MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
          MAESTRO_CLI_NO_ANALYTICS: '1',
        },
      });
      return {
        binPath: candidate,
        version,
      };
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    `Maestro CLI is not available. Install it with \`brew install maestro\`, or unpack the CLI to \`${defaultMaestroBinPath}\`, or point \`MAESTRO_BIN\` at an existing Maestro binary before retrying \`npm run mobile:maestro:smoke -- --app standalone\`.`,
  );
}

function isRetryableHarnessLookupError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Unable to lookup in current state: Shutdown') ||
    message.includes('get_app_container')
  );
}

async function resolveHarnessWithRetry({
  app,
  device,
  expoUrl,
  shouldLaunch,
  attempts = 5,
  retryDelayMs = 2_000,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return JSON.parse(
        runNode(['scripts/find-mobile-simulator-harness.mjs', '--app', app, '--device', device]),
      );
    } catch (error) {
      lastError = error;
      if (!isRetryableHarnessLookupError(error) || attempt === attempts) {
        throw error;
      }

      if (shouldLaunch) {
        try {
          launchMobileApp({ app, device, expoUrl });
        } catch {
          // Let the next harness lookup retry surface the more useful error.
        }
      }

      await sleep(retryDelayMs);
    }
  }

  throw lastError;
}

function materializeFlowPath(flowPath, outputDir, skipLaunchApp) {
  if (!skipLaunchApp) {
    return flowPath;
  }

  const original = fs.readFileSync(flowPath, 'utf8');
  const stripped = original.replace('- launchApp:\n    stopApp: false\n', '');
  const generatedFlowPath = path.join(outputDir, path.basename(flowPath));
  writeText(generatedFlowPath, stripped);
  return generatedFlowPath;
}

function runMaestroFlow({ maestroBin, flowPath, outputDir, env, device, skipLaunchApp = false }) {
  ensureDir(outputDir);
  const effectiveFlowPath = materializeFlowPath(flowPath, outputDir, skipLaunchApp);
  const envArgs = Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]);
  return runCommand(
    maestroBin,
    [
      'test',
      effectiveFlowPath,
      '--test-output-dir',
      outputDir,
      '--device',
      device,
      ...envArgs,
    ],
    {
      env: {
        ...process.env,
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
        MAESTRO_CLI_NO_ANALYTICS: '1',
        MAESTRO_DRIVER_STARTUP_TIMEOUT:
          process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT ?? '240000',
      },
    },
  );
}

function isRetryableMaestroError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Failed to connect to /127.0.0.1:') ||
    message.includes('Connection refused') ||
    message.includes('Assertion is false: id: main-tab-home is visible')
  );
}

async function runMaestroFlowWithRetry({
  attempts = 3,
  retryDelayMs = 2_000,
  beforeAttempt,
  ...flowArgs
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (beforeAttempt) {
      await beforeAttempt(attempt);
    }

    try {
      return runMaestroFlow(flowArgs);
    } catch (error) {
      lastError = error;
      if (!isRetryableMaestroError(error) || attempt === attempts) {
        throw error;
      }
      await sleep(retryDelayMs);
    }
  }

  throw lastError;
}

function pickMessageList(result) {
  return result.items ?? result.messages ?? [];
}

function flattenMessageBody(entry) {
  const message = entry?.message ?? entry;
  return message?.bodyMarkdown ?? message?.bodyPlaintext ?? null;
}

function flattenMessageId(entry) {
  const message = entry?.message ?? entry;
  return message?.id ?? entry?.id ?? null;
}

function flattenAttachments(entry) {
  const message = entry?.message ?? entry;
  return message?.attachments ?? entry?.attachments ?? [];
}

async function waitForChannelMessage(channelId, token, body, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/channels/${channelId}/messages?limit=30`, { token });
    return pickMessageList(response).find((entry) => flattenMessageBody(entry) === body) ?? null;
  }, { timeoutMs, label: 'channel message delivery' });
}

async function waitForChannelAttachment(channelId, token, body, attachmentId, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/channels/${channelId}/messages?limit=30`, { token });
    return (
      pickMessageList(response).find((entry) => {
        if (flattenMessageBody(entry) !== body) {
          return false;
        }

        return flattenAttachments(entry).some((attachment) => attachment?.id === attachmentId);
      }) ?? null
    );
  }, { timeoutMs, label: 'channel attachment delivery' });
}

async function waitForChannelAttachmentByFileName(channelId, token, fileName, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/channels/${channelId}/messages?limit=30`, { token });
    return (
      pickMessageList(response).find((entry) =>
        flattenAttachments(entry).some((attachment) => attachment?.fileName === fileName),
      ) ?? null
    );
  }, { timeoutMs, label: 'channel attachment send delivery' });
}

async function waitForDmMessage(conversationId, token, body, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/dm/conversations/${conversationId}/messages?limit=30`, {
      token,
    });
    return pickMessageList(response).find((entry) => flattenMessageBody(entry) === body) ?? null;
  }, { timeoutMs, label: 'dm message delivery' });
}

async function waitForDmAttachmentByFileName(conversationId, token, fileName, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/dm/conversations/${conversationId}/messages?limit=30`, {
      token,
    });
    return (
      pickMessageList(response).find((entry) =>
        flattenAttachments(entry).some((attachment) => attachment?.fileName === fileName),
      ) ?? null
    );
  }, { timeoutMs, label: 'dm attachment delivery' });
}

async function waitForThreadMessage(threadId, token, body, timeoutMs) {
  return waitFor(async () => {
    const response = await request(`/api/threads/${threadId}/messages?limit=30`, { token });
    return pickMessageList(response).find((entry) => flattenMessageBody(entry) === body) ?? null;
  }, { timeoutMs, label: 'thread message delivery' });
}

async function runLightboxZoomAction(paths, action, timeoutMs) {
  removeIfExists(paths.lightboxResult);
  writeJson(paths.lightboxAction, action);
  const result = await waitForJsonFile(
    paths.lightboxResult,
    (data) => data.requestId === action.requestId,
    { timeoutMs, label: `lightbox action ${action.requestId}` },
  );
  removeIfExists(paths.lightboxResult);
  return result;
}

async function uploadBinary(uploadUrl, { token, contentType, body }) {
  const response = await fetch(`${baseUrl}${uploadUrl}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': contentType,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `PUT ${uploadUrl} failed: ${response.status} ${response.statusText}\n${text}`,
    );
  }
}

async function createChannelImageAttachment({
  channelId,
  senderToken,
  recipientToken,
  fileName,
  bodyMarkdown,
  timeoutMs,
}) {
  const messageResponse = await request(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    token: senderToken,
    headers: {
      'x-request-id': `mobile-maestro-attachment-${Date.now()}`,
    },
    body: {
      bodyMarkdown,
    },
  });
  const messageId = flattenMessageId(messageResponse);
  assert(messageId, 'Channel attachment message id missing from create response');

  const presignResponse = await request('/api/upload/presign', {
    method: 'POST',
    token: senderToken,
    body: {
      channelId,
      fileName,
      mimeType: 'image/png',
      fileSize: TINY_PNG.length,
    },
  });
  assert(
    typeof presignResponse?.uploadUrl === 'string' &&
      typeof presignResponse?.storageKey === 'string',
    'Channel attachment presign response was incomplete',
  );

  await uploadBinary(presignResponse.uploadUrl, {
    token: senderToken,
    contentType: 'image/png',
    body: TINY_PNG,
  });

  const attachmentResponse = await request('/api/upload/attachments', {
    method: 'POST',
    token: senderToken,
    body: {
      messageId,
      storageKey: presignResponse.storageKey,
      fileName,
      mimeType: 'image/png',
      fileSize: TINY_PNG.length,
      width: 1,
      height: 1,
    },
  });
  const attachmentId = attachmentResponse?.id ?? null;
  assert(attachmentId, 'Channel attachment id missing from create response');

  const deliveredMessage = await waitForChannelAttachment(
    channelId,
    recipientToken,
    bodyMarkdown,
    attachmentId,
    timeoutMs,
  );

  return {
    messageId,
    attachmentId,
    fileName,
    bodyMarkdown,
    deliveredMessageId: flattenMessageId(deliveredMessage),
  };
}

function printUsage() {
  console.log(`Usage:
  node scripts/mobile-maestro-smoke.mjs [--app standalone] [--device booted|<udid>] [--mode channel|ime|dm|both|selected-message-ai|selected-message-ai-dm|selected-message-ai-thread|attachment|attachment-send|document-send|camera-send|dm-attachment-send|dm-document-send|dm-camera-send|attachment-zoom] [--fresh] [--launch] [--timeout-ms 90000] [--maestro-timeout-ms 20000]

Defaults:
  --app standalone
  --device iPhone 15
  --mode channel
  --launch true
`);
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
  const mode = args.mode ?? 'channel';
  const shouldLaunch = args.launch === undefined ? true : args.launch === 'true';
  const timeoutMs = Number(args['timeout-ms'] ?? 90_000);
  const maestroTimeoutMs = Number(args['maestro-timeout-ms'] ?? 20_000);
  const expoUrl = args['expo-url'] ?? process.env.EXPO_GO_URL ?? '';
  const timestamp = Date.now();
  const channelMessageBody =
    args['channel-message-body'] ??
    (mode === 'channel' ? args['message-body'] : undefined) ??
    `mobile-maestro-channel-${timestamp}`;
  const imeMessageBody =
    args['ime-message-body'] ??
    (mode === 'ime' ? args['message-body'] : undefined) ??
    `모바일 한글 입력 테스트 ${timestamp}`;
  const dmMessageBody =
    args['dm-message-body'] ??
    (mode === 'dm' ? args['message-body'] : undefined) ??
    `mobile-maestro-dm-${timestamp}`;
  const dmAttachmentSendFileName =
    args['dm-attachment-send-file-name'] ?? `mobile-maestro-dm-upload-${timestamp}.png`;
  const dmDocumentSendFileName =
    args['dm-document-send-file-name'] ?? `mobile-maestro-dm-document-${timestamp}.pdf`;
  const dmCameraSendFileName =
    args['dm-camera-send-file-name'] ?? `mobile-maestro-dm-camera-${timestamp}.png`;
  const attachmentSendFileName =
    args['attachment-send-file-name'] ?? `mobile-maestro-upload-${timestamp}.png`;
  const documentSendFileName =
    args['document-send-file-name'] ?? `mobile-maestro-document-${timestamp}.pdf`;
  const cameraSendFileName =
    args['camera-send-file-name'] ?? `mobile-maestro-camera-${timestamp}.png`;
  const attachmentMessageBody =
    args['attachment-message-body'] ??
    (mode === 'attachment' ? args['message-body'] : undefined) ??
    `mobile-maestro-attachment-${timestamp}`;
  const attachmentFileName =
    args['attachment-file-name'] ?? `mobile-maestro-preview-${timestamp}.png`;
  const attachmentCloseLabel = args['close-label'] ?? '취소';
  const channelFlowPath = path.resolve(
    args['channel-flow'] ?? (mode === 'channel' ? args.flow ?? defaultChannelFlowPath : defaultChannelFlowPath),
  );
  const imeFlowPath = path.resolve(
    args['ime-flow'] ?? (mode === 'ime' ? args.flow ?? defaultImeFlowPath : defaultImeFlowPath),
  );
  const dmFlowPath = path.resolve(
    args['dm-flow'] ?? (mode === 'dm' ? args.flow ?? defaultDmFlowPath : defaultDmFlowPath),
  );
  const selectedMessageAiFlowPath = path.resolve(
    args['selected-message-ai-flow'] ??
      (mode === 'selected-message-ai'
        ? args.flow ?? defaultSelectedMessageAiFlowPath
        : defaultSelectedMessageAiFlowPath),
  );
  const dmSelectedMessageAiFlowPath = path.resolve(
    args['dm-selected-message-ai-flow'] ??
      (mode === 'selected-message-ai-dm'
        ? args.flow ?? defaultDmSelectedMessageAiFlowPath
        : defaultDmSelectedMessageAiFlowPath),
  );
  const threadSelectedMessageAiFlowPath = path.resolve(
    args['thread-selected-message-ai-flow'] ??
      (mode === 'selected-message-ai-thread'
        ? args.flow ?? defaultThreadSelectedMessageAiFlowPath
        : defaultThreadSelectedMessageAiFlowPath),
  );
  const dmAttachmentSendFlowPath = path.resolve(
    args['dm-attachment-send-flow'] ??
      (mode === 'dm-attachment-send'
        ? args.flow ?? defaultDmAttachmentSendFlowPath
        : defaultDmAttachmentSendFlowPath),
  );
  const dmDocumentSendFlowPath = path.resolve(
    args['dm-document-send-flow'] ??
      (mode === 'dm-document-send'
        ? args.flow ?? defaultDmDocumentSendFlowPath
        : defaultDmDocumentSendFlowPath),
  );
  const dmCameraSendFlowPath = path.resolve(
    args['dm-camera-send-flow'] ??
      (mode === 'dm-camera-send'
        ? args.flow ?? defaultDmCameraSendFlowPath
        : defaultDmCameraSendFlowPath),
  );
  const attachmentOpenFlowPath = path.resolve(
    args['attachment-open-flow'] ?? defaultAttachmentOpenFlowPath,
  );
  const attachmentCloseFlowPath = path.resolve(
    args['attachment-close-flow'] ?? defaultAttachmentCloseFlowPath,
  );
  const attachmentSendFlowPath = path.resolve(
    args['attachment-send-flow'] ??
      (mode === 'attachment-send'
        ? args.flow ?? defaultAttachmentSendFlowPath
        : defaultAttachmentSendFlowPath),
  );
  const documentSendFlowPath = path.resolve(
    args['document-send-flow'] ??
      (mode === 'document-send'
        ? args.flow ?? defaultDocumentSendFlowPath
        : defaultDocumentSendFlowPath),
  );
  const cameraSendFlowPath = path.resolve(
    args['camera-send-flow'] ??
      (mode === 'camera-send'
        ? args.flow ?? defaultCameraSendFlowPath
        : defaultCameraSendFlowPath),
  );
  const attachmentFlowPath = path.resolve(
    args['attachment-flow'] ??
      (mode === 'attachment' ? args.flow ?? defaultAttachmentFlowPath : defaultAttachmentFlowPath),
  );
  const maestroOutputRoot = path.join(process.cwd(), '.tmp', 'mobile-maestro');

  assert(Number.isFinite(timeoutMs) && timeoutMs > 0, 'timeout-ms must be a positive number');
  assert(
    Number.isFinite(maestroTimeoutMs) && maestroTimeoutMs > 0,
    'maestro-timeout-ms must be a positive number',
  );
  assert(
    mode === 'channel' ||
      mode === 'ime' ||
      mode === 'dm' ||
      mode === 'both' ||
      mode === 'selected-message-ai' ||
      mode === 'selected-message-ai-dm' ||
      mode === 'selected-message-ai-thread' ||
      mode === 'attachment' ||
      mode === 'attachment-send' ||
      mode === 'document-send' ||
      mode === 'camera-send' ||
      mode === 'dm-attachment-send' ||
      mode === 'dm-document-send' ||
      mode === 'dm-camera-send' ||
      mode === 'attachment-zoom',
    'mode must be one of: channel, ime, dm, both, selected-message-ai, selected-message-ai-dm, selected-message-ai-thread, attachment, attachment-send, document-send, camera-send, dm-attachment-send, dm-document-send, dm-camera-send, attachment-zoom',
  );
  if (app !== 'standalone') {
    throw new Error('mobile:maestro:smoke currently supports --app standalone only.');
  }
  if ((mode === 'channel' || mode === 'both') && !fs.existsSync(channelFlowPath)) {
    throw new Error(`Channel Maestro flow not found: ${channelFlowPath}`);
  }
  if (mode === 'ime' && !fs.existsSync(imeFlowPath)) {
    throw new Error(`IME Maestro flow not found: ${imeFlowPath}`);
  }
  if ((mode === 'dm' || mode === 'both') && !fs.existsSync(dmFlowPath)) {
    throw new Error(`DM Maestro flow not found: ${dmFlowPath}`);
  }
  if (mode === 'selected-message-ai-dm' && !fs.existsSync(dmSelectedMessageAiFlowPath)) {
    throw new Error(`DM selected-message AI Maestro flow not found: ${dmSelectedMessageAiFlowPath}`);
  }
  if (
    mode === 'selected-message-ai-thread' &&
    !fs.existsSync(threadSelectedMessageAiFlowPath)
  ) {
    throw new Error(
      `Thread selected-message AI Maestro flow not found: ${threadSelectedMessageAiFlowPath}`,
    );
  }
  if (mode === 'dm-attachment-send' && !fs.existsSync(dmAttachmentSendFlowPath)) {
    throw new Error(`DM attachment send Maestro flow not found: ${dmAttachmentSendFlowPath}`);
  }
  if (mode === 'dm-document-send' && !fs.existsSync(dmDocumentSendFlowPath)) {
    throw new Error(`DM document send Maestro flow not found: ${dmDocumentSendFlowPath}`);
  }
  if (mode === 'dm-camera-send' && !fs.existsSync(dmCameraSendFlowPath)) {
    throw new Error(`DM camera send Maestro flow not found: ${dmCameraSendFlowPath}`);
  }
  if (mode === 'attachment-send' && !fs.existsSync(attachmentSendFlowPath)) {
    throw new Error(`Attachment send Maestro flow not found: ${attachmentSendFlowPath}`);
  }
  if (mode === 'document-send' && !fs.existsSync(documentSendFlowPath)) {
    throw new Error(`Document send Maestro flow not found: ${documentSendFlowPath}`);
  }
  if (mode === 'camera-send' && !fs.existsSync(cameraSendFlowPath)) {
    throw new Error(`Camera send Maestro flow not found: ${cameraSendFlowPath}`);
  }
  if (mode === 'attachment' && !fs.existsSync(attachmentFlowPath)) {
    throw new Error(`Attachment Maestro flow not found: ${attachmentFlowPath}`);
  }
  if (mode === 'attachment-zoom' && !fs.existsSync(attachmentOpenFlowPath)) {
    throw new Error(`Attachment open Maestro flow not found: ${attachmentOpenFlowPath}`);
  }
  if (mode === 'attachment-zoom' && !fs.existsSync(attachmentCloseFlowPath)) {
    throw new Error(`Attachment close Maestro flow not found: ${attachmentCloseFlowPath}`);
  }

  if (app !== 'standalone') {
    const metroAvailable = await isMetroAvailable();
    if (!metroAvailable) {
      throw new Error(
        'Metro dev server is not running on http://127.0.0.1:8081/status. Start it from /Users/hyunokoh/Documents/Projects/zkTalk/apps/mobile with `npm run start` before running mobile:maestro:smoke.',
      );
    }
  }
  let standalonePrepare = null;
  if (app === 'standalone') {
    standalonePrepare = ensureStandalonePrepared(device);
  }
  if (shouldLaunch && app === 'standalone') {
    launchMobileApp({ app, device, expoUrl });
  }

  const maestro = resolveMaestroBinary();
  const harness = await resolveHarnessWithRetry({
    app,
    device,
    expoUrl,
    shouldLaunch,
  });
  const { e2e, usedCached, usedStaleFallback } = await loadE2eData({
    fresh: args.fresh === 'true',
  });
  const harnessPaths = getHarnessPaths(harness.harnessDir);
  clearHarnessFiles(harnessPaths);

  writeText(harnessPaths.sessionToken, e2e.userA.sessionToken);

  let launchResult = null;
  if (shouldLaunch) {
    launchResult = launchMobileApp({ app, device, expoUrl });
  }

  const errorBoundary = readJsonIfExists(harnessPaths.errorBoundary);
  if (errorBoundary) {
    throw new Error(
      `Mobile app hit the error boundary before Maestro started:\n${JSON.stringify(errorBoundary, null, 2)}`,
    );
  }

  const bringAppToHome = () =>
    routeAndWait(
      harnessPaths,
      { type: 'home' },
      'home',
      timeoutMs,
    );

  const bringAppToChannel = () =>
    routeAndWait(
      harnessPaths,
      {
        type: 'channel',
        communityId: e2e.communityId,
        channelId: e2e.channelId,
      },
      'channel',
      timeoutMs,
    );
  const prepareMaestroAttempt = async () => {
    if (shouldLaunch) {
      foregroundMobileApp({ app, device, expoUrl });
      await sleep(1_000);
    }

    await bringAppToHome();

    const attemptErrorBoundary = readJsonIfExists(harnessPaths.errorBoundary);
    if (attemptErrorBoundary) {
      throw new Error(
        `Mobile app hit the error boundary before a Maestro attempt:\n${JSON.stringify(
          attemptErrorBoundary,
          null,
          2,
        )}`,
      );
    }
  };

  const steps = [];
  const runChannelSendStep = async ({ outputKey, flowPath, messageBody, step }) => {
    await bringAppToChannel();
    const outputDir = path.join(maestroOutputRoot, outputKey);
    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: async () => {
        if (shouldLaunch) {
          foregroundMobileApp({ app, device, expoUrl });
          await sleep(1_000);
        }

        await bringAppToChannel();

        const attemptErrorBoundary = readJsonIfExists(harnessPaths.errorBoundary);
        if (attemptErrorBoundary) {
          throw new Error(
            `Mobile app hit the error boundary before a Maestro attempt:\n${JSON.stringify(
              attemptErrorBoundary,
              null,
              2,
            )}`,
          );
        }
      },
      env: {
        COMMUNITY_ID: e2e.communityId,
        CHANNEL_ID: e2e.channelId,
        CHANNEL_NAME: e2e.channelName,
        MESSAGE_BODY: messageBody,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForChannelMessage(
      e2e.channelId,
      e2e.userB.sessionToken,
      messageBody,
      timeoutMs,
    );

    steps.push({
      step,
      flowPath,
      maestroOutputDir: outputDir,
      messageBody,
      deliveredMessageId: deliveredMessage?.message?.id ?? deliveredMessage?.id ?? null,
      maestroStdout,
    });

    return deliveredMessage;
  };

  if (mode === 'channel' || mode === 'both') {
    await runChannelSendStep({
      outputKey: 'channel-send',
      flowPath: channelFlowPath,
      messageBody: channelMessageBody,
      step: 'channel-send',
    });
  }

  if (mode === 'ime') {
    await runChannelSendStep({
      outputKey: 'channel-ime-send',
      flowPath: imeFlowPath,
      messageBody: imeMessageBody,
      step: 'channel-ime-send',
    });
  }

  if (mode === 'selected-message-ai') {
    const deliveredMessage = await runChannelSendStep({
      outputKey: 'selected-message-ai-seed',
      flowPath: channelFlowPath,
      messageBody: channelMessageBody,
      step: 'selected-message-ai-seed',
    });

    await bringAppToChannel();
    const outputDir = path.join(maestroOutputRoot, 'selected-message-ai');
    const deliveredMessageId = deliveredMessage?.message?.id ?? deliveredMessage?.id ?? null;
    assert(
      typeof deliveredMessageId === 'string' && deliveredMessageId.length > 0,
      'selected-message-ai mode requires a delivered channel message id',
    );
    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: selectedMessageAiFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: async () => {
        if (shouldLaunch) {
          foregroundMobileApp({ app, device, expoUrl });
          await sleep(1_000);
        }

        await bringAppToChannel();

        const attemptErrorBoundary = readJsonIfExists(harnessPaths.errorBoundary);
        if (attemptErrorBoundary) {
          throw new Error(
            `Mobile app hit the error boundary before a Maestro attempt:\n${JSON.stringify(
              attemptErrorBoundary,
              null,
              2,
            )}`,
          );
        }
      },
      env: {
        COMMUNITY_ID: e2e.communityId,
        CHANNEL_ID: e2e.channelId,
        CHANNEL_NAME: e2e.channelName,
        MESSAGE_ID: deliveredMessageId,
        MESSAGE_BODY: channelMessageBody,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    steps.push({
      step: 'selected-message-ai',
      flowPath: selectedMessageAiFlowPath,
      maestroOutputDir: outputDir,
      messageBody: channelMessageBody,
      deliveredMessageId,
      maestroStdout,
    });
  }

  if (mode === 'selected-message-ai-dm') {
    const dmDeliveredMessage = await request(`/api/dm/conversations/${e2e.harnessConversationId}/messages`, {
      method: 'POST',
      token: e2e.userB.sessionToken,
      headers: {
        'x-request-id': `mobile-maestro-dm-selected-message-ai-${Date.now()}`,
      },
      body: {
        bodyMarkdown: dmMessageBody,
      },
    });
    const deliveredMessageId = flattenMessageId(dmDeliveredMessage);
    await waitForDmMessage(
      e2e.harnessConversationId,
      e2e.userA.sessionToken,
      dmMessageBody,
      timeoutMs,
    );
    assert(
      typeof deliveredMessageId === 'string' && deliveredMessageId.length > 0,
      'selected-message-ai-dm mode requires a delivered DM message id',
    );

    const outputDir = path.join(maestroOutputRoot, 'selected-message-ai-dm');
    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: dmSelectedMessageAiFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: async () => {
        await prepareMaestroAttempt();
        await routeAndWait(
          harnessPaths,
          {
            type: 'dm',
            conversationId: e2e.harnessConversationId,
          },
          'dm',
          timeoutMs,
        );
      },
      env: {
        CONVERSATION_ID: e2e.harnessConversationId,
        MESSAGE_ID: deliveredMessageId,
        MESSAGE_BODY: dmMessageBody,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    steps.push({
      step: 'selected-message-ai-dm',
      flowPath: dmSelectedMessageAiFlowPath,
      maestroOutputDir: outputDir,
      messageBody: dmMessageBody,
      deliveredMessageId,
      conversationId: e2e.harnessConversationId,
      maestroStdout,
    });
  }

  if (mode === 'selected-message-ai-thread') {
    const deliveredRootMessage = await request(`/api/channels/${e2e.channelId}/messages`, {
      method: 'POST',
      token: e2e.userB.sessionToken,
      headers: {
        'x-request-id': `mobile-maestro-thread-selected-message-root-${Date.now()}`,
      },
      body: {
        bodyMarkdown: channelMessageBody,
      },
    });
    const rootMessageId = flattenMessageId(deliveredRootMessage);
    assert(
      typeof rootMessageId === 'string' && rootMessageId.length > 0,
      'selected-message-ai-thread mode requires a delivered thread root message id',
    );
    await waitForChannelMessage(e2e.channelId, e2e.userA.sessionToken, channelMessageBody, timeoutMs);

    const createdThread = await request(`/api/messages/${rootMessageId}/thread`, {
      method: 'POST',
      token: e2e.userA.sessionToken,
    });
    const threadId = createdThread?.id ?? createdThread?.thread?.id ?? null;
    assert(typeof threadId === 'string' && threadId.length > 0, 'Thread create response did not include a thread id');

    const threadMessageBody = `thread-selected-message-ai-${timestamp}`;
    const threadMessageResponse = await request(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      token: e2e.userB.sessionToken,
      headers: {
        'x-request-id': `mobile-maestro-thread-selected-message-reply-${Date.now()}`,
      },
      body: {
        bodyMarkdown: threadMessageBody,
      },
    });
    const deliveredMessageId = flattenMessageId(threadMessageResponse);
    await waitForThreadMessage(threadId, e2e.userA.sessionToken, threadMessageBody, timeoutMs);
    assert(
      typeof deliveredMessageId === 'string' && deliveredMessageId.length > 0,
      'selected-message-ai-thread mode requires a delivered thread reply message id',
    );

    const outputDir = path.join(maestroOutputRoot, 'selected-message-ai-thread');
    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: threadSelectedMessageAiFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: async () => {
        await prepareMaestroAttempt();
        await routeAndWait(
          harnessPaths,
          {
            type: 'thread',
            threadId,
            channelId: e2e.channelId,
            communityId: e2e.communityId,
            rootMessageId,
          },
          'thread',
          timeoutMs,
        );
      },
      env: {
        THREAD_ID: threadId,
        MESSAGE_ID: deliveredMessageId,
        MESSAGE_BODY: threadMessageBody,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    steps.push({
      step: 'selected-message-ai-thread',
      flowPath: threadSelectedMessageAiFlowPath,
      maestroOutputDir: outputDir,
      messageBody: threadMessageBody,
      deliveredMessageId,
      threadId,
      rootMessageId,
      maestroStdout,
    });
  }

  if (mode === 'dm' || mode === 'both') {
    let relaunch = null;
    if (steps.length > 0 && shouldLaunch) {
      relaunch = launchMobileApp({ app, device, expoUrl });
      await bringAppToHome();
      const postRelaunchErrorBoundary = readJsonIfExists(harnessPaths.errorBoundary);
      if (postRelaunchErrorBoundary) {
        throw new Error(
          `Mobile app hit the error boundary after relaunching for the next Maestro step:\n${JSON.stringify(
            postRelaunchErrorBoundary,
            null,
            2,
          )}`,
        );
      }
    }

    const outputDir = path.join(maestroOutputRoot, 'dm-send');
    await bringAppToHome();
    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: dmFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        CONVERSATION_ID: e2e.harnessConversationId,
        DISPLAY_NAME: e2e.dmHarnessSender.displayName,
        MESSAGE_BODY: dmMessageBody,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForDmMessage(
      e2e.harnessConversationId,
      e2e.dmHarnessSender.sessionToken,
      dmMessageBody,
      timeoutMs,
    );

    steps.push({
      step: 'dm-send',
      flowPath: dmFlowPath,
      maestroOutputDir: outputDir,
      conversationId: e2e.harnessConversationId,
      messageBody: dmMessageBody,
      deliveredMessageId: deliveredMessage?.message?.id ?? deliveredMessage?.id ?? null,
      relaunch,
      maestroStdout,
    });
  }

  if (mode === 'dm-attachment-send') {
    await bringAppToHome();
    const outputDir = path.join(maestroOutputRoot, 'dm-attachment-send');
    writeJson(harnessPaths.filePickerAction, {
      picker: 'image',
      fileName: dmAttachmentSendFileName,
      mimeType: 'image/png',
      base64: TINY_PNG.toString('base64'),
      size: TINY_PNG.length,
    });

    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: dmAttachmentSendFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        CONVERSATION_ID: e2e.harnessConversationId,
        DISPLAY_NAME: e2e.dmHarnessSender.displayName,
        ATTACHMENT_FILE_NAME: dmAttachmentSendFileName,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForDmAttachmentByFileName(
      e2e.harnessConversationId,
      e2e.dmHarnessSender.sessionToken,
      dmAttachmentSendFileName,
      timeoutMs,
    );
    const deliveredAttachment =
      flattenAttachments(deliveredMessage).find(
        (attachment) => attachment?.fileName === dmAttachmentSendFileName,
      ) ?? null;

    steps.push({
      step: 'dm-attachment-send',
      flowPath: dmAttachmentSendFlowPath,
      maestroOutputDir: outputDir,
      deliveredMessageId: flattenMessageId(deliveredMessage),
      attachmentId: deliveredAttachment?.id ?? null,
      attachmentFileName: dmAttachmentSendFileName,
      maestroStdout,
    });
  }

  if (mode === 'dm-document-send') {
    await bringAppToHome();
    const outputDir = path.join(maestroOutputRoot, 'dm-document-send');
    writeJson(harnessPaths.filePickerAction, {
      picker: 'document',
      fileName: dmDocumentSendFileName,
      mimeType: 'application/pdf',
      base64: TINY_PDF.toString('base64'),
      size: TINY_PDF.length,
    });

    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: dmDocumentSendFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        CONVERSATION_ID: e2e.harnessConversationId,
        DISPLAY_NAME: e2e.dmHarnessSender.displayName,
        DOCUMENT_FILE_NAME: dmDocumentSendFileName,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForDmAttachmentByFileName(
      e2e.harnessConversationId,
      e2e.dmHarnessSender.sessionToken,
      dmDocumentSendFileName,
      timeoutMs,
    );
    const deliveredAttachment =
      flattenAttachments(deliveredMessage).find(
        (attachment) => attachment?.fileName === dmDocumentSendFileName,
      ) ?? null;

    steps.push({
      step: 'dm-document-send',
      flowPath: dmDocumentSendFlowPath,
      maestroOutputDir: outputDir,
      deliveredMessageId: flattenMessageId(deliveredMessage),
      attachmentId: deliveredAttachment?.id ?? null,
      attachmentFileName: dmDocumentSendFileName,
      maestroStdout,
    });
  }

  if (mode === 'dm-camera-send') {
    await bringAppToHome();
    const outputDir = path.join(maestroOutputRoot, 'dm-camera-send');
    writeJson(harnessPaths.filePickerAction, {
      picker: 'camera',
      fileName: dmCameraSendFileName,
      mimeType: 'image/png',
      base64: TINY_PNG.toString('base64'),
      size: TINY_PNG.length,
    });

    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: dmCameraSendFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        CONVERSATION_ID: e2e.harnessConversationId,
        DISPLAY_NAME: e2e.dmHarnessSender.displayName,
        CAMERA_FILE_NAME: dmCameraSendFileName,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForDmAttachmentByFileName(
      e2e.harnessConversationId,
      e2e.dmHarnessSender.sessionToken,
      dmCameraSendFileName,
      timeoutMs,
    );
    const deliveredAttachment =
      flattenAttachments(deliveredMessage).find(
        (attachment) => attachment?.fileName === dmCameraSendFileName,
      ) ?? null;

    steps.push({
      step: 'dm-camera-send',
      flowPath: dmCameraSendFlowPath,
      maestroOutputDir: outputDir,
      deliveredMessageId: flattenMessageId(deliveredMessage),
      attachmentId: deliveredAttachment?.id ?? null,
      attachmentFileName: dmCameraSendFileName,
      maestroStdout,
    });
  }

  if (mode === 'attachment-send') {
    await bringAppToHome();
    const outputDir = path.join(maestroOutputRoot, 'channel-attachment-send');
    writeJson(harnessPaths.filePickerAction, {
      picker: 'image',
      fileName: attachmentSendFileName,
      mimeType: 'image/png',
      base64: TINY_PNG.toString('base64'),
      size: TINY_PNG.length,
    });

    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: attachmentSendFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        COMMUNITY_ID: e2e.communityId,
        CHANNEL_ID: e2e.channelId,
        CHANNEL_NAME: e2e.channelName,
        ATTACHMENT_FILE_NAME: attachmentSendFileName,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForChannelAttachmentByFileName(
      e2e.channelId,
      e2e.userB.sessionToken,
      attachmentSendFileName,
      timeoutMs,
    );
    const deliveredAttachment =
      flattenAttachments(deliveredMessage).find(
        (attachment) => attachment?.fileName === attachmentSendFileName,
      ) ?? null;

    steps.push({
      step: 'channel-attachment-send',
      flowPath: attachmentSendFlowPath,
      maestroOutputDir: outputDir,
      deliveredMessageId: flattenMessageId(deliveredMessage),
      attachmentId: deliveredAttachment?.id ?? null,
      attachmentFileName: attachmentSendFileName,
      maestroStdout,
    });
  }

  if (mode === 'document-send') {
    await bringAppToHome();
    const outputDir = path.join(maestroOutputRoot, 'channel-document-send');
    writeJson(harnessPaths.filePickerAction, {
      picker: 'document',
      fileName: documentSendFileName,
      mimeType: 'application/pdf',
      base64: TINY_PDF.toString('base64'),
      size: TINY_PDF.length,
    });

    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: documentSendFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        COMMUNITY_ID: e2e.communityId,
        CHANNEL_ID: e2e.channelId,
        CHANNEL_NAME: e2e.channelName,
        DOCUMENT_FILE_NAME: documentSendFileName,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForChannelAttachmentByFileName(
      e2e.channelId,
      e2e.userB.sessionToken,
      documentSendFileName,
      timeoutMs,
    );
    const deliveredAttachment =
      flattenAttachments(deliveredMessage).find(
        (attachment) => attachment?.fileName === documentSendFileName,
      ) ?? null;

    steps.push({
      step: 'channel-document-send',
      flowPath: documentSendFlowPath,
      maestroOutputDir: outputDir,
      deliveredMessageId: flattenMessageId(deliveredMessage),
      attachmentId: deliveredAttachment?.id ?? null,
      attachmentFileName: documentSendFileName,
      maestroStdout,
    });
  }

  if (mode === 'camera-send') {
    await bringAppToHome();
    const outputDir = path.join(maestroOutputRoot, 'channel-camera-send');
    writeJson(harnessPaths.filePickerAction, {
      picker: 'camera',
      fileName: cameraSendFileName,
      mimeType: 'image/png',
      base64: TINY_PNG.toString('base64'),
      size: TINY_PNG.length,
    });

    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: cameraSendFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        COMMUNITY_ID: e2e.communityId,
        CHANNEL_ID: e2e.channelId,
        CHANNEL_NAME: e2e.channelName,
        CAMERA_FILE_NAME: cameraSendFileName,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const deliveredMessage = await waitForChannelAttachmentByFileName(
      e2e.channelId,
      e2e.userB.sessionToken,
      cameraSendFileName,
      timeoutMs,
    );
    const deliveredAttachment =
      flattenAttachments(deliveredMessage).find(
        (attachment) => attachment?.fileName === cameraSendFileName,
      ) ?? null;

    steps.push({
      step: 'channel-camera-send',
      flowPath: cameraSendFlowPath,
      maestroOutputDir: outputDir,
      deliveredMessageId: flattenMessageId(deliveredMessage),
      attachmentId: deliveredAttachment?.id ?? null,
      attachmentFileName: cameraSendFileName,
      maestroStdout,
    });
  }

  if (mode === 'attachment') {
    await bringAppToHome();
    const seededAttachment = await createChannelImageAttachment({
      channelId: e2e.channelId,
      senderToken: e2e.userC.sessionToken,
      recipientToken: e2e.userA.sessionToken,
      fileName: attachmentFileName,
      bodyMarkdown: attachmentMessageBody,
      timeoutMs,
    });

    const outputDir = path.join(maestroOutputRoot, 'channel-attachment-preview');
    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: attachmentFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        COMMUNITY_ID: e2e.communityId,
        CHANNEL_ID: e2e.channelId,
        CHANNEL_NAME: e2e.channelName,
        MESSAGE_BODY: seededAttachment.bodyMarkdown,
        ATTACHMENT_ID: seededAttachment.attachmentId,
        FILE_NAME: seededAttachment.fileName,
        CLOSE_LABEL: attachmentCloseLabel,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    steps.push({
      step: 'channel-attachment-preview',
      flowPath: attachmentFlowPath,
      maestroOutputDir: outputDir,
      messageBody: seededAttachment.bodyMarkdown,
      deliveredMessageId: seededAttachment.deliveredMessageId ?? seededAttachment.messageId,
      attachmentId: seededAttachment.attachmentId,
      attachmentFileName: seededAttachment.fileName,
      maestroStdout,
    });
  }

  if (mode === 'attachment-zoom') {
    await bringAppToHome();
    const seededAttachment = await createChannelImageAttachment({
      channelId: e2e.channelId,
      senderToken: e2e.userC.sessionToken,
      recipientToken: e2e.userA.sessionToken,
      fileName: attachmentFileName,
      bodyMarkdown: attachmentMessageBody,
      timeoutMs,
    });

    const outputDir = path.join(maestroOutputRoot, 'channel-attachment-zoom');
    const maestroStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: attachmentOpenFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        COMMUNITY_ID: e2e.communityId,
        CHANNEL_ID: e2e.channelId,
        CHANNEL_NAME: e2e.channelName,
        ATTACHMENT_ID: seededAttachment.attachmentId,
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    const zoomInResult = await runLightboxZoomAction(
      harnessPaths,
      {
        requestId: `zoom-in-${timestamp}`,
        type: 'setZoom',
        scale: 2,
      },
      timeoutMs,
    );
    const zoomOutClampResult = await runLightboxZoomAction(
      harnessPaths,
      {
        requestId: `zoom-out-${timestamp}`,
        type: 'setZoom',
        scale: 0.5,
      },
      timeoutMs,
    );
    const zoomMaxClampResult = await runLightboxZoomAction(
      harnessPaths,
      {
        requestId: `zoom-max-${timestamp}`,
        type: 'setZoom',
        scale: 5,
      },
      timeoutMs,
    );
    const closeStdout = await runMaestroFlowWithRetry({
      maestroBin: maestro.binPath,
      flowPath: attachmentCloseFlowPath,
      outputDir,
      device,
      skipLaunchApp: shouldLaunch,
      beforeAttempt: prepareMaestroAttempt,
      env: {
        FLOW_WAIT_TIMEOUT_MS: String(maestroTimeoutMs),
      },
    });

    steps.push({
      step: 'channel-attachment-zoom',
      flowPath: attachmentOpenFlowPath,
      maestroOutputDir: outputDir,
      deliveredMessageId: seededAttachment.deliveredMessageId ?? seededAttachment.messageId,
      attachmentId: seededAttachment.attachmentId,
      attachmentFileName: seededAttachment.fileName,
      zoomChecks: {
        zoomIn: zoomInResult,
        zoomOutClamp: zoomOutClampResult,
        zoomMaxClamp: zoomMaxClampResult,
      },
      maestroStdout: `${maestroStdout}\n${closeStdout}`,
    });
  }

  const singleStep = steps.length === 1 ? steps[0] : null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        app,
        device,
        ...(shutdownOtherBootedDevices.length > 0
          ? { shutdownOtherBootedDevices }
          : {}),
        mode,
        harnessDir: harness.harnessDir,
        usedCachedE2e: usedCached,
        usedStaleCachedFallback: usedStaleFallback,
        maestroBin: maestro.binPath,
        maestroVersion: maestro.version,
        ...(standalonePrepare ? { standalonePrepare } : {}),
        launch: launchResult,
        autoLoginMarker: readJsonIfExists(harnessPaths.autoLoginMarker),
        communityId: e2e.communityId,
        channelId: e2e.channelId,
        channelName: e2e.channelName,
        harnessConversationId: e2e.harnessConversationId,
        flows: {
          channel: channelFlowPath,
          ime: imeFlowPath,
          dm: dmFlowPath,
          dmAttachmentSend: dmAttachmentSendFlowPath,
          dmDocumentSend: dmDocumentSendFlowPath,
          dmCameraSend: dmCameraSendFlowPath,
          attachmentOpen: attachmentOpenFlowPath,
          attachmentClose: attachmentCloseFlowPath,
          attachmentSend: attachmentSendFlowPath,
          documentSend: documentSendFlowPath,
          cameraSend: cameraSendFlowPath,
          attachment: attachmentFlowPath,
        },
        steps,
        ...(singleStep
          ? {
              flowPath: singleStep.flowPath,
              maestroOutputDir: singleStep.maestroOutputDir,
              messageBody: singleStep.messageBody,
              deliveredMessageId: singleStep.deliveredMessageId,
              maestroStdout: singleStep.maestroStdout,
            }
          : {}),
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
