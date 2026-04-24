const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAgentDeviceBridge,
  sampleHeartbeatSummary,
  buildDefaultDeviceSlug,
  BUILTIN_AGENT_DRIVERS,
} = require('./agent-device-bridge');

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

test('BUILTIN_AGENT_DRIVERS ships the three canonical slugs', () => {
  const slugs = BUILTIN_AGENT_DRIVERS.map((d) => d.agentSlug).sort();
  assert.deepEqual(slugs, ['browser', 'finder', 'shell']);
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

test('createAgentDeviceBridge.start registers a new device when list returns empty', async () => {
  const fetchImpl = createMockFetch([
    { ok: true, body: { devices: [], agentsByDevice: {} } }, // GET /api/devices
    { ok: true, body: { device: { id: 'dev-123', slug: 'x' } } }, // POST /api/devices
    // Agent registrations (3) + heartbeat (1) — all OK
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
    fetchImpl,
  });

  const deviceId = await bridge.start();
  assert.equal(deviceId, 'dev-123');
  assert.equal(store.get('agentDeviceId'), 'dev-123');

  // First call: GET /api/devices
  assert.match(fetchImpl.calls[0].url, /\/api\/devices$/);
  assert.equal(fetchImpl.calls[0].init?.method ?? 'GET', 'GET');

  // Second call: POST /api/devices
  assert.equal(fetchImpl.calls[1].init.method, 'POST');

  // Bearer token attached
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
        devices: [
          { id: 'dev-existing', slug: 'unit-test-abc123' },
        ],
        agentsByDevice: {},
      },
    },
    // agent registrations (3) + heartbeat (1)
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
    fetchImpl,
  });

  const deviceId = await bridge.start();
  assert.equal(deviceId, 'dev-existing');
  // No POST /api/devices — only GET + per-agent registration + heartbeat
  assert.equal(
    fetchImpl.calls.filter(
      (c) => c.init?.method === 'POST' && c.url.endsWith('/api/devices'),
    ).length,
    0,
  );

  await bridge.stop();
});
