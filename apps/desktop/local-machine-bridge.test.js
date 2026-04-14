const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  BRIDGE_PRESENCE_TIMEOUT_MS,
  createDesktopLoopbackBridge,
  disconnectLocalMachineBridge,
  dispatchLocalMachineCommand,
  ensureLocalMachineBridgeOnline,
  getLocalMachineBridgeState,
  heartbeatLocalMachineBridge,
  registerLocalMachineBridge,
  resolveBridgePresence,
} = require('./local-machine-bridge');

function createStorePath() {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'zktalk-local-machine-bridge-')),
    'local-machine-bridge.json',
  );
}

test('resolveBridgePresence keeps online, busy, auth_missing, and bridge_missing explicit', () => {
  assert.equal(
    resolveBridgePresence({
      bridgeIdentifier: 'bridge-1',
      codexAuthState: 'auth_present',
      lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
      now: '2026-04-12T14:00:30.000Z',
    }).status,
    'online',
  );

  assert.equal(
    resolveBridgePresence({
      bridgeIdentifier: 'bridge-1',
      codexAuthState: 'auth_present',
      activeCommandId: 'command-1',
      lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
      now: '2026-04-12T14:00:30.000Z',
    }).status,
    'busy',
  );

  assert.equal(
    resolveBridgePresence({
      bridgeIdentifier: 'bridge-1',
      codexAuthState: 'auth_missing',
      lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
      now: '2026-04-12T14:00:30.000Z',
    }).status,
    'auth_missing',
  );

  assert.equal(
    resolveBridgePresence({
      bridgeIdentifier: 'bridge-1',
      codexAuthState: 'auth_present',
      lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
      now: '2026-04-12T14:01:01.000Z',
    }).status,
    'bridge_missing',
  );
});

test('registerLocalMachineBridge persists a stable named machine and starts fail-closed', () => {
  const storePath = createStorePath();
  const snapshot = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-1',
    now: '2026-04-12T14:00:00.000Z',
  });

  assert.equal(snapshot.registered, true);
  assert.equal(snapshot.machine.ownerUserId, 'user-1');
  assert.equal(snapshot.machine.name, 'Operator Desktop');
  assert.equal(snapshot.machine.bridgeIdentifier, 'bridge-public-id-1');
  assert.equal(snapshot.presence.status, 'bridge_missing');
});

test('heartbeatLocalMachineBridge updates presence through online, busy, and auth_missing loopback states', () => {
  const storePath = createStorePath();
  const registered = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-2',
    now: '2026-04-12T14:00:00.000Z',
  });

  const online = heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:10.000Z',
  });
  assert.equal(online.machine.id, registered.machine.id);
  assert.equal(online.presence.status, 'online');
  assert.equal(online.presence.expiresAt, '2026-04-12T14:01:10.000Z');

  const busy = heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    activeCommandId: 'command-7',
    now: '2026-04-12T14:00:30.000Z',
  });
  assert.equal(busy.presence.status, 'busy');
  assert.equal(busy.presence.activeCommandId, 'command-7');

  const authMissing = heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_missing',
    now: '2026-04-12T14:00:45.000Z',
  });
  assert.equal(authMissing.presence.status, 'auth_missing');

  const stale = getLocalMachineBridgeState(storePath, '2026-04-12T14:01:46.000Z');
  assert.equal(stale.heartbeatTimeoutMs, BRIDGE_PRESENCE_TIMEOUT_MS);
  assert.equal(stale.presence.status, 'bridge_missing');
});

test('ensureLocalMachineBridgeOnline auto-registers a default machine and derives auth state when omitted', () => {
  const storePath = createStorePath();
  const authHome = fs.mkdtempSync(path.join(os.tmpdir(), 'zktalk-codex-home-'));
  fs.writeFileSync(path.join(authHome, 'auth.json'), '{"token":"present"}');
  const previousCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = authHome;

  try {
    const snapshot = ensureLocalMachineBridgeOnline(storePath, {
      ownerUserId: 'user-auto',
      now: '2026-04-12T14:00:00.000Z',
    });

    assert.equal(snapshot.registered, true);
    assert.equal(snapshot.machine.ownerUserId, 'user-auto');
    assert.match(snapshot.machine.bridgeIdentifier, /^desktop-loopback:/);
    assert.equal(snapshot.presence.status, 'online');
    assert.equal(snapshot.presence.codexAuthState, 'auth_present');
  } finally {
    if (previousCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = previousCodexHome;
    }
  }
});

