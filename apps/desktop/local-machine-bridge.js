const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MACHINE_TYPES = new Set(['desktop', 'laptop', 'buildbox', 'other']);
const CODEX_AUTH_STATES = new Set(['auth_present', 'auth_missing']);
const BRIDGE_PRESENCE_TIMEOUT_MS = 60_000;
const DEFAULT_AUTO_HEARTBEAT_INTERVAL_MS = 20_000;
const DEFAULT_CODEX_BIN = process.env.ZKTALK_LOCAL_CODEX_BIN || 'codex';
const DEFAULT_CODEX_TIMEOUT_MS = 5 * 60_000;
const MAX_RECENT_COMMAND_UPDATES = 40;
const MAX_OUTPUT_TEXT_CHARS = 12_000;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMachineType(value) {
  const normalized = normalizeText(value).toLowerCase();
  return MACHINE_TYPES.has(normalized) ? normalized : 'desktop';
}

function slugifyMachineName(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function getDefaultMachineName() {
  const hostname = normalizeText(os.hostname());
  return hostname || 'desktop';
}

function buildDefaultBridgeIdentifier(storePath) {
  const hostSlug = slugifyMachineName(getDefaultMachineName()) || 'desktop';
  const suffix = crypto.createHash('sha1').update(String(storePath)).digest('hex').slice(0, 8);
  return `desktop-loopback:${hostSlug}:${suffix}`;
}

function normalizeCodexAuthState(value) {
  const normalized = normalizeText(value).toLowerCase();
  return CODEX_AUTH_STATES.has(normalized) ? normalized : 'auth_missing';
}

function getCodexAuthCandidates() {
  const candidates = [];
  const codexHome = normalizeText(process.env.CODEX_HOME);
  if (codexHome) {
    candidates.push(path.join(codexHome, 'auth.json'));
  }
  candidates.push(path.join(os.homedir(), '.codex', 'auth.json'));
  return [...new Set(candidates)];
}

function resolveCodexAuthStateFromDisk() {
  for (const candidate of getCodexAuthCandidates()) {
    try {
      const stat = fs.statSync(candidate);
      if (!stat.isFile() || stat.size === 0) {
        continue;
      }
      const raw = fs.readFileSync(candidate, 'utf8').trim();
      if (raw.length > 0) {
        return 'auth_present';
      }
    } catch (_) {
      // Ignore missing or unreadable auth paths and keep looking.
    }
  }

  return 'auth_missing';
}

function ensureStoreDirectory(storePath) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
}

