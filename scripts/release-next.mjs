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
const docsIndexPath = path.join(docsDir, 'README.md');
const currentStatusPath = path.join(docsDir, 'CURRENT_STATUS.md');
const blockersPath = path.join(docsDir, 'current-blockers-2026-03-25.md');
const runtimeRunbookPath = path.join(docsDir, 'production-runtime-runbook.md');
const finalOperatorChecklistPath = path.join(
  docsDir,
  'final-operator-checklist-2026-04-07.md',
);
const commercializationPlanPath = path.join(docsDir, 'COMMERCIALIZATION_PLAN.md');
const implementationPlanPath = path.join(docsDir, 'IMPLEMENTATION_PLAN.md');
const visibilityMatrixPath = path.join(docsDir, 'community-visibility-matrix-2026-04-10.md');
const desktopReleasePath = path.join(rootDir, 'apps', 'desktop', 'RELEASE.md');
const wantsJson = process.argv.includes('--json');
const externalOnlyBlockers = [
  {
    id: 'mac-signing',
    label: 'mac signing / notarization credentials',
    owner: 'operator',
    unblockWhen:
      'A real Developer ID certificate and Apple notarization credentials are available in signing.env or an explicit env override.',
  },
  {
    id: 'windows-signing',
    label: 'Windows code-signing credentials',
    owner: 'operator',
    unblockWhen:
      'A real Windows code-signing certificate and password are available in signing.env or an explicit env override.',
  },
  {
    id: 'iphone-ime',
    label: 'Real iPhone Korean IME confirmation',
    owner: 'operator',
    unblockWhen:
      'The physical-device Korean IME checklist has been run once and recorded with a real iPhone result.',
  },
];
const notCodeBlockers = [
  'Missing signing.env in a fresh workspace',
  'A cleaned apps/desktop/dist directory',
  'A dirty worktree that still contains active user-authored changes',
  'Credential placeholders or missing certificates in the current operator environment',
  'Real-device confirmation work that cannot be completed repo-locally',
];
const operatorTriageSequence = [
  {
    step: 1,
    label: 'Read deploy/runtime authority first',
    command: 'docs/README.md -> docs/production-runtime-runbook.md -> docs/release-readiness-checklist-2026-03-25.md',
    purpose:
      'Start from the runtime and verification source of truth before classifying a blocker.',
  },
  {
    step: 2,
    label: 'Refresh the current release snapshot',
    command: 'npm run release:next',
    purpose:
      'Regenerate the repo-local blocker snapshot so operators do not reason from stale dist state.',
  },
  {
    step: 3,
    label: 'Recheck operator-doc alignment after snapshot/doc edits',
    command: 'npm run operator:handoff:check',
    purpose:
      'Confirm the blocker summary, current status, final operator checklist, and snapshot still agree.',
  },
  {
    step: 4,
    label: 'Use the smallest automation shortlist before widening scope',
    command: 'npm run operator:smoke:inventory',
    purpose:
      'Pick the current smallest repo-local smoke command instead of reopening broad engineering work.',
  },
  {
    step: 5,
    label: 'Separate code failures from operator/environment gaps',
    command: '.zkcoder/scripts/verify.sh',
    purpose:
      'If repo-local verification passes, keep credentials, accounts, and device needs in operator docs.',
  },
];
const engineeringEscalationRules = [
  'Escalate to engineering only when a documented repo-local verification command fails unexpectedly.',
  'Escalate to engineering only when release snapshots contradict the current source-of-truth docs.',
  'Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.',
  'If the next action still requires credentials, account access, or a physical device, keep it in operator/blocker docs instead of reopening code work.',
];
const manualOperatorGates = [
  {
    id: 'desktop-signing-credentials',
    label: 'Desktop signing credential gate',
    classification: 'external-only blocker',
    owner: 'operator',
    whenToRun:
      'Before attempting signed macOS or Windows release commands, or any time the question is whether signed release readiness changed.',
    unblockWhen:
      'A real signing.env or explicit env override exists and all Apple/Windows signing values are real rather than placeholders.',
    repoLocalEvidence: [
      'npm run release:next',
      'apps/desktop/dist/signing-blockers.md',
      'apps/desktop/dist/signing-blockers.json',
      'apps/desktop/RELEASE.md',
    ],
    keepOutOfEngineeringWhen:
      'The only missing inputs are signing credentials, certificates, or signed artifact generation in the current workspace snapshot.',
  },
  {
    id: 'real-device-ime',
    label: 'Real-device Korean IME gate',
    classification: 'external-only blocker',
    owner: 'operator',
    whenToRun:
      'Before claiming final mobile confidence beyond simulator coverage.',
    unblockWhen:
      'The physical-device Korean IME checklist has been executed once and recorded with a real iPhone result.',
    repoLocalEvidence: [
      'docs/mobile-korean-ime-checklist-2026-03-26.md',
      'docs/mobile-korean-ime-report-template-2026-03-26.md',
    ],
    keepOutOfEngineeringWhen:
      'Simulator validation is green and the remaining gap is only the physical-device confirmation pass.',
  },
  {
    id: 'storage-operator-gate',
    label: 'Object storage operator gate',
    classification: 'manual operator gate',
    owner: 'operator',
    whenToRun:
      'Before claiming attachment upload/download readiness in a target deployment.',
    unblockWhen:
      'Real storage env values are present, /api/health/ready still excludes storage by design, and the separate storage gate passes.',
    repoLocalEvidence: [
      '/api/health/ready',
      'npm run verify:release-readiness',
      'docs/final-operator-checklist-2026-04-07.md#3a-storage-and-voice-operator-gates',
    ],
    keepOutOfEngineeringWhen:
      'Baseline readiness is green and the remaining uncertainty is deploy-time S3/MinIO configuration rather than a reproduced repo defect.',
  },
  {
    id: 'voice-operator-gate',
    label: 'Voice / LiveKit operator gate',
    classification: 'manual operator gate',
    owner: 'operator',
    whenToRun:
      'Before claiming voice/video readiness in a target deployment.',
    unblockWhen:
      'Real LiveKit env values are present, /api/health/ready still excludes voice by design, and the separate voice gate passes.',
    repoLocalEvidence: [
      '/api/health/ready',
      'npm run verify:release-readiness',
      'docs/final-operator-checklist-2026-04-07.md#3a-storage-and-voice-operator-gates',
    ],
    keepOutOfEngineeringWhen:
      'Baseline readiness is green and the remaining uncertainty is LiveKit/operator setup rather than a reproduced repo defect.',
  },
];

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
    operatorHandoffCheck: 'npm run operator:handoff:check',
    operatorSmokeInventory: 'npm run operator:smoke:inventory',
    imeReportInit: 'npm run ime:report:init',
    desktopNext: 'cd apps/desktop && npm run release:next',
    desktopNextJson: 'cd apps/desktop && npm run release:next -- --json',
  },
  snapshots: {
    markdown: markdownSnapshotPath,
    json: snapshotPath,
    desktopJson: path.join(rootDir, 'apps', 'desktop', 'dist', 'release-next.json'),
  },
  sourceOfTruth: {
    docsIndex: docsIndexPath,
    currentStatus: currentStatusPath,
    blockerSummary: blockersPath,
    runtimeRunbook: runtimeRunbookPath,
    finalOperatorChecklist: finalOperatorChecklistPath,
    commercializationPlan: commercializationPlanPath,
    implementationPlan: implementationPlanPath,
    visibilityMatrix: visibilityMatrixPath,
    desktopReleaseRunbook: desktopReleasePath,
    mobileImeChecklist: imeChecklistPath,
  },
  decisionBoundary: {
    unsignedHandoffReady: true,
    signedProductionReady: false,
    blockerScope:
      'External-only blockers stay in operator docs; repo-local hardening and regression work stay in the engineering queue.',
  },
  operatorHandoff: {
    externalOnlyBlockers,
    manualOperatorGates,
    triageSequence: operatorTriageSequence,
    notCodeBlockers,
    engineeringEscalationRules,
  },
  topRemainingBlockers: externalOnlyBlockers.map((blocker) => blocker.label),
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
  `- \`${payload.commands.operatorHandoffCheck}\``,
  `- \`${payload.commands.operatorSmokeInventory}\``,
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
  '## Decision Boundary',
  '',
  `- Unsigned handoff ready: ${payload.decisionBoundary.unsignedHandoffReady ? 'YES' : 'NO'}`,
  `- Signed production ready: ${payload.decisionBoundary.signedProductionReady ? 'YES' : 'NO'}`,
  `- Blocker scope: ${payload.decisionBoundary.blockerScope}`,
  '- Visibility policy anchor: `docs/community-visibility-matrix-2026-04-10.md` is the source of truth for public-community discovery, locked `members_only` / `invite_only` rows, hidden `private` channels, and post-join unlock assumptions.',
  '',
  '## External-Only Blockers',
  '',
  ...payload.operatorHandoff.externalOnlyBlockers.map(
    (blocker) => `- ${blocker.label}: ${blocker.unblockWhen}`,
  ),
  '',
  '## Manual Operator Gates',
  '',
  ...payload.operatorHandoff.manualOperatorGates.flatMap((gate) => [
    `- ${gate.label} (${gate.classification})`,
    `  - When to run: ${gate.whenToRun}`,
    `  - Unblock when: ${gate.unblockWhen}`,
    `  - Repo-local evidence: ${gate.repoLocalEvidence.join('; ')}`,
    `  - Keep out of engineering when: ${gate.keepOutOfEngineeringWhen}`,
  ]),
  '',
  '## Operator Triage Order',
  '',
  ...payload.operatorHandoff.triageSequence.map(
    (item) => `- ${item.step}. ${item.label}: \`${item.command}\` (${item.purpose})`,
  ),
  '',
  '## Do Not Reopen As Code Blockers',
  '',
  ...payload.operatorHandoff.notCodeBlockers.map((item) => `- ${item}`),
  '',
  '## Reopen Engineering Only When',
  '',
  ...payload.operatorHandoff.engineeringEscalationRules.map((rule) => `- ${rule}`),
  '- Escalate to engineering only when a visibility-policy change updates the matrix, API reference, and deterministic tests together rather than reopening the policy from operator notes alone.',
  '',
  '## Runbooks',
  '',
  `- Desktop signing runbook: \`${path.join(rootDir, 'apps', 'desktop', 'RELEASE.md')}\``,
  `- Mobile Korean IME checklist: \`${imeChecklistPath}\``,
  `- Final operator checklist: \`${finalOperatorChecklistPath}\``,
  '',
  '## Source Of Truth',
  '',
  `- Docs index: \`${docsIndexPath}\``,
  `- Current status: \`${currentStatusPath}\``,
  `- Blocker summary: \`${blockersPath}\``,
  `- Runtime runbook: \`${runtimeRunbookPath}\``,
  `- Final operator checklist: \`${finalOperatorChecklistPath}\``,
  `- Commercialization plan: \`${commercializationPlanPath}\``,
  `- Implementation plan: \`${implementationPlanPath}\``,
  `- Visibility matrix: \`${visibilityMatrixPath}\``,
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
  'Decision boundary:',
  `- Unsigned handoff ready: ${payload.decisionBoundary.unsignedHandoffReady ? 'YES' : 'NO'}`,
  `- Signed production ready: ${payload.decisionBoundary.signedProductionReady ? 'YES' : 'NO'}`,
  `- ${payload.decisionBoundary.blockerScope}`,
  '',
  'External-only blockers:',
  ...payload.operatorHandoff.externalOnlyBlockers.map(
    (blocker) => `- ${blocker.label}: ${blocker.unblockWhen}`,
  ),
  '',
  'Manual operator gates:',
  ...payload.operatorHandoff.manualOperatorGates.flatMap((gate) => [
    `- ${gate.label} (${gate.classification})`,
    `  When to run: ${gate.whenToRun}`,
    `  Unblock when: ${gate.unblockWhen}`,
    `  Repo-local evidence: ${gate.repoLocalEvidence.join('; ')}`,
    `  Keep out of engineering when: ${gate.keepOutOfEngineeringWhen}`,
  ]),
  '',
  'Operator triage order:',
  ...payload.operatorHandoff.triageSequence.map(
    (item) => `- ${item.step}. ${item.label}: ${item.command} (${item.purpose})`,
  ),
  '',
  'Do not reopen as code blockers:',
  ...payload.operatorHandoff.notCodeBlockers.map((item) => `- ${item}`),
  '',
  'Reopen engineering only when:',
  ...payload.operatorHandoff.engineeringEscalationRules.map((rule) => `- ${rule}`),
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
  '- npm run operator:handoff:check',
  '- npm run operator:smoke:inventory',
  '- npm run ime:report:init',
  '- cd apps/desktop && npm run release:next',
  '- cd apps/desktop && npm run release:next -- --json',
  '',
  'Mobile confidence runbook:',
  `- Real-device Korean IME checklist: ${imeChecklistPath}`,
  `- JSON snapshot: ${snapshotPath}`,
  `- Markdown snapshot: ${markdownSnapshotPath}`,
  '',
  'Source of truth:',
  `- Docs index: ${docsIndexPath}`,
  `- Current status: ${currentStatusPath}`,
  `- Blocker summary: ${blockersPath}`,
  `- Runtime runbook: ${runtimeRunbookPath}`,
  `- Final operator checklist: ${finalOperatorChecklistPath}`,
  `- Commercialization plan: ${commercializationPlanPath}`,
  `- Implementation plan: ${implementationPlanPath}`,
  `- Desktop release runbook: ${desktopReleasePath}`,
  '',
  'Top remaining blockers:',
  ...payload.topRemainingBlockers.map((blocker) => `- ${blocker}`),
];

process.stdout.write(`${lines.join('\n')}\n`);