test('createDesktopLoopbackBridge keeps heartbeats running after the first ensure-online call', async () => {
  const storePath = createStorePath();
  const bridge = createDesktopLoopbackBridge({
    statePath: storePath,
    autoHeartbeatIntervalMs: 10,
  });

  try {
    const initial = bridge.ensureOnline({
      ownerUserId: 'user-auto-loop',
      codexAuthState: 'auth_missing',
      now: '2026-04-12T14:00:00.000Z',
    });

    assert.equal(initial.registered, true);
    assert.equal(initial.machine.ownerUserId, 'user-auto-loop');

    await new Promise((resolve) => setTimeout(resolve, 30));

    const snapshot = bridge.getSnapshot();
    assert.equal(snapshot.registered, true);
    assert.equal(snapshot.machine.ownerUserId, 'user-auto-loop');
    assert.ok(snapshot.presence);
    assert.notEqual(snapshot.presence.status, 'bridge_missing');
  } finally {
    bridge.stopAutoHeartbeat();
  }
});

test('createDesktopLoopbackBridge auto-resumes heartbeat for the stored owner on startup', async () => {
  const storePath = createStorePath();
  const authHome = fs.mkdtempSync(path.join(os.tmpdir(), 'zktalk-codex-home-'));
  fs.writeFileSync(path.join(authHome, 'auth.json'), '{"token":"present"}');
  registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-restored',
    name: 'Restored Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-restored',
    now: '2026-04-12T14:00:00.000Z',
  });

  const previousCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = authHome;

  const bridge = createDesktopLoopbackBridge({
    statePath: storePath,
    autoHeartbeatIntervalMs: 10,
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 30));

    const snapshot = bridge.getSnapshot();
    assert.equal(snapshot.registered, true);
    assert.equal(snapshot.machine?.ownerUserId, 'user-restored');
    assert.equal(snapshot.presence?.status, 'online');
    assert.equal(snapshot.presence?.codexAuthState, 'auth_present');
  } finally {
    bridge.stopAutoHeartbeat();
    if (previousCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = previousCodexHome;
    }
  }
});

test('disconnectLocalMachineBridge stops reporting online while preserving the last seen heartbeat', () => {
  const storePath = createStorePath();
  registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-stop',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-stop',
    now: '2026-04-12T14:00:00.000Z',
  });
  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-stop',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:10.000Z',
  });

  const snapshot = disconnectLocalMachineBridge(storePath, {
    ownerUserId: 'user-stop',
    now: '2026-04-12T14:00:20.000Z',
  });

  assert.equal(snapshot.registered, true);
  assert.equal(snapshot.presence?.status, 'bridge_missing');
  assert.equal(snapshot.presence?.lastSeenAt, '2026-04-12T14:00:10.000Z');
  assert.equal(snapshot.presence?.expiresAt, '2026-04-12T14:00:20.000Z');
  assert.equal(snapshot.machine?.presence, 'bridge_missing');
});

test('dispatchLocalMachineCommand returns accepted, streaming, and completed updates through the local runner', async () => {
  const storePath = createStorePath();
  const registered = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-3',
    now: '2026-04-12T14:00:00.000Z',
  });
  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:10.000Z',
  });

  const result = await dispatchLocalMachineCommand(
    storePath,
    {
      envelope: {
        id: 'command-1',
        targetMachineId: registered.machine.id,
        owningUserId: 'user-1',
        instruction: 'Summarize the current release blockers.',
      },
      now: '2026-04-12T14:00:15.000Z',
    },
    {
      commandRunner: async (_envelope, options) => {
        options.onOutput('partial summary');
        options.onOutput('next operator step');
        return {
          completionSummary: 'Completed operator summary.',
          completionOutputText: 'Run verify, then capture external blockers.',
        };
      },
    },
  );

  assert.equal(result.accepted, true);
  assert.equal(result.updates[0].status, 'accepted');
  assert.equal(result.updates[1].status, 'streaming');
  assert.equal(result.updates[1].outputText, 'partial summary');
  assert.equal(result.updates[2].outputText, 'next operator step');
  assert.equal(result.updates[3].status, 'completed');
  assert.equal(result.updates[3].summary, 'Completed operator summary.');
  assert.equal(result.machine.presence, 'online');

  const snapshot = getLocalMachineBridgeState(storePath);
  assert.equal(snapshot.lastCommand.status, 'completed');
  assert.equal(snapshot.lastCommand.summary, 'Completed operator summary.');
  assert.deepEqual(
    snapshot.recentCommandUpdates.map((update) => update.status),
    ['accepted', 'streaming', 'streaming', 'completed'],
  );
  assert.equal(snapshot.recentCommandUpdates.at(-1).outputText, 'Run verify, then capture external blockers.');
});

