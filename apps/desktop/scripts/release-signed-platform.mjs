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

const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
const target = targetArg ? targetArg.slice('--target='.length) : '';

const targets = {
  mac: {
    label: 'macOS',
    distScript: 'dist:mac',
    statuses(env) {
      return {
        APPLE_ID: getEnvValueStatus(env.APPLE_ID),
        APPLE_APP_SPECIFIC_PASSWORD: getEnvValueStatus(env.APPLE_APP_SPECIFIC_PASSWORD),
        APPLE_TEAM_ID: getEnvValueStatus(env.APPLE_TEAM_ID),
      };
    },
  },
  'win:x64': {
    label: 'Windows x64',
    distScript: 'dist:win:x64',
    statuses(env) {
      return {
        'WIN_CSC_LINK / CSC_LINK': combineEnvStatuses(
          getCertificateLinkStatus(env.WIN_CSC_LINK),
          getCertificateLinkStatus(env.CSC_LINK),
        ),
        'WIN_CSC_KEY_PASSWORD / CSC_KEY_PASSWORD': combineEnvStatuses(
          getEnvValueStatus(env.WIN_CSC_KEY_PASSWORD),
          getEnvValueStatus(env.CSC_KEY_PASSWORD),
        ),
      };
    },
  },
  'win:arm64': {
    label: 'Windows arm64',
    distScript: 'dist:win:arm64',
    statuses(env) {
      return {
        'WIN_CSC_LINK / CSC_LINK': combineEnvStatuses(
          getCertificateLinkStatus(env.WIN_CSC_LINK),
          getCertificateLinkStatus(env.CSC_LINK),
        ),
        'WIN_CSC_KEY_PASSWORD / CSC_KEY_PASSWORD': combineEnvStatuses(
          getEnvValueStatus(env.WIN_CSC_KEY_PASSWORD),
          getEnvValueStatus(env.CSC_KEY_PASSWORD),
        ),
      };
    },
  },
};

const config = targets[target];
if (!config) {
  console.error('[release-signed-platform] Missing or invalid target.');
  console.error('Use one of: --target=mac, --target=win:x64, --target=win:arm64');
  process.exit(1);
}

const envFromFile = loadSigningEnv();

if (Object.keys(envFromFile).length === 0) {
  console.error(`[release-signed-platform] No signing env loaded from ${resolvedSigningEnvPath}`);
  console.error('Create signing.env from SIGNING.example.env first.');
  process.exit(1);
}

const statuses = config.statuses(envFromFile);
const invalidEntries = Object.entries(statuses).filter(([, status]) => status !== 'OK');

if (invalidEntries.length > 0) {
  console.error(`[release-signed-platform] signing.env is not ready for ${config.label}.`);
  for (const [name, status] of invalidEntries) {
    console.error(`  ${name}: ${status}`);
  }
  console.error('Replace placeholder values in signing.env with real credentials first.');
  process.exit(1);
}

const env = {
  ...process.env,
  ...envFromFile,
};

console.log(`[release-signed-platform] Building signed ${config.label} release...`);
execFileSync('npm', ['run', config.distScript], {
  cwd: desktopDir,
  env,
  stdio: 'inherit',
});

console.log('[release-signed-platform] Refreshing release metadata...');
execFileSync(process.execPath, [path.join(__dirname, 'release-unsigned.mjs')], {
  cwd: desktopDir,
  env,
  stdio: 'inherit',
});

console.log(`[release-signed-platform] Completed signed ${config.label} release flow.`);
