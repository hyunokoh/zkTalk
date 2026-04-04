import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');

const steps = [
  ['release:status', [path.join(__dirname, 'release-status.mjs')]],
  ['release:signing-blockers', [path.join(__dirname, 'release-signing-blockers.mjs')]],
  ['release:manifest', [path.join(__dirname, 'release-manifest.mjs')]],
  ['release:checksums', [path.join(__dirname, 'release-checksums.mjs')]],
  ['release:handoff', [path.join(__dirname, 'release-handoff.mjs')]],
  ['release:bundle (base)', [path.join(__dirname, 'release-bundle.mjs')]],
  ['release:archive (base)', [path.join(__dirname, 'release-archive.mjs')]],
  ['release:verify', [path.join(__dirname, 'release-verify.mjs')]],
  ['release:verify:bundle', [path.join(__dirname, 'release-verify.mjs'), '--bundle']],
  ['release:verify:archive', [path.join(__dirname, 'release-verify-archive.mjs')]],
  ['release:verification', [path.join(__dirname, 'release-verification.mjs')]],
  ['release:summary', [path.join(__dirname, 'release-summary.mjs')]],
  ['release:report', [path.join(__dirname, 'release-report.mjs')]],
  ['release:index', [path.join(__dirname, 'release-index.mjs')]],
  ['release:bundle (final)', [path.join(__dirname, 'release-bundle.mjs')]],
  ['release:archive (final)', [path.join(__dirname, 'release-archive.mjs')]],
  ['release:verify:bundle (final)', [path.join(__dirname, 'release-verify.mjs'), '--bundle']],
  ['release:verify:archive (final)', [path.join(__dirname, 'release-verify-archive.mjs')]],
];

for (const [label, args] of steps) {
  console.log(`\n==> ${label}`);
  execFileSync(process.execPath, args, {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

console.log('\nUnsigned desktop release refresh completed.');
