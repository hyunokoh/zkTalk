#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createChildEnv, ensureDir, parseArgs, serializeError, writeJsonFile } from './smoke-common.mjs';

const repoRoot = process.cwd();
const timeoutBin = '/opt/homebrew/bin/timeout';
const resultPath = path.join(repoRoot, '.tmp', 'nightly-stabilize-last-result.json');

function timestampSlug(date = new Date()) {
  return date.toISOString().replaceAll(':', '-').replace(/\..+$/, 'Z');
}

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function runWithCapture({ command, args, timeoutSeconds, logPath, env }) {
  ensureDir(path.dirname(logPath));
  const fileHandle = fs.openSync(logPath, 'a');
  const startedAt = new Date().toISOString();

  try {
    execFileSync(timeoutBin, [String(timeoutSeconds), command, ...args], {
      cwd: repoRoot,
      env: createChildEnv(env),
      stdio: ['ignore', fileHandle, fileHandle],
    });

    return {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      command,
      args,
      timeoutSeconds,
      logPath,
    };
  } catch (error) {
    return {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      command,
      args,
      timeoutSeconds,
      logPath,
      error: serializeError(error),
    };
  } finally {
    fs.closeSync(fileHandle);
  }
}

function readZkcoderNext() {
  try {
    return execFileSync('zkcoder', ['next'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: createChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stdout = error?.stdout?.toString?.() ?? '';
    const stderr = error?.stderr?.toString?.() ?? '';
    return `${stdout}\n${stderr}`.trim();
  }
}

function hasPendingZkcoderWork(nextOutput) {
  if (!nextOutput) return false;
  return !(
    nextOutput.includes('모든 queue 항목이 완료되었습니다') ||
    nextOutput.includes('all queue items completed')
  );
}

function buildRounds({ device, webTimeoutSeconds, mobileTimeoutSeconds, apiPort, webPort }) {
  return [
    {
      id: 'selected-message-ai-shared-tests',
      command: 'pnpm',
      args: [
        '--filter',
        '@zktalk/shared',
        'test',
        '--',
        '--run',
        'src/__tests__/ai-selected-message.test.ts',
      ],
      timeoutSeconds: 5 * 60,
    },
    {
      id: 'selected-message-ai-web-tests',
      command: 'pnpm',
      args: [
        '--filter',
        '@zktalk/web',
        'test',
        '--',
        '--run',
        'src/lib/__tests__/selected-message-ai.test.ts',
        'src/app/(app)/communities/[slug]/channels/[channelId]/__tests__/page.test.tsx',
        'src/app/(app)/settings/ai/__tests__/page.test.tsx',
        'src/components/DmConversation/__tests__/DmConversation.test.tsx',
        'src/components/MessageComposer/__tests__/MessageComposer.test.tsx',
        'src/components/MessageItem/__tests__/MessageItem.test.tsx',
        'src/components/MessageList/__tests__/MessageList.test.tsx',
        'src/components/ThreadPanel/__tests__/ThreadPanel.test.tsx',
      ],
      timeoutSeconds: 10 * 60,
    },
    {
      id: 'web-core-smoke',
      command: '/bin/zsh',
      args: [
        '-lc',
        'node scripts/local-commercial-stack.mjs && node scripts/run-core-smoke.mjs',
      ],
      timeoutSeconds: webTimeoutSeconds,
      env: {
        CI: '1',
        ZKTALK_API_PORT: String(apiPort),
        ZKTALK_WEB_PORT: String(webPort),
      },
    },
    {
      id: 'mobile-channel-smoke',
      command: 'node',
      args: [
        'scripts/mobile-maestro-smoke.mjs',
        '--mode',
        'channel',
        '--app',
        'standalone',
        '--device',
        device,
        '--timeout-ms',
        '120000',
        '--maestro-timeout-ms',
        '30000',
      ],
      timeoutSeconds: mobileTimeoutSeconds,
    },
    {
      id: 'mobile-selected-message-ai',
      command: 'node',
      args: [
        'scripts/mobile-maestro-smoke.mjs',
        '--mode',
        'selected-message-ai',
        '--app',
        'standalone',
        '--device',
        device,
        '--timeout-ms',
        '120000',
        '--maestro-timeout-ms',
        '30000',
      ],
      timeoutSeconds: mobileTimeoutSeconds,
    },
  ];
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const device = flags.device ?? 'iPhone 15';
  const roundsDir = path.join(repoRoot, '.tmp', 'nightly-stabilize', 'runs');
  const maxRounds = toPositiveInt(flags.rounds, Number.POSITIVE_INFINITY);
  const restartSleepMs = toPositiveInt(flags['sleep-ms'], 15_000);
  const webTimeoutSeconds = toPositiveInt(flags['web-timeout-seconds'], 20 * 60);
  const mobileTimeoutSeconds = toPositiveInt(flags['mobile-timeout-seconds'], 8 * 60);
  const fallbackToZkcoder = flags['zkcoder-fallback'] !== 'false';

  let roundIndex = 0;
  let lastFailure = null;
  const rounds = [];

  while (roundIndex < maxRounds) {
    roundIndex += 1;
    const roundSlug = `${String(roundIndex).padStart(3, '0')}-${timestampSlug()}`;
    const roundDir = path.join(roundsDir, roundSlug);
    ensureDir(roundDir);
    const roundApiPort = 4400 + roundIndex;
    const roundWebPort = 3400 + roundIndex;
    const stepDefinitions = buildRounds({
      device,
      webTimeoutSeconds,
      mobileTimeoutSeconds,
      apiPort: roundApiPort,
      webPort: roundWebPort,
    });

    const roundResult = {
      round: roundIndex,
      startedAt: new Date().toISOString(),
      roundDir,
      apiPort: roundApiPort,
      webPort: roundWebPort,
      steps: [],
      zkcoder: null,
    };

    for (const step of stepDefinitions) {
      const logPath = path.join(roundDir, `${step.id}.log`);
      const stepResult = runWithCapture({
        command: step.command,
        args: step.args,
        timeoutSeconds: step.timeoutSeconds,
        logPath,
        env: step.env,
      });
      roundResult.steps.push({ id: step.id, ...stepResult });

      if (!stepResult.ok) {
        lastFailure = { round: roundIndex, step: step.id, logPath, error: stepResult.error };
        break;
      }
    }

    const nextOutput = readZkcoderNext();
    if (
      lastFailure &&
      lastFailure.round === roundIndex &&
      fallbackToZkcoder &&
      hasPendingZkcoderWork(nextOutput)
    ) {
      const zkcoderLogPath = path.join(roundDir, 'zkcoder-run-next.log');
      roundResult.zkcoder = runWithCapture({
        command: 'zkcoder',
        args: ['run-next'],
        timeoutSeconds: 45 * 60,
        logPath: zkcoderLogPath,
      });
    } else {
      roundResult.zkcoder = {
        ok: true,
        skipped: true,
        nextOutput,
      };
    }

    roundResult.finishedAt = new Date().toISOString();
    roundResult.ok = roundResult.steps.every((step) => step.ok) && (roundResult.zkcoder?.ok ?? true);
    rounds.push(roundResult);
    writeJsonFile(path.join(roundDir, 'result.json'), roundResult);
    writeJsonFile(resultPath, {
      ok: roundResult.ok,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAtMs,
      currentRound: roundIndex,
      device,
      lastFailure,
      latestRound: roundResult,
      rounds,
    });

    await new Promise((resolve) => setTimeout(resolve, restartSleepMs));
  }
}

main().catch((error) => {
  writeJsonFile(resultPath, {
    ok: false,
    finishedAt: new Date().toISOString(),
    error: serializeError(error),
  });
  console.error(error);
  process.exit(1);
});
