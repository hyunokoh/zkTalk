import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const handoffPath = path.join(distDir, 'release-handoff.md');
const handoffJsonPath = path.join(distDir, 'release-handoff.json');
const handoffHtmlPath = path.join(distDir, 'release-handoff.html');
const manifestPath = path.join(distDir, 'release-manifest.json');
const statusPath = path.join(distDir, 'release-status.json');
const signingBlockersJsonPath = path.join(distDir, 'signing-blockers.json');
const verificationPath = path.join(distDir, 'release-verification.md');
const verificationJsonPath = path.join(distDir, 'release-verification.json');
const verificationHtmlPath = path.join(distDir, 'release-verification.html');

function runStep(scriptName) {
  execFileSync('npm', ['run', scriptName], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return 'unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relativeLink(filePath) {
  return path.relative(distDir, filePath).split(path.sep).join('/');
}

function getPrimaryCommand(statusSummary, signingEnvExists, signingEnvLoaded) {
  if (!signingEnvExists || !signingEnvLoaded) {
    return 'npm run release:init-signing';
  }

  if (statusSummary?.macos === 'READY' && statusSummary?.windows === 'READY') {
    return 'npm run release:signed';
  }

  return 'npm run release:check:signed';
}

if (!existsSync(manifestPath)) {
  runStep('release:manifest');
}
runStep('release:status');
runStep('release:signing-blockers');
runStep('release:verification');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const status = JSON.parse(readFileSync(statusPath, 'utf8'));
const signingBlockers = JSON.parse(readFileSync(signingBlockersJsonPath, 'utf8'));
const verification = JSON.parse(readFileSync(verificationJsonPath, 'utf8'));
const generatedAt = new Date().toISOString();
const artifactManifestGeneratedAt = typeof manifest.generatedAt === 'string' ? manifest.generatedAt : 'unknown';
const summary = status && typeof status.summary === 'object' ? status.summary : {};
const targets = status && typeof status.targets === 'object' ? status.targets : {};
const nextSteps = Array.isArray(status?.nextSteps) ? status.nextSteps.filter((step) => typeof step === 'string' && step.length > 0) : [];
const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
const signingEnvPath = path.join(desktopDir, 'signing.env');
const hasSigningEnv = existsSync(signingEnvPath);
const signingEnvExists = signingBlockers?.signingEnv?.exists === true || hasSigningEnv;
const signingEnvLoaded = signingBlockers?.signingEnv?.loaded === true;
const primaryCommand = getPrimaryCommand(summary, signingEnvExists, signingEnvLoaded);
const handoff = {
  generatedAt,
  artifactManifestGeneratedAt,
  readiness: {
    macos: typeof summary.macos === 'string' ? summary.macos : 'unknown',
    windows: typeof summary.windows === 'string' ? summary.windows : 'unknown',
  },
  primaryCommand,
  nextSteps,
  signingBlockers: {
    primaryCommand: typeof signingBlockers?.primaryCommand === 'string' ? signingBlockers.primaryCommand : primaryCommand,
    signingEnv: signingBlockers?.signingEnv ?? null,
    blockers: Array.isArray(signingBlockers?.blockers) ? signingBlockers.blockers : [],
  },
  verification: verification && typeof verification === 'object'
    ? {
        summary: verification.summary ?? null,
        checks: verification.checks ?? null,
      }
    : null,
  installers: artifacts,
  paths: {
    manifest: manifestPath,
    status: statusPath,
    signingBlockersJson: signingBlockersJsonPath,
    verification: verificationPath,
    verificationJson: verificationJsonPath,
    verificationHtml: verificationHtmlPath,
    signingEnv: hasSigningEnv ? signingEnvPath : null,
    distDir,
  },
};

const verificationSummary = verification && typeof verification.summary === 'object'
  ? verification.summary
  : {};
const verificationChecks = verification && typeof verification.checks === 'object'
  ? verification.checks
  : {};
const availableSignedCommands = [
  ['all', 'Signed all-platform release'],
  ['mac', 'Signed macOS release'],
  ['win:x64', 'Signed Windows x64 release'],
  ['win:arm64', 'Signed Windows arm64 release'],
]
  .map(([key, label]) => {
    const entry = targets && typeof targets[key] === 'object' ? targets[key] : null;
    if (!entry || entry.ready !== true || typeof entry.command !== 'string') {
      return null;
    }
    return `${label}: ${entry.command}`;
  })
  .filter(Boolean);

const verificationLines = Object.entries(verificationChecks).map(([name, check]) => {
  const ok = check && typeof check === 'object' ? Boolean(check.ok) : false;
  return `- ${name}: ${ok ? 'PASS' : 'FAIL'}`;
});

const markdown = [
  '# Desktop Release Handoff',
  '',
  `Generated at: ${generatedAt}`,
  '',
  `Artifact manifest generated at: ${artifactManifestGeneratedAt}`,
  '',
  '## Readiness',
  '',
  `- macOS readiness: ${typeof summary.macos === 'string' ? summary.macos : 'unknown'}`,
  `- Windows readiness: ${typeof summary.windows === 'string' ? summary.windows : 'unknown'}`,
  '',
  '## Primary Command',
  '',
  `\`${primaryCommand}\``,
  '',
  '## Available Signed Release Commands',
  '',
  ...(availableSignedCommands.length > 0 ? availableSignedCommands.map((command) => `- ${command}`) : ['- None']),
  '',
  '## Next Steps',
  '',
  ...(nextSteps.length > 0 ? nextSteps.map((step) => `- ${step}`) : ['- None']),
  '',
  '## Signing Blockers',
  '',
  `- Primary command: \`${typeof signingBlockers?.primaryCommand === 'string' ? signingBlockers.primaryCommand : primaryCommand}\``,
  `- Signing env exists: ${signingEnvExists ? 'YES' : 'NO'}`,
  `- Signing env loaded: ${signingEnvLoaded ? 'YES' : 'NO'}`,
  ...(Array.isArray(signingBlockers?.blockers) && signingBlockers.blockers.length > 0
    ? signingBlockers.blockers.map((blocker) => `- ${blocker.platform}: ${blocker.label} = ${blocker.value}`)
    : ['- None']),
  '',
  '## Verification',
  '',
  `- Passed checks: ${typeof verificationSummary.passedChecks === 'number' ? verificationSummary.passedChecks : 'unknown'}`,
  `- Failed checks: ${typeof verificationSummary.failedChecks === 'number' ? verificationSummary.failedChecks : 'unknown'}`,
  ...(verificationLines.length > 0 ? verificationLines : ['- None']),
  '',
  '## Installers',
  '',
  ...(artifacts.length > 0
    ? artifacts.map((artifact) => {
      const name = typeof artifact?.name === 'string' ? artifact.name : 'Unknown artifact';
      const size = formatBytes(artifact?.sizeBytes);
      const sha256 = typeof artifact?.sha256 === 'string' ? artifact.sha256 : '(missing sha256)';
      const artifactPath = typeof artifact?.path === 'string' ? artifact.path : '(missing path)';
      return `- \`${name}\` (${size})  \n  sha256: \`${sha256}\`  \n  path: \`${artifactPath}\``;
    })
    : ['- No artifacts found']),
  '',
  '## Paths',
  '',
  `- Release manifest: \`${manifestPath}\``,
  `- Release status: \`${statusPath}\``,
  `- Signing blockers JSON: \`${signingBlockersJsonPath}\``,
  `- Release verification report: \`${verificationPath}\``,
  `- Release verification JSON: \`${verificationJsonPath}\``,
  `- Release verification HTML: \`${verificationHtmlPath}\``,
  `- Signing env: \`${hasSigningEnv ? signingEnvPath : '(not generated)'}\``,
  `- Release dist dir: \`${distDir}\``,
].join('\n');

const installersHtml = artifacts.length > 0
  ? artifacts.map((artifact) => {
      const name = typeof artifact?.name === 'string' ? artifact.name : 'Unknown artifact';
      const size = formatBytes(artifact?.sizeBytes);
      const sha256 = typeof artifact?.sha256 === 'string' ? artifact.sha256 : '(missing sha256)';
      const artifactPath = typeof artifact?.path === 'string' ? artifact.path : '(missing path)';
      return `<li><strong>${escapeHtml(name)}</strong><br />Size: ${escapeHtml(size)}<br />SHA256: <code>${escapeHtml(sha256)}</code><br />Path: <a href="${escapeHtml(relativeLink(artifactPath))}">${escapeHtml(artifactPath)}</a></li>`;
    }).join('\n')
  : '<li>No artifacts found.</li>';

const blockerItemsHtml = Array.isArray(signingBlockers?.blockers) && signingBlockers.blockers.length > 0
  ? signingBlockers.blockers
      .map((blocker) => `<li>${escapeHtml(blocker.platform || 'Unknown')}: ${escapeHtml(blocker.label || 'Unknown')} = ${escapeHtml(blocker.value || 'unknown')}</li>`)
      .join('\n')
  : '<li>None</li>';

const nextStepsHtml = nextSteps.length > 0
  ? nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('\n')
  : '<li>None</li>';

const verificationItemsHtml = verificationLines.length > 0
  ? verificationLines.map((line) => `<li>${escapeHtml(line.replace(/^- /, ''))}</li>`).join('\n')
  : '<li>None</li>';

const resources = [
  ['Release manifest', manifestPath],
  ['Release status', statusPath],
  ['Signing blockers JSON', signingBlockersJsonPath],
  ['Release verification report', verificationPath],
  ['Release verification JSON', verificationJsonPath],
  ['Release verification HTML', verificationHtmlPath],
  ['Release handoff JSON', handoffJsonPath],
  ['Release handoff markdown', handoffPath],
];

const resourcesHtml = resources
  .map(([label, filePath]) => `<li><a href="${escapeHtml(relativeLink(filePath))}">${escapeHtml(label)}</a></li>`)
  .join('\n');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>zkTalk Desktop Release Handoff</title>
    <style>
      body {
        margin: 0;
        background: #0b1020;
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 40px 24px 80px;
      }
      h1, h2 {
        margin: 0 0 16px;
      }
      p, li {
        color: #cbd5e1;
        line-height: 1.6;
      }
      a {
        color: #93c5fd;
      }
      .panel {
        margin-top: 24px;
        padding: 20px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
      code {
        word-break: break-all;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>zkTalk Desktop Release Handoff</h1>
      <p>Generated at ${escapeHtml(generatedAt)}.<br />Artifact manifest generated at ${escapeHtml(artifactManifestGeneratedAt)}.</p>

      <section class="panel">
        <h2>Readiness</h2>
        <p>macOS: ${escapeHtml(typeof summary.macos === 'string' ? summary.macos : 'unknown')}<br />Windows: ${escapeHtml(typeof summary.windows === 'string' ? summary.windows : 'unknown')}</p>
      </section>

      <section class="panel">
        <h2>Primary Command</h2>
        <p><code>${escapeHtml(primaryCommand)}</code></p>
      </section>

      <section class="panel">
        <h2>Available Signed Release Commands</h2>
        <ul>${availableSignedCommands.length > 0 ? availableSignedCommands.map((command) => `<li>${escapeHtml(command)}</li>`).join('\n') : '<li>None</li>'}</ul>
      </section>

      <section class="panel">
        <h2>Next Steps</h2>
        <ul>${nextStepsHtml}</ul>
      </section>

      <section class="panel">
        <h2>Signing Blockers</h2>
        <p>Primary command: <code>${escapeHtml(typeof signingBlockers?.primaryCommand === 'string' ? signingBlockers.primaryCommand : primaryCommand)}</code></p>
        <p>Signing env exists: <strong>${signingEnvExists ? 'YES' : 'NO'}</strong><br />Signing env loaded: <strong>${signingEnvLoaded ? 'YES' : 'NO'}</strong></p>
        <ul>${blockerItemsHtml}</ul>
      </section>

      <section class="panel">
        <h2>Verification</h2>
        <p>Passed: ${escapeHtml(verificationSummary.passedChecks ?? 'unknown')}<br />Failed: ${escapeHtml(verificationSummary.failedChecks ?? 'unknown')}</p>
        <ul>${verificationItemsHtml}</ul>
      </section>

      <section class="panel">
        <h2>Installers</h2>
        <ul>${installersHtml}</ul>
      </section>

      <section class="panel">
        <h2>Resources</h2>
        <ul>${resourcesHtml}</ul>
      </section>
    </main>
  </body>
</html>`;

writeFileSync(handoffPath, `${markdown}\n`);
writeFileSync(handoffJsonPath, `${JSON.stringify(handoff, null, 2)}\n`);
writeFileSync(handoffHtmlPath, html);
console.log(`Wrote release handoff: ${handoffPath}`);
console.log(`Wrote release handoff JSON: ${handoffJsonPath}`);
console.log(`Wrote release handoff HTML: ${handoffHtmlPath}`);
