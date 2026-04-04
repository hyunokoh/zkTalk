import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const manifestPath = path.join(distDir, 'release-manifest.json');
const reportPath = path.join(distDir, 'release-report.md');
const checksumsPath = path.join(distDir, 'SHA256SUMS.txt');
const statusPath = path.join(distDir, 'release-status.json');
const signingBlockersPath = path.join(distDir, 'signing-blockers.md');
const signingBlockersJsonPath = path.join(distDir, 'signing-blockers.json');
const summaryPath = path.join(distDir, 'release-summary.json');
const handoffPath = path.join(distDir, 'release-handoff.md');
const handoffJsonPath = path.join(distDir, 'release-handoff.json');
const handoffHtmlPath = path.join(distDir, 'release-handoff.html');
const verificationPath = path.join(distDir, 'release-verification.md');
const verificationJsonPath = path.join(distDir, 'release-verification.json');
const verificationHtmlPath = path.join(distDir, 'release-verification.html');
const bundleDir = path.join(distDir, 'release-bundle');
const archivePath = path.join(distDir, 'zkTalk-desktop-release-bundle.tar.gz');
const indexPath = path.join(distDir, 'release-index.html');

function runScript(scriptPath) {
  execFileSync(process.execPath, [scriptPath], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

if (!existsSync(manifestPath)) {
  runScript(path.join(__dirname, 'release-manifest.mjs'));
}
if (!existsSync(checksumsPath)) {
  runScript(path.join(__dirname, 'release-checksums.mjs'));
}
runScript(path.join(__dirname, 'release-report.mjs'));
runScript(path.join(__dirname, 'release-summary.mjs'));

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const releaseStatus = JSON.parse(readFileSync(statusPath, 'utf8'));
const signingBlockers = existsSync(signingBlockersJsonPath)
  ? JSON.parse(readFileSync(signingBlockersJsonPath, 'utf8'))
  : null;
const verification = existsSync(verificationJsonPath)
  ? JSON.parse(readFileSync(verificationJsonPath, 'utf8'))
  : null;
const generatedAt = new Date().toISOString();
const artifactManifestGeneratedAt = typeof manifest.generatedAt === 'string' ? manifest.generatedAt : 'unknown';

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

const artifactsHtml = manifest.artifacts.length > 0
  ? manifest.artifacts
      .map(
        (artifact) => `<tr>
          <td><a href="${escapeHtml(relativeLink(artifact.path))}">${escapeHtml(artifact.name)}</a></td>
          <td>${artifact.sizeBytes.toLocaleString()}</td>
          <td><code>${escapeHtml(artifact.sha256)}</code></td>
        </tr>`,
      )
      .join('\n')
  : '<tr><td colspan="3">No artifacts found.</td></tr>';

const resources = [
  ['Release manifest', manifestPath],
  ['Release status', statusPath],
  ...(existsSync(signingBlockersPath) ? [['Signing blockers report', signingBlockersPath]] : []),
  ...(existsSync(signingBlockersJsonPath) ? [['Signing blockers JSON', signingBlockersJsonPath]] : []),
  ...(existsSync(summaryPath) ? [['Release summary JSON', summaryPath]] : []),
  ...(existsSync(handoffPath) ? [['Release handoff', handoffPath]] : []),
  ...(existsSync(handoffJsonPath) ? [['Release handoff JSON', handoffJsonPath]] : []),
  ...(existsSync(handoffHtmlPath) ? [['Release handoff HTML', handoffHtmlPath]] : []),
  ...(existsSync(verificationPath) ? [['Release verification report', verificationPath]] : []),
  ...(existsSync(verificationJsonPath) ? [['Release verification JSON', verificationJsonPath]] : []),
  ...(existsSync(verificationHtmlPath) ? [['Release verification HTML', verificationHtmlPath]] : []),
  ['Checksums', checksumsPath],
  ['Release report', reportPath],
  ...(existsSync(bundleDir) ? [['Release bundle', bundleDir]] : []),
  ...(existsSync(archivePath) ? [['Release bundle archive', archivePath]] : []),
];

const resourcesHtml = resources
  .map(([label, filePath]) => `<li><a href="${escapeHtml(relativeLink(filePath))}">${escapeHtml(label)}</a></li>`)
  .join('\n');

const nextStepsHtml = Array.isArray(releaseStatus.nextSteps) && releaseStatus.nextSteps.length > 0
  ? releaseStatus.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('\n')
  : '<li>No outstanding signing steps.</li>';
const availableSignedCommandsHtml = releaseStatus && typeof releaseStatus.targets === 'object'
  ? Object.entries(releaseStatus.targets)
      .filter(([, entry]) => entry && typeof entry === 'object' && entry.ready === true && typeof entry.command === 'string')
      .map(([key, entry]) => `<li>${escapeHtml(key)}: <code>${escapeHtml(entry.command)}</code></li>`)
      .join('\n')
  : '';

const blockersHtml = Array.isArray(signingBlockers?.blockers) && signingBlockers.blockers.length > 0
  ? signingBlockers.blockers
      .map((item) => `<li>${escapeHtml(item.platform || 'Unknown')}: ${escapeHtml(item.label || 'Unknown')} = ${escapeHtml(item.value || 'unknown')}</li>`)
      .join('\n')
  : '<li>No signing blockers recorded.</li>';

const verificationChecks = verification && typeof verification === 'object' && verification.checks && typeof verification.checks === 'object'
  ? verification.checks
  : null;

const verificationSummaryHtml = verificationChecks
  ? Object.entries(verificationChecks)
      .map(([label, check]) => {
        const ok = check && typeof check === 'object' ? Boolean(check.ok) : false;
        const output = check && typeof check === 'object' && typeof check.output === 'string' ? check.output : 'No output';
        return `<li>${escapeHtml(label)}: <strong>${ok ? 'PASS' : 'FAIL'}</strong><br /><code>${escapeHtml(output)}</code></li>`;
      })
      .join('\n')
  : '<li>Release verification has not been generated yet.</li>';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>zkTalk Desktop Release Index</title>
    <style>
      body {
        margin: 0;
        background: #0b1020;
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        max-width: 1120px;
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
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      th, td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.14);
        vertical-align: top;
      }
      th {
        color: #93c5fd;
      }
      code {
        word-break: break-all;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>zkTalk Desktop Release Index</h1>
      <p>Generated at ${escapeHtml(generatedAt)}.<br />Artifact manifest generated at ${escapeHtml(artifactManifestGeneratedAt)}.</p>

      <section class="panel">
        <h2>Artifacts</h2>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Size (bytes)</th>
              <th>SHA256</th>
            </tr>
          </thead>
          <tbody>
            ${artifactsHtml}
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Readiness</h2>
        <p>macOS: ${escapeHtml(releaseStatus.summary?.macos || 'unknown')}<br />Windows: ${escapeHtml(releaseStatus.summary?.windows || 'unknown')}</p>
        <ul>
          ${nextStepsHtml}
        </ul>
      </section>

      <section class="panel">
        <h2>Signing Blockers</h2>
        <p>Primary command: <code>${escapeHtml(signingBlockers?.primaryCommand || 'unknown')}</code></p>
        <p>Signing env exists: <strong>${signingBlockers?.signingEnv?.exists === true ? 'YES' : 'NO'}</strong><br />Signing env loaded: <strong>${signingBlockers?.signingEnv?.loaded === true ? 'YES' : 'NO'}</strong></p>
        <ul>
          ${blockersHtml}
        </ul>
      </section>

      <section class="panel">
        <h2>Verification</h2>
        <p>Passed: ${escapeHtml(verification?.summary?.passedChecks ?? 'unknown')} / ${escapeHtml(verification?.summary?.totalChecks ?? 'unknown')}<br />Failed: ${escapeHtml(verification?.summary?.failedChecks ?? 'unknown')}</p>
        <ul>
          ${verificationSummaryHtml}
        </ul>
      </section>

      <section class="panel">
        <h2>Available Signed Release Commands</h2>
        <ul>
          ${availableSignedCommandsHtml || '<li>None</li>'}
        </ul>
      </section>

      <section class="panel">
        <h2>Release Resources</h2>
        <ul>
          ${resourcesHtml}
        </ul>
      </section>
    </main>
  </body>
</html>`;

writeFileSync(indexPath, html);
console.log(`Wrote release index: ${indexPath}`);
