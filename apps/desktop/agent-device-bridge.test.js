const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAgentDeviceBridge,
  sampleHeartbeatSummary,
  buildDefaultDeviceSlug,
  buildShellCommandString,
  executeShellCommand,
  truncateOutput,
  BUILTIN_AGENT_DRIVERS,
} = require('./agent-device-bridge');
const { createCodexAgentDriver } = require('./agent-ai-driver');

function createMockFetch(script) {
  const calls = [];
  let i = 0;
  const fn = async (url, init) => {
    calls.push({ url, init });
    const step = script[i++] ?? script[script.length - 1];
    const body = step?.body ?? {};
    return {
      ok: step?.ok ?? true,
      status: step?.status ?? 200,
      async json() {
        return body;
      },
      async text() {
        return JSON.stringify(body);
      },
    };
  };
  fn.calls = calls;
  return fn;
}

function createMemoryStore() {
  const state = new Map();
  return {
    get: (k) => state.get(k) ?? null,
    set: (k, v) => state.set(k, v),
    dump: () => Object.fromEntries(state),
  };
}

test('BUILTIN_AGENT_DRIVERS ships the canonical slugs', () => {
  const slugs = BUILTIN_AGENT_DRIVERS.map((d) => d.agentSlug).sort();
  assert.deepEqual(slugs, ['browser', 'claude', 'codex', 'finder', 'shell']);
});

test('buildDefaultDeviceSlug produces a stable, slug-shaped value', () => {
  const a = buildDefaultDeviceSlug('seed-a');
  const b = buildDefaultDeviceSlug('seed-a');
  const c = buildDefaultDeviceSlug('seed-b');
  assert.equal(a, b, 'same seed → same slug');
  assert.notEqual(a, c, 'different seed → different slug');
  assert.match(a, /^[a-z0-9][a-z0-9-]*$/);
});

test('sampleHeartbeatSummary produces an ISO timestamp and clamped cpu', () => {
  const s = sampleHeartbeatSummary([
    { agentSlug: 'shell', version: '0.1.0' },
    { agentSlug: 'finder', version: null },
  ]);
  assert.ok(!Number.isNaN(new Date(s.at).getTime()));
  assert.ok(s.cpu >= 0 && s.cpu <= 1);
  assert.ok(s.ramTotal > 0);
  assert.deepEqual(s.agents.sort(), ['finder', 'shell@0.1.0'].sort());
});

test('truncateOutput appends a marker when over limit', () => {
  const short = truncateOutput('hi', 10);
  assert.equal(short, 'hi');
  const long = truncateOutput('x'.repeat(50), 10);
  assert.ok(long.startsWith('xxxxxxxxxx'));
  assert.match(long, /40 more chars truncated/);
});

test('buildShellCommandString prefers args, falls back to stripping rawCommand prefix', () => {
  assert.equal(buildShellCommandString({ args: 'ls ~/Downloads' }), 'ls ~/Downloads');
  assert.equal(
    buildShellCommandString({ args: '', rawCommand: '/home.shell ls ~/Downloads' }),
    'ls ~/Downloads',
  );
  assert.equal(buildShellCommandString({ args: '', rawCommand: 'noop' }), 'noop');
  assert.equal(buildShellCommandString({ args: '', rawCommand: '/onlyprefix' }), '');
});

test('executeShellCommand captures stdout and exit 0 on success', async () => {
  const result = await executeShellCommand('echo hello-zktalk');
  assert.equal(result.exitCode, 0);
  assert.match(result.stdoutTrunc, /hello-zktalk/);
  assert.equal(result.stderrTrunc, '');
});

test('executeShellCommand surfaces a non-zero exit when the command fails', async () => {
  const result = await executeShellCommand('exit 7');
  assert.equal(result.exitCode, 7);
});

test('executeShellCommand kills long-running commands after the timeout', async () => {
  const result = await executeShellCommand('sleep 5', { timeoutMs: 100 });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderrTrunc, /timeout/);
});