test('dispatchLocalMachineCommand keeps busy and auth-missing blockers explicit', async () => {
  const storePath = createStorePath();
  const registered = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-4',
    now: '2026-04-12T14:00:00.000Z',
  });

  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    activeCommandId: 'command-in-flight',
    now: '2026-04-12T14:00:10.000Z',
  });

  const busy = await dispatchLocalMachineCommand(storePath, {
    envelope: {
      id: 'command-2',
      targetMachineId: registered.machine.id,
      owningUserId: 'user-1',
      instruction: 'Run the verification suite.',
    },
    now: '2026-04-12T14:00:11.000Z',
  });
  assert.equal(busy.accepted, false);
  assert.equal(busy.updates[0].status, 'failed');
  assert.equal(busy.updates[0].errorCode, 'busy');

  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_missing',
    now: '2026-04-12T14:00:20.000Z',
  });

  const authMissing = await dispatchLocalMachineCommand(storePath, {
    envelope: {
      id: 'command-3',
      targetMachineId: registered.machine.id,
      owningUserId: 'user-1',
      instruction: 'Run the verification suite.',
    },
    now: '2026-04-12T14:00:21.000Z',
  });
  assert.equal(authMissing.accepted, false);
  assert.equal(authMissing.updates[0].errorCode, 'auth_missing');
});

test('dispatchLocalMachineCommand rejects missing command identity or empty instruction before invoking Codex', async () => {
  const storePath = createStorePath();
  const registered = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-5',
    now: '2026-04-12T14:00:00.000Z',
  });

  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:10.000Z',
  });

  let invoked = false;
  const missingId = await dispatchLocalMachineCommand(
    storePath,
    {
      envelope: {
        id: '   ',
        targetMachineId: registered.machine.id,
        owningUserId: 'user-1',
        instruction: 'Run verify.',
      },
      now: '2026-04-12T14:00:11.000Z',
    },
    {
      commandRunner: async () => {
        invoked = true;
        return {
          completionSummary: 'should not run',
        };
      },
    },
  );
  assert.equal(missingId.accepted, false);
  assert.equal(missingId.updates[0].status, 'rejected');
  assert.equal(missingId.updates[0].summary, 'The local machine command is missing a command id.');

  const emptyInstruction = await dispatchLocalMachineCommand(
    storePath,
    {
      envelope: {
        id: 'command-5',
        targetMachineId: registered.machine.id,
        owningUserId: 'user-1',
        instruction: '   ',
      },
      now: '2026-04-12T14:00:12.000Z',
    },
    {
      commandRunner: async () => {
        invoked = true;
        return {
          completionSummary: 'should not run',
        };
      },
    },
  );
  assert.equal(emptyInstruction.accepted, false);
  assert.equal(emptyInstruction.updates[0].status, 'rejected');
  assert.equal(emptyInstruction.updates[0].summary, 'The local machine command instruction is empty.');
  assert.equal(invoked, false);
});

test('dispatchLocalMachineCommand persists mapped runner failures and explicit result state in the bridge snapshot', async () => {
  const storePath = createStorePath();
  const registered = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-6',
    now: '2026-04-12T14:00:00.000Z',
  });

  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:10.000Z',
  });

  const failed = await dispatchLocalMachineCommand(
    storePath,
    {
      envelope: {
        id: 'command-5',
        targetMachineId: registered.machine.id,
        owningUserId: 'user-1',
        instruction: 'Run the local operator summary.',
      },
      now: '2026-04-12T14:00:15.000Z',
    },
    {
      commandRunner: async () => {
        const error = new Error('Codex login required before running this command.');
        error.stderr = 'auth missing';
        throw error;
      },
    },
  );

  assert.equal(failed.accepted, false);
  assert.equal(failed.updates[0].status, 'accepted');
  assert.equal(failed.updates.at(-1).status, 'failed');
  assert.equal(failed.updates.at(-1).errorCode, 'auth_missing');
  assert.equal(failed.machine.codexAuthState, 'auth_missing');
  assert.equal(failed.presence.status, 'auth_missing');

  const snapshot = getLocalMachineBridgeState(storePath);
  assert.equal(snapshot.lastCommand.status, 'failed');
  assert.equal(snapshot.lastCommand.errorCode, 'auth_missing');
  assert.deepEqual(
    snapshot.recentCommandUpdates.map((update) => update.status),
    ['accepted', 'failed'],
  );
  assert.equal(snapshot.machine.codexAuthState, 'auth_missing');
  assert.equal(snapshot.presence.status, 'auth_missing');
});

test('dispatchLocalMachineCommand maps timeout failures explicitly and clears the busy state', async () => {
  const storePath = createStorePath();
  const registered = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-timeout',
    now: '2026-04-12T14:00:00.000Z',
  });

  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:10.000Z',
  });

  const failed = await dispatchLocalMachineCommand(
    storePath,
    {
      envelope: {
        id: 'command-timeout',
        targetMachineId: registered.machine.id,
        owningUserId: 'user-1',
        instruction: 'Run until timeout.',
      },
      now: '2026-04-12T14:00:15.000Z',
    },
    {
      commandRunner: async () => {
        const error = new Error('Local Codex command timed out after 1000ms.');
        error.code = 'ETIMEDOUT';
        error.stderr = 'partial output before timeout';
        throw error;
      },
    },
  );

  assert.equal(failed.accepted, false);
  assert.equal(failed.updates[0].status, 'accepted');
  assert.equal(failed.updates.at(-1).status, 'failed');
  assert.equal(failed.updates.at(-1).errorCode, 'timed_out');
  assert.match(failed.updates.at(-1).summary, /timed out/i);
  assert.equal(failed.presence.status, 'online');

  const snapshot = getLocalMachineBridgeState(storePath);
  assert.equal(snapshot.machine.presence, 'online');
  assert.equal(snapshot.lastCommand.errorCode, 'timed_out');
});

