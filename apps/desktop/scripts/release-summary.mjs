import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const summaryPath = path.join(distDir, 'release-summary.json');
const manifestPath = path.join(distDir, 'release-manifest.json');
const statusPath = path.join(distDir, 'release-status.json');
const signingBlockersJsonPath = path.join(distDir, 'signing-blockers.json');
const reportPath = path.join(distDir, 'release-report.md');
const handoffPath = path.join(distDir, 'release-handoff.md');
const handoffJsonPath = path.join(distDir, 'release-handoff.json');
const handoffHtmlPath = path.join(distDir, 'release-handoff.html');
const verificationPath = path.join(distDir, 'release-verification.md');
const verificationJsonPath = path.join(distDir, 'release-verification.json');
const verificationHtmlPath = path.join(distDir, 'release-verification.html');
const indexPath = path.join(distDir, 'release-index.html');
const checksumsPath = path.join(distDir, 'SHA256SUMS.txt');

function runStep(scriptName) {
  execFileSync('npm', ['run', scriptName], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

if (!existsSync(manifestPath)) {
  runStep('release:manifest');
}
runStep('release:status');
runStep('release:signing-blockers');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const status = JSON.parse(readFileSync(statusPath, 'utf8'));
const signingBlockers = JSON.parse(readFileSync(signingBlockersJsonPath, 'utf8'));
const verification = existsSync(verificationJsonPath)
  ? JSON.parse(readFileSync(verificationJsonPath, 'utf8'))
  : null;

const summary = {
  generatedAt: new Date().toISOString(),
  readiness: status.summary ?? {},
  targets: status.targets ?? {},
  primaryCommand: signingBlockers.primaryCommand ?? null,
  signingEnv: status.signingEnv ?? null,
  signingDetails: status.signingDetails ?? null,
  nextSteps: Array.isArray(status.nextSteps) ? status.nextSteps : [],
  blockers: Array.isArray(signingBlockers.blockers) ? signingBlockers.blockers : [],
  verification: verification && typeof verification === 'object'
    ? {
        summary: verification.summary ?? null,
        checks: verification.checks ?? null,
      }
    : null,
  artifacts: Array.isArray(manifest.artifacts) ? manifest.artifacts : [],
  paths: {
    distDir,
    manifest: manifestPath,
    status: statusPath,
    signingBlockersJson: signingBlockersJsonPath,
    checksums: checksumsPath,
    report: reportPath,
    handoff: handoffPath,
    handoffJson: handoffJsonPath,
    handoffHtml: handoffHtmlPath,
    verification: verificationPath,
    verificationJson: verificationJsonPath,
    verificationHtml: verificationHtmlPath,
    index: indexPath,
  },
};

writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Wrote release summary: ${summaryPath}`);
