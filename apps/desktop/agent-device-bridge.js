/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Phase 9B.5 — Agent Device Bridge (stub).
 *
 * Runs in the Electron main process and turns the local computer into an
 * addressable agent device in zkTalk.
 *
 * Responsibilities:
 *   1. On startup, ensure the local device is registered with the API
 *      (POST /api/devices) and persist the returned `deviceId` to config.
 *   2. Emit a periodic heartbeat summarising CPU/RAM/agents
 *      (POST /api/devices/:id/heartbeat).
 *   3. Subscribe to the realtime channel for this user and dispatch
 *      `command.queued` / `command.approved` events to the matching agent
 *      driver.
 *   4. On command completion, POST the result back with stdout/stderr/exit
 *      code and emit a realtime update.
 *
 * This file is the STUB form landed in Phase 9B. The real agent drivers
 * (shell/finder/browser) and the WebSocket subscription plumbing land in
 * Phase 9C — the interfaces below are intentionally narrow so the 9C
 * patch is additive.
 *
 * Design references:
 *   docs/ui-design/design-brief.md §9B
 *   docs/ui-design/agent-ux.md
 */

const os = require('node:os');
const crypto = require('node:crypto');

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_PLATFORM = (() => {
  const p = process.platform;
  if (p === 'darwin') return 'macos';
  if (p === 'linux') return 'linux';
  if (p === 'win32') return 'windows';
  return 'other';
})();

/**
 * Canonical baseline agents shipped with every desktop install.
 * Each entry is a driver stub — `execute()` simply returns a
 * NOT_IMPLEMENTED error until the 9C wiring lands.
 */
const BUILTIN_AGENT_DRIVERS = [
  {
    agentSlug: 'shell',
    displayName: 'Shell',
    version: '0.1.0',
    defaultVerb: 'exec',
    scopes: ['exec:shell'],
    async execute(_command) {
      return {
        exitCode: -1,
        stdoutTrunc: '',
        stderrTrunc: 'shell agent not wired up yet (9C)',
      };
    },
  },
  {
    agentSlug: 'finder',
    displayName: 'Finder',
    version: '0.1.0',
    defaultVerb: 'ls',
    scopes: ['read:~/Documents', 'read:~/Downloads'],
    async execute(_command) {
      return {
        exitCode: -1,
        stdoutTrunc: '',
        stderrTrunc: 'finder agent not wired up yet (9C)',
      };
    },
  },
  {
    agentSlug: 'browser',
    displayName: 'Browser',
    version: '0.1.0',
    defaultVerb: 'open',
    scopes: ['net:http'],
    async execute(_command) {
      return {
        exitCode: -1,
        stdoutTrunc: '',
        stderrTrunc: 'browser agent not wired up yet (9C)',
      };
    },
  },
];

function slugifyName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function getDefaultDeviceName() {
  const hostname = String(os.hostname() || '').trim();
  return hostname || 'my-computer';
}

function buildDefaultDeviceSlug(seed) {
  const hostSlug = slugifyName(getDefaultDeviceName()) || 'device';
  const suffix = crypto
    .createHash('sha1')
    .update(String(seed ?? ''))
    .digest('hex')
    .slice(0, 6);
  return `${hostSlug}-${suffix}`;
}

/**
 * Observe current system load and return a DeviceHeartbeatSummary-shaped
 * payload ready to send to the API.
 */
function sampleHeartbeatSummary(agents) {
  const loadAvg = os.loadavg()[0] || 0;
  const cores = Math.max(1, os.cpus()?.length || 1);
  const cpu = Math.max(0, Math.min(1, loadAvg / cores));
  const ramTotal = os.totalmem();
  const ramUsed = ramTotal - os.freemem();

  return {
    at: new Date().toISOString(),
    cpu,
    ramUsed,
    ramTotal,
    runningCount: 0,
    agents: agents.map(
      (a) => `${a.agentSlug}${a.version ? `@${a.version}` : ''}`,
    ),
  };
}

/**
 * Create a new bridge. Returned object is a lifecycle handle — call
 * `.start()` from the Electron main process once the user has a
 * session token, and `.stop()` on quit.
 *
 * @param {object} options
 * @param {string} options.apiBaseUrl         Base URL of the zkTalk API
 * @param {() => string|null} options.getSessionToken
 *                                            Returns the current bearer token or null.
 * @param {object} [options.configStore]      Optional persistent store for
 *                                            deviceId + slug. Minimal shape:
 *                                            { get(key), set(key, value) }.
 * @param {string} [options.preferredName]    User-facing device name (defaults to hostname).
 * @param {string} [options.preferredSlug]    Device slug (defaults to hostname-<hash>).
 * @param {number} [options.heartbeatIntervalMs]
 * @param {typeof fetch} [options.fetchImpl]  Inject for tests.
 * @param {(level, msg, meta?) => void} [options.logger]
 */
