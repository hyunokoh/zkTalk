import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const manifestPath = path.join(distDir, 'release-manifest.json');
const checksumsPath = path.join(distDir, 'SHA256SUMS.txt');
const statusPath = path.join(distDir, 'release-status.json');
const signingBlockersPath = path.join(distDir, 'signing-blockers.md');
const signingBlockersJsonPath = path.join(distDir, 'signing-blockers.json');
const summaryPath = path.join(distDir, 'release-summary.json');
const reportPath = path.join(distDir, 'release-report.md');
const handoffPath = path.join(distDir, 'release-handoff.md');
const handoffJsonPath = path.join(distDir, 'release-handoff.json');
const handoffHtmlPath = path.join(distDir, 'release-handoff.html');
const verificationPath = path.join(distDir, 'release-verification.md');
const verificationJsonPath = path.join(distDir, 'release-verification.json');
const verificationHtmlPath = path.join(distDir, 'release-verification.html');
const indexPath = path.join(distDir, 'release-index.html');
const bundleDir = path.join(distDir, 'release-bundle');
const releaseNotesPath = path.join(desktopDir, 'RELEASE.md');

const generators = {
  'release:manifest': path.join(__dirname, 'release-manifest.mjs'),
  'release:summary': path.join(__dirname, 'release-summary.mjs'),
  'release:checksums': path.join(__dirname, 'release-checksums.mjs'),
  'release:report': path.join(__dirname, 'release-report.mjs'),
  'release:handoff': path.join(__dirname, 'release-handoff.mjs'),
  'release:index': path.join(__dirname, 'release-index.mjs'),
};

function runStep(scriptName) {
  execFileSync(process.execPath, [generators[scriptName]], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

if (!existsSync(manifestPath)) {
  runStep('release:manifest');
}
if (!existsSync(checksumsPath)) {
  runStep('release:checksums');
}
runStep('release:report');
runStep('release:summary');
runStep('release:handoff');
runStep('release:index');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

rmSync(bundleDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

for (const artifact of manifest.artifacts) {
  cpSync(artifact.path, path.join(bundleDir, artifact.name));
}

cpSync(manifestPath, path.join(bundleDir, 'release-manifest.json'));
cpSync(statusPath, path.join(bundleDir, 'release-status.json'));
cpSync(signingBlockersPath, path.join(bundleDir, 'signing-blockers.md'));
cpSync(signingBlockersJsonPath, path.join(bundleDir, 'signing-blockers.json'));
cpSync(summaryPath, path.join(bundleDir, 'release-summary.json'));
cpSync(checksumsPath, path.join(bundleDir, 'SHA256SUMS.txt'));
cpSync(reportPath, path.join(bundleDir, 'release-report.md'));
cpSync(handoffPath, path.join(bundleDir, 'release-handoff.md'));
cpSync(handoffJsonPath, path.join(bundleDir, 'release-handoff.json'));
cpSync(handoffHtmlPath, path.join(bundleDir, 'release-handoff.html'));
if (existsSync(verificationPath)) {
  cpSync(verificationPath, path.join(bundleDir, 'release-verification.md'));
}
if (existsSync(verificationJsonPath)) {
  cpSync(verificationJsonPath, path.join(bundleDir, 'release-verification.json'));
}
if (existsSync(verificationHtmlPath)) {
  cpSync(verificationHtmlPath, path.join(bundleDir, 'release-verification.html'));
}
cpSync(indexPath, path.join(bundleDir, 'release-index.html'));
cpSync(releaseNotesPath, path.join(bundleDir, 'RELEASE.md'));

const optionalEntries = [
  existsSync(verificationPath) ? '- release-verification.md' : null,
  existsSync(verificationJsonPath) ? '- release-verification.json' : null,
  existsSync(verificationHtmlPath) ? '- release-verification.html' : null,
].filter(Boolean);

writeFileSync(
  path.join(bundleDir, 'README.txt'),
  [
    'zkTalk Desktop release bundle',
    '',
    'Contents:',
    '- Installer artifacts',
    '- Blockmaps',
    '- release-manifest.json',
    '- release-status.json',
    '- signing-blockers.md',
    '- signing-blockers.json',
    '- release-summary.json',
    '- SHA256SUMS.txt',
    '- release-report.md',
    '- release-handoff.md',
    '- release-handoff.json',
    '- release-handoff.html',
    ...optionalEntries,
    '- release-index.html',
    '- RELEASE.md',
    '',
    'Verify downloads with SHA256SUMS.txt before publishing.',
  ].join('\n'),
);

console.log(`Wrote release bundle: ${bundleDir}`);
