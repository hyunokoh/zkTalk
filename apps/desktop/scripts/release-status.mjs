import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadSigningEnv } from './signing-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const statusPath = path.join(distDir, 'release-status.json');
const signingEnv = loadSigningEnv();
const isQuiet = process.argv.includes('--quiet');

try {
  const output = execFileSync(process.execPath, [path.join(__dirname, 'release-check.mjs'), '--json'], {
    cwd: desktopDir,
    env: {
      ...process.env,
      ...signingEnv,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  writeFileSync(statusPath, output);
  if (!isQuiet) {
    console.log(`Wrote release status: ${statusPath}`);
  }
} catch (error) {
  const stdout = error.stdout ? String(error.stdout) : '';
  const stderr = error.stderr ? String(error.stderr) : '';
  if (stdout.trim()) {
    writeFileSync(statusPath, stdout);
    if (!isQuiet) {
      console.log(`Wrote release status: ${statusPath}`);
    }
    process.exit(0);
  }
  if (stderr.trim()) {
    process.stderr.write(stderr);
  }
  process.exit(typeof error.status === 'number' ? error.status : 1);
}
