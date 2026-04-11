import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const blockersPath = path.join(distDir, 'signing-blockers.json');
const snapshotPath = path.join(distDir, 'release-next.json');
const repoRoot = path.resolve(desktopDir, '..', '..');
const docsDir = path.join(repoRoot, 'docs');
const docsIndexPath = path.join(docsDir, 'README.md');
const currentStatusPath = path.join(docsDir, 'CURRENT_STATUS.md');
const repoSnapshotPath = path.join(docsDir, 'current-release-next.json');
const blockerSummaryPath = path.join(docsDir, 'current-blockers-2026-03-25.md');
const runtimeRunbookPath = path.join(docsDir, 'production-runtime-runbook.md');
const commercializationPlanPath = path.join(docsDir, 'COMMERCIALIZATION_PLAN.md');
const implementationPlanPath = path.join(docsDir, 'IMPLEMENTATION_PLAN.md');
const desktopReleasePath = path.join(desktopDir, 'RELEASE.md');
const wantsJson = process.argv.includes('--json');

function refreshBlockers() {
  execFileSync(process.execPath, [path.join(__dirname, 'release-signing-blockers.mjs'), '--quiet'], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

refreshBlockers();

const blockers = readJson(blockersPath);
const readiness = blockers && typeof blockers.readiness === 'object' ? blockers.readiness : {};
const blockerItems = Array.isArray(blockers?.blockers) ? blockers.blockers : [];
const nextSteps = Array.isArray(blockers?.nextSteps) ? blockers.nextSteps : [];
const primaryCommand = typeof blockers?.primaryCommand === 'string' ? blockers.primaryCommand : 'unknown';
const signingEnv = blockers && typeof blockers.signingEnv === 'object' ? blockers.signingEnv : {};
const paths = blockers && typeof blockers.paths === 'object' ? blockers.paths : {};

if (wantsJson) {
  const payload = {
    generatedAt: typeof blockers?.generatedAt === 'string' ? blockers.generatedAt : null,
    readiness: {
      macos: typeof readiness.macos === 'string' ? readiness.macos : 'unknown',
      windows: typeof readiness.windows === 'string' ? readiness.windows : 'unknown',
    },
    signingEnv: {
      exists: signingEnv.exists === true,
      loaded: signingEnv.loaded === true,
    },
    primaryCommand,
    blockers: blockerItems,
    nextSteps,
    reports: {
      markdown: typeof paths.markdown === 'string' ? paths.markdown : null,
      blockersJson: blockersPath,
      releaseStatus: typeof paths.releaseStatus === 'string' ? paths.releaseStatus : null,
    },
    commands: {
      next: 'npm run release:next',
      nextJson: 'npm run release:next -- --json',
      primary: primaryCommand,
      signed: 'npm run release:signed',
      envOverrideExample: 'ZKTALK_SIGNING_ENV_PATH=/absolute/path/to/signing.env npm run release:check:signed',
    },
    snapshots: {
      json: snapshotPath,
      blockersMarkdown: typeof paths.markdown === 'string' ? paths.markdown : null,
      blockersJson: blockersPath,
      releaseStatus: typeof paths.releaseStatus === 'string' ? paths.releaseStatus : null,
      signingEnv: typeof paths.signingEnv === 'string' ? paths.signingEnv : null,
      signingEnvExample:
        typeof paths.signingEnvExample === 'string' ? paths.signingEnvExample : null,
    },
    sourceOfTruth: {
      docsIndex: docsIndexPath,
      currentStatus: currentStatusPath,
      repoSnapshot: repoSnapshotPath,
      blockerSummary: blockerSummaryPath,
      runtimeRunbook: runtimeRunbookPath,
      commercializationPlan: commercializationPlanPath,
      implementationPlan: implementationPlanPath,
      desktopReleaseRunbook: desktopReleasePath,
    },
  };
  writeFileSync(snapshotPath, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

writeFileSync(
  snapshotPath,
  `${JSON.stringify({
    generatedAt: typeof blockers?.generatedAt === 'string' ? blockers.generatedAt : null,
    readiness: {
      macos: typeof readiness.macos === 'string' ? readiness.macos : 'unknown',
      windows: typeof readiness.windows === 'string' ? readiness.windows : 'unknown',
    },
    signingEnv: {
      exists: signingEnv.exists === true,
      loaded: signingEnv.loaded === true,
    },
    primaryCommand,
    blockers: blockerItems,
    nextSteps,
    reports: {
      markdown: typeof paths.markdown === 'string' ? paths.markdown : null,
      blockersJson: blockersPath,
      releaseStatus: typeof paths.releaseStatus === 'string' ? paths.releaseStatus : null,
    },
    commands: {
      next: 'npm run release:next',
      nextJson: 'npm run release:next -- --json',
      primary: primaryCommand,
      signed: 'npm run release:signed',
      envOverrideExample: 'ZKTALK_SIGNING_ENV_PATH=/absolute/path/to/signing.env npm run release:check:signed',
    },
    snapshots: {
      json: snapshotPath,
      blockersMarkdown: typeof paths.markdown === 'string' ? paths.markdown : null,
      blockersJson: blockersPath,
      releaseStatus: typeof paths.releaseStatus === 'string' ? paths.releaseStatus : null,
      signingEnv: typeof paths.signingEnv === 'string' ? paths.signingEnv : null,
      signingEnvExample:
        typeof paths.signingEnvExample === 'string' ? paths.signingEnvExample : null,
    },
    sourceOfTruth: {
      docsIndex: docsIndexPath,
      currentStatus: currentStatusPath,
      repoSnapshot: repoSnapshotPath,
      blockerSummary: blockerSummaryPath,
      runtimeRunbook: runtimeRunbookPath,
      commercializationPlan: commercializationPlanPath,
      implementationPlan: implementationPlanPath,
      desktopReleaseRunbook: desktopReleasePath,
    },
  }, null, 2)}\n`,
);

const lines = [
  'zkTalk desktop release next steps',
  '',
  `Generated at: ${typeof blockers?.generatedAt === 'string' ? blockers.generatedAt : 'unknown'}`,
  `macOS readiness: ${typeof readiness.macos === 'string' ? readiness.macos : 'unknown'}`,
  `Windows readiness: ${typeof readiness.windows === 'string' ? readiness.windows : 'unknown'}`,
  `Signing env exists: ${signingEnv.exists === true ? 'YES' : 'NO'}`,
  `Signing env loaded: ${signingEnv.loaded === true ? 'YES' : 'NO'}`,
  '',
  `Primary command: ${primaryCommand}`,
];

lines.push(
  '',
  'Commands:',
  '- npm run release:next',
  '- npm run release:next -- --json',
  `- ${primaryCommand}`,
  '- npm run release:signed',
  '- ZKTALK_SIGNING_ENV_PATH=/absolute/path/to/signing.env npm run release:check:signed',
);

if (blockerItems.length > 0) {
  lines.push('', 'Blocking items:');
  for (const item of blockerItems) {
    const platform = typeof item?.platform === 'string' ? item.platform : 'Unknown';
    const label = typeof item?.label === 'string' ? item.label : 'Unknown';
    const value = typeof item?.value === 'string' ? item.value : 'unknown';
    lines.push(`- ${platform}: ${label} = ${value}`);
  }
}

if (nextSteps.length > 0) {
  lines.push('', 'Next steps:');
  for (const step of nextSteps) {
    lines.push(`- ${step}`);
  }
}

if (typeof paths.markdown === 'string' || typeof paths.releaseStatus === 'string') {
  lines.push('', 'Reports:');
  if (typeof paths.markdown === 'string') {
    lines.push(`- Markdown: ${paths.markdown}`);
  }
  lines.push(`- Blockers JSON: ${blockersPath}`);
  if (typeof paths.releaseStatus === 'string') {
    lines.push(`- Release status: ${paths.releaseStatus}`);
  }
  if (typeof paths.signingEnv === 'string') {
    lines.push(`- Signing env: ${paths.signingEnv}`);
  }
  if (typeof paths.signingEnvExample === 'string') {
    lines.push(`- Signing env example: ${paths.signingEnvExample}`);
  }
  lines.push(`- Snapshot JSON: ${snapshotPath}`);
}

lines.push(
  '',
  'Source of truth:',
  `- Docs index: ${docsIndexPath}`,
  `- Current status: ${currentStatusPath}`,
  `- Repo release snapshot: ${repoSnapshotPath}`,
  `- Blocker summary: ${blockerSummaryPath}`,
  `- Runtime runbook: ${runtimeRunbookPath}`,
  `- Commercialization plan: ${commercializationPlanPath}`,
  `- Implementation plan: ${implementationPlanPath}`,
  `- Desktop release runbook: ${desktopReleasePath}`,
);

process.stdout.write(`${lines.join('\n')}\n`);
