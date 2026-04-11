#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { serializeError, writeJsonFile, writeTextFile } from './smoke-common.mjs';

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, '.tmp');
const briefPath = path.join(tmpDir, 'manual-smoke-brief-2026-03-27.md');
const briefLatestPath = path.join(tmpDir, 'manual-smoke-brief-latest.md');
const resultPath = path.join(tmpDir, 'manual-smoke-brief-last-result.json');
const manualSmokeStatusResultPath = path.join(tmpDir, 'manual-smoke-status-last-result.json');
const statusScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-status.mjs');
const desktopCachePath = path.join(tmpDir, 'desktop-harness-last-e2e.json');
const desktopResultPath = path.join(tmpDir, 'desktop-harness-last-result.json');
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
const manualSmokeOpenResultPath = path.join(tmpDir, 'manual-smoke-open-last-result.json');
const manualSmokeRefreshResultPath = path.join(tmpDir, 'manual-smoke-refresh-last-result.json');
const latestDesktopCapturePath = path.join(tmpDir, 'manual-smoke-desktop-latest.png');
const latestMobileCapturePath = path.join(tmpDir, 'manual-smoke-mobile-latest.png');
const resultStaleAfterMs = 24 * 60 * 60 * 1000;

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

function buildLine(label, value) {
  return `- ${label}: ${value}`;
}

function findFirstPid(pattern) {
  try {
    const output = execFileSync('pgrep', ['-f', pattern], { encoding: 'utf8' }).trim();
    return output.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  } catch {
    return '';
  }
}

