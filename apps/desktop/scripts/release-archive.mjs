import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const bundleDir = path.join(distDir, 'release-bundle');
const archivePath = path.join(distDir, 'zkTalk-desktop-release-bundle.tar.gz');

if (!existsSync(bundleDir)) {
  execFileSync(process.execPath, [path.join(__dirname, 'release-bundle.mjs')], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

execFileSync('tar', ['-czf', archivePath, '-C', distDir, 'release-bundle'], {
  cwd: desktopDir,
  stdio: 'inherit',
});

console.log(`Wrote release archive: ${archivePath}`);
