#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serializeError, writeJsonFile } from './smoke-common.mjs';

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, '.tmp');
const desktopCachePath = path.join(tmpDir, 'desktop-harness-last-e2e.json');
const desktopResultPath = path.join(tmpDir, 'desktop-harness-last-result.json');
const manualSmokeCaptureResultPath = path.join(tmpDir, 'manual-smoke-capture-last-result.json');
const manualSmokeOpenResultPath = path.join(tmpDir, 'manual-smoke-open-last-result.json');
const manualSmokeRefreshResultPath = path.join(tmpDir, 'manual-smoke-refresh-last-result.json');
const mobileCachePath = path.join(tmpDir, 'mobile-harness-last-e2e.json');
const e2eSeedCachePath = path.join(tmpDir, 'e2e', 'ui-seed-v2.json');
const uiSmokePlaywrightWebResultPath = path.join(tmpDir, 'ui-smoke-playwright-web-last-result.json');
const uiSmokePlaywrightDesktopResultPath = path.join(tmpDir, 'ui-smoke-playwright-desktop-last-result.json');
const uiSmokeMobileResultPath = path.join(tmpDir, 'ui-smoke-mobile-last-result.json');
const uiSmokeMacosResultPath = path.join(tmpDir, 'ui-smoke-macos-last-result.json');
const uiSmokeAllResultPath = path.join(tmpDir, 'ui-smoke-all-last-result.json');
const uiSmokeVerifyResultPath = path.join(tmpDir, 'ui-smoke-verify-last-result.json');
const uiSmokeRerunResultPath = path.join(tmpDir, 'ui-smoke-rerun-last-result.json');
const uiSmokeRepairResultPath = path.join(tmpDir, 'ui-smoke-repair-last-result.json');
const manualSmokeBriefPath = path.join(tmpDir, 'manual-smoke-brief-latest.md');
const manualSmokeBriefResultPath = path.join(tmpDir, 'manual-smoke-brief-last-result.json');
const manualSmokeReportPath = path.join(tmpDir, 'manual-smoke-report-latest.md');
const manualSmokeReportResultPath = path.join(tmpDir, 'manual-smoke-report-last-result.json');
const manualSmokeReportMetadataPath = path.join(tmpDir, 'manual-smoke-report-latest.json');
const manualSmokeStatusResultPath = path.join(tmpDir, 'manual-smoke-status-last-result.json');
const manualSmokeHistoryPath = path.join(tmpDir, 'manual-smoke-history.md');
const latestDesktopCapturePath = path.join(tmpDir, 'manual-smoke-desktop-latest.png');
const latestMobileCapturePath = path.join(tmpDir, 'manual-smoke-mobile-latest.png');
const resultStaleAfterMs = 24 * 60 * 60 * 1000;
const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getPrimaryCache() {
  return readJsonIfExists(desktopCachePath)
    ?? readJsonIfExists(mobileCachePath)
    ?? readJsonIfExists(e2eSeedCachePath);
}

function boolLabel(value) {
  return value ? 'yes' : 'no';
}

function printLine(label, value = '') {
  console.log(`${label}${value ? `: ${value}` : ''}`);
}

function buildDesktopChannelDeepLink(cache) {
  const sessionToken = cache.userB?.sessionToken;
  const communitySlug = cache.communitySlug ?? '';
  const channelId = cache.channelId ?? '';
  if (!sessionToken || !communitySlug || !channelId) {
    return '';
  }

  const params = new URLSearchParams({
    mode: 'channel',
    sessionToken,
    communitySlug,
    channelId,
    body: 'manual smoke desktop channel',
    nonce: `manual-${Date.now()}-channel`,
  });

  return `zktalk://desktop-harness?${params.toString()}`;
}

function buildDesktopDmDeepLink(cache) {
  const sessionToken = cache.dmHarnessSender?.sessionToken ?? cache.userC?.sessionToken;
  const conversationId = cache.harnessConversationId ?? cache.conversationId ?? '';
  if (!sessionToken || !conversationId) {
    return '';
  }

  const params = new URLSearchParams({
    mode: 'dm',
    sessionToken,
    conversationId,
    body: 'manual smoke desktop dm',
    nonce: `manual-${Date.now()}-dm`,
  });

  return `zktalk://desktop-harness?${params.toString()}`;
}