function readBridgeStore(storePath) {
  try {
    if (!fs.existsSync(storePath)) {
      return null;
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function writeBridgeStore(storePath, nextState) {
  ensureStoreDirectory(storePath);
  fs.writeFileSync(storePath, JSON.stringify(nextState, null, 2));
}

function truncateOutputText(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }

  if (normalized.length <= MAX_OUTPUT_TEXT_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_OUTPUT_TEXT_CHARS - 18).trimEnd()}\n...[truncated]`;
}

function trimRecentCommandUpdates(updates) {
  if (!Array.isArray(updates)) {
    return [];
  }

  if (updates.length <= MAX_RECENT_COMMAND_UPDATES) {
    return [...updates];
  }

  return updates.slice(-MAX_RECENT_COMMAND_UPDATES);
}

function resolveCodexTimeoutMs(value) {
  if (Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  const envValue = Number(process.env.ZKTALK_LOCAL_CODEX_TIMEOUT_MS);
  if (Number.isFinite(envValue) && envValue > 0) {
    return Math.trunc(envValue);
  }

  return DEFAULT_CODEX_TIMEOUT_MS;
}

function buildCommandUpdate(input) {
  return {
    commandId: normalizeText(input.commandId),
    targetMachineId: normalizeText(input.targetMachineId),
    owningUserId: normalizeText(input.owningUserId),
    status: input.status,
    summary: truncateOutputText(input.summary) || null,
    outputText: truncateOutputText(input.outputText) || null,
    errorCode: input.errorCode ?? null,
    createdAt: normalizeText(input.createdAt) || new Date().toISOString(),
  };
}

function resolveBridgePresence(input) {
  const bridgeIdentifier = normalizeText(input.bridgeIdentifier);
  const codexAuthState = normalizeCodexAuthState(input.codexAuthState);
  const activeCommandId = normalizeText(input.activeCommandId) || null;
  const lastHeartbeatAt = normalizeText(input.lastHeartbeatAt) || null;
  const stoppedAt = normalizeText(input.stoppedAt) || null;
  const nowIso = normalizeText(input.now) || new Date().toISOString();
  const timeoutMs =
    Number.isFinite(input.heartbeatTimeoutMs) && input.heartbeatTimeoutMs > 0
      ? Math.trunc(input.heartbeatTimeoutMs)
      : BRIDGE_PRESENCE_TIMEOUT_MS;
  const nowMs = Date.parse(nowIso);
  const heartbeatMs = lastHeartbeatAt ? Date.parse(lastHeartbeatAt) : Number.NaN;

  if (!bridgeIdentifier) {
    return {
      status: 'bridge_missing',
      codexAuthState,
      activeCommandId,
      lastSeenAt: lastHeartbeatAt,
      expiresAt: null,
    };
  }

  if (stoppedAt) {
    return {
      status: 'bridge_missing',
      codexAuthState,
      activeCommandId: null,
      lastSeenAt: lastHeartbeatAt,
      expiresAt: stoppedAt,
    };
  }

  if (!lastHeartbeatAt || !Number.isFinite(nowMs) || !Number.isFinite(heartbeatMs)) {
    return {
      status: 'bridge_missing',
      codexAuthState,
      activeCommandId,
      lastSeenAt: lastHeartbeatAt,
      expiresAt: lastHeartbeatAt,
    };
  }

  const expiresAt = new Date(heartbeatMs + timeoutMs).toISOString();
  if (heartbeatMs + timeoutMs < nowMs) {
    return {
      status: 'bridge_missing',
      codexAuthState,
      activeCommandId,
      lastSeenAt: lastHeartbeatAt,
      expiresAt,
    };
  }

  if (codexAuthState === 'auth_missing') {
    return {
      status: 'auth_missing',
      codexAuthState,
      activeCommandId,
      lastSeenAt: lastHeartbeatAt,
      expiresAt,
    };
  }

  return {
    status: activeCommandId ? 'busy' : 'online',
    codexAuthState,
    activeCommandId,
    lastSeenAt: lastHeartbeatAt,
    expiresAt,
  };
}

function buildBridgeSnapshot(store, now) {
  if (!store?.machine) {
    return {
      machine: null,
      presence: null,
      lastCommand: null,
      recentCommandUpdates: [],
      heartbeatTimeoutMs: BRIDGE_PRESENCE_TIMEOUT_MS,
      registered: false,
    };
  }

  const presence = resolveBridgePresence({
    bridgeIdentifier: store.machine.bridgeIdentifier,
    codexAuthState: store.heartbeat?.codexAuthState,
    activeCommandId: store.heartbeat?.activeCommandId,
    lastHeartbeatAt: store.heartbeat?.lastHeartbeatAt,
    stoppedAt: store.heartbeat?.stoppedAt,
    now,
  });
  const presenceSnapshot = {
    machineId: store.machine.id,
    ownerUserId: store.machine.ownerUserId,
    ...presence,
  };

  return {
    machine: {
      ...store.machine,
      presence: presenceSnapshot.status,
      lastSeenAt: presenceSnapshot.lastSeenAt,
      updatedAt: store.heartbeat?.lastHeartbeatAt || store.machine.updatedAt,
    },
    presence: presenceSnapshot,
    lastCommand: store.lastCommand || null,
    recentCommandUpdates: Array.isArray(store.recentCommandUpdates) ? store.recentCommandUpdates : [],
    heartbeatTimeoutMs: BRIDGE_PRESENCE_TIMEOUT_MS,
    registered: true,
  };
}

function registerLocalMachineBridge(storePath, input) {
  const existing = readBridgeStore(storePath);
  const now =
    normalizeText(input.now) ||
    normalizeText(existing?.heartbeat?.lastHeartbeatAt) ||
    new Date().toISOString();
  const ownerUserId = normalizeText(input.ownerUserId);
  const bridgeIdentifier = normalizeText(input.bridgeIdentifier);

  if (!ownerUserId) {
    throw new Error('ownerUserId is required for local machine registration.');
  }

  const machineId =
    normalizeText(existing?.machine?.id) ||
    `machine-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now()}`;
  const machine = {
    id: machineId,
    ownerUserId,
    name: normalizeText(input.name) || normalizeText(existing?.machine?.name) || getDefaultMachineName(),
    type: normalizeMachineType(input.type),
    bridgeIdentifier:
      bridgeIdentifier ||
      normalizeText(existing?.machine?.bridgeIdentifier) ||
      buildDefaultBridgeIdentifier(storePath),
    codexAuthState: 'auth_missing',
    presence: 'bridge_missing',
    lastSeenAt: null,
    createdAt: normalizeText(existing?.machine?.createdAt) || now,
    updatedAt: now,
  };

  writeBridgeStore(storePath, {
    machine,
    heartbeat: {
      codexAuthState: normalizeCodexAuthState(existing?.heartbeat?.codexAuthState),
      activeCommandId: normalizeText(existing?.heartbeat?.activeCommandId) || null,
      lastHeartbeatAt: normalizeText(existing?.heartbeat?.lastHeartbeatAt) || null,
      stoppedAt: null,
    },
    lastCommand: existing?.lastCommand || null,
    recentCommandUpdates: Array.isArray(existing?.recentCommandUpdates)
      ? existing.recentCommandUpdates
      : existing?.lastCommand
        ? [existing.lastCommand]
        : [],
  });

  return buildBridgeSnapshot(readBridgeStore(storePath), now);
}

function heartbeatLocalMachineBridge(storePath, input) {
  const existing = readBridgeStore(storePath);
  if (!existing?.machine) {
    throw new Error('Local machine bridge must be registered before heartbeat.');
  }

  const now = normalizeText(input.now) || new Date().toISOString();
  const ownerUserId = normalizeText(input.ownerUserId);
  if (ownerUserId !== existing.machine.ownerUserId) {
    throw new Error('Local machine bridge heartbeat owner mismatch.');
  }

  existing.heartbeat = {
    codexAuthState: normalizeText(input.codexAuthState)
      ? normalizeCodexAuthState(input.codexAuthState)
      : resolveCodexAuthStateFromDisk(),
    activeCommandId: normalizeText(input.activeCommandId) || null,
    lastHeartbeatAt: now,
    stoppedAt: null,
  };
  existing.machine.codexAuthState = existing.heartbeat.codexAuthState;
  existing.machine.updatedAt = now;

  const snapshot = buildBridgeSnapshot(existing, now);
  existing.machine.presence = snapshot.presence.status;
  existing.machine.lastSeenAt = snapshot.presence.lastSeenAt;
  existing.machine.updatedAt = now;
  writeBridgeStore(storePath, existing);
  return snapshot;
}

function getLocalMachineBridgeState(storePath, now) {
  return buildBridgeSnapshot(readBridgeStore(storePath), now);
}

function getRegisteredOwnerUserId(storePath) {
  const ownerUserId = normalizeText(readBridgeStore(storePath)?.machine?.ownerUserId);
  return ownerUserId || null;
}

function disconnectLocalMachineBridge(storePath, input = {}) {
  const existing = readBridgeStore(storePath);
  if (!existing?.machine) {
    return buildBridgeSnapshot(existing, input?.now);
  }

  const ownerUserId = normalizeText(input.ownerUserId);
  if (ownerUserId && ownerUserId !== existing.machine.ownerUserId) {
    throw new Error('Local machine bridge disconnect owner mismatch.');
  }

  const now = normalizeText(input.now) || new Date().toISOString();
  const lastHeartbeatAt = normalizeText(existing.heartbeat?.lastHeartbeatAt) || null;

  existing.heartbeat = {
    codexAuthState: normalizeCodexAuthState(existing.heartbeat?.codexAuthState),
    activeCommandId: null,
    lastHeartbeatAt,
    stoppedAt: now,
  };
  existing.machine.presence = 'bridge_missing';
  existing.machine.lastSeenAt = lastHeartbeatAt;
  existing.machine.updatedAt = now;
  writeBridgeStore(storePath, existing);
  return buildBridgeSnapshot(existing, now);
}

function ensureLocalMachineBridgeOnline(storePath, input) {
  const ownerUserId = normalizeText(input?.ownerUserId);
  if (!ownerUserId) {
    throw new Error('ownerUserId is required to ensure the local machine bridge is online.');
  }

  const existing = readBridgeStore(storePath);
  const machineOwnerUserId = normalizeText(existing?.machine?.ownerUserId);

  if (!existing?.machine || (machineOwnerUserId && machineOwnerUserId !== ownerUserId)) {
    registerLocalMachineBridge(storePath, {
      ownerUserId,
      name: normalizeText(input?.name) || getDefaultMachineName(),
      type: normalizeMachineType(input?.type),
      bridgeIdentifier:
        normalizeText(input?.bridgeIdentifier) || buildDefaultBridgeIdentifier(storePath),
      now: input?.now,
    });
  }

  return heartbeatLocalMachineBridge(storePath, {
    ownerUserId,
    codexAuthState: input?.codexAuthState,
    activeCommandId: input?.activeCommandId,
    now: input?.now,
  });
}

function mapExecutionFailure(error) {
  const message = normalizeText(error?.message);
  const stderr = normalizeText(error?.stderr);
  const haystack = [message, stderr].filter(Boolean).join('\n').toLowerCase();

  if (error?.code === 'ETIMEDOUT' || haystack.includes('timed out')) {
    return {
      errorCode: 'timed_out',
      summary: 'The local Codex command timed out before the target machine returned a final result.',
    };
  }

  if (
    error?.code === 'ENOENT' ||
    haystack.includes('auth') ||
    haystack.includes('login') ||
    haystack.includes('api key')
  ) {
    return {
      errorCode: 'auth_missing',
      summary: 'Local Codex CLI/auth is missing or unusable on the target machine.',
    };
  }

  return {
    errorCode: 'rejected',
    summary: message || 'The local machine bridge could not execute the Codex command.',
  };
}

function runLocalCodexCommand(envelope, options = {}) {
  const codexBin = normalizeText(options.codexBin) || DEFAULT_CODEX_BIN;
  const cwd = normalizeText(options.cwd) || process.cwd();
  const timeoutMs = resolveCodexTimeoutMs(options.timeoutMs);
  const args = [
    'exec',
    '--skip-git-repo-check',
    '--cd',
    cwd,
    '--sandbox',
    'workspace-write',
    '--json',
    envelope.instruction,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(codexBin, args, {
      cwd,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const streamedOutput = [];
    let stderr = '';
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    const handleOutput = (chunk) => {
      const lines = String(chunk)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        streamedOutput.push(line);
        options.onOutput?.(line);
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      stderr += text;
      handleOutput(text);
    });
    child.on('error', (error) => {
      clearTimeout(timeoutHandle);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeoutHandle);
      const outputText = streamedOutput.join('\n').trim() || null;
      if (timedOut) {
        const failure = new Error(`Local Codex command timed out after ${timeoutMs}ms.`);
        failure.code = 'ETIMEDOUT';
        failure.stderr = stderr.trim() || outputText || null;
        reject(failure);
        return;
      }

      if (code === 0) {
        resolve({
          completionSummary: 'The target machine bridge completed the command using local Codex.',
          completionOutputText: outputText,
        });
        return;
      }

      const failure = new Error(
        `Local Codex command exited with code ${typeof code === 'number' ? code : 'unknown'}.`,
      );
      failure.stderr = stderr.trim() || outputText || null;
      failure.exitCode = code;
      reject(failure);
    });
  });
}

async function dispatchLocalMachineCommand(storePath, input, options = {}) {
  const store = readBridgeStore(storePath);
  const envelope = input?.envelope;
  if (!store?.machine || !envelope || typeof envelope !== 'object') {
    throw new Error('Local machine bridge command dispatch requires a registered machine and envelope.');
  }

  const now = normalizeText(input.now) || new Date().toISOString();
  const machine = store.machine;
  const commandId = normalizeText(envelope.id);
  const targetMachineId = normalizeText(envelope.targetMachineId);
  const owningUserId = normalizeText(envelope.owningUserId);
  const instruction = normalizeText(envelope.instruction);
  const activeCommandId = normalizeText(store.heartbeat?.activeCommandId) || null;
  const presence = resolveBridgePresence({
    bridgeIdentifier: machine.bridgeIdentifier,
    codexAuthState: store.heartbeat?.codexAuthState,
    activeCommandId,
    lastHeartbeatAt: store.heartbeat?.lastHeartbeatAt,
    now,
  });

  const fail = (status, errorCode, summary) => {
    const update = buildCommandUpdate({
      commandId,
      targetMachineId: machine.id,
      owningUserId,
      status,
      errorCode,
      summary,
      createdAt: now,
    });
    store.lastCommand = update;
    store.recentCommandUpdates = trimRecentCommandUpdates([update]);
    writeBridgeStore(storePath, store);
    return {
      accepted: false,
      machine: { ...machine, presence: presence.status },
      presence,
      updates: [update],
    };
  };

  if (targetMachineId !== machine.id) {
    return fail('rejected', 'rejected', 'The command target does not match this registered machine.');
  }

  if (!commandId) {
    return fail('rejected', 'rejected', 'The local machine command is missing a command id.');
  }

  if (owningUserId !== machine.ownerUserId) {
    return fail('rejected', 'rejected', 'The connected bridge does not belong to the owning zkTalk user.');
  }

  if (!instruction) {
    return fail('rejected', 'rejected', 'The local machine command instruction is empty.');
  }

  if (presence.status !== 'online') {
    const errorCode =
      presence.status === 'busy' ||
      presence.status === 'auth_missing' ||
      presence.status === 'bridge_missing'
        ? presence.status
        : 'offline';
    const summary =
      errorCode === 'busy'
        ? 'The target machine is already executing another local command.'
        : errorCode === 'auth_missing'
          ? 'Local Codex auth is missing on the target machine.'
          : errorCode === 'bridge_missing'
            ? 'The target machine does not have an active local bridge.'
            : 'The target machine is offline.';
    return fail('failed', errorCode, summary);
  }

  if (activeCommandId && activeCommandId !== commandId) {
    return fail('failed', 'busy', 'The target machine is already executing another local command.');
  }

  store.heartbeat.activeCommandId = commandId;
  store.heartbeat.lastHeartbeatAt = now;
  store.machine.presence = 'busy';
  store.machine.updatedAt = now;
  writeBridgeStore(storePath, store);

  const updates = [
    buildCommandUpdate({
      commandId,
      targetMachineId: machine.id,
      owningUserId,
      status: 'accepted',
      summary: 'The target machine bridge accepted the command using local Codex.',
      createdAt: now,
    }),
  ];
  store.lastCommand = updates[0];
  store.recentCommandUpdates = trimRecentCommandUpdates(updates);
  writeBridgeStore(storePath, store);

  try {
    const runner = options.commandRunner || runLocalCodexCommand;
    const completion = await runner(
      {
        ...envelope,
        id: commandId,
        targetMachineId,
        owningUserId,
        instruction,
      },
      {
        codexBin: options.codexBin,
        cwd: options.cwd,
        env: options.env,
        timeoutMs: options.timeoutMs,
        onOutput(line) {
          updates.push(
            buildCommandUpdate({
              commandId,
              targetMachineId: machine.id,
              owningUserId,
              status: 'streaming',
              outputText: line,
            }),
          );
          store.lastCommand = updates[updates.length - 1];
          store.recentCommandUpdates = trimRecentCommandUpdates(updates);
          writeBridgeStore(storePath, store);
        },
      },
    );

    const completedAt = new Date().toISOString();
    updates.push(
      buildCommandUpdate({
        commandId,
        targetMachineId: machine.id,
        owningUserId,
        status: 'completed',
        summary: completion?.completionSummary,
        outputText: completion?.completionOutputText,
        createdAt: completedAt,
      }),
    );
    store.heartbeat.activeCommandId = null;
    store.heartbeat.lastHeartbeatAt = completedAt;
    store.machine.presence = 'online';
    store.machine.lastSeenAt = completedAt;
    store.machine.updatedAt = completedAt;
    store.lastCommand = updates[updates.length - 1];
    store.recentCommandUpdates = trimRecentCommandUpdates(updates);
    writeBridgeStore(storePath, store);

    return {
      accepted: true,
      machine: store.machine,
      presence: resolveBridgePresence({
        bridgeIdentifier: machine.bridgeIdentifier,
        codexAuthState: store.heartbeat?.codexAuthState,
        activeCommandId: store.heartbeat?.activeCommandId,
        lastHeartbeatAt: store.heartbeat?.lastHeartbeatAt,
        now: completedAt,
      }),
      updates,
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    const failure = mapExecutionFailure(error);
    updates.push(
      buildCommandUpdate({
        commandId,
        targetMachineId: machine.id,
        owningUserId,
        status: failure.errorCode === 'rejected' ? 'rejected' : 'failed',
        errorCode: failure.errorCode,
        summary: failure.summary,
        outputText: normalizeText(error?.stderr) || null,
        createdAt: failedAt,
      }),
    );
    store.heartbeat.activeCommandId = null;
    store.heartbeat.lastHeartbeatAt = failedAt;
    store.machine.presence = failure.errorCode === 'auth_missing' ? 'auth_missing' : 'online';
    if (failure.errorCode === 'auth_missing') {
      store.heartbeat.codexAuthState = 'auth_missing';
      store.machine.codexAuthState = 'auth_missing';
    }
    store.machine.lastSeenAt = failedAt;
    store.machine.updatedAt = failedAt;
    store.lastCommand = updates[updates.length - 1];
    store.recentCommandUpdates = trimRecentCommandUpdates(updates);
    writeBridgeStore(storePath, store);

    return {
      accepted: false,
      machine: store.machine,
      presence: resolveBridgePresence({
        bridgeIdentifier: machine.bridgeIdentifier,
        codexAuthState: store.heartbeat?.codexAuthState,
        activeCommandId: store.heartbeat?.activeCommandId,
        lastHeartbeatAt: store.heartbeat?.lastHeartbeatAt,
        now: failedAt,
      }),
      updates,
    };
  }
}

function createDesktopLoopbackBridge({
  statePath,
  commandRunner,
  codexBin,
  cwd,
  env,
  timeoutMs,
  autoHeartbeatIntervalMs = DEFAULT_AUTO_HEARTBEAT_INTERVAL_MS,
} = {}) {
  let autoHeartbeatTimer = null;
  let autoHeartbeatOwnerUserId = null;

  const stopAutoHeartbeat = () => {
    if (autoHeartbeatTimer) {
      clearInterval(autoHeartbeatTimer);
      autoHeartbeatTimer = null;
    }
  };

  const disconnect = (input = {}) => {
    stopAutoHeartbeat();
    autoHeartbeatOwnerUserId = null;
    return disconnectLocalMachineBridge(statePath, input);
  };

  const syncAutoHeartbeat = (input) => {
    const ownerUserId = normalizeText(input?.ownerUserId) || autoHeartbeatOwnerUserId;
    if (!ownerUserId) {
      return null;
    }

    return ensureLocalMachineBridgeOnline(statePath, {
      ...input,
      ownerUserId,
    });
  };

  const startAutoHeartbeat = (input) => {
    const normalizedOwnerUserId = normalizeText(input?.ownerUserId);
    if (!normalizedOwnerUserId) {
      throw new Error('ownerUserId is required to start desktop local machine auto-heartbeat.');
    }

    autoHeartbeatOwnerUserId = normalizedOwnerUserId;
    stopAutoHeartbeat();
    autoHeartbeatTimer = setInterval(() => {
      try {
        syncAutoHeartbeat({
          ownerUserId: normalizedOwnerUserId,
        });
      } catch (_) {
        // Keep background heartbeats fail-soft so the desktop shell remains usable.
      }
    }, autoHeartbeatIntervalMs);
    if (typeof autoHeartbeatTimer?.unref === 'function') {
      autoHeartbeatTimer.unref();
    }

    return syncAutoHeartbeat(input);
  };

  const restoreAutoHeartbeatFromStore = () => {
    const ownerUserId = getRegisteredOwnerUserId(statePath);
    if (!ownerUserId) {
      return;
    }

    try {
      startAutoHeartbeat({ ownerUserId });
    } catch (_) {
      // Keep startup fail-soft so a stale bridge store cannot block the desktop shell.
    }
  };

  restoreAutoHeartbeatFromStore();

  return {
    getSnapshot(now) {
      return getLocalMachineBridgeState(statePath, now);
    },
    registerMachine(input) {
      const snapshot = registerLocalMachineBridge(statePath, input);
      return startAutoHeartbeat({
        ...input,
        ownerUserId: snapshot.machine?.ownerUserId,
      });
    },
    heartbeat(input) {
      return heartbeatLocalMachineBridge(statePath, input);
    },
    ensureOnline(input) {
      return startAutoHeartbeat(input);
    },
    dispatchCommand(input) {
      return dispatchLocalMachineCommand(statePath, input, {
        commandRunner,
        codexBin,
        cwd,
        env,
        timeoutMs,
      });
    },
    stopAutoHeartbeat,
    disconnect,
  };
}

module.exports = {
  BRIDGE_PRESENCE_TIMEOUT_MS,
  createDesktopLoopbackBridge,
  disconnectLocalMachineBridge,
  dispatchLocalMachineCommand,
  ensureLocalMachineBridgeOnline,
  getLocalMachineBridgeState,
  getRegisteredOwnerUserId,
  heartbeatLocalMachineBridge,
  registerLocalMachineBridge,
  resolveCodexTimeoutMs,
  resolveBridgePresence,
  runLocalCodexCommand,
};