function refreshStatusSnapshot() {
  try {
    return JSON.parse(
      execFileSync('node', [statusScriptPath, '--json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
  } catch {
    return null;
  }
}

function formatResultLabel(result) {
  if (!result) {
    return '(missing)';
  }
  return result.ok ? 'pass' : 'fail';
}

function formatDurationMs(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return '(missing)';
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
    return '(missing)';
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

function buildFreshnessLabel(result, resultPath) {
  const timestampMs = getResultTimestampMs(result, resultPath);
  if (!Number.isFinite(timestampMs)) {
    return '(missing)';
  }

  const ageMs = Math.max(0, Date.now() - timestampMs);
  const stale = ageMs > resultStaleAfterMs;
  return `${stale ? 'stale' : 'fresh'} (${formatAgeMs(ageMs)} old)`;
}

function buildBrief(cache) {
  const communitySlug = cache.communitySlug ?? '';
  const channelId = cache.channelId ?? '';
  const harnessConversationId = cache.harnessConversationId ?? cache.conversationId ?? '';
  const webCommunity = communitySlug ? `http://localhost:3000/communities/${communitySlug}` : '';
  const webChannel =
    communitySlug && channelId
      ? `http://localhost:3000/communities/${communitySlug}/channels/${channelId}`
      : '';
  const webDm = harnessConversationId ? `http://localhost:3000/dm/${harnessConversationId}` : '';
  const desktopChannelDeepLink = (() => {
    if (!cache.userB?.sessionToken || !communitySlug || !channelId) return '(missing)';
    const params = new URLSearchParams({
      mode: 'channel',
      sessionToken: cache.userB.sessionToken,
      communitySlug,
      channelId,
      body: 'manual smoke desktop channel',
      nonce: `manual-${Date.now()}-channel`,
    });
    return `zktalk://desktop-harness?${params.toString()}`;
  })();
  const desktopDmDeepLink = (() => {
    const sessionToken = cache.dmHarnessSender?.sessionToken ?? cache.userC?.sessionToken;
    if (!sessionToken || !harnessConversationId) return '(missing)';
    const params = new URLSearchParams({
      mode: 'dm',
      sessionToken,
      conversationId: harnessConversationId,
      body: 'manual smoke desktop dm',
      nonce: `manual-${Date.now()}-dm`,
    });
    return `zktalk://desktop-harness?${params.toString()}`;
  })();
  const desktopOpenChannelCommand =
    desktopChannelDeepLink === '(missing)'
      ? '(missing)'
      : `cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/open-desktop-protocol.mjs --url '${desktopChannelDeepLink}'`;
  const desktopOpenDmCommand =
    desktopDmDeepLink === '(missing)'
      ? '(missing)'
      : `cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/open-desktop-protocol.mjs --url '${desktopDmDeepLink}'`;
  const mobileStandaloneBothCommand =
    'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/mobile-harness-regression.mjs --app standalone --mode both --launch';
  const mobileExpoBothCommand =
    'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/mobile-harness-regression.mjs --app expo --mode both --launch';
  const mobileStandaloneOpenCommand =
    'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/launch-mobile-simulator-app.mjs --app standalone --clean-harness';
  const desktopPackagedPid = findFirstPid('zkTalk.app/Contents/MacOS/zkTalk');
  const desktopDevPid = findFirstPid('apps/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
  const desktopResult = readJsonIfExists(desktopResultPath);
  const desktopMode = desktopDevPid ? 'dev-reused' : desktopPackagedPid ? 'packaged' : 'not-running';
  const desktopRecommendedOpenCommand = desktopDevPid
    ? 'cd /Users/hyunokoh/Documents/Projects/zkTalk && node ./scripts/manual-smoke-open.mjs --no-web --no-mobile --no-doc'
    : 'open /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/mac-arm64/zkTalk.app';
  const desktopLatestCapture = fs.existsSync(latestDesktopCapturePath) ? latestDesktopCapturePath : '(missing)';
  const mobileLatestCapture = fs.existsSync(latestMobileCapturePath) ? latestMobileCapturePath : '(missing)';
  const uiSmokePlaywrightWebResult = readJsonIfExists(uiSmokePlaywrightWebResultPath);
  const uiSmokePlaywrightDesktopResult = readJsonIfExists(uiSmokePlaywrightDesktopResultPath);
  const uiSmokeMobileResult = readJsonIfExists(uiSmokeMobileResultPath);
  const uiSmokeMacosResult = readJsonIfExists(uiSmokeMacosResultPath);
  const uiSmokeAllResult = readJsonIfExists(uiSmokeAllResultPath);
  const uiSmokeVerifyResult = readJsonIfExists(uiSmokeVerifyResultPath);
  const uiSmokeRerunResult = readJsonIfExists(uiSmokeRerunResultPath);
  const uiSmokeRepairResult = readJsonIfExists(uiSmokeRepairResultPath);
  const manualSmokeStatusResult = readJsonIfExists(manualSmokeStatusResultPath);
  const manualSmokeOpenResult = readJsonIfExists(manualSmokeOpenResultPath);
  const manualSmokeRefreshResult = readJsonIfExists(manualSmokeRefreshResultPath);

  return `# zkTalk Manual Smoke Brief

Generated from current cached QA data.

## Runtime

${buildLine('Web login', 'http://localhost:3000/login')}
${buildLine('Web home', 'http://localhost:3000/home')}
${buildLine('API health', 'http://localhost:4000/api/health')}
${buildLine('Desktop app', '/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/mac-arm64/zkTalk.app')}
${buildLine('Desktop mode', desktopMode)}
${buildLine('Desktop packaged PID', desktopPackagedPid || '(missing)')}
${buildLine('Desktop dev PID', desktopDevPid || '(missing)')}
${buildLine('Desktop regression mode', desktopResult?.desktopMode || '(missing)')}
${buildLine('Desktop regression channel', desktopResult?.channelVerified ? 'verified' : '(missing)')}
${buildLine('Desktop regression DM', desktopResult?.dmVerified ? 'verified' : '(missing)')}
${buildLine('Desktop recommended open', desktopRecommendedOpenCommand)}
${buildLine('Desktop latest capture', desktopLatestCapture)}
${buildLine('Mobile device', 'iPhone 15 simulator (booted)')}
${buildLine('Mobile latest capture', mobileLatestCapture)}

## Last UI smoke results

${buildLine('Playwright web', formatResultLabel(uiSmokePlaywrightWebResult))}
${buildLine('Playwright web finished', uiSmokePlaywrightWebResult?.finishedAt ?? '(missing)')}
${buildLine('Playwright web duration', formatDurationMs(uiSmokePlaywrightWebResult?.durationMs))}
${buildLine('Playwright web freshness', buildFreshnessLabel(uiSmokePlaywrightWebResult, uiSmokePlaywrightWebResultPath))}
${buildLine('Playwright desktop', formatResultLabel(uiSmokePlaywrightDesktopResult))}
${buildLine('Playwright desktop finished', uiSmokePlaywrightDesktopResult?.finishedAt ?? '(missing)')}
${buildLine('Playwright desktop duration', formatDurationMs(uiSmokePlaywrightDesktopResult?.durationMs))}
${buildLine('Playwright desktop freshness', buildFreshnessLabel(uiSmokePlaywrightDesktopResult, uiSmokePlaywrightDesktopResultPath))}
${buildLine('Mobile wrapper', formatResultLabel(uiSmokeMobileResult))}
${buildLine('Mobile wrapper finished', uiSmokeMobileResult?.finishedAt ?? '(missing)')}
${buildLine('Mobile wrapper duration', formatDurationMs(uiSmokeMobileResult?.durationMs))}
${buildLine('Mobile wrapper freshness', buildFreshnessLabel(uiSmokeMobileResult, uiSmokeMobileResultPath))}
${buildLine('macOS wrapper', formatResultLabel(uiSmokeMacosResult))}
${buildLine('macOS wrapper finished', uiSmokeMacosResult?.finishedAt ?? '(missing)')}
${buildLine('macOS wrapper duration', formatDurationMs(uiSmokeMacosResult?.durationMs))}
${buildLine('macOS wrapper freshness', buildFreshnessLabel(uiSmokeMacosResult, uiSmokeMacosResultPath))}
${buildLine('Full UI smoke', formatResultLabel(uiSmokeAllResult))}
${buildLine('Full UI smoke finished', uiSmokeAllResult?.finishedAt ?? '(missing)')}
${buildLine('Full UI smoke duration', formatDurationMs(uiSmokeAllResult?.durationMs))}
${buildLine('Full UI smoke freshness', buildFreshnessLabel(uiSmokeAllResult, uiSmokeAllResultPath))}
${buildLine('Verify gate', formatResultLabel(uiSmokeVerifyResult))}
${buildLine('Verify gate checked', uiSmokeVerifyResult?.checkedAt ?? '(missing)')}
${buildLine(
  'Verify gate max age',
  typeof uiSmokeVerifyResult?.maxAgeMinutes === 'number'
    ? `${uiSmokeVerifyResult.maxAgeMinutes}m`
    : '(missing)',
)}
${buildLine(
  'Verify gate failing suites',
  Array.isArray(uiSmokeVerifyResult?.failingSuites) && uiSmokeVerifyResult.failingSuites.length > 0
    ? uiSmokeVerifyResult.failingSuites.join(', ')
    : '(none)',
)}
${buildLine('Rerun helper', formatResultLabel(uiSmokeRerunResult))}
${buildLine('Rerun helper finished', uiSmokeRerunResult?.finishedAt ?? '(missing)')}
${buildLine('Rerun helper duration', formatDurationMs(uiSmokeRerunResult?.durationMs))}
${buildLine(
  'Rerun helper selected suites',
  Array.isArray(uiSmokeRerunResult?.selectedSuites) && uiSmokeRerunResult.selectedSuites.length > 0
    ? uiSmokeRerunResult.selectedSuites.join(', ')
    : '(none)',
)}
${buildLine('Repair loop', formatResultLabel(uiSmokeRepairResult))}
${buildLine('Repair loop finished', uiSmokeRepairResult?.finishedAt ?? '(missing)')}
${buildLine('Repair loop duration', formatDurationMs(uiSmokeRepairResult?.durationMs))}
${buildLine(
  'Repair loop selected suites',
  Array.isArray(uiSmokeRepairResult?.rerun?.selectedSuites) && uiSmokeRepairResult.rerun.selectedSuites.length > 0
    ? uiSmokeRepairResult.rerun.selectedSuites.join(', ')
    : '(none)',
)}
${buildLine('Playwright web result file', fs.existsSync(uiSmokePlaywrightWebResultPath) ? uiSmokePlaywrightWebResultPath : '(missing)')}
${buildLine('Playwright desktop result file', fs.existsSync(uiSmokePlaywrightDesktopResultPath) ? uiSmokePlaywrightDesktopResultPath : '(missing)')}
${buildLine('Mobile wrapper result file', fs.existsSync(uiSmokeMobileResultPath) ? uiSmokeMobileResultPath : '(missing)')}
${buildLine('macOS wrapper result file', fs.existsSync(uiSmokeMacosResultPath) ? uiSmokeMacosResultPath : '(missing)')}
${buildLine('Full UI smoke result file', fs.existsSync(uiSmokeAllResultPath) ? uiSmokeAllResultPath : '(missing)')}
${buildLine('Verify gate result file', fs.existsSync(uiSmokeVerifyResultPath) ? uiSmokeVerifyResultPath : '(missing)')}
${buildLine('Rerun helper result file', fs.existsSync(uiSmokeRerunResultPath) ? uiSmokeRerunResultPath : '(missing)')}
${buildLine('Repair loop result file', fs.existsSync(uiSmokeRepairResultPath) ? uiSmokeRepairResultPath : '(missing)')}

## Manual workspace helpers

${buildLine('Manual status', formatResultLabel(manualSmokeStatusResult))}
${buildLine('Manual status finished', manualSmokeStatusResult?.finishedAt ?? '(missing)')}
${buildLine('Manual status duration', formatDurationMs(manualSmokeStatusResult?.durationMs))}
${buildLine('Manual status freshness', buildFreshnessLabel(manualSmokeStatusResult, manualSmokeStatusResultPath))}
${buildLine('Manual status result file', fs.existsSync(manualSmokeStatusResultPath) ? manualSmokeStatusResultPath : '(missing)')}
${buildLine('Manual open', formatResultLabel(manualSmokeOpenResult))}
${buildLine('Manual open finished', manualSmokeOpenResult?.finishedAt ?? '(missing)')}
${buildLine('Manual open duration', formatDurationMs(manualSmokeOpenResult?.durationMs))}
${buildLine('Manual open freshness', buildFreshnessLabel(manualSmokeOpenResult, manualSmokeOpenResultPath))}
${buildLine('Manual open result file', fs.existsSync(manualSmokeOpenResultPath) ? manualSmokeOpenResultPath : '(missing)')}
${buildLine('Manual refresh', formatResultLabel(manualSmokeRefreshResult))}
${buildLine('Manual refresh finished', manualSmokeRefreshResult?.finishedAt ?? '(missing)')}
${buildLine('Manual refresh duration', formatDurationMs(manualSmokeRefreshResult?.durationMs))}
${buildLine('Manual refresh freshness', buildFreshnessLabel(manualSmokeRefreshResult, manualSmokeRefreshResultPath))}
${buildLine('Manual refresh result file', fs.existsSync(manualSmokeRefreshResultPath) ? manualSmokeRefreshResultPath : '(missing)')}

## QA users

${buildLine('User A', cache.userA?.email ?? '')}
${buildLine('User B', cache.userB?.email ?? '')}
${buildLine('User C', cache.userC?.email ?? '')}

## Direct targets

${buildLine('Community', webCommunity || '(missing)')}
${buildLine('Channel', webChannel || '(missing)')}
${buildLine('DM', webDm || '(missing)')}

## Desktop deep links

${buildLine('Channel deep link', desktopChannelDeepLink)}
${buildLine('DM deep link', desktopDmDeepLink)}

## Ready-to-run commands

${buildLine('Desktop channel open', desktopOpenChannelCommand)}
${buildLine('Desktop DM open', desktopOpenDmCommand)}
${buildLine('Mobile standalone both', mobileStandaloneBothCommand)}
${buildLine('Mobile Expo both', mobileExpoBothCommand)}
${buildLine('Mobile standalone open', mobileStandaloneOpenCommand)}

## IDs

${buildLine('communitySlug', communitySlug || '(missing)')}
${buildLine('channelId', channelId || '(missing)')}
${buildLine('harnessConversationId', harnessConversationId || '(missing)')}

## References

${buildLine('Manual smoke report', fs.existsSync(path.join(tmpDir, 'manual-smoke-report-latest.md')) ? path.join(tmpDir, 'manual-smoke-report-latest.md') : '(missing)')}
${buildLine('Manual smoke report result', fs.existsSync(path.join(tmpDir, 'manual-smoke-report-last-result.json')) ? path.join(tmpDir, 'manual-smoke-report-last-result.json') : '(missing)')}
${buildLine('Manual smoke report metadata', fs.existsSync(path.join(tmpDir, 'manual-smoke-report-latest.json')) ? path.join(tmpDir, 'manual-smoke-report-latest.json') : '(missing)')}
${buildLine('Manual smoke history', fs.existsSync(path.join(tmpDir, 'manual-smoke-history.md')) ? path.join(tmpDir, 'manual-smoke-history.md') : '(missing)')}
${buildLine('Manual smoke open result', fs.existsSync(manualSmokeOpenResultPath) ? manualSmokeOpenResultPath : '(missing)')}
${buildLine('Manual smoke refresh result', fs.existsSync(manualSmokeRefreshResultPath) ? manualSmokeRefreshResultPath : '(missing)')}
${buildLine('Manual smoke status result', fs.existsSync(manualSmokeStatusResultPath) ? manualSmokeStatusResultPath : '(missing)')}
${buildLine('Checklist', '/Users/hyunokoh/Documents/Projects/zkTalk/docs/manual-smoke-checklist-2026-03-27.md')}
${buildLine('Test matrix', '/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md')}
`;
}

const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();

function main() {
  const cache = getPrimaryCache();
  if (!cache) {
    throw new Error('No cached QA data found. Run the harness regression once first.');
  }

  fs.mkdirSync(tmpDir, { recursive: true });
  refreshStatusSnapshot();
  const markdown = buildBrief(cache);
  writeTextFile(briefPath, markdown);
  writeTextFile(briefLatestPath, markdown);
  const payload = {
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    resultPath,
    briefPath,
    briefLatestPath,
    statusResultPath: manualSmokeStatusResultPath,
  };
  writeJsonFile(resultPath, payload);

  console.log(JSON.stringify(payload, null, 2));
}

try {
  main();
} catch (error) {
  writeJsonFile(resultPath, {
    ok: false,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    resultPath,
    briefPath,
    briefLatestPath,
    statusResultPath: manualSmokeStatusResultPath,
    error: serializeError(error),
  });
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
