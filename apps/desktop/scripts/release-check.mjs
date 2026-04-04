import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  combineEnvStatuses,
  getEnvValueStatus,
  inspectCertificateLink,
  loadSigningEnv,
  resolvedSigningEnvPath,
} from './signing-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const signingExamplePath = path.join(desktopDir, 'SIGNING.example.env');
const outputJson = process.argv.includes('--json');
const signingEnv = loadSigningEnv();
const hasSigningEnv = existsSync(resolvedSigningEnvPath);
const hasLoadedSigningEnv = Object.keys(signingEnv).length > 0;

function getEnvStatus(name) {
  return getEnvValueStatus(process.env[name]);
}

function getEnvDetail(name) {
  return {
    status: getEnvStatus(name),
  };
}

function findMacSigningIdentity() {
  try {
    const output = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const lines = output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.find((line) => line.includes('Developer ID Application')) || null;
  } catch (_) {
    return null;
  }
}

function printSection(title, rows) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  for (const row of rows) {
    console.log(`${row.label.padEnd(28)} ${row.value}`);
  }
}

const macIdentity = findMacSigningIdentity();
const macEnvDetails = {
  APPLE_ID: getEnvDetail('APPLE_ID'),
  APPLE_APP_SPECIFIC_PASSWORD: getEnvDetail('APPLE_APP_SPECIFIC_PASSWORD'),
  APPLE_TEAM_ID: getEnvDetail('APPLE_TEAM_ID'),
};
const macRows = [
  { label: 'Developer ID identity', value: macIdentity ? 'OK' : 'MISSING' },
  { label: 'APPLE_ID', value: macEnvDetails.APPLE_ID.status },
  { label: 'APPLE_APP_SPECIFIC_PASSWORD', value: macEnvDetails.APPLE_APP_SPECIFIC_PASSWORD.status },
  { label: 'APPLE_TEAM_ID', value: macEnvDetails.APPLE_TEAM_ID.status },
  { label: 'Latest DMG', value: existsSync(path.join(distDir, 'zkTalk-mac-arm64-0.0.1.dmg')) ? 'OK' : 'MISSING' },
];

const winLinkDetails = {
  WIN_CSC_LINK: inspectCertificateLink(process.env.WIN_CSC_LINK),
  CSC_LINK: inspectCertificateLink(process.env.CSC_LINK),
};
const winPasswordDetails = {
  WIN_CSC_KEY_PASSWORD: getEnvDetail('WIN_CSC_KEY_PASSWORD'),
  CSC_KEY_PASSWORD: getEnvDetail('CSC_KEY_PASSWORD'),
};
const winCertStatus = combineEnvStatuses(
  winLinkDetails.WIN_CSC_LINK.status,
  winLinkDetails.CSC_LINK.status,
);
const winPasswordStatus = combineEnvStatuses(
  winPasswordDetails.WIN_CSC_KEY_PASSWORD.status,
  winPasswordDetails.CSC_KEY_PASSWORD.status,
);
const winRows = [
  { label: 'WIN_CSC_LINK / CSC_LINK', value: winCertStatus },
  { label: 'WIN_CSC_KEY_PASSWORD / CSC_KEY_PASSWORD', value: winPasswordStatus },
  { label: 'Latest NSIS installer', value: existsSync(path.join(distDir, 'zkTalk-win-x64-0.0.1.exe')) ? 'OK' : 'MISSING' },
];

const generalRows = [
  { label: 'Desktop dist dir', value: existsSync(distDir) ? distDir : 'MISSING' },
  { label: 'mac unpacked app', value: existsSync(path.join(distDir, 'mac-arm64', 'zkTalk.app')) ? 'OK' : 'MISSING' },
  { label: 'win unpacked app', value: existsSync(path.join(distDir, 'win-unpacked', 'zkTalk.exe')) ? 'OK' : 'MISSING' },
  { label: 'Signing env file', value: hasSigningEnv ? resolvedSigningEnvPath : 'MISSING' },
  { label: 'Signing env loaded', value: hasLoadedSigningEnv ? 'YES' : 'NO' },
  { label: 'Signing env example', value: existsSync(signingExamplePath) ? signingExamplePath : 'MISSING' },
];

const missingMac = macRows.some((row) => row.value !== 'OK');
const missingWin = winRows.some((row) => row.value !== 'OK');
const macReady = !missingMac;
const windowsReady = !missingWin;

const summary = {
  macos: missingMac ? 'NOT_READY' : 'READY',
  windows: missingWin ? 'NOT_READY' : 'READY',
};

if (outputJson) {
  const nextSteps = [];
  if (!hasSigningEnv) {
    nextSteps.push('Create signing.env from SIGNING.example.env before running signed release commands.');
  } else if (!hasLoadedSigningEnv) {
    nextSteps.push('Fill signing.env with real signing values or export them in the shell before running signed release commands.');
  }
  if (!macIdentity) {
    nextSteps.push('Install a valid Developer ID Application certificate in Keychain.');
  }
  if (macRows.some((row) => row.value === 'MISSING' || row.value === 'EXAMPLE')) {
    nextSteps.push('Set real APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID values.');
  }
  if (winRows.some((row) => row.label === 'WIN_CSC_LINK / CSC_LINK' && row.value === 'INVALID_PATH')) {
    nextSteps.push('Point WIN_CSC_LINK or CSC_LINK to an existing certificate file.');
  }
  if (winRows.some((row) => row.value === 'MISSING' || row.value === 'EXAMPLE')) {
    nextSteps.push('Set real Windows signing certificate and password values.');
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    paths: {
      distDir,
      signingEnvPath: resolvedSigningEnvPath,
      signingExamplePath,
    },
    signingEnv: {
      exists: hasSigningEnv,
      loaded: hasLoadedSigningEnv,
    },
    signingDetails: {
      macos: {
        developerIdIdentity: {
          status: macIdentity ? 'OK' : 'MISSING',
          value: macIdentity,
        },
        env: macEnvDetails,
      },
      windows: {
        env: {
          WIN_CSC_LINK: winLinkDetails.WIN_CSC_LINK,
          CSC_LINK: winLinkDetails.CSC_LINK,
          WIN_CSC_KEY_PASSWORD: winPasswordDetails.WIN_CSC_KEY_PASSWORD,
          CSC_KEY_PASSWORD: winPasswordDetails.CSC_KEY_PASSWORD,
        },
      },
    },
    sections: {
      general: generalRows,
      macos: macRows,
      windows: winRows,
    },
    summary,
    targets: {
      all: {
        ready: macReady && windowsReady,
        command: 'npm run release:signed',
      },
      mac: {
        ready: macReady,
        command: 'npm run release:signed:mac',
      },
      'win:x64': {
        ready: windowsReady,
        command: 'npm run release:signed:win:x64',
      },
      'win:arm64': {
        ready: windowsReady,
        command: 'npm run release:signed:win:arm64',
      },
    },
    nextSteps,
  }, null, 2));
} else {
  printSection('General', generalRows);
  printSection('macOS release readiness', macRows);
  if (macIdentity) {
    console.log(`Identity: ${macIdentity}`);
  }
  printSection('Windows release readiness', winRows);

  console.log('\nSummary');
  console.log('-------');
  console.log(`macOS signing/notarization: ${macReady ? 'ready' : 'not ready'}`);
  console.log(`Windows signing: ${windowsReady ? 'ready' : 'not ready'}`);
}
if (!macReady || !windowsReady) {
  process.exitCode = 1;
}