function getResultLabel(result) {
  if (!result) {
    return 'missing';
  }
  return result.ok ? 'pass' : 'fail';
}

function formatDurationMs(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return '';
  }

  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }

  const totalSeconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function getResultTimestampMs(result, resultPath) {
  const finishedAtMs = Date.parse(result?.finishedAt ?? '');
  if (Number.isFinite(finishedAtMs)) {
    return finishedAtMs;
  }

  if (resultPath && fs.existsSync(resultPath)) {
    try {
      return fs.statSync(resultPath).mtimeMs;
    } catch {
      return null;
    }
  }

  return null;
}

function formatAgeMs(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return '';
  }

  const totalMinutes = Math.floor(ageMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${Math.max(minutes, 0)}m`;
}

function getResultFreshness(result, resultPath) {
  const timestampMs = getResultTimestampMs(result, resultPath);
  if (!Number.isFinite(timestampMs)) {
    return {
      age: '',
      stale: false,
    };
  }

  const ageMs = Math.max(0, Date.now() - timestampMs);
  return {
    age: formatAgeMs(ageMs),
    stale: ageMs > resultStaleAfterMs,
  };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function findFirstPid(pattern) {
  try {
    const output = execFileSync('pgrep', ['-f', pattern], { encoding: 'utf8' }).trim();
    return output.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  } catch {
    return '';
  }
}

function listTimestampedReportPaths(extension) {
  if (!fs.existsSync(tmpDir)) {
    return [];
  }

  return fs
    .readdirSync(tmpDir)
    .filter((entry) => new RegExp(`^manual-smoke-report-20\\d\\d-.*\\.${extension}$`).test(entry))
    .sort()
    .reverse()
    .map((entry) => path.join(tmpDir, entry));
}

function listTimestampedCapturePaths(kind) {
  if (!fs.existsSync(tmpDir)) {
    return [];
  }

  return fs
    .readdirSync(tmpDir)
    .filter((entry) => new RegExp(`^manual-smoke-${kind}-20\\d\\d-.*\\.png$`).test(entry))
    .sort()
    .reverse()
    .map((entry) => path.join(tmpDir, entry));
}

function main() {
  const cache = getPrimaryCache();
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAtMs;
  const status = {
    manualSmokeReady: !!cache,
    webLogin: 'http://localhost:3000/login',
    webHome: 'http://localhost:3000/home',
    apiHealth: 'http://localhost:4000/api/health',
    desktopApp: '/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/mac-arm64/zkTalk.app',
    mobileDevice: 'iPhone 15 simulator (booted)',
    cachedQaData: !!cache,
    checklistDoc: '/Users/hyunokoh/Documents/Projects/zkTalk/docs/manual-smoke-checklist-2026-03-27.md',
  };

  const packagedDesktopPid = findFirstPid('zkTalk.app/Contents/MacOS/zkTalk');
  const devDesktopPid = findFirstPid('apps/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
  const desktopResult = readJsonIfExists(desktopResultPath);
  const manualSmokeCaptureResult = readJsonIfExists(manualSmokeCaptureResultPath);
  const manualSmokeOpenResult = readJsonIfExists(manualSmokeOpenResultPath);
  const manualSmokeRefreshResult = readJsonIfExists(manualSmokeRefreshResultPath);
  const manualSmokeBriefResult = readJsonIfExists(manualSmokeBriefResultPath);
  const manualSmokeReportResult = readJsonIfExists(manualSmokeReportResultPath);
  const uiSmokePlaywrightWebResult = readJsonIfExists(uiSmokePlaywrightWebResultPath);
  const uiSmokePlaywrightDesktopResult = readJsonIfExists(uiSmokePlaywrightDesktopResultPath);
  const uiSmokeMobileResult = readJsonIfExists(uiSmokeMobileResultPath);
  const uiSmokeMacosResult = readJsonIfExists(uiSmokeMacosResultPath);
  const uiSmokeAllResult = readJsonIfExists(uiSmokeAllResultPath);
  const uiSmokeVerifyResult = readJsonIfExists(uiSmokeVerifyResultPath);
  const uiSmokeRerunResult = readJsonIfExists(uiSmokeRerunResultPath);
  const uiSmokeRepairResult = readJsonIfExists(uiSmokeRepairResultPath);
  const uiSmokePlaywrightWebFreshness = getResultFreshness(uiSmokePlaywrightWebResult, uiSmokePlaywrightWebResultPath);
  const uiSmokePlaywrightDesktopFreshness = getResultFreshness(uiSmokePlaywrightDesktopResult, uiSmokePlaywrightDesktopResultPath);
  const uiSmokeMobileFreshness = getResultFreshness(uiSmokeMobileResult, uiSmokeMobileResultPath);
  const uiSmokeMacosFreshness = getResultFreshness(uiSmokeMacosResult, uiSmokeMacosResultPath);
  const uiSmokeAllFreshness = getResultFreshness(uiSmokeAllResult, uiSmokeAllResultPath);
  const manualSmokeOpenFreshness = getResultFreshness(manualSmokeOpenResult, manualSmokeOpenResultPath);
  const manualSmokeRefreshFreshness = getResultFreshness(manualSmokeRefreshResult, manualSmokeRefreshResultPath);
  const manualSmokeBriefFreshness = getResultFreshness(manualSmokeBriefResult, manualSmokeBriefResultPath);
  const manualSmokeReportFreshness = getResultFreshness(manualSmokeReportResult, manualSmokeReportResultPath);
  status.desktopPackagedPid = packagedDesktopPid;
  status.desktopDevPid = devDesktopPid;
  status.desktopMode = devDesktopPid ? 'dev-reused' : packagedDesktopPid ? 'packaged' : 'not-running';
  status.desktopRegressionMode = desktopResult?.desktopMode ?? '';
  status.desktopRegressionChannelVerified = Boolean(desktopResult?.channelVerified);
  status.desktopRegressionDmVerified = Boolean(desktopResult?.dmVerified);
  status.desktopRegressionResultPath = desktopResult ? desktopResultPath : '';
  status.desktopRecommendedOpenCommand = devDesktopPid
    ? 'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/manual-smoke-open.mjs --no-web --no-mobile --no-doc'
    : 'open /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/mac-arm64/zkTalk.app';
  status.desktopLatestCapture = fs.existsSync(latestDesktopCapturePath) ? latestDesktopCapturePath : '';
  status.mobileLatestCapture = fs.existsSync(latestMobileCapturePath) ? latestMobileCapturePath : '';
  status.manualSmokeCaptureMethod = manualSmokeCaptureResult?.desktopCaptureMethod ?? '';
  status.manualSmokeCaptureResultPath = manualSmokeCaptureResult ? manualSmokeCaptureResultPath : '';
  status.manualSmokeDeletedCaptureCount = String(
    Array.isArray(manualSmokeCaptureResult?.deletedCapturePaths)
      ? manualSmokeCaptureResult.deletedCapturePaths.length
      : 0,
  );
  status.uiSmokePlaywrightWeb = getResultLabel(uiSmokePlaywrightWebResult);
  status.uiSmokePlaywrightDesktop = getResultLabel(uiSmokePlaywrightDesktopResult);
  status.uiSmokeMobile = getResultLabel(uiSmokeMobileResult);
  status.uiSmokeMacos = getResultLabel(uiSmokeMacosResult);
  status.uiSmokeAll = getResultLabel(uiSmokeAllResult);
  status.uiSmokeVerify = getResultLabel(uiSmokeVerifyResult);
  status.uiSmokeRerun = getResultLabel(uiSmokeRerunResult);
  status.uiSmokeRepair = getResultLabel(uiSmokeRepairResult);
  status.manualSmokeOpen = getResultLabel(manualSmokeOpenResult);
  status.manualSmokeRefresh = getResultLabel(manualSmokeRefreshResult);
  status.manualSmokeBrief = getResultLabel(manualSmokeBriefResult);
  status.manualSmokeReport = getResultLabel(manualSmokeReportResult);
  status.uiSmokePlaywrightWebFinishedAt = uiSmokePlaywrightWebResult?.finishedAt ?? '';
  status.uiSmokePlaywrightDesktopFinishedAt = uiSmokePlaywrightDesktopResult?.finishedAt ?? '';
  status.uiSmokeMobileFinishedAt = uiSmokeMobileResult?.finishedAt ?? '';
  status.uiSmokeMacosFinishedAt = uiSmokeMacosResult?.finishedAt ?? '';
  status.uiSmokeAllFinishedAt = uiSmokeAllResult?.finishedAt ?? '';
  status.uiSmokeVerifyCheckedAt = uiSmokeVerifyResult?.checkedAt ?? '';
  status.uiSmokeRerunFinishedAt = uiSmokeRerunResult?.finishedAt ?? '';
  status.uiSmokeRepairFinishedAt = uiSmokeRepairResult?.finishedAt ?? '';
  status.manualSmokeOpenFinishedAt = manualSmokeOpenResult?.finishedAt ?? '';
  status.manualSmokeRefreshFinishedAt = manualSmokeRefreshResult?.finishedAt ?? '';
  status.manualSmokeBriefFinishedAt = manualSmokeBriefResult?.finishedAt ?? '';
  status.manualSmokeReportFinishedAt = manualSmokeReportResult?.finishedAt ?? '';
  status.uiSmokeVerifyMaxAgeMinutes =
    typeof uiSmokeVerifyResult?.maxAgeMinutes === 'number'
      ? String(uiSmokeVerifyResult.maxAgeMinutes)
      : '';
  status.uiSmokeVerifyFailingSuites = Array.isArray(uiSmokeVerifyResult?.failingSuites)
    ? uiSmokeVerifyResult.failingSuites
    : [];
  status.uiSmokeRerunSelectedSuites = Array.isArray(uiSmokeRerunResult?.selectedSuites)
    ? uiSmokeRerunResult.selectedSuites
    : [];
  status.uiSmokeRepairSelectedSuites = Array.isArray(uiSmokeRepairResult?.rerun?.selectedSuites)
    ? uiSmokeRepairResult.rerun.selectedSuites
    : [];
  status.uiSmokePlaywrightWebDuration = formatDurationMs(uiSmokePlaywrightWebResult?.durationMs);
  status.uiSmokePlaywrightDesktopDuration = formatDurationMs(uiSmokePlaywrightDesktopResult?.durationMs);
  status.uiSmokeMobileDuration = formatDurationMs(uiSmokeMobileResult?.durationMs);
  status.uiSmokeMacosDuration = formatDurationMs(uiSmokeMacosResult?.durationMs);
  status.uiSmokeAllDuration = formatDurationMs(uiSmokeAllResult?.durationMs);
  status.uiSmokeRerunDuration = formatDurationMs(uiSmokeRerunResult?.durationMs);
  status.uiSmokeRepairDuration = formatDurationMs(uiSmokeRepairResult?.durationMs);
  status.manualSmokeOpenDuration = formatDurationMs(manualSmokeOpenResult?.durationMs);
  status.manualSmokeRefreshDuration = formatDurationMs(manualSmokeRefreshResult?.durationMs);
  status.manualSmokeBriefDuration = formatDurationMs(manualSmokeBriefResult?.durationMs);
  status.manualSmokeReportDuration = formatDurationMs(manualSmokeReportResult?.durationMs);
  status.uiSmokePlaywrightWebAge = uiSmokePlaywrightWebFreshness.age;
  status.uiSmokePlaywrightDesktopAge = uiSmokePlaywrightDesktopFreshness.age;
  status.uiSmokeMobileAge = uiSmokeMobileFreshness.age;
  status.uiSmokeMacosAge = uiSmokeMacosFreshness.age;
  status.uiSmokeAllAge = uiSmokeAllFreshness.age;
  status.manualSmokeOpenAge = manualSmokeOpenFreshness.age;
  status.manualSmokeRefreshAge = manualSmokeRefreshFreshness.age;
  status.manualSmokeBriefAge = manualSmokeBriefFreshness.age;
  status.manualSmokeReportAge = manualSmokeReportFreshness.age;
  status.uiSmokePlaywrightWebStale = uiSmokePlaywrightWebFreshness.stale;
  status.uiSmokePlaywrightDesktopStale = uiSmokePlaywrightDesktopFreshness.stale;
  status.uiSmokeMobileStale = uiSmokeMobileFreshness.stale;
  status.uiSmokeMacosStale = uiSmokeMacosFreshness.stale;
  status.uiSmokeAllStale = uiSmokeAllFreshness.stale;
  status.manualSmokeOpenStale = manualSmokeOpenFreshness.stale;
  status.manualSmokeRefreshStale = manualSmokeRefreshFreshness.stale;
  status.manualSmokeBriefStale = manualSmokeBriefFreshness.stale;
  status.manualSmokeReportStale = manualSmokeReportFreshness.stale;
  status.uiSmokePlaywrightWebResultPath = uiSmokePlaywrightWebResult ? uiSmokePlaywrightWebResultPath : '';
  status.uiSmokePlaywrightDesktopResultPath = uiSmokePlaywrightDesktopResult ? uiSmokePlaywrightDesktopResultPath : '';
  status.uiSmokeMobileResultPath = uiSmokeMobileResult ? uiSmokeMobileResultPath : '';
  status.uiSmokeMacosResultPath = uiSmokeMacosResult ? uiSmokeMacosResultPath : '';
  status.uiSmokeAllResultPath = uiSmokeAllResult ? uiSmokeAllResultPath : '';
  status.uiSmokeVerifyResultPath = uiSmokeVerifyResult ? uiSmokeVerifyResultPath : '';
  status.uiSmokeRerunResultPath = uiSmokeRerunResult ? uiSmokeRerunResultPath : '';
  status.uiSmokeRepairResultPath = uiSmokeRepairResult ? uiSmokeRepairResultPath : '';
  status.manualSmokeOpenResultPath = manualSmokeOpenResult ? manualSmokeOpenResultPath : '';
  status.manualSmokeRefreshResultPath = manualSmokeRefreshResult ? manualSmokeRefreshResultPath : '';
  status.manualSmokeBriefPath = fs.existsSync(manualSmokeBriefPath) ? manualSmokeBriefPath : '';
  status.manualSmokeBriefResultPath = fs.existsSync(manualSmokeBriefResultPath)
    ? manualSmokeBriefResultPath
    : '';
  status.manualSmokeReportPath = fs.existsSync(manualSmokeReportPath) ? manualSmokeReportPath : '';
  status.manualSmokeReportResultPath = fs.existsSync(manualSmokeReportResultPath)
    ? manualSmokeReportResultPath
    : '';
  status.manualSmokeReportMetadataPath = fs.existsSync(manualSmokeReportMetadataPath)
    ? manualSmokeReportMetadataPath
    : '';
  status.manualSmokeStatus = 'pass';
  status.manualSmokeStatusFinishedAt = finishedAt;
  status.manualSmokeStatusDuration = formatDurationMs(durationMs);
  status.manualSmokeStatusAge = '0m';
  status.manualSmokeStatusStale = false;
  status.manualSmokeStatusResultPath = manualSmokeStatusResultPath;
  status.manualSmokeHistoryPath = fs.existsSync(manualSmokeHistoryPath) ? manualSmokeHistoryPath : '';
  const timestampedReportPaths = listTimestampedReportPaths('md');
  const timestampedReportMetadataPaths = listTimestampedReportPaths('json');
  status.manualSmokeLatestSnapshotPath = timestampedReportPaths[0] ?? '';
  status.manualSmokeLatestMetadataPath = timestampedReportMetadataPaths[0] ?? '';
  status.manualSmokeSnapshotCount = String(timestampedReportPaths.length);
  status.manualSmokeDesktopCaptureCount = String(listTimestampedCapturePaths('desktop').length);
  status.manualSmokeMobileCaptureCount = String(listTimestampedCapturePaths('mobile').length);

  if (cache) {
    const communitySlug = cache.communitySlug ?? '';
    const channelId = cache.channelId ?? '';
    const harnessConversationId = cache.harnessConversationId ?? cache.conversationId ?? '';
    status.communitySlug = communitySlug;
    status.channelId = channelId;
    status.harnessConversationId = harnessConversationId;
    status.userAEmail = cache.userA?.email ?? '';
    status.userBEmail = cache.userB?.email ?? '';
    status.userCEmail = cache.userC?.email ?? '';
    status.hasPromotedCommunityFlow = Boolean(cache.promotedCommunityId && cache.promotedChannelId);
    status.checks = Array.isArray(cache.checks) ? cache.checks : [];
    status.webCommunity = communitySlug ? `http://localhost:3000/communities/${communitySlug}` : '';
    status.webChannel =
      communitySlug && channelId
        ? `http://localhost:3000/communities/${communitySlug}/channels/${channelId}`
        : '';
    status.webDm = harnessConversationId
      ? `http://localhost:3000/dm/${harnessConversationId}`
      : '';
    status.desktopChannelDeepLink = buildDesktopChannelDeepLink(cache);
    status.desktopDmDeepLink = buildDesktopDmDeepLink(cache);
    status.desktopOpenChannelCommand = status.desktopChannelDeepLink
      ? `cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/open-desktop-protocol.mjs --url ${shellQuote(status.desktopChannelDeepLink)}`
      : '';
    status.desktopOpenDmCommand = status.desktopDmDeepLink
      ? `cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/open-desktop-protocol.mjs --url ${shellQuote(status.desktopDmDeepLink)}`
      : '';
    status.mobileStandaloneBothCommand =
      'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/mobile-harness-regression.mjs --app standalone --mode both --launch';
    status.mobileExpoBothCommand =
      'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/mobile-harness-regression.mjs --app expo --mode both --launch';
    status.mobileStandaloneOpenCommand =
      'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/launch-mobile-simulator-app.mjs --app standalone --clean-harness';
  }

  writeJsonFile(manualSmokeStatusResultPath, {
    ok: true,
    startedAt,
    finishedAt,
    durationMs,
    resultPath: manualSmokeStatusResultPath,
    status,
  });

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  printLine('manualSmokeReady', cache ? 'yes' : 'partial');
  printLine('webLogin', status.webLogin);
  printLine('webHome', status.webHome);
  printLine('apiHealth', status.apiHealth);
  printLine('desktopApp', status.desktopApp);
  printLine('desktopMode', status.desktopMode);
  printLine('desktopPackagedPid', status.desktopPackagedPid);
  printLine('desktopDevPid', status.desktopDevPid);
  printLine('desktopRegressionMode', status.desktopRegressionMode);
  printLine('desktopRegressionChannelVerified', status.desktopRegressionChannelVerified ? 'yes' : 'no');
  printLine('desktopRegressionDmVerified', status.desktopRegressionDmVerified ? 'yes' : 'no');
  printLine('desktopRegressionResultPath', status.desktopRegressionResultPath);
  printLine('desktopRecommendedOpenCommand', status.desktopRecommendedOpenCommand);
  printLine('desktopLatestCapture', status.desktopLatestCapture);
  printLine('mobileDevice', status.mobileDevice);
  printLine('mobileLatestCapture', status.mobileLatestCapture);
  printLine('manualSmokeCaptureMethod', status.manualSmokeCaptureMethod);
  printLine('manualSmokeCaptureResultPath', status.manualSmokeCaptureResultPath);
  printLine('manualSmokeDeletedCaptureCount', status.manualSmokeDeletedCaptureCount);
  printLine('uiSmokePlaywrightWeb', status.uiSmokePlaywrightWeb);
  printLine('uiSmokePlaywrightDesktop', status.uiSmokePlaywrightDesktop);
  printLine('uiSmokeMobile', status.uiSmokeMobile);
  printLine('uiSmokeMacos', status.uiSmokeMacos);
  printLine('uiSmokeAll', status.uiSmokeAll);
  printLine('uiSmokeVerify', status.uiSmokeVerify);
  printLine('uiSmokeRerun', status.uiSmokeRerun);
  printLine('uiSmokeRepair', status.uiSmokeRepair);
  printLine('manualSmokeOpen', status.manualSmokeOpen);
  printLine('manualSmokeRefresh', status.manualSmokeRefresh);
  printLine('manualSmokeBrief', status.manualSmokeBrief);
  printLine('manualSmokeReport', status.manualSmokeReport);
  printLine('manualSmokeStatus', status.manualSmokeStatus);
  printLine('uiSmokePlaywrightWebFinishedAt', status.uiSmokePlaywrightWebFinishedAt);
  printLine('uiSmokePlaywrightWebDuration', status.uiSmokePlaywrightWebDuration);
  printLine('uiSmokePlaywrightWebAge', status.uiSmokePlaywrightWebAge);
  printLine('uiSmokePlaywrightWebStale', status.uiSmokePlaywrightWebStale ? 'yes' : 'no');
  printLine('uiSmokePlaywrightDesktopFinishedAt', status.uiSmokePlaywrightDesktopFinishedAt);
  printLine('uiSmokePlaywrightDesktopDuration', status.uiSmokePlaywrightDesktopDuration);
  printLine('uiSmokePlaywrightDesktopAge', status.uiSmokePlaywrightDesktopAge);
  printLine('uiSmokePlaywrightDesktopStale', status.uiSmokePlaywrightDesktopStale ? 'yes' : 'no');
  printLine('uiSmokeMobileFinishedAt', status.uiSmokeMobileFinishedAt);
  printLine('uiSmokeMobileDuration', status.uiSmokeMobileDuration);
  printLine('uiSmokeMobileAge', status.uiSmokeMobileAge);
  printLine('uiSmokeMobileStale', status.uiSmokeMobileStale ? 'yes' : 'no');
  printLine('uiSmokeMacosFinishedAt', status.uiSmokeMacosFinishedAt);
  printLine('uiSmokeMacosDuration', status.uiSmokeMacosDuration);
  printLine('uiSmokeMacosAge', status.uiSmokeMacosAge);
  printLine('uiSmokeMacosStale', status.uiSmokeMacosStale ? 'yes' : 'no');
  printLine('uiSmokeAllFinishedAt', status.uiSmokeAllFinishedAt);
  printLine('uiSmokeAllDuration', status.uiSmokeAllDuration);
  printLine('uiSmokeAllAge', status.uiSmokeAllAge);
  printLine('uiSmokeAllStale', status.uiSmokeAllStale ? 'yes' : 'no');
  printLine('uiSmokeVerifyCheckedAt', status.uiSmokeVerifyCheckedAt);
  printLine('uiSmokeVerifyMaxAgeMinutes', status.uiSmokeVerifyMaxAgeMinutes);
  printLine(
    'uiSmokeVerifyFailingSuites',
    status.uiSmokeVerifyFailingSuites.length > 0 ? status.uiSmokeVerifyFailingSuites.join(',') : '',
  );
  printLine('uiSmokeRerunFinishedAt', status.uiSmokeRerunFinishedAt);
  printLine('uiSmokeRerunDuration', status.uiSmokeRerunDuration);
  printLine(
    'uiSmokeRerunSelectedSuites',
    status.uiSmokeRerunSelectedSuites.length > 0 ? status.uiSmokeRerunSelectedSuites.join(',') : '',
  );
  printLine('uiSmokeRepairFinishedAt', status.uiSmokeRepairFinishedAt);
  printLine('uiSmokeRepairDuration', status.uiSmokeRepairDuration);
  printLine('manualSmokeOpenFinishedAt', status.manualSmokeOpenFinishedAt);
  printLine('manualSmokeOpenDuration', status.manualSmokeOpenDuration);
  printLine('manualSmokeOpenAge', status.manualSmokeOpenAge);
  printLine('manualSmokeOpenStale', status.manualSmokeOpenStale ? 'yes' : 'no');
  printLine('manualSmokeRefreshFinishedAt', status.manualSmokeRefreshFinishedAt);
  printLine('manualSmokeRefreshDuration', status.manualSmokeRefreshDuration);
  printLine('manualSmokeRefreshAge', status.manualSmokeRefreshAge);
  printLine('manualSmokeRefreshStale', status.manualSmokeRefreshStale ? 'yes' : 'no');
  printLine('manualSmokeBriefFinishedAt', status.manualSmokeBriefFinishedAt);
  printLine('manualSmokeBriefDuration', status.manualSmokeBriefDuration);
  printLine('manualSmokeBriefAge', status.manualSmokeBriefAge);
  printLine('manualSmokeBriefStale', status.manualSmokeBriefStale ? 'yes' : 'no');
  printLine('manualSmokeReportFinishedAt', status.manualSmokeReportFinishedAt);
  printLine('manualSmokeReportDuration', status.manualSmokeReportDuration);
  printLine('manualSmokeReportAge', status.manualSmokeReportAge);
  printLine('manualSmokeReportStale', status.manualSmokeReportStale ? 'yes' : 'no');
  printLine('manualSmokeStatusFinishedAt', status.manualSmokeStatusFinishedAt);
  printLine('manualSmokeStatusDuration', status.manualSmokeStatusDuration);
  printLine('manualSmokeStatusAge', status.manualSmokeStatusAge);
  printLine('manualSmokeStatusStale', status.manualSmokeStatusStale ? 'yes' : 'no');
  printLine(
    'uiSmokeRepairSelectedSuites',
    status.uiSmokeRepairSelectedSuites.length > 0 ? status.uiSmokeRepairSelectedSuites.join(',') : '',
  );
  printLine('uiSmokePlaywrightWebResultPath', status.uiSmokePlaywrightWebResultPath);
  printLine('uiSmokePlaywrightDesktopResultPath', status.uiSmokePlaywrightDesktopResultPath);
  printLine('uiSmokeMobileResultPath', status.uiSmokeMobileResultPath);
  printLine('uiSmokeMacosResultPath', status.uiSmokeMacosResultPath);
  printLine('uiSmokeAllResultPath', status.uiSmokeAllResultPath);
  printLine('uiSmokeVerifyResultPath', status.uiSmokeVerifyResultPath);
  printLine('uiSmokeRerunResultPath', status.uiSmokeRerunResultPath);
  printLine('uiSmokeRepairResultPath', status.uiSmokeRepairResultPath);
  printLine('manualSmokeOpenResultPath', status.manualSmokeOpenResultPath);
  printLine('manualSmokeRefreshResultPath', status.manualSmokeRefreshResultPath);
  printLine('manualSmokeBriefPath', status.manualSmokeBriefPath);
  printLine('manualSmokeBriefResultPath', status.manualSmokeBriefResultPath);
  printLine('manualSmokeReportPath', status.manualSmokeReportPath);
  printLine('manualSmokeReportResultPath', status.manualSmokeReportResultPath);
  printLine('manualSmokeReportMetadataPath', status.manualSmokeReportMetadataPath);
  printLine('manualSmokeStatusResultPath', status.manualSmokeStatusResultPath);
  printLine('manualSmokeHistoryPath', status.manualSmokeHistoryPath);
  printLine('manualSmokeLatestSnapshotPath', status.manualSmokeLatestSnapshotPath);
  printLine('manualSmokeLatestMetadataPath', status.manualSmokeLatestMetadataPath);
  printLine('manualSmokeSnapshotCount', status.manualSmokeSnapshotCount);
  printLine('manualSmokeDesktopCaptureCount', status.manualSmokeDesktopCaptureCount);
  printLine('manualSmokeMobileCaptureCount', status.manualSmokeMobileCaptureCount);

  if (!cache) {
    printLine('cachedQaData', 'missing');
    printLine('nextStep', 'Run the API E2E or harness regression once to repopulate .tmp caches.');
    return;
  }

  printLine('cachedQaData', 'present');
  printLine('communitySlug', status.communitySlug ?? '');
  printLine('channelId', status.channelId ?? '');
  printLine('harnessConversationId', status.harnessConversationId ?? '');
  printLine('webCommunity', status.webCommunity ?? '');
  printLine('webChannel', status.webChannel ?? '');
  printLine('webDm', status.webDm ?? '');
  printLine('desktopChannelDeepLink', status.desktopChannelDeepLink ?? '');
  printLine('desktopDmDeepLink', status.desktopDmDeepLink ?? '');
  printLine('desktopOpenChannelCommand', status.desktopOpenChannelCommand ?? '');
  printLine('desktopOpenDmCommand', status.desktopOpenDmCommand ?? '');
  printLine('mobileStandaloneBothCommand', status.mobileStandaloneBothCommand ?? '');
  printLine('mobileExpoBothCommand', status.mobileExpoBothCommand ?? '');
  printLine('mobileStandaloneOpenCommand', status.mobileStandaloneOpenCommand ?? '');
  printLine('userAEmail', status.userAEmail ?? '');
  printLine('userBEmail', status.userBEmail ?? '');
  printLine('userCEmail', status.userCEmail ?? '');
  printLine('hasPromotedCommunityFlow', boolLabel(Boolean(status.hasPromotedCommunityFlow)));
  printLine(
    'checks',
    Array.isArray(status.checks) ? status.checks.join(', ') : '',
  );
  printLine('checklistDoc', status.checklistDoc);
}

try {
  main();
} catch (error) {
  writeJsonFile(manualSmokeStatusResultPath, {
    ok: false,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    resultPath: manualSmokeStatusResultPath,
    error: serializeError(error),
  });
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