test('dispatchLocalMachineCommand caps persisted update history and truncates oversized output', async () => {
  const storePath = createStorePath();
  const registered = registerLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-trim',
    now: '2026-04-12T14:00:00.000Z',
  });

  heartbeatLocalMachineBridge(storePath, {
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:10.000Z',
  });

  const result = await dispatchLocalMachineCommand(
    storePath,
    {
      envelope: {
        id: 'command-trim',
        targetMachineId: registered.machine.id,
        owningUserId: 'user-1',
        instruction: 'Stream a lot of output.',
      },
      now: '2026-04-12T14:00:15.000Z',
    },
    {
      commandRunner: async (_envelope, options) => {
        for (let index = 0; index < 45; index += 1) {
          options.onOutput(`stream-${index}`);
        }

        return {
          completionSummary: 'Completed with long output.',
          completionOutputText: 'x'.repeat(12_500),
        };
      },
    },
  );

  assert.equal(result.accepted, true);
  assert.equal(result.updates.length, 47);

  const snapshot = getLocalMachineBridgeState(storePath);
  assert.equal(snapshot.recentCommandUpdates.length, 40);
  assert.equal(snapshot.recentCommandUpdates[0].outputText, 'stream-6');
  assert.match(snapshot.lastCommand.outputText, /\.\.\.\[truncated\]$/);
});

test('createDesktopLoopbackBridge exposes the same command dispatch surface used by Electron IPC', async () => {
  const statePath = createStorePath();
  const bridge = createDesktopLoopbackBridge({
    statePath,
    commandRunner: async (_envelope, options) => {
      options.onOutput('desktop bridge output');
      return {
        completionSummary: 'Bridge completed local dispatch.',
        completionOutputText: 'desktop bridge output',
      };
    },
  });

  const registered = bridge.registerMachine({
    ownerUserId: 'user-1',
    name: 'Operator Desktop',
    type: 'desktop',
    bridgeIdentifier: 'bridge-public-id-5',
    now: '2026-04-12T14:00:00.000Z',
  });
  bridge.heartbeat({
    ownerUserId: 'user-1',
    codexAuthState: 'auth_present',
    now: '2026-04-12T14:00:05.000Z',
  });

  const result = await bridge.dispatchCommand({
    envelope: {
      id: 'command-4',
      targetMachineId: registered.machine.id,
      owningUserId: 'user-1',
      instruction: 'Inspect the desktop bridge loopback.',
    },
    now: '2026-04-12T14:00:06.000Z',
  });

  assert.equal(result.accepted, true);
  assert.equal(result.updates.at(-1).status, 'completed');
  assert.equal(bridge.getSnapshot().lastCommand.summary, 'Bridge completed local dispatch.');
});

test('createDesktopLoopbackBridge registerMachine immediately brings the stored machine online for the owner', async () => {
  const statePath = createStorePath();
  const authHome = fs.mkdtempSync(path.join(os.tmpdir(), 'zktalk-codex-home-'));
  fs.writeFileSync(path.join(authHome, 'auth.json'), '{"token":"present"}');
  const previousCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = authHome;

  const bridge = createDesktopLoopbackBridge({
    statePath,
    autoHeartbeatIntervalMs: 10,
  });

  try {
    const registered = bridge.registerMachine({
      ownerUserId: 'user-register-auto',
      name: 'Auto Online Desktop',
      type: 'desktop',
      bridgeIdentifier: 'bridge-register-auto',
      now: '2026-04-12T15:00:00.000Z',
    });

    assert.equal(registered.registered, true);
    assert.equal(registered.machine?.ownerUserId, 'user-register-auto');
    assert.equal(registered.presence?.status, 'online');
    assert.equal(registered.presence?.codexAuthState, 'auth_present');

    await new Promise((resolve) => setTimeout(resolve, 30));

    const snapshot = bridge.getSnapshot();
    assert.equal(snapshot.registered, true);
    assert.equal(snapshot.machine?.ownerUserId, 'user-register-auto');
    assert.equal(snapshot.presence?.status, 'online');
  } finally {
    bridge.stopAutoHeartbeat();
    if (previousCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = previousCodexHome;
    }
  }
});