test('BUILTIN shell driver executes args from the CommandExecution row', async () => {
  const shell = BUILTIN_AGENT_DRIVERS.find((d) => d.agentSlug === 'shell');
  const result = await shell.execute({
    agentSlug: 'shell',
    args: 'echo driver-route',
    rawCommand: '/x.shell echo driver-route',
  });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdoutTrunc, /driver-route/);
});

test('BUILTIN codex driver is registered with AI execution scopes', () => {
  const codex = BUILTIN_AGENT_DRIVERS.find((d) => d.agentSlug === 'codex');
  assert.ok(codex);
  assert.equal(codex.displayName, 'Codex');
  assert.ok(codex.scopes.includes('ai:codex'));
  assert.ok(codex.commandTimeoutMs >= 60_000);
});

test('createAgentDeviceBridge.start registers a new device when list returns empty', async () => {
  const fetchImpl = createMockFetch([
    { ok: true, body: { devices: [], agentsByDevice: {} } },
    { ok: true, body: { device: { id: 'dev-123', slug: 'x' } } },
    { ok: true, body: {} },
    { ok: true, body: {} },
    { ok: true, body: {} },
    { ok: true, body: {} },
  ]);

  const store = createMemoryStore();
  const bridge = createAgentDeviceBridge({
    apiBaseUrl: 'https://api.test',
    getSessionToken: () => 'tok-abc',
    configStore: store,
    preferredName: 'unit-test',
    heartbeatIntervalMs: 1_000_000,
    dispatchIntervalMs: 1_000_000,
    fetchImpl,
  });

  const deviceId = await bridge.start();
  assert.equal(deviceId, 'dev-123');
  assert.equal(store.get('agentDeviceId'), 'dev-123');

  assert.match(fetchImpl.calls[0].url, /\/api\/devices$/);
  assert.equal(fetchImpl.calls[0].init?.method ?? 'GET', 'GET');
  assert.equal(fetchImpl.calls[1].init.method, 'POST');
  assert.equal(
    fetchImpl.calls[1].init.headers.Authorization,
    'Bearer tok-abc',
  );

  await bridge.stop();
});

test('createAgentDeviceBridge.start reuses existing device by slug', async () => {
  const fetchImpl = createMockFetch([
    {
      ok: true,
      body: {
        devices: [{ id: 'dev-existing', slug: 'unit-test-abc123' }],
        agentsByDevice: {},
      },
    },
    { ok: true, body: {} },
    { ok: true, body: {} },
    { ok: true, body: {} },
    { ok: true, body: {} },
  ]);

  const bridge = createAgentDeviceBridge({
    apiBaseUrl: 'https://api.test',
    getSessionToken: () => 'tok-abc',
    preferredName: 'unit-test',
    preferredSlug: 'unit-test-abc123',
    heartbeatIntervalMs: 1_000_000,
    dispatchIntervalMs: 1_000_000,
    fetchImpl,
  });

  const deviceId = await bridge.start();
  assert.equal(deviceId, 'dev-existing');
  assert.equal(
    fetchImpl.calls.filter(
      (c) => c.init?.method === 'POST' && c.url.endsWith('/api/devices'),
    ).length,
    0,
  );

  await bridge.stop();
});

