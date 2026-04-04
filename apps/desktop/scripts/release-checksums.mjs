import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const manifestPath = path.join(distDir, 'release-manifest.json');
const checksumsPath = path.join(distDir, 'SHA256SUMS.txt');

function ensureManifest() {
  if (existsSync(manifestPath)) {
    return;
  }

  execFileSync(process.execPath, [path.join(__dirname, 'release-manifest.mjs')], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

ensureManifest();

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const content = manifest.artifacts
  .map((artifact) => `${artifact.sha256}  ${artifact.name}`)
  .join('\n');

writeFileSync(checksumsPath, content.length > 0 ? `${content}\n` : '');
console.log(`Wrote release checksums: ${checksumsPath}`);
