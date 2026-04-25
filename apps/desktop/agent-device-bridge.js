/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Phase 9B — Agent Device Bridge.
 *
 * Runs in the Electron main process and turns the local computer into an
 * addressable agent device in zkTalk.
 *
 * Responsibilities:
 *   1. On startup, ensure the local device is registered with the API
 *      (POST /api/devices) and persist the returned `deviceId` to config.
 *   2. Emit a periodic heartbeat summarising CPU/RAM/agents
 *      (POST /api/devices/:id/heartbeat).
 *   3. Poll for queued or approved commands targeting this device, claim
 *      them atomically via POST /api/commands/:id/claim, execute them via
 *      the matching agent driver, and submit the result via
 *      POST /api/commands/:id/result.
 *
 * The `shell` and `codex` drivers have real implementations in 9B. The
 * `finder` and `browser` drivers register so the API surface is complete,
 * but their execute() returns a NOT_IMPLEMENTED error until 9C.
 *
 * Design references:
 *   docs/ui-design/design-brief.md §9B
 *   docs/ui-design/agent-ux.md
 */

const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { createCodexAgentDriver, createClaudeAgentDriver } = require('./agent-ai-driver');

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_DISPATCH_INTERVAL_MS = 3_000;
const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 12_000;
const DEFAULT_PLATFORM = (() => {
  const p = process.platform;
  if (p === 'darwin') return 'macos';
  if (p === 'linux') return 'linux';
  if (p === 'win32') return 'windows';
  return 'other';
})();

/**
 * Truncate a string to `max` characters. If it was longer, append a marker
 * explaining how many chars were dropped so the user knows the output is
 * capped rather than the command having produced only this much.
 */
function truncateOutput(text, max = MAX_OUTPUT_CHARS) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  const dropped = s.length - max;
  return `${s.slice(0, max)}\n[… ${dropped} more chars truncated]`;
}

/**
 * Real shell executor. Spawns a login shell (or cmd.exe on Windows), writes
 * the command string, and captures stdout/stderr with a timeout cap.
 *
 * Safety notes:
 *   - Only the device owner's API token authenticates with the API, and
 *     only the owner can queue commands against their own device. The command
 *     runs with the same privileges as the Electron process.
 *   - We hard-cap timeout and output size to prevent a single bad command
 *     from exhausting memory or blocking the dispatcher.
 */
function executeShellCommand(commandString, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const cwd = options.cwd ?? os.homedir();

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const bin = isWindows ? 'cmd.exe' : (process.env.SHELL || '/bin/sh');
    const args = isWindows ? ['/c', commandString] : ['-c', commandString];

    let stdoutBuf = '';
    let stderrBuf = '';
    let settled = false;
    let timedOut = false;

    const child = spawn(bin, args, {
      cwd,
      env: process.env,
      windowsHide: true,
    });

    const capture = (stream, onChunk) => {
      stream.setEncoding('utf8');
      stream.on('data', onChunk);
    };

    capture(child.stdout, (chunk) => {
      if (stdoutBuf.length < MAX_OUTPUT_CHARS * 2) {
        stdoutBuf += chunk;
      }
    });
    capture(child.stderr, (chunk) => {
      if (stderrBuf.length < MAX_OUTPUT_CHARS * 2) {
        stderrBuf += chunk;
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch (_) {
        /* already dead */
      }
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch (_) {
          /* ignore */
        }
      }, 1_000);
    }, timeoutMs);

    const finish = (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode,
        stdoutTrunc: truncateOutput(stdoutBuf),
        stderrTrunc: truncateOutput(
          timedOut
            ? `${stderrBuf}\n[command exceeded ${timeoutMs}ms timeout — killed]`
            : stderrBuf,
        ),
      });
    };

    child.on('error', (err) => {
      stderrBuf += `\n${err instanceof Error ? err.message : String(err)}`;
      finish(-1);
    });
    child.on('close', (code, signal) => {
      // Node sets code=null on signal-terminated children; surface a non-zero
      // exit so the API marks the command as failed.
      const exit =
        typeof code === 'number' ? code : signal ? 130 : -1;
      finish(exit);
    });
  });
}

/**
 * Canonical baseline agents shipped with every desktop install.
 */
const BUILTIN_AGENT_DRIVERS = [
  {
    agentSlug: 'shell',
    displayName: 'Shell',
    version: '0.1.0',
    defaultVerb: 'exec',
    scopes: ['exec:shell'],
    async execute(command, options = {}) {
      const cmd = buildShellCommandString(command);
      if (!cmd) {
        return {
          exitCode: 2,
          stdoutTrunc: '',
          stderrTrunc: 'shell agent requires non-empty args',
        };
      }
      return executeShellCommand(cmd, options);
    },
  },
  createCodexAgentDriver(),
  createClaudeAgentDriver(),
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

/**
 * Flatten a CommandExecution row to the raw string passed to the shell.
 * We prefer `args` when present. If the requester typed a full command like
 * `/home-pc.shell ls ~/Downloads`, the API already stripped the prefix and
 * stored the tail in `args`.
 */
function buildShellCommandString(command) {
  const args = typeof command?.args === 'string' ? command.args.trim() : '';
  if (args) return args;
  // Fall back to rawCommand with the prefix stripped, in case an older client
  // didn't split the args.
  const raw = typeof command?.rawCommand === 'string' ? command.rawCommand.trim() : '';
  if (!raw.startsWith('/')) return raw;
  const space = raw.indexOf(' ');
  return space === -1 ? '' : raw.slice(space + 1).trim();
}

function findDriver(agentSlug, drivers) {
  return drivers.find((d) => d.agentSlug === agentSlug) ?? null;
}

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

function sampleHeartbeatSummary(agents, extra = {}) {
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
    runningCount: extra.runningCount ?? 0,
    agents: agents.map(
      (a) => `${a.agentSlug}${a.version ? `@${a.version}` : ''}`,
    ),
  };
}

