import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  combineEnvStatuses,
  getCertificateLinkStatus,
  getEnvValueStatus,
  loadSigningEnv,
  resolvedSigningEnvPath,
} from './signing-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');

const envFromFile = loadSigningEnv();

if (Object.keys(envFromFile).length === 0) {
  console.error(`[release-signed] No signing env loaded from ${resolvedSigningEnvPath}`);
  console.error('Create signing.env from SIGNING.example.env first.');
  process.exit(1);
}

const macStatuses = {
  APPLE_ID: getEnvValueStatus(envFromFile.APPLE_ID),
  APPLE_APP_SPECIFIC_PASSWORD: getEnvValueStatus(envFromFile.APPLE_APP_SPECIFIC_PASSWORD),
  APPLE_TEAM_ID: getEnvValueStatus(envFromFile.APPLE_TEAM_ID),
};

const windowsStatuses = {
  'WIN_CSC_LINK / CSC_LINK': combineEnvStatuses(
    getCertificateLinkStatus(envFromFile.WIN_CSC_LINK),
    getCertificateLinkStatus(envFromFile.CSC_LINK),
  ),
  'WIN_CSC_KEY_PASSWORD / CSC_KEY_PASSWORD': combineEnvStatuses(
    getEnvValueStatus(envFromFile.WIN_CSC_KEY_PASSWORD),
    getEnvValueStatus(envFromFile.CSC_KEY_PASSWORD),
  ),
};

const invalidEntries = [
  ...Object.entries(macStatuses),
  ...Object.entries(windowsStatuses),
].filter(([, status]) => status !== 'OK');

if (invalidEntries.length > 0) {
  console.error('[release-signed] signing.env is not ready for a signed release.');
  for (const [name, status] of invalidEntries) {
    console.error(`  ${name}: ${status}`);
  }
  console.error('Replace placeholder values in signing.env with real credentials first.');
  process.exit(1);
}

execFileSync('npm', ['run', 'release:refresh'], {
  cwd: desktopDir,
  env: {
    ...process.env,
    ...envFromFile,
  },
  stdio: 'inherit',
});
