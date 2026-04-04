#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serializeError, writeJsonFile, writeTextFile } from './smoke-common.mjs';

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, '.tmp');
const reportPath = path.join(tmpDir, 'manual-smoke-report-latest.md');
const metadataLatestPath = path.join(tmpDir, 'manual-smoke-report-latest.json');
const historyPath = path.join(tmpDir, 'manual-smoke-history.md');
const resultPath = path.join(tmpDir, 'manual-smoke-report-last-result.json');
const statusScriptPath = path.join(rootDir, 'scripts', 'manual-smoke-status.mjs');
const briefPath = path.join(tmpDir, 'manual-smoke-brief-latest.md');
const briefResultPath = path.join(tmpDir, 'manual-smoke-brief-last-result.json');
const statusResultPath = path.join(tmpDir, 'manual-smoke-status-last-result.json');
const openResultPath = path.join(tmpDir, 'manual-smoke-open-last-result.json');
const refreshResultPath = path.join(tmpDir, 'manual-smoke-refresh-last-result.json');
const maxHistoryEntries = 10;
const maxStoredSnapshots = 15;

function buildTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function runJson(command, args) {
  return JSON.parse(
    execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
}

function buildLine(label, value) {
  return `- ${label}: ${value || '(missing)'}`;
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

function buildMetadata(status, generatedAt, snapshotPath) {
  return {
    generatedAt,
    snapshotPath,
    desktopMode: status.desktopMode || '',
    desktopRegressionMode: status.desktopRegressionMode || '',
    desktopRegressionChannelVerified: Boolean(status.desktopRegressionChannelVerified),
    desktopRegressionDmVerified: Boolean(status.desktopRegressionDmVerified),
    desktopPackagedPid: status.desktopPackagedPid || '',
    desktopDevPid: status.desktopDevPid || '',
    desktopLatestCapture: status.desktopLatestCapture || '',
    mobileLatestCapture: status.mobileLatestCapture || '',
    manualSmokeCaptureMethod: status.manualSmokeCaptureMethod || '',
    manualSmokeDeletedCaptureCount: status.manualSmokeDeletedCaptureCount || '',
    manualSmokeDesktopCaptureCount: status.manualSmokeDesktopCaptureCount || '',
    manualSmokeMobileCaptureCount: status.manualSmokeMobileCaptureCount || '',
    communitySlug: status.communitySlug || '',
    channelId: status.channelId || '',
    harnessConversationId: status.harnessConversationId || '',
    webChannel: status.webChannel || '',
    webDm: status.webDm || '',
    userAEmail: status.userAEmail || '',
    userBEmail: status.userBEmail || '',
    userCEmail: status.userCEmail || '',
    uiSmokeAll: status.uiSmokeAll || '',
    uiSmokeAllAge: status.uiSmokeAllAge || '',
    uiSmokeVerify: status.uiSmokeVerify || '',
    uiSmokeVerifyCheckedAt: status.uiSmokeVerifyCheckedAt || '',
    uiSmokeVerifyFailingSuites: Array.isArray(status.uiSmokeVerifyFailingSuites)
      ? status.uiSmokeVerifyFailingSuites
      : [],
    uiSmokeRepair: status.uiSmokeRepair || '',
    uiSmokeRepairSelectedSuites: Array.isArray(status.uiSmokeRepairSelectedSuites)
      ? status.uiSmokeRepairSelectedSuites
      : [],
    manualSmokeStatus: status.manualSmokeStatus || '',
    manualSmokeStatusFinishedAt: status.manualSmokeStatusFinishedAt || '',
    manualSmokeStatusDuration: status.manualSmokeStatusDuration || '',
    manualSmokeStatusResultPath: status.manualSmokeStatusResultPath || '',
    manualSmokeOpen: status.manualSmokeOpen || '',
    manualSmokeOpenFinishedAt: status.manualSmokeOpenFinishedAt || '',
    manualSmokeOpenDuration: status.manualSmokeOpenDuration || '',
    manualSmokeOpenResultPath: status.manualSmokeOpenResultPath || '',
    manualSmokeRefresh: status.manualSmokeRefresh || '',
    manualSmokeRefreshFinishedAt: status.manualSmokeRefreshFinishedAt || '',
    manualSmokeRefreshDuration: status.manualSmokeRefreshDuration || '',
    manualSmokeRefreshResultPath: status.manualSmokeRefreshResultPath || '',
    manualSmokeBrief: status.manualSmokeBrief || '',
    manualSmokeBriefFinishedAt: status.manualSmokeBriefFinishedAt || '',
    manualSmokeBriefDuration: status.manualSmokeBriefDuration || '',
    manualSmokeBriefResultPath: status.manualSmokeBriefResultPath || '',
    manualSmokeReport: status.manualSmokeReport || '',
    manualSmokeReportFinishedAt: status.manualSmokeReportFinishedAt || '',
    manualSmokeReportDuration: status.manualSmokeReportDuration || '',
    manualSmokeReportResultPath: status.manualSmokeReportResultPath || '',
  };
}

function buildReport(status, generatedAt) {
  const checks = Array.isArray(status.checks) ? status.checks : [];
  const desktopCapture = status.desktopLatestCapture || '';
  const mobileCapture = status.mobileLatestCapture || '';

  return `# zkTalk Manual Smoke Report

Generated: ${generatedAt}

## Runtime

${buildLine('Desktop mode', status.desktopMode)}
${buildLine('Desktop regression mode', status.desktopRegressionMode)}
${buildLine('Desktop regression channel', status.desktopRegressionChannelVerified ? 'verified' : '')}
${buildLine('Desktop regression DM', status.desktopRegressionDmVerified ? 'verified' : '')}
${buildLine('Desktop packaged PID', status.desktopPackagedPid)}
${buildLine('Desktop dev PID', status.desktopDevPid)}
${buildLine('Desktop recommended open', status.desktopRecommendedOpenCommand)}
${buildLine('Web login', status.webLogin)}
${buildLine('Web home', status.webHome)}
${buildLine('API health', status.apiHealth)}
${buildLine('Mobile device', status.mobileDevice)}

## UI smoke

${buildLine('Playwright web', status.uiSmokePlaywrightWeb)}
${buildLine('Playwright web freshness', status.uiSmokePlaywrightWebAge ? `${status.uiSmokePlaywrightWebAge} old` : '')}
${buildLine('Playwright desktop', status.uiSmokePlaywrightDesktop)}
${buildLine('Playwright desktop freshness', status.uiSmokePlaywrightDesktopAge ? `${status.uiSmokePlaywrightDesktopAge} old` : '')}
${buildLine('Mobile wrapper', status.uiSmokeMobile)}
${buildLine('Mobile wrapper freshness', status.uiSmokeMobileAge ? `${status.uiSmokeMobileAge} old` : '')}
${buildLine('macOS wrapper', status.uiSmokeMacos)}
${buildLine('macOS wrapper freshness', status.uiSmokeMacosAge ? `${status.uiSmokeMacosAge} old` : '')}
${buildLine('Full UI smoke', status.uiSmokeAll)}
${buildLine('Full UI smoke freshness', status.uiSmokeAllAge ? `${status.uiSmokeAllAge} old` : '')}
${buildLine('Verify gate', status.uiSmokeVerify)}
${buildLine('Verify gate checked', status.uiSmokeVerifyCheckedAt)}
${buildLine(
  'Verify gate failing suites',
  Array.isArray(status.uiSmokeVerifyFailingSuites) && status.uiSmokeVerifyFailingSuites.length > 0
    ? status.uiSmokeVerifyFailingSuites.join(', ')
    : '(none)',
)}
${buildLine('Manual status helper', status.manualSmokeStatus)}
${buildLine('Manual status freshness', status.manualSmokeStatusAge ? `${status.manualSmokeStatusAge} old` : '')}
${buildLine('Manual open helper', status.manualSmokeOpen)}
${buildLine('Manual open freshness', status.manualSmokeOpenAge ? `${status.manualSmokeOpenAge} old` : '')}
${buildLine('Manual refresh helper', status.manualSmokeRefresh)}
${buildLine('Manual refresh freshness', status.manualSmokeRefreshAge ? `${status.manualSmokeRefreshAge} old` : '')}
${buildLine('Repair loop', status.uiSmokeRepair)}
${buildLine(
  'Repair loop selected suites',
  Array.isArray(status.uiSmokeRepairSelectedSuites) && status.uiSmokeRepairSelectedSuites.length > 0
    ? status.uiSmokeRepairSelectedSuites.join(', ')
    : '(none)',
)}

## Latest captures

${buildLine('Desktop latest capture', status.desktopLatestCapture)}
${buildLine('Mobile latest capture', status.mobileLatestCapture)}
${buildLine('Capture method', status.manualSmokeCaptureMethod)}
${buildLine('Deleted captures this run', status.manualSmokeDeletedCaptureCount)}
${buildLine('Stored desktop captures', status.manualSmokeDesktopCaptureCount)}
${buildLine('Stored mobile captures', status.manualSmokeMobileCaptureCount)}

${desktopCapture ? `### Desktop snapshot\n\n![Desktop QA](${desktopCapture})\n` : ''}
${mobileCapture ? `### Mobile snapshot\n\n![Mobile QA](${mobileCapture})\n` : ''}

## Cached QA targets

${buildLine('communitySlug', status.communitySlug)}
${buildLine('channelId', status.channelId)}
${buildLine('harnessConversationId', status.harnessConversationId)}
${buildLine('Web community', status.webCommunity)}
${buildLine('Web channel', status.webChannel)}
${buildLine('Web DM', status.webDm)}

## Ready-to-run commands

${buildLine('Desktop open channel', status.desktopOpenChannelCommand)}
${buildLine('Desktop open DM', status.desktopOpenDmCommand)}
${buildLine('Mobile standalone open', status.mobileStandaloneOpenCommand)}
${buildLine('Mobile standalone both', status.mobileStandaloneBothCommand)}
${buildLine('Mobile Expo both', status.mobileExpoBothCommand)}

## QA users

${buildLine('User A', status.userAEmail)}
${buildLine('User B', status.userBEmail)}
${buildLine('User C', status.userCEmail)}

## Checks in cache

${checks.length ? checks.map((check) => `- ${check}`).join('\n') : '- (missing)'}

## References

${buildLine('Brief', fs.existsSync(briefPath) ? briefPath : '')}
${buildLine('Brief result', briefResultPath)}
${buildLine('Status result', fs.existsSync(statusResultPath) ? statusResultPath : '')}
${buildLine('Manual open result', fs.existsSync(openResultPath) ? openResultPath : '')}
${buildLine('Manual refresh result', fs.existsSync(refreshResultPath) ? refreshResultPath : '')}
${buildLine('Report result', resultPath)}
${buildLine('Report metadata', fs.existsSync(metadataLatestPath) ? metadataLatestPath : '')}
${buildLine('Checklist', '/Users/hyunokoh/Documents/Projects/zkTalk/docs/manual-smoke-checklist-2026-03-27.md')}
`;
}

function readMetadata(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function listTimestampedReportGroups() {
  const groups = new Map();

  for (const entry of fs.readdirSync(tmpDir)) {
    const match = entry.match(/^(manual-smoke-report-20\d\d-.*)\.(md|json)$/);
    if (!match) {
      continue;
    }

    const [, stem, extension] = match;
    const group = groups.get(stem) ?? {
      stem,
      md: null,
      json: null,
    };
    group[extension] = path.join(tmpDir, entry);
    groups.set(stem, group);
  }

  return Array.from(groups.values()).sort((left, right) => right.stem.localeCompare(left.stem));
}

function pruneTimestampedReports() {
  const deletedPaths = [];
  const groups = listTimestampedReportGroups();
  const completeGroups = groups.filter((group) => group.md && group.json);
  const incompleteGroups = groups.filter((group) => !group.md || !group.json);
  const staleGroups = [...completeGroups.slice(maxStoredSnapshots), ...incompleteGroups];

  for (const group of staleGroups) {
    for (const targetPath of [group.md, group.json].filter(Boolean)) {
      try {
        fs.unlinkSync(targetPath);
        deletedPaths.push(targetPath);
      } catch {
        // Ignore cleanup failures for old temp artifacts.
      }
    }
  }

  return deletedPaths;
}

function buildHistory(metadataEntries) {
  const lines = metadataEntries.map((entry) => {
    const generatedAt = escapePipe(entry.generatedAt || '');
    const desktopMode = escapePipe(entry.desktopMode || '');
    const uiSmokeAll = escapePipe(entry.uiSmokeAll || '');
    const uiSmokeVerify = escapePipe(entry.uiSmokeVerify || '');
    const uiSmokeRepair = escapePipe(entry.uiSmokeRepair || '');
    const manualSmokeStatus = escapePipe(entry.manualSmokeStatus || '');
    const manualSmokeOpen = escapePipe(entry.manualSmokeOpen || '');
    const manualSmokeRefresh = escapePipe(entry.manualSmokeRefresh || '');
    const manualSmokeBrief = escapePipe(entry.manualSmokeBrief || '');
    const manualSmokeReport = escapePipe(entry.manualSmokeReport || '');
    const communitySlug = escapePipe(entry.communitySlug || '');
    const channelId = escapePipe(entry.channelId || '');
    const reportLabel = escapePipe(path.basename(entry.snapshotPath || ''));
    return `| ${generatedAt || '(missing)'} | ${desktopMode || '(missing)'} | ${uiSmokeAll || '(missing)'} | ${uiSmokeVerify || '(missing)'} | ${uiSmokeRepair || '(missing)'} | ${manualSmokeStatus || '(missing)'} | ${manualSmokeOpen || '(missing)'} | ${manualSmokeRefresh || '(missing)'} | ${manualSmokeBrief || '(missing)'} | ${manualSmokeReport || '(missing)'} | ${communitySlug || '(missing)'} | ${channelId || '(missing)'} | [${reportLabel || 'report'}](${entry.snapshotPath || ''}) |`;
  });

  return `# zkTalk Manual Smoke History

Recent timestamped QA reports.

| Generated | Desktop mode | Full UI smoke | Verify | Repair | Status | Open | Refresh | Brief | Report | Community | Channel | Snapshot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${lines.length ? lines.join('\n') : '| (missing) | (missing) | (missing) | (missing) | (missing) | (missing) | (missing) | (missing) | (missing) | (missing) | (missing) | (missing) | (missing) |'}
`;
}

const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();

function main() {
  fs.mkdirSync(tmpDir, { recursive: true });
  const status = runJson('node', [statusScriptPath, '--json']);
  const generatedAt = new Date().toISOString();
  const stamp = buildTimestamp();
  const markdown = buildReport(status, generatedAt);
  const snapshotPath = path.join(tmpDir, `manual-smoke-report-${stamp}.md`);
  const metadataPath = path.join(tmpDir, `manual-smoke-report-${stamp}.json`);
  const metadata = buildMetadata(status, generatedAt, snapshotPath);
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAtMs;
  const enrichedMetadata = {
    ...metadata,
    manualSmokeReport: 'pass',
    manualSmokeReportFinishedAt: finishedAt,
    manualSmokeReportDuration: formatDurationMs(durationMs),
    manualSmokeReportResultPath: resultPath,
  };
  writeTextFile(snapshotPath, markdown);
  writeJsonFile(metadataPath, enrichedMetadata);
  writeTextFile(reportPath, markdown);
  writeJsonFile(metadataLatestPath, enrichedMetadata);
  const deletedPaths = pruneTimestampedReports();
  const timestampedJsonEntries = fs
    .readdirSync(tmpDir)
    .filter((entry) => /^manual-smoke-report-20\d\d-.*\.json$/.test(entry))
    .sort()
    .reverse();
  const timestampedMarkdownEntries = fs
    .readdirSync(tmpDir)
    .filter((entry) => /^manual-smoke-report-20\d\d-.*\.md$/.test(entry))
    .sort()
    .reverse();
  const metadataEntries = timestampedJsonEntries
    .slice(0, maxHistoryEntries)
    .map((entry) => readMetadata(path.join(tmpDir, entry)))
    .filter(Boolean);
  writeTextFile(historyPath, buildHistory(metadataEntries));
  const payload = {
    ok: true,
    startedAt,
    finishedAt,
    durationMs,
    resultPath,
    reportPath,
    metadataLatestPath,
    snapshotPath,
    metadataPath,
    historyPath,
    latestSnapshotPath: timestampedMarkdownEntries[0]
      ? path.join(tmpDir, timestampedMarkdownEntries[0])
      : snapshotPath,
    latestMetadataPath: timestampedJsonEntries[0]
      ? path.join(tmpDir, timestampedJsonEntries[0])
      : metadataPath,
    snapshotCount: timestampedMarkdownEntries.length,
    metadataCount: timestampedJsonEntries.length,
    deletedPaths,
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
    reportPath,
    metadataLatestPath,
    historyPath,
    error: serializeError(error),
  });
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