function createAgentDeviceBridge(options = {}) {
  const {
    apiBaseUrl,
    getSessionToken,
    configStore = null,
    preferredName = getDefaultDeviceName(),
    preferredSlug = null,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
    fetchImpl = globalThis.fetch,
    logger = () => {},
  } = options;

  if (!apiBaseUrl) {
    throw new Error('agent-device-bridge: apiBaseUrl is required');
  }
  if (typeof getSessionToken !== 'function') {
    throw new Error('agent-device-bridge: getSessionToken must be a function');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('agent-device-bridge: fetch not available in runtime');
  }

  let heartbeatTimer = null;
  let running = false;
  let cachedDeviceId =
    (configStore && typeof configStore.get === 'function'
      ? configStore.get('agentDeviceId')
      : null) ?? null;

  const agents = [...BUILTIN_AGENT_DRIVERS];

  async function request(path, init = {}) {
    const token = getSessionToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `API ${init.method || 'GET'} ${path} → ${res.status} ${text.slice(0, 200)}`,
      );
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function ensureRegistered() {
    if (cachedDeviceId) return cachedDeviceId;

    const seed = `${preferredName}|${os.platform()}|${os.arch()}`;
    const slug = preferredSlug || buildDefaultDeviceSlug(seed);

    // Attempt to list first — if a device with this slug already exists
    // for this user, reuse it rather than creating a duplicate.
    try {
      const listed = await request('/api/devices');
      const existing = Array.isArray(listed?.devices)
        ? listed.devices.find((d) => d.slug === slug)
        : null;
      if (existing?.id) {
        cachedDeviceId = existing.id;
        if (configStore?.set) configStore.set('agentDeviceId', existing.id);
        logger('info', 'agent-device-bridge: reusing existing device', {
          deviceId: existing.id,
          slug,
        });
        return existing.id;
      }
    } catch (err) {
      logger('warn', 'agent-device-bridge: list failed, will attempt create', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const created = await request('/api/devices', {
      method: 'POST',
      body: JSON.stringify({
        name: preferredName,
        slug,
        platform: DEFAULT_PLATFORM,
      }),
    });
    const deviceId = created?.device?.id;
    if (!deviceId) {
      throw new Error('agent-device-bridge: registerDevice returned no id');
    }
    cachedDeviceId = deviceId;
    if (configStore?.set) configStore.set('agentDeviceId', deviceId);
    logger('info', 'agent-device-bridge: registered device', {
      deviceId,
      slug,
    });
    return deviceId;
  }

  async function registerAgents() {
    if (!cachedDeviceId) return;
    for (const driver of agents) {
      try {
        await request(`/api/devices/${cachedDeviceId}/agents`, {
          method: 'POST',
          body: JSON.stringify({
            agentSlug: driver.agentSlug,
            displayName: driver.displayName,
            version: driver.version,
            defaultVerb: driver.defaultVerb,
            scopes: driver.scopes,
          }),
        });
      } catch (err) {
        logger('warn', 'agent-device-bridge: agent registration failed', {
          agentSlug: driver.agentSlug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  async function sendHeartbeat() {
    if (!cachedDeviceId) return;
    try {
      const summary = sampleHeartbeatSummary(agents);
      await request(`/api/devices/${cachedDeviceId}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify(summary),
      });
    } catch (err) {
      logger('warn', 'agent-device-bridge: heartbeat failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function start() {
    if (running) return cachedDeviceId;
    running = true;
    try {
      await ensureRegistered();
      await registerAgents();
      await sendHeartbeat();
      heartbeatTimer = setInterval(() => {
        sendHeartbeat().catch(() => {});
      }, heartbeatIntervalMs);
      if (heartbeatTimer?.unref) heartbeatTimer.unref();
      return cachedDeviceId;
    } catch (err) {
      running = false;
      logger('error', 'agent-device-bridge: start failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async function stop() {
    running = false;
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  return {
    start,
    stop,
    sendHeartbeat,
    getDeviceId() {
      return cachedDeviceId;
    },
    listAgents() {
      return agents.map((a) => ({
        agentSlug: a.agentSlug,
        displayName: a.displayName,
        version: a.version,
        defaultVerb: a.defaultVerb,
        scopes: [...a.scopes],
      }));
    },
  };
}

module.exports = {
  createAgentDeviceBridge,
  sampleHeartbeatSummary,
  buildDefaultDeviceSlug,
  BUILTIN_AGENT_DRIVERS,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
};
