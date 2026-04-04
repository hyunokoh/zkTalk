import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');

const mode = process.argv.includes('--bundle') ? 'bundle' : 'dist';
const baseDir = mode === 'bundle' ? path.join(distDir, 'release-bundle') : distDir;
const checksumsPath = path.join(baseDir, 'SHA256SUMS.txt');

if (!existsSync(checksumsPath)) {
  console.error(`Missing checksum file: ${checksumsPath}`);
  process.exit(1);
}

function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

const lines = readFileSync(checksumsPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

let hasFailure = false;

for (const line of lines) {
  const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/i);
  if (!match) {
    console.error(`Invalid checksum line: ${line}`);
    hasFailure = true;
    continue;
  }

  const [, expectedHash, fileName] = match;
  const filePath = path.join(baseDir, fileName);
  if (!existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    hasFailure = true;
    continue;
  }

  const actualHash = sha256(filePath);
  if (actualHash !== expectedHash.toLowerCase()) {
    console.error(`Hash mismatch: ${fileName}`);
    console.error(`  expected ${expectedHash}`);
    console.error(`  actual   ${actualHash}`);
    hasFailure = true;
    continue;
  }

  console.log(`OK  ${fileName}`);
}

if (hasFailure) {
  process.exit(1);
}

console.log(`Verified ${lines.length} artifact(s) in ${baseDir}`);
