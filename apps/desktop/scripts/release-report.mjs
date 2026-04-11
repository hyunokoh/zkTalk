import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const manifestPath = path.join(distDir, 'release-manifest.json');
const reportPath = path.join(distDir, 'release-report.md');
const handoffPath = path.join(distDir, 'release-handoff.md');
const handoffJsonPath = path.join(distDir, 'release-handoff.json');
const handoffHtmlPath = path.join(distDir, 'release-handoff.html');
const verificationPath = path.join(distDir, 'release-verification.md');
const verificationJsonPath = path.join(distDir, 'release-verification.json');
const verificationHtmlPath = path.join(distDir, 'release-verification.html');
const checksumsPath = path.join(distDir, 'SHA256SUMS.txt');
const statusPath = path.join(distDir, 'release-status.json');
const signingBlockersPath = path.join(distDir, 'signing-blockers.md');
const signingBlockersJsonPath = path.join(distDir, 'signing-blockers.json');
const summaryPath = path.join(distDir, 'release-summary.json');
const bundlePath = path.join(distDir, 'release-bundle');
const archivePath = path.join(distDir, 'zkTalk-desktop-release-bundle.tar.gz');
const indexPath = path.join(distDir, 'release-index.html');
const repoRoot = path.resolve(desktopDir, '..', '..');
const docsDir = path.join(repoRoot, 'docs');
const docsIndexPath = path.join(docsDir, 'README.md');
const currentStatusPath = path.join(docsDir, 'CURRENT_STATUS.md');
const repoSnapshotPath = path.join(docsDir, 'current-release-next.md');
const repoSnapshotJsonPath = path.join(docsDir, 'current-release-next.json');
const blockerSummaryPath = path.join(docsDir, 'current-blockers-2026-03-25.md');
const runtimeRunbookPath = path.join(docsDir, 'production-runtime-runbook.md');
const commercializationPlanPath = path.join(docsDir, 'COMMERCIALIZATION_PLAN.md');
const implementationPlanPath = path.join(docsDir, 'IMPLEMENTATION_PLAN.md');
const desktopReleasePath = path.join(desktopDir, 'RELEASE.md');

function runScript(scriptName) {
  execFileSync(process.execPath, [path.join(__dirname, scriptName)], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

function runReleaseCheck() {
  try {
    const output = execFileSync(process.execPath, [path.join(__dirname, 'release-check.mjs')], {
      cwd: desktopDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    return {
      ok: false,
      output: [stdout, stderr].filter(Boolean).join('\n').trim(),
    };
  }
}

function readReleaseStatus() {
  try {
    const output = execFileSync(process.execPath, [path.join(__dirname, 'release-check.mjs'), '--json'], {
      cwd: desktopDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : '';
    return stdout.trim() ? JSON.parse(stdout) : null;
  }
}

function runSigningBlockers() {
  execFileSync(process.execPath, [path.join(__dirname, 'release-signing-blockers.mjs')], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

if (!existsSync(manifestPath)) {
  runScript('release-manifest.mjs');
}
runSigningBlockers();

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const releaseCheck = runReleaseCheck();
const releaseStatus = readReleaseStatus();
const signingBlockers = JSON.parse(readFileSync(signingBlockersJsonPath, 'utf8'));
const generatedAt = new Date().toISOString();
const artifactManifestGeneratedAt = typeof manifest.generatedAt === 'string' ? manifest.generatedAt : 'unknown';
const targetCommands = releaseStatus && typeof releaseStatus.targets === 'object'
  ? Object.entries(releaseStatus.targets)
      .filter(([, entry]) => entry && typeof entry === 'object' && entry.ready === true && typeof entry.command === 'string')
      .map(([key, entry]) => `- ${key}: \`${entry.command}\``)
  : [];

const artifactLines = manifest.artifacts.length > 0
  ? manifest.artifacts.map((artifact) => `- \`${artifact.name}\` (${artifact.sizeBytes} bytes)  \n  sha256: \`${artifact.sha256}\``).join('\n')
  : '- No installer artifacts found.';

const nextStepsSection = releaseStatus && Array.isArray(releaseStatus.nextSteps) && releaseStatus.nextSteps.length > 0
  ? `\n## Next Steps\n\n${releaseStatus.nextSteps.map((step) => `- ${step}`).join('\n')}\n`
  : '';

const blockerLines = Array.isArray(signingBlockers?.blockers) && signingBlockers.blockers.length > 0
  ? signingBlockers.blockers.map((blocker) => `- ${blocker.platform}: ${blocker.label} = ${blocker.value}`).join('\n')
  : '- No signing blockers found.';

const blockerSection = `
## Signing Blockers

- Primary command: \`${typeof signingBlockers?.primaryCommand === 'string' ? signingBlockers.primaryCommand : 'unknown'}\`
- Signing env exists: ${signingBlockers?.signingEnv?.exists === true ? 'YES' : 'NO'}
- Signing env loaded: ${signingBlockers?.signingEnv?.loaded === true ? 'YES' : 'NO'}
${blockerLines}
`;

const markdown = `# zkTalk Desktop Release Report

Generated at: ${generatedAt}

Artifact manifest generated at: ${artifactManifestGeneratedAt}

## Artifacts

${artifactLines}

## Release Check

\`\`\`text
${releaseCheck.output || 'No output'}
\`\`\`
${nextStepsSection}
${blockerSection}

## Available Signed Release Commands

${targetCommands.length > 0 ? targetCommands.join('\n') : '- None'}

## Source Of Truth

- Docs index: \`${docsIndexPath}\`
- Current status: \`${currentStatusPath}\`
- Repo release snapshot: \`${repoSnapshotPath}\`
- Repo release snapshot JSON: \`${repoSnapshotJsonPath}\`
- Current blocker summary: \`${blockerSummaryPath}\`
- Production runtime runbook: \`${runtimeRunbookPath}\`
- Commercialization plan: \`${commercializationPlanPath}\`
- Implementation plan: \`${implementationPlanPath}\`
- Desktop release runbook: \`${desktopReleasePath}\`

## Result

- Artifact manifest: \`${manifestPath}\`
- Checksums: \`${checksumsPath}\`
- Release status: \`${statusPath}\`
- Signing blockers: \`${signingBlockersPath}\`
- Signing blockers JSON: \`${signingBlockersJsonPath}\`
- Release summary JSON: \`${summaryPath}\`
- Release index: \`${indexPath}\`
- Release handoff: \`${handoffPath}\`
- Release handoff JSON: \`${handoffJsonPath}\`
- Release handoff HTML: \`${handoffHtmlPath}\`
- Release verification report: \`${verificationPath}\`
- Release verification JSON: \`${verificationJsonPath}\`
- Release verification HTML: \`${verificationHtmlPath}\`
- Release bundle dir: \`${bundlePath}\`
- Release bundle archive: \`${archivePath}\`
- Release readiness: ${releaseCheck.ok ? 'ready' : 'needs signing credentials'}
`;

writeFileSync(reportPath, markdown);
console.log(`Wrote release report: ${reportPath}`);
