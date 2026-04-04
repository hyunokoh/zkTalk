import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const statusPath = path.join(distDir, 'release-status.json');
const signingBlockersPath = path.join(distDir, 'signing-blockers.md');
const signingBlockersJsonPath = path.join(distDir, 'signing-blockers.json');
const signingEnvPath = path.join(desktopDir, 'signing.env');
const signingEnvExamplePath = path.join(desktopDir, 'SIGNING.example.env');
const isQuiet = process.argv.includes('--quiet');

function refreshStatus() {
  const args = [path.join(__dirname, 'release-status.mjs')];
  if (isQuiet) {
    args.push('--quiet');
  }

  execFileSync(process.execPath, args, {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

function getPrimaryCommand(summary, signingEnvExists, signingEnvLoaded) {
  if (!signingEnvExists || !signingEnvLoaded) {
    return 'npm run release:init-signing';
  }

  if (summary?.macos === 'READY' && summary?.windows === 'READY') {
    return 'npm run release:signed';
  }

  return 'npm run release:check:signed';
}

refreshStatus();

const status = JSON.parse(readFileSync(statusPath, 'utf8'));
const summary = status && typeof status.summary === 'object' ? status.summary : {};
const sections = status && typeof status.sections === 'object' ? status.sections : {};
const signingEnv = status && typeof status.signingEnv === 'object' ? status.signingEnv : {};
const nextSteps = Array.isArray(status?.nextSteps)
  ? status.nextSteps.filter((step) => typeof step === 'string' && step.length > 0)
  : [];
const hasSigningEnv = existsSync(signingEnvPath);
const signingEnvExists = signingEnv.exists === true;
const signingEnvLoaded = signingEnv.loaded === true;
const primaryCommand = getPrimaryCommand(summary, signingEnvExists || hasSigningEnv, signingEnvLoaded);

const blockingLines = [];
const blockingItems = [];
for (const [platformName, items] of Object.entries({
  macOS: Array.isArray(sections.macos) ? sections.macos : [],
  Windows: Array.isArray(sections.windows) ? sections.windows : [],
})) {
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const label = typeof item.label === 'string' ? item.label : 'Unknown';
    const value = typeof item.value === 'string' ? item.value : 'unknown';
    if (value === 'OK') {
      continue;
    }

    blockingLines.push(`- ${platformName}: ${label} = ${value}`);
    blockingItems.push({
      platform: platformName,
      label,
      value,
    });
  }
}

const markdown = [
  '# Desktop Signing Blockers',
  '',
  `Generated at: ${typeof status.generatedAt === 'string' ? status.generatedAt : 'unknown'}`,
  '',
  '## Readiness',
  '',
  `- macOS readiness: ${typeof summary.macos === 'string' ? summary.macos : 'unknown'}`,
  `- Windows readiness: ${typeof summary.windows === 'string' ? summary.windows : 'unknown'}`,
  '',
  '## Primary Command',
  '',
  `\`${primaryCommand}\``,
  '',
  '## Blocking Items',
  '',
  ...(blockingLines.length > 0 ? blockingLines : ['- None']),
  '',
  '## Next Steps',
  '',
  ...(nextSteps.length > 0 ? nextSteps.map((step) => `- ${step}`) : ['- None']),
  '',
  '## Paths',
  '',
  `- Release status: \`${statusPath}\``,
  `- Signing env: \`${hasSigningEnv ? signingEnvPath : '(not generated)'}\``,
  `- Signing env exists: ${signingEnvExists ? 'YES' : 'NO'}`,
  `- Signing env loaded: ${signingEnvLoaded ? 'YES' : 'NO'}`,
  `- Signing env example: \`${existsSync(signingEnvExamplePath) ? signingEnvExamplePath : '(not bundled)'}\``,
].join('\n');

writeFileSync(signingBlockersPath, `${markdown}\n`);
writeFileSync(
  signingBlockersJsonPath,
  `${JSON.stringify({
    generatedAt: typeof status.generatedAt === 'string' ? status.generatedAt : null,
    readiness: {
      macos: typeof summary.macos === 'string' ? summary.macos : 'unknown',
      windows: typeof summary.windows === 'string' ? summary.windows : 'unknown',
    },
    primaryCommand,
    blockers: blockingItems,
    nextSteps,
    signingEnv: {
      exists: signingEnvExists,
      loaded: signingEnvLoaded,
    },
    paths: {
      releaseStatus: statusPath,
      signingEnv: hasSigningEnv ? signingEnvPath : null,
      signingEnvExample: existsSync(signingEnvExamplePath) ? signingEnvExamplePath : null,
      markdown: signingBlockersPath,
    },
  }, null, 2)}\n`,
);
if (!isQuiet) {
  console.log(`Wrote signing blockers report: ${signingBlockersPath}`);
  console.log(`Wrote signing blockers data: ${signingBlockersJsonPath}`);
}
