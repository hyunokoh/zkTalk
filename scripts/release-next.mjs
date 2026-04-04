import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'apps', 'desktop');
const docsDir = path.join(rootDir, 'docs');
const imeChecklistPath = path.join(rootDir, 'docs', 'mobile-korean-ime-checklist-2026-03-26.md');
const snapshotPath = path.join(docsDir, 'current-release-next.json');
const markdownSnapshotPath = path.join(docsDir, 'current-release-next.md');
const wantsJson = process.argv.includes('--json');

function runDesktopReleaseNext() {
  const args = [path.join(desktopDir, 'scripts', 'release-next.mjs'), '--json'];
  return execFileSync(process.execPath, args, {
    cwd: desktopDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const desktop = JSON.parse(runDesktopReleaseNext());
const payload = {
  desktop,
  mobile: {
    imeChecklist: imeChecklistPath,
  },
  commands: {
    repoNext: 'npm run release:next',
    repoNextJson: 'npm run release:next -- --json',
    imeReportInit: 'npm run ime:report:init',
    desktopNext: 'cd apps/desktop && npm run release:next',
    desktopNextJson: 'cd apps/desktop && npm run release:next -- --json',
  },
  snapshots: {
    markdown: markdownSnapshotPath,
    json: snapshotPath,
    desktopJson: path.join(rootDir, 'apps', 'desktop', 'dist', 'release-next.json'),
  },
  topRemainingBlockers: [
    'mac signing / notarization credentials',
    'Windows code-signing credentials',
    'Real iPhone Korean IME confirmation',
  ],
};

writeFileSync(snapshotPath, `${JSON.stringify(payload, null, 2)}\n`);

const markdownSnapshot = [
  '# zkTalk Current Release Next',
  '',
  `Generated at: ${typeof desktop.generatedAt === 'string' ? desktop.generatedAt : 'unknown'}`,
  '',
  '## Desktop Readiness',
  '',
  `- macOS: ${typeof desktop.readiness?.macos === 'string' ? desktop.readiness.macos : 'unknown'}`,
  `- Windows: ${typeof desktop.readiness?.windows === 'string' ? desktop.readiness.windows : 'unknown'}`,
  `- Signing env exists: ${desktop.signingEnv?.exists === true ? 'YES' : 'NO'}`,
  `- Signing env loaded: ${desktop.signingEnv?.loaded === true ? 'YES' : 'NO'}`,
  '',
  '## Primary Command',
  '',
  `- \`${typeof desktop.primaryCommand === 'string' ? desktop.primaryCommand : 'unknown'}\``,
  '',
  '## Commands',
  '',
  `- \`${payload.commands.repoNext}\``,
  `- \`${payload.commands.repoNextJson}\``,
  `- \`${payload.commands.desktopNext}\``,
  `- \`${payload.commands.desktopNextJson}\``,
  '',
  '## Blocking Items',
  '',
  ...(Array.isArray(desktop.blockers) && desktop.blockers.length > 0
    ? desktop.blockers.map((item) => {
        const platform = typeof item?.platform === 'string' ? item.platform : 'Unknown';
        const label = typeof item?.label === 'string' ? item.label : 'Unknown';
        const value = typeof item?.value === 'string' ? item.value : 'unknown';
        return `- ${platform}: ${label} = ${value}`;
      })
    : ['- None']),
  '',
  '## Next Steps',
  '',
  ...(Array.isArray(desktop.nextSteps) && desktop.nextSteps.length > 0
    ? desktop.nextSteps.map((step) => `- ${step}`)
    : ['- None']),
  '',
  '## Runbooks',
  '',
  `- Desktop signing runbook: \`${path.join(rootDir, 'apps', 'desktop', 'RELEASE.md')}\``,
  `- Mobile Korean IME checklist: \`${imeChecklistPath}\``,
  '',
  '## Snapshot Files',
  '',
  `- Repo JSON snapshot: \`${snapshotPath}\``,
  `- Desktop JSON snapshot: \`${path.join(rootDir, 'apps', 'desktop', 'dist', 'release-next.json')}\``,
].join('\n');

writeFileSync(markdownSnapshotPath, `${markdownSnapshot}\n`);

if (wantsJson) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

const desktopOutput = [
  `Generated at: ${typeof desktop.generatedAt === 'string' ? desktop.generatedAt : 'unknown'}`,
  `macOS readiness: ${typeof desktop.readiness?.macos === 'string' ? desktop.readiness.macos : 'unknown'}`,
  `Windows readiness: ${typeof desktop.readiness?.windows === 'string' ? desktop.readiness.windows : 'unknown'}`,
  `Signing env exists: ${desktop.signingEnv?.exists === true ? 'YES' : 'NO'}`,
  `Signing env loaded: ${desktop.signingEnv?.loaded === true ? 'YES' : 'NO'}`,
  '',
  `Primary command: ${typeof desktop.primaryCommand === 'string' ? desktop.primaryCommand : 'unknown'}`,
  '',
  'Blocking items:',
  ...(Array.isArray(desktop.blockers) && desktop.blockers.length > 0
    ? desktop.blockers.map((item) => {
        const platform = typeof item?.platform === 'string' ? item.platform : 'Unknown';
        const label = typeof item?.label === 'string' ? item.label : 'Unknown';
        const value = typeof item?.value === 'string' ? item.value : 'unknown';
        return `- ${platform}: ${label} = ${value}`;
      })
    : ['- None']),
  '',
  'Next steps:',
  ...(Array.isArray(desktop.nextSteps) && desktop.nextSteps.length > 0
    ? desktop.nextSteps.map((step) => `- ${step}`)
    : ['- None']),
  '',
  'Reports:',
  `- Markdown: ${typeof desktop.reports?.markdown === 'string' ? desktop.reports.markdown : 'unknown'}`,
  `- Release status: ${typeof desktop.reports?.releaseStatus === 'string' ? desktop.reports.releaseStatus : 'unknown'}`,
].join('\n');

const lines = [
  'zkTalk repo release next steps',
  '',
  desktopOutput,
  '',
  'Commands:',
  '- npm run release:next',
  '- npm run release:next -- --json',
  '- npm run ime:report:init',
  '- cd apps/desktop && npm run release:next',
  '- cd apps/desktop && npm run release:next -- --json',
  '',
  'Mobile confidence runbook:',
  `- Real-device Korean IME checklist: ${imeChecklistPath}`,
  `- JSON snapshot: ${snapshotPath}`,
  `- Markdown snapshot: ${markdownSnapshotPath}`,
  '',
  'Top remaining blockers:',
  '- mac signing / notarization credentials',
  '- Windows code-signing credentials',
  '- Real iPhone Korean IME confirmation',
];

process.stdout.write(`${lines.join('\n')}\n`);