test('dispatchOne claims a queued command, runs it, and submits the result', async () => {
  // Pre-register store so start() skips device creation and jumps past agents/heartbeat
  // for the setup calls. The test drives dispatchOne() directly.
  const store = createMemoryStore();
  store.set('agentDeviceId', 'dev-1');

  const fetchImpl = createMockFetch([
    // dispatchOne → GET /api/commands
    {
      ok: true,
      body: {
        commands: [
          {
            id: 'cmd-1',
            status: 'queued',
            agentSlug: 'shell',
            args: 'echo dispatched',
            rawCommand: '/x.shell echo dispatched',
            queuedAt: '2026-04-24T00:00:00.000Z',
          },
        ],
      },
    },
    // POST /api/commands/cmd-1/claim
    {
      ok: true,
      body: {
        command: {
          id: 'cmd-1',
          status: 'running',
          agentSlug: 'shell',
          args: 'echo dispatched',
          rawCommand: '/x.shell echo dispatched',
        },
      },
    },
    // POST /api/commands/cmd-1/result
    { ok: true, body: { command: { id: 'cmd-1', status: 'completed' } } },
  ]);

  const bridge = createAgentDeviceBridge({
    apiBaseUrl: 'https://api.test',
    getSessionToken: () => 'tok',
    configStore: store,
    heartbeatIntervalMs: 1_000_000,
    dispatchIntervalMs: 1_000_000,
    fetchImpl,
  });

  await bridge.dispatchOne();
  await bridge.awaitIdle();

  const urls = fetchImpl.calls.map((c) => c.url);
  assert.ok(urls.some((u) => u.includes('/api/commands?deviceId=dev-1')));
  assert.ok(urls.some((u) => u.endsWith('/api/commands/cmd-1/claim')));
  const resultCall = fetchImpl.calls.find((c) =>
    c.url.endsWith('/api/commands/cmd-1/result'),
  );
  assert.ok(resultCall, 'POST /result should be called');
  const resultBody = JSON.parse(resultCall.init.body);
  assert.equal(resultBody.exitCode, 0);
  assert.match(resultBody.stdoutTrunc, /dispatched/);
});

test('dispatchOne can route a queued codex command to the local AI driver', async () => {
  const store = createMemoryStore();
  store.set('agentDeviceId', 'dev-1');

  const fetchImpl = createMockFetch([
    {
      ok: true,
      body: {
        commands: [
          {
            id: 'cmd-ai-1',
            status: 'queued',
            agentSlug: 'codex',
            args: 'summarize this machine',
            rawCommand: '/x.codex summarize this machine',
            queuedAt: '2026-04-24T00:00:00.000Z',
          },
        ],
      },
    },
    {
      ok: true,
      body: {
        command: {
          id: 'cmd-ai-1',
          status: 'running',
          agentSlug: 'codex',
          args: 'summarize this machine',
          rawCommand: '/x.codex summarize this machine',
        },
      },
    },
    { ok: true, body: { command: { id: 'cmd-ai-1', status: 'completed' } } },
  ]);

  const codexDriver = createCodexAgentDriver({
    commandTimeoutMs: 90_000,
    async execute(command, options) {
      assert.equal(command.args, 'summarize this machine');
      assert.equal(options.timeoutMs, 90_000);
      return {
        exitCode: 0,
        stdoutTrunc: 'codex answer from target machine',
        stderrTrunc: '',
      };
    },
  });

  const bridge = createAgentDeviceBridge({
    apiBaseUrl: 'https://api.test',
    getSessionToken: () => 'tok',
    configStore: store,
    heartbeatIntervalMs: 1_000_000,
    dispatchIntervalMs: 1_000_000,
    fetchImpl,
    drivers: [codexDriver],
  });

  await bridge.dispatchOne();
  await bridge.awaitIdle();

  const resultCall = fetchImpl.calls.find((c) =>
    c.url.endsWith('/api/commands/cmd-ai-1/result'),
  );
  assert.ok(resultCall, 'POST /result should be called');
  const resultBody = JSON.parse(resultCall.init.body);
  assert.equal(resultBody.exitCode, 0);
  assert.match(resultBody.stdoutTrunc, /codex answer/);
});

test('dispatchOne skips when no queued/approved commands', async () => {
  const store = createMemoryStore();
  store.set('agentDeviceId', 'dev-1');

  const fetchImpl = createMockFetch([
    {
      ok: true,
      body: {
        commands: [
          { id: 'cmd-1', status: 'completed', queuedAt: '2026-04-24T00:00:00.000Z' },
        ],
      },
    },
  ]);

  const bridge = createAgentDeviceBridge({
    apiBaseUrl: 'https://api.test',
    getSessionToken: () => 'tok',
    configStore: store,
    heartbeatIntervalMs: 1_000_000,
    dispatchIntervalMs: 1_000_000,
    fetchImpl,
  });

  await bridge.dispatchOne();
  assert.equal(fetchImpl.calls.length, 1, 'only the list call should happen');
});
