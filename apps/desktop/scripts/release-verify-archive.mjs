import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const archivePath = path.join(distDir, 'zkTalk-desktop-release-bundle.tar.gz');

if (!existsSync(archivePath)) {
  console.error(`Missing release archive: ${archivePath}`);
  process.exit(1);
}

function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'zktalk-release-archive-'));

try {
  execFileSync('tar', ['-xzf', archivePath, '-C', tempDir], {
    cwd: desktopDir,
    stdio: 'inherit',
  });

  const bundleDir = path.join(tempDir, 'release-bundle');
  const checksumsPath = path.join(bundleDir, 'SHA256SUMS.txt');

  if (!existsSync(bundleDir)) {
    throw new Error(`Archive did not contain release-bundle/: ${archivePath}`);
  }

  if (!existsSync(checksumsPath)) {
    throw new Error(`Archive bundle missing SHA256SUMS.txt: ${checksumsPath}`);
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
    const filePath = path.join(bundleDir, fileName);
    if (!existsSync(filePath)) {
      console.error(`Missing file in archive bundle: ${filePath}`);
      hasFailure = true;
      continue;
    }

    const actualHash = sha256(filePath);
    if (actualHash !== expectedHash.toLowerCase()) {
      console.error(`Hash mismatch in archive bundle: ${fileName}`);
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

  console.log(`Verified ${lines.length} artifact(s) inside ${archivePath}`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
