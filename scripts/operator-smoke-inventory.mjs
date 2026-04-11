#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');
const contractPath = path.join(repoRoot, 'e2e', 'core-smoke-contract.json');

function loadContract() {
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function buildInventory() {
  const contract = loadContract();

  return {
    generatedAt: new Date().toISOString(),
    objective:
      'Show the smallest high-value smoke tasks that can be automated repo-locally without reclassifying external credential or device blockers as code work.',
    triageOrder: [
      {
        step: 1,
        command: 'npm run release:next',
        reason: 'Refresh the current blocker snapshot before classifying anything as a new engineering task.',
      },
      {
        step: 2,
        command: 'npm run operator:handoff:check',
        reason: 'Confirm the snapshot still matches the blocker/status/checklist docs after edits or refreshes.',
      },
      {
        step: 3,
        command: 'npm run operator:smoke:inventory',
        reason: 'Choose the smallest current automation candidate before widening scope.',
      },
      {
        step: 4,
        command: '.zkcoder/scripts/verify.sh',
        reason: 'Separate repo-local regressions from credential, account, or device gaps.',
      },
    ],
    sourceOfTruth: {
      releaseReadinessChecklist: 'docs/release-readiness-checklist-2026-03-25.md',
      finalOperatorChecklist: 'docs/final-operator-checklist-2026-04-07.md',
      criticalPathVerificationMap: 'docs/critical-path-verification-map-2026-04-07.md',
      commercializationPlan: 'docs/COMMERCIALIZATION_PLAN.md',
      coreSmokeContract: 'e2e/core-smoke-contract.json',
    },
    automationCandidates: [
      {
        id: 'release-snapshot-refresh',
        tier: 'operator-shortcut',
        command: 'npm run release:next',
        value:
          'Refreshes the current blocker snapshot without depending on stale desktop dist state.',
        whenToRun:
          'Before escalation, and any time the question is whether the remaining release blockers are still external-only.',
        classification:
          'repo-local blocker classification; does not require signing credentials to run',
        prerequisites: [],
        coveredSignals: [
          'desktop readiness snapshot',
          'current signing-env presence',
          'next operator action',
        ],
      },
      {
        id: 'operator-handoff-check',
        tier: 'operator-doc guard',
        command: 'npm run operator:handoff:check',
        value:
          'Checks that the current release snapshot, blocker summary, status page, and final operator checklist still agree on the external-only blocker boundary.',
        whenToRun:
          'After operator-doc edits, queue regeneration, or any release-snapshot refresh that changes the current blocker narrative.',
        classification: 'repo-local deterministic verification',
        prerequisites: [],
        coveredSignals: [
          'snapshot-to-doc command alignment',
          'external-only blocker labels',
          'engineering escalation boundary',
        ],
      },
      {
        id: 'hardening-batch',
        tier: 'smallest regression gate',
        command: 'npm run verify:hardening',
        value:
          'Runs the thinnest credible repo-local guard for the current high-risk API/web runtime surfaces.',
        whenToRun:
          'Default for narrow runtime or doc hardening changes before widening to broader release-readiness checks.',
        classification: 'repo-local deterministic verification',
        prerequisites: ['package tooling installed'],
        coveredSignals: [
          'dirty-worktree preservation guard',
          'doc/runtime alignment checks',
          'mapped targeted API/web tests for changed high-risk files',
        ],
      },
      {
        id: 'release-readiness-batch',
        tier: 'operator-grade regression gate',
        command: 'npm run verify:release-readiness',
        value:
          'Combines targeted tests, local stack verification, and the current smallest browser core smoke into one release-readiness pass.',
        whenToRun:
          'Before claiming broader web/API release confidence or when separating code failure from environment readiness.',
        classification: 'repo-local deterministic verification',
        prerequisites: ['package tooling installed', 'documented local commercial stack available'],
        coveredSignals: [
          'all targeted API/web tests',
          'pnpm local:commercial:verify',
          contract.command,
        ],
      },
      {
        id: 'local-commercial-verify',
        tier: 'stack boundary isolator',
        command: 'pnpm local:commercial:verify',
        value:
          'Separates type/runtime stack availability from browser-smoke failures so operators can classify stack prerequisites cleanly.',
        whenToRun:
          'When the broad release-readiness batch fails and the next question is stack-versus-code.',
        classification: 'repo-local deterministic verification',
        prerequisites: ['package tooling installed', 'local commercial stack bootstrapable'],
        coveredSignals: ['local stack bootstrap', 'API typecheck', 'web typecheck'],
      },
      {
        id: 'web-core-smoke',
        tier: 'highest-value browser smoke',
        command: contract.command,
        value:
          'Runs the smallest explicit browser journey set that is stable enough to stay in the release-readiness path.',
        whenToRun:
          'When the local stack is available and operator-grade browser confidence is needed.',
        classification: 'repo-local deterministic verification',
        prerequisites: contract.prerequisites,
        coveredSignals: contract.journeys,
        excludedSignals: contract.excludedJourneys,
        specFiles: contract.specs,
      },
    ],
    keepManualOrExternal: [
      {
        id: 'storage-operator-gate',
        reason:
          'Object storage readiness is intentionally outside /api/health/ready and still needs real env inspection plus operator follow-up.',
        nextPath: 'docs/final-operator-checklist-2026-04-07.md#3a-storage-and-voice-operator-gates',
      },
      {
        id: 'voice-operator-gate',
        reason:
          'The current voice smoke is only a thin seeded join check, not a full operator-visible media validation.',
        nextPath: 'docs/final-operator-checklist-2026-04-07.md#3a-storage-and-voice-operator-gates',
      },
      {
        id: 'desktop-signing',
        reason:
          'macOS and Windows signing remain external credential and certificate blockers, not code smoke candidates.',
        nextPath: 'docs/current-release-next.md',
      },
      {
        id: 'real-device-ime',
        reason:
          'Korean IME final confidence still depends on a real iPhone and should remain an explicit device gate.',
        nextPath: 'docs/mobile-korean-ime-checklist-2026-03-26.md',
      },
    ],
  };
}

function printMarkdown(inventory) {
  const lines = [];

  lines.push('# zkTalk Operator Smoke Inventory');
  lines.push('');
  lines.push(`Generated at: ${inventory.generatedAt}`);
  lines.push('');
  lines.push(inventory.objective);
  lines.push('');
  lines.push('## Recommended triage order');
  lines.push('');

  for (const item of inventory.triageOrder) {
    lines.push(`- ${item.step}. \`${item.command}\`: ${item.reason}`);
  }

  lines.push('');
  lines.push('## Automatable smoke tasks');
  lines.push('');

  for (const task of inventory.automationCandidates) {
    lines.push(`### ${task.id}`);
    lines.push(`- Tier: ${task.tier}`);
    lines.push(`- Command: \`${task.command}\``);
    lines.push(`- Value: ${task.value}`);
    lines.push(`- When to run: ${task.whenToRun}`);
    lines.push(`- Classification: ${task.classification}`);
    if (task.prerequisites.length > 0) {
      lines.push(`- Prerequisites: ${task.prerequisites.join('; ')}`);
    }
    lines.push(`- Covered signals: ${task.coveredSignals.join('; ')}`);
    if (Array.isArray(task.excludedSignals) && task.excludedSignals.length > 0) {
      lines.push(`- Explicitly excluded: ${task.excludedSignals.join('; ')}`);
    }
    if (Array.isArray(task.specFiles) && task.specFiles.length > 0) {
      lines.push(`- Spec files: ${task.specFiles.join('; ')}`);
    }
    lines.push('');
  }

  lines.push('## Keep outside the automatable smoke queue');
  lines.push('');

  for (const item of inventory.keepManualOrExternal) {
    lines.push(`### ${item.id}`);
    lines.push(`- Reason: ${item.reason}`);
    lines.push(`- Next path: \`${item.nextPath}\``);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function main() {
  const inventory = buildInventory();

  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
    return;
  }

  process.stdout.write(printMarkdown(inventory));
}

main();