/**
 * Create a new bridge. Returned object is a lifecycle handle — call
 * `.start()` from the Electron main process once the user has a
 * session token, and `.stop()` on quit.
 */
function createAgentDeviceBridge(options = {}) {
  const {
    apiBaseUrl,
    getSessionToken,
    configStore = null,
    preferredName = getDefaultDeviceName(),
    preferredSlug = null,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
    dispatchIntervalMs = DEFAULT_DISPATCH_INTERVAL_MS,
    commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
    codexBin = null,
    codexCwd = null,
    fetchImpl = globalThis.fetch,
    logger = () => {},
    drivers = BUILTIN_AGENT_DRIVERS,
  } = options;

  if (!apiBaseUrl) {
    throw new Error('agent-device-bridge: apiBaseUrl is required');
  }
  if (typeof apiBaseUrl !== 'string' && typeof apiBaseUrl !== 'function') {
    throw new Error('agent-device-bridge: apiBaseUrl must be a string or function');
  }
  if (typeof getSessionToken !== 'function') {
    throw new Error('agent-device-bridge: getSessionToken must be a function');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('agent-device-bridge: fetch not available in runtime');
  }

  let heartbeatTimer = null;
  let dispatchTimer = null;
  let running = false;
  let busy = false;
  let runningCount = 0;
  let cachedDeviceId =
    (configStore && typeof configStore.get === 'function'
      ? configStore.get('agentDeviceId')
      : null) ?? null;

  const agents = [...drivers];

  function resolveApiBaseUrl() {
    return typeof apiBaseUrl === 'function' ? apiBaseUrl() : apiBaseUrl;
  }

  async function request(path, init = {}) {
    const token = getSessionToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${resolveApiBaseUrl()}${path}`, {
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
      const summary = sampleHeartbeatSummary(agents, { runningCount });
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

  async function fetchActionable() {
    if (!cachedDeviceId) return [];
    const res = await request(
      `/api/commands?deviceId=${encodeURIComponent(cachedDeviceId)}&limit=20`,
    );
    const all = Array.isArray(res?.commands) ? res.commands : [];
    // Oldest actionable first so users see sequential progress.
    return all
      .filter((c) => c.status === 'queued' || c.status === 'approved')
      .sort(
        (a, b) =>
          new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime(),
      );
  }

  async function runCommand(command) {
    const driver = findDriver(command.agentSlug, agents);
    if (!driver) {
      return {
        exitCode: -1,
        stdoutTrunc: '',
        stderrTrunc: `agent ${command.agentSlug} not installed locally`,
      };
    }
    try {
      const timeoutMs = driver.commandTimeoutMs ?? commandTimeoutMs;
      return await driver.execute(command, {
        timeoutMs,
        codexBin,
        cwd: codexCwd,
      });
    } catch (err) {
      return {
        exitCode: -1,
        stdoutTrunc: '',
        stderrTrunc: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function dispatchOne() {
    if (busy) return;
    busy = true;
    try {
      const actionable = await fetchActionable();
      if (actionable.length === 0) return;
      const command = actionable[0];

      let claimed;
      try {
        const res = await request(
          `/api/commands/${encodeURIComponent(command.id)}/claim`,
          { method: 'POST', body: JSON.stringify({}) },
        );
        claimed = res?.command ?? command;
      } catch (err) {
        // Another process may have claimed it, or status changed. Skip and retry
        // on next tick.
        logger('debug', 'agent-device-bridge: claim failed', {
          commandId: command.id,
          error: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      runningCount += 1;
      try {
        logger('info', 'agent-device-bridge: running command', {
          id: claimed.id,
          agent: claimed.agentSlug,
        });
        const result = await runCommand(claimed);
        await request(
          `/api/commands/${encodeURIComponent(claimed.id)}/result`,
          {
            method: 'POST',
            body: JSON.stringify({
              exitCode: result.exitCode,
              stdoutTrunc: result.stdoutTrunc ?? null,
              stderrTrunc: result.stderrTrunc ?? null,
            }),
          },
        );
        logger('info', 'agent-device-bridge: command finished', {
          id: claimed.id,
          exitCode: result.exitCode,
        });
      } finally {
        runningCount = Math.max(0, runningCount - 1);
      }
    } catch (err) {
      logger('warn', 'agent-device-bridge: dispatch error', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      busy = false;
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
      dispatchTimer = setInterval(() => {
        dispatchOne().catch(() => {});
      }, dispatchIntervalMs);
      if (heartbeatTimer?.unref) heartbeatTimer.unref();
      if (dispatchTimer?.unref) dispatchTimer.unref();
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
    if (dispatchTimer) {
      clearInterval(dispatchTimer);
      dispatchTimer = null;
    }
  }

  return {
    start,
    stop,
    sendHeartbeat,
    dispatchOne,
    getDeviceId() {
      return cachedDeviceId;
    },
    isRunning() {
      return running;
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
  buildShellCommandString,
  executeShellCommand,
  truncateOutput,
  BUILTIN_AGENT_DRIVERS,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_DISPATCH_INTERVAL_MS,
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_OUTPUT_CHARS,
};
