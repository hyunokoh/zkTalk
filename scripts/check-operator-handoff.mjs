#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');
const snapshotPath = path.join(repoRoot, 'docs', 'current-release-next.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function expect(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

function triageStepAligned(item, docs) {
  if (
    typeof item?.step !== 'number' ||
    typeof item?.label !== 'string' ||
    typeof item?.command !== 'string' ||
    typeof item?.purpose !== 'string'
  ) {
    return false;
  }

  if (item.step === 1) {
    return (
      docs.currentReleaseMarkdown.includes(item.label) &&
      docs.finalOperatorChecklist.includes('docs/README.md') &&
      docs.finalOperatorChecklist.includes('docs/production-runtime-runbook.md') &&
      docs.finalOperatorChecklist.includes('docs/release-readiness-checklist-2026-03-25.md')
    );
  }

  return (
    docs.currentReleaseMarkdown.includes(item.label) &&
    (docs.finalOperatorChecklist.includes(item.command) ||
      docs.docsIndex.includes(item.command) ||
      docs.currentStatus.includes(item.command))
  );
}

function buildReport() {
  const failures = [];
  const snapshot = readJson(snapshotPath);

  const docPaths = {
    docsIndex: path.join(repoRoot, 'docs', 'README.md'),
    currentStatus: path.join(repoRoot, 'docs', 'CURRENT_STATUS.md'),
    blockerSummary: path.join(repoRoot, 'docs', 'current-blockers-2026-03-25.md'),
    finalOperatorChecklist: path.join(repoRoot, 'docs', 'final-operator-checklist-2026-04-07.md'),
    implementationPlan: path.join(repoRoot, 'docs', 'IMPLEMENTATION_PLAN.md'),
    visibilityMatrix: path.join(repoRoot, 'docs', 'community-visibility-matrix-2026-04-10.md'),
  };

  for (const [key, filePath] of Object.entries(docPaths)) {
    expect(fs.existsSync(filePath), `missing required handoff file: ${key}`, failures);
  }

  const docsIndex = readText(docPaths.docsIndex);
  const currentStatus = readText(docPaths.currentStatus);
  const blockerSummary = readText(docPaths.blockerSummary);
  const finalOperatorChecklist = readText(docPaths.finalOperatorChecklist);
  const implementationPlan = readText(docPaths.implementationPlan);
  const visibilityMatrix = readText(docPaths.visibilityMatrix);
  const currentReleaseMarkdown = readText(path.join(repoRoot, 'docs', 'current-release-next.md'));

  const primaryCommand = snapshot.desktop?.primaryCommand;
  const repoNext = snapshot.commands?.repoNext;
  const operatorInventory = snapshot.commands?.operatorSmokeInventory;
  const blockerLabels = Array.isArray(snapshot.topRemainingBlockers) ? snapshot.topRemainingBlockers : [];
  const externalOnlyBlockers = Array.isArray(snapshot.operatorHandoff?.externalOnlyBlockers)
    ? snapshot.operatorHandoff.externalOnlyBlockers
    : [];
  const manualOperatorGates = Array.isArray(snapshot.operatorHandoff?.manualOperatorGates)
    ? snapshot.operatorHandoff.manualOperatorGates
    : [];
  const triageSequence = Array.isArray(snapshot.operatorHandoff?.triageSequence)
    ? snapshot.operatorHandoff.triageSequence
    : [];
  const notCodeBlockers = Array.isArray(snapshot.operatorHandoff?.notCodeBlockers)
    ? snapshot.operatorHandoff.notCodeBlockers
    : [];
  const escalationRules = Array.isArray(snapshot.operatorHandoff?.engineeringEscalationRules)
    ? snapshot.operatorHandoff.engineeringEscalationRules
    : [];
  const blockerScope = snapshot.decisionBoundary?.blockerScope;

  expect(primaryCommand === 'npm run release:init-signing', 'unexpected primary operator command in snapshot', failures);
  expect(repoNext === 'npm run release:next', 'unexpected repo release:next command in snapshot', failures);
  expect(
    snapshot.commands?.operatorHandoffCheck === 'npm run operator:handoff:check',
    'unexpected operator handoff check command in snapshot',
    failures,
  );
  expect(
    operatorInventory === 'npm run operator:smoke:inventory',
    'unexpected operator smoke inventory command in snapshot',
    failures,
  );
  expect(blockerLabels.length === 3, 'snapshot should expose exactly three top remaining blockers', failures);
  expect(externalOnlyBlockers.length === 3, 'snapshot should expose exactly three external-only blocker records', failures);
  expect(manualOperatorGates.length === 4, 'snapshot should expose four manual operator gate records', failures);
  expect(triageSequence.length === 5, 'snapshot should expose five operator triage steps', failures);
  expect(notCodeBlockers.length >= 5, 'snapshot should expose the current non-code blocker guardrails', failures);
  expect(escalationRules.length === 4, 'snapshot should expose four engineering escalation rules', failures);

  for (const label of blockerLabels) {
    expect(currentStatus.includes(label), `current status is missing blocker label: ${label}`, failures);
    expect(blockerSummary.includes(label), `blocker summary is missing blocker label: ${label}`, failures);
  }

  expect(
    includesAll(finalOperatorChecklist, [
      'Run these in order before escalating anything as a new engineering blocker.',
      'npm run release:next',
      'npm run operator:handoff:check',
      'npm run operator:smoke:inventory',
      '.zkcoder/scripts/verify.sh',
    ]),
    'final operator checklist must preserve the ordered operator triage sequence',
    failures,
  );
  expect(
    includesAll(finalOperatorChecklist, [
      'mac signing / notarization',
      'Windows signing',
      'Mobile confidence gate',
      'Object storage gate',
      'Voice / LiveKit gate',
      'Operator-owned blocker ledger',
    ]),
    'final operator checklist is missing one or more external-only blocker sections',
    failures,
  );

  expect(
    docsIndex.includes(operatorInventory) &&
      docsIndex.includes(repoNext) &&
      docsIndex.includes('npm run operator:handoff:check') &&
      docsIndex.includes('.zkcoder/scripts/verify.sh'),
    'docs index must surface the release snapshot, operator handoff check, operator smoke inventory, and repo-local verify command',
    failures,
  );
  expect(
    currentStatus.includes(primaryCommand) && currentStatus.includes('external-only blockers'),
    'current status must preserve the signing init command and external-only blocker framing',
    failures,
  );
  expect(
    blockerSummary.includes('This document only lists current external release blockers and confidence gates.'),
    'blocker summary must preserve the external-only blocker boundary',
    failures,
  );
  expect(
    includesAll(finalOperatorChecklist, [
      'Do not overwrite, revert, stash, or clean user-authored local changes just to manufacture a clean git state for handoff.',
      'A dirty worktree is not a release blocker by itself.',
    ]),
    'final operator checklist must preserve the dirty-worktree handoff guardrail',
    failures,
  );
  expect(
    finalOperatorChecklist.includes('Escalate to engineering only when:'),
    'final operator checklist must preserve the engineering escalation boundary',
    failures,
  );
  expect(
    includesAll(finalOperatorChecklist, [
      'Phase 7 visibility policy:',
      'community-visibility-matrix-2026-04-10.md',
      'members_only',
      'invite_only',
      'private',
    ]),
    'final operator checklist must preserve the Phase 7 visibility policy anchor',
    failures,
  );
  expect(
    finalOperatorChecklist.includes('| Item | Owner | Unblock when | Repo-local evidence | Keep out of engineering when |'),
    'final operator checklist must preserve the operator-owned blocker ledger table',
    failures,
  );
  expect(
    implementationPlan.includes('## Phase 5') &&
      implementationPlan.includes('Prepare a strong operator handoff for the remaining non-code blockers.'),
    'implementation plan must preserve the Phase 5 operator-handoff objective',
    failures,
  );
  expect(
    includesAll(visibilityMatrix, [
      'Community Visibility Matrix (2026-04-10)',
      'This file is the Phase 7 source of truth',
      'members_only',
      'invite_only',
      'private',
      'update this file, the API reference, and the deterministic tests in the same batch',
    ]),
    'visibility matrix must preserve the Phase 7 source-of-truth policy and update rule',
    failures,
  );
  expect(
    typeof blockerScope === 'string' &&
      docsIndex.includes('This split is intentional so release owners and zkCoder do not re-open credential/device gaps as fake code tasks.') &&
      blockerScope.includes('External-only blockers stay in operator docs'),
    'blocker scope must stay aligned between the snapshot and docs index',
    failures,
  );
  expect(
    currentStatus.includes('Do not overwrite, revert, stash, or clean user-authored local changes') &&
      blockerSummary.includes('A dirty worktree is not a release blocker by itself.') &&
      docsIndex.includes('Do not overwrite, revert, stash, or clean user-authored local changes'),
    'status, blockers, and docs index must preserve the dirty-worktree preservation boundary',
    failures,
  );
  expect(
    currentReleaseMarkdown.includes('Visibility policy anchor:') &&
      currentReleaseMarkdown.includes('community-visibility-matrix-2026-04-10.md') &&
      currentStatus.includes('Phase 7 operator policy source of truth now lives in') &&
      docsIndex.includes('Community visibility matrix (2026-04-10)'),
    'release snapshot, current status, and docs index must all surface the Phase 7 visibility policy anchor',
    failures,
  );
  expect(
    triageSequence.every(
      (item) =>
        triageStepAligned(item, {
          docsIndex,
          currentStatus,
          currentReleaseMarkdown,
          finalOperatorChecklist,
        }),
    ),
    'structured operator triage steps should stay aligned between the snapshot and operator-facing docs',
    failures,
  );
  expect(
    notCodeBlockers.every(
      (item) => blockerSummary.includes(item) || currentStatus.includes(item) || currentReleaseMarkdown.includes(item),
    ),
    'non-code blocker guardrails should stay represented in handoff docs',
    failures,
  );
  expect(
    externalOnlyBlockers.every(
      (item) =>
        item.owner === 'operator' &&
        typeof item.label === 'string' &&
        typeof item.unblockWhen === 'string' &&
        finalOperatorChecklist.includes(item.label) &&
        finalOperatorChecklist.includes(item.unblockWhen) &&
        (blockerSummary.includes(item.label) || currentStatus.includes(item.label) || currentReleaseMarkdown.includes(item.label)),
    ),
    'external-only blocker records should stay aligned between the snapshot and operator checklist',
    failures,
  );
  expect(
    manualOperatorGates.every(
      (item) =>
        item.owner === 'operator' &&
        typeof item.label === 'string' &&
        typeof item.whenToRun === 'string' &&
        typeof item.unblockWhen === 'string' &&
        Array.isArray(item.repoLocalEvidence) &&
        item.repoLocalEvidence.length > 0 &&
        typeof item.keepOutOfEngineeringWhen === 'string' &&
        finalOperatorChecklist.includes(item.label) &&
        finalOperatorChecklist.includes(item.unblockWhen),
    ),
    'manual operator gate records should stay aligned between the snapshot and operator checklist',
    failures,
  );
  expect(
    escalationRules.every((rule) => finalOperatorChecklist.includes(rule) || currentReleaseMarkdown.includes(rule)),
    'engineering escalation rules should stay represented in operator-facing docs',
    failures,
  );

  return {
    generatedAt: new Date().toISOString(),
    snapshotGeneratedAt: snapshot.desktop?.generatedAt ?? null,
    primaryCommand,
    repoNext,
    operatorInventory,
    operatorTriageLabels: triageSequence.map((item) => item.label),
    manualOperatorGateLabels: manualOperatorGates.map((item) => item.label),
    blockerLabels,
    blockerScope,
    checkedFiles: Object.fromEntries(
      Object.entries(docPaths).map(([key, filePath]) => [key, path.relative(repoRoot, filePath)]),
    ),
    ok: failures.length === 0,
    failures,
  };
}

function printMarkdown(report) {
  const lines = [];

  lines.push('# zkTalk Operator Handoff Check');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Snapshot generated at: ${report.snapshotGeneratedAt ?? 'unknown'}`);
  lines.push('');
  lines.push(`Primary command: \`${report.primaryCommand}\``);
  lines.push(`Release snapshot command: \`${report.repoNext}\``);
  lines.push(`Operator smoke inventory: \`${report.operatorInventory}\``);
  lines.push('');
  lines.push('Checked operator triage steps:');
  for (const label of report.operatorTriageLabels) {
    lines.push(`- ${label}`);
  }
  lines.push('');
  lines.push('Checked blocker labels:');
  for (const label of report.blockerLabels) {
    lines.push(`- ${label}`);
  }
  lines.push('');
  lines.push('Checked manual operator gates:');
  for (const label of report.manualOperatorGateLabels) {
    lines.push(`- ${label}`);
  }
  lines.push('');
  lines.push(`Result: ${report.ok ? 'PASS' : 'FAIL'}`);
  if (!report.ok) {
    lines.push('');
    lines.push('Failures:');
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function main() {
  const report = buildReport();

  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(printMarkdown(report));
  }

  if (!report.ok) {
    process.exit(1);
  }
}

main();
