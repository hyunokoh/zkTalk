import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const verificationReportPath = path.join(distDir, 'release-verification.md');
const verificationJsonPath = path.join(distDir, 'release-verification.json');
const verificationHtmlPath = path.join(distDir, 'release-verification.html');
const manifestPath = path.join(distDir, 'release-manifest.json');
const checksumsPath = path.join(distDir, 'SHA256SUMS.txt');
const bundleDir = path.join(distDir, 'release-bundle');
const archivePath = path.join(distDir, 'zkTalk-desktop-release-bundle.tar.gz');

function ensureExists(filePath, scriptFile) {
  if (existsSync(filePath)) {
    return;
  }

  execFileSync(process.execPath, [path.join(__dirname, scriptFile)], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
}

function runVerification(args) {
  try {
    const output = execFileSync(process.execPath, args, {
      cwd: desktopDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      ok: true,
      output: output.trim(),
    };
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    return {
      ok: false,
      output: [stdout, stderr].filter(Boolean).join('\n').trim(),
    };
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

ensureExists(manifestPath, 'release-manifest.mjs');
ensureExists(checksumsPath, 'release-checksums.mjs');
ensureExists(bundleDir, 'release-bundle.mjs');
ensureExists(archivePath, 'release-archive.mjs');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const distVerification = runVerification([path.join(__dirname, 'release-verify.mjs')]);
const bundleVerification = runVerification([path.join(__dirname, 'release-verify.mjs'), '--bundle']);
const archiveVerification = runVerification([path.join(__dirname, 'release-verify-archive.mjs')]);

const checkEntries = [
  ['Dist', distVerification],
  ['Bundle', bundleVerification],
  ['Archive', archiveVerification],
];
const passCount = checkEntries.filter(([, check]) => check.ok).length;
const failCount = checkEntries.length - passCount;

const verification = {
  generatedAt: new Date().toISOString(),
  artifacts: Array.isArray(manifest.artifacts) ? manifest.artifacts.map((artifact) => artifact.name) : [],
  summary: {
    totalChecks: checkEntries.length,
    passedChecks: passCount,
    failedChecks: failCount,
  },
  checks: {
    dist: distVerification,
    bundle: bundleVerification,
    archive: archiveVerification,
  },
  paths: {
    manifest: manifestPath,
    checksums: checksumsPath,
    bundleDir,
    archive: archivePath,
    verificationHtml: verificationHtmlPath,
  },
};

const markdown = [
  '# zkTalk Desktop Release Verification',
  '',
  `Generated at: ${verification.generatedAt}`,
  '',
  '## Artifact Count',
  '',
  `- ${verification.artifacts.length} installer artifact(s)`,
  '',
  '## Dist Verification',
  '',
  `- Status: ${distVerification.ok ? 'PASS' : 'FAIL'}`,
  '',
  '```text',
  distVerification.output || 'No output',
  '```',
  '',
  '## Bundle Verification',
  '',
  `- Status: ${bundleVerification.ok ? 'PASS' : 'FAIL'}`,
  '',
  '```text',
  bundleVerification.output || 'No output',
  '```',
  '',
  '## Archive Verification',
  '',
  `- Status: ${archiveVerification.ok ? 'PASS' : 'FAIL'}`,
  '',
  '```text',
  archiveVerification.output || 'No output',
  '```',
  '',
  '## Paths',
  '',
  `- Manifest: \`${manifestPath}\``,
  `- Checksums: \`${checksumsPath}\``,
  `- Bundle dir: \`${bundleDir}\``,
  `- Archive: \`${archivePath}\``,
].join('\n');

const checksHtml = checkEntries
  .map(
    ([label, check]) => `<section class="panel">
      <h2>${escapeHtml(label)} Verification</h2>
      <p>Status: <strong class="${check.ok ? 'ok' : 'fail'}">${check.ok ? 'PASS' : 'FAIL'}</strong></p>
      <pre>${escapeHtml(check.output || 'No output')}</pre>
    </section>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>zkTalk Desktop Release Verification</title>
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
      .panel {
        margin-top: 24px;
        padding: 20px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
      .summary {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      }
      .stat {
        padding: 16px;
        border-radius: 12px;
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.16);
      }
      .stat strong {
        display: block;
        margin-top: 8px;
        font-size: 24px;
      }
      .ok {
        color: #86efac;
      }
      .fail {
        color: #fca5a5;
      }
      pre, code {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12px;
      }
      pre {
        margin: 0;
        padding: 16px;
        border-radius: 12px;
        background: rgba(2, 6, 23, 0.85);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      ul {
        padding-left: 20px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>zkTalk Desktop Release Verification</h1>
      <p>Generated at ${escapeHtml(verification.generatedAt)}.</p>

      <section class="panel">
        <h2>Summary</h2>
        <div class="summary">
          <div class="stat">
            Checks
            <strong>${escapeHtml(verification.summary.totalChecks)}</strong>
          </div>
          <div class="stat">
            Passed
            <strong class="ok">${escapeHtml(verification.summary.passedChecks)}</strong>
          </div>
          <div class="stat">
            Failed
            <strong class="${failCount > 0 ? 'fail' : 'ok'}">${escapeHtml(verification.summary.failedChecks)}</strong>
          </div>
          <div class="stat">
            Installers
            <strong>${escapeHtml(verification.artifacts.length)}</strong>
          </div>
        </div>
      </section>

      ${checksHtml}

      <section class="panel">
        <h2>Paths</h2>
        <ul>
          <li>Manifest: <code>${escapeHtml(manifestPath)}</code></li>
          <li>Checksums: <code>${escapeHtml(checksumsPath)}</code></li>
          <li>Bundle dir: <code>${escapeHtml(bundleDir)}</code></li>
          <li>Archive: <code>${escapeHtml(archivePath)}</code></li>
        </ul>
      </section>
    </main>
  </body>
</html>`;

writeFileSync(verificationReportPath, `${markdown}\n`);
writeFileSync(verificationJsonPath, `${JSON.stringify(verification, null, 2)}\n`);
writeFileSync(verificationHtmlPath, `${html}\n`);

console.log(`Wrote release verification report: ${verificationReportPath}`);
console.log(`Wrote release verification data: ${verificationJsonPath}`);
console.log(`Wrote release verification HTML: ${verificationHtmlPath}`);
