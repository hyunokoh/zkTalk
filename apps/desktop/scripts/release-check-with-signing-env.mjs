import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSigningEnv, resolvedSigningEnvPath } from './signing-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');

const envFromFile = loadSigningEnv();

if (Object.keys(envFromFile).length === 0) {
  console.warn(`[release-check-with-signing-env] No signing env loaded from ${resolvedSigningEnvPath}`);
}

try {
  execFileSync(process.execPath, [path.join(__dirname, 'release-check.mjs')], {
    cwd: desktopDir,
    env: {
      ...process.env,
      ...envFromFile,
    },
    stdio: 'inherit',
  });
} catch (error) {
  process.exit(typeof error.status === 'number' ? error.status : 1);
}
