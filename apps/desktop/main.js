const fs = require('fs');
const path = require('path');
const EARLY_BOOT_DEBUG_LOG_PATH = '/tmp/zktalk-desktop-early-boot.log';

try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] pre-electron pid=${process.pid} argv=${JSON.stringify(process.argv)} cwd=${process.cwd()} resourcesPath=${process.resourcesPath || ''}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}

const { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, shell, screen } = require('electron');
const TEST_USER_DATA_DIR =
  typeof process.env.ZKTALK_USER_DATA_DIR === 'string'
    ? process.env.ZKTALK_USER_DATA_DIR.trim()
    : '';
const IS_DESKTOP_TEST_INSTANCE = process.env.ZKTALK_DESKTOP_TEST === '1';

if (TEST_USER_DATA_DIR) {
  app.setPath('userData', TEST_USER_DATA_DIR);
}
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] post-electron pid=${process.pid} userData=${app.getPath('userData')} desktopTest=${IS_DESKTOP_TEST_INSTANCE}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] post-core-modules pid=${process.pid}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] require-go-menu:start pid=${process.pid}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}
let buildGoMenuSubmenu;
let getDesktopMenuLabels;
try {
  ({ buildGoMenuSubmenu, getDesktopMenuLabels } = require('./go-menu'));
} catch (error) {
  try {
    fs.appendFileSync(
      EARLY_BOOT_DEBUG_LOG_PATH,
      `[${new Date().toISOString()}] require-go-menu:error pid=${process.pid} message=${error instanceof Error ? error.stack || error.message : String(error)}\n`,
    );
  } catch (_) {
    // Ignore early boot log failures.
  }
  throw error;
}
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] require-go-menu:done pid=${process.pid}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] require-protocol-route:start pid=${process.pid}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}
const { extractRouteFromProtocolUrl, extractSharedProfileRoute } = require('./protocol-route');
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] require-protocol-route:done pid=${process.pid}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] require-window-state:start pid=${process.pid}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}
const { normalizeWindowState } = require('./window-state');
const { createDesktopLoopbackBridge } = require('./local-machine-bridge');
const { createAgentDeviceBridge } = require('./agent-device-bridge');
try {
  fs.appendFileSync(
    EARLY_BOOT_DEBUG_LOG_PATH,
    `[${new Date().toISOString()}] post-local-modules pid=${process.pid}\n`,
  );
} catch (_) {
  // Ignore early boot log failures.
}

const HOST = '127.0.0.1';
const DEV_WEB_URL = 'http://localhost:3000';
const DEV_WEB_URL_LOOPBACK = 'http://127.0.0.1:3000';
const FILE_MIME_MAP = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  dmg: 'application/x-apple-diskimage',
  iso: 'application/x-iso9660-image',
  pkg: 'application/vnd.apple.installer+xml',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  bz2: 'application/x-bzip2',
  xz: 'application/x-xz',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  exe: 'application/vnd.microsoft.portable-executable',
  msi: 'application/x-msi',
  apk: 'application/vnd.android.package-archive',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  zip: 'application/zip',
};
const LOCAL_STANDALONE_ENTRY = path.join(
  __dirname,
  '..',
  'web',
  '.next',
  'standalone',
  'apps',
  'web',
  'server.js',
);
const PACKAGED_STANDALONE_ENTRY = path.join(
  process.resourcesPath,
  'web',
  'standalone',
  'apps',
  'web',
  'server.js',
);
const LOCAL_DESKTOP_CONFIG_PATH = path.join(__dirname, 'desktop.config.json');
const LOCAL_RELEASE_NOTES_PATH = path.join(__dirname, 'RELEASE.md');
const LOCAL_SIGNING_ENV_EXAMPLE_PATH = path.join(__dirname, 'SIGNING.example.env');
const LOCAL_RELEASE_DIST_DIR = path.join(__dirname, 'dist');
const LOCAL_RELEASE_MANIFEST_PATH = path.join(__dirname, 'dist', 'release-manifest.json');
const LOCAL_RELEASE_STATUS_PATH = path.join(__dirname, 'dist', 'release-status.json');
const LOCAL_SIGNING_BLOCKERS_PATH = path.join(__dirname, 'dist', 'signing-blockers.md');
const LOCAL_SIGNING_BLOCKERS_JSON_PATH = path.join(__dirname, 'dist', 'signing-blockers.json');
const LOCAL_RELEASE_SUMMARY_JSON_PATH = path.join(__dirname, 'dist', 'release-summary.json');
const LOCAL_RELEASE_CHECKSUMS_PATH = path.join(__dirname, 'dist', 'SHA256SUMS.txt');
const LOCAL_RELEASE_INDEX_PATH = path.join(__dirname, 'dist', 'release-index.html');
const LOCAL_RELEASE_REPORT_PATH = path.join(__dirname, 'dist', 'release-report.md');
const LOCAL_RELEASE_HANDOFF_PATH = path.join(__dirname, 'dist', 'release-handoff.md');
const LOCAL_RELEASE_HANDOFF_JSON_PATH = path.join(__dirname, 'dist', 'release-handoff.json');
const LOCAL_RELEASE_HANDOFF_HTML_PATH = path.join(__dirname, 'dist', 'release-handoff.html');
const LOCAL_RELEASE_VERIFICATION_PATH = path.join(__dirname, 'dist', 'release-verification.md');
const LOCAL_RELEASE_VERIFICATION_JSON_PATH = path.join(
  __dirname,
  'dist',
  'release-verification.json',
);
const LOCAL_RELEASE_VERIFICATION_HTML_PATH = path.join(
  __dirname,
  'dist',
  'release-verification.html',
);
const LOCAL_RELEASE_BUNDLE_DIR = path.join(__dirname, 'dist', 'release-bundle');
const LOCAL_RELEASE_ARCHIVE_PATH = path.join(
  __dirname,
  'dist',
  'zkTalk-desktop-release-bundle.tar.gz',
);
const BOOT_DEBUG_LOG_PATH = '/tmp/zktalk-desktop-boot.log';
const LOCAL_AGENT_LANGUAGE_PRESET_IDS = new Set([
  'english_only',
  'korean_preferred_english_readable',
  'manual_only',
]);
const DESKTOP_APP_LOCALE_IDS = new Set(['en', 'ko']);

let mainWindow = null;
let webServerProcess = null;
let webServerUrl = null;
let webServerLogStreamsAttached = false;
let isQuitting = false;
let resolvedAppUrl = null;
let loadedDesktopConfigPath = null;
let pendingProtocolUrl = null;
let windowRecoveryInterval = null;
let isRecoveringWindow = false;
const desktopLocalMachineBridge = createDesktopLoopbackBridge({
  statePath: path.join(app.getPath('userData'), 'local-machine-bridge.json'),
});

// ── Agent Device Bridge (Phase 9B) ──────────────────────────────────
// The agent-device-bridge is the desktop daemon that registers this
// Mac as an AgentDevice with the zkTalk API, heartbeats, and dispatches
// queued commands (shell/finder/browser) submitted from the web UI.
//
// The bridge is disabled by default via env gate so the existing desktop
// experience stays untouched for users who haven't opted in yet. Set
// ZKTALK_AGENT_BRIDGE=1 to enable.
let agentDeviceBridgeToken = null;
let agentDeviceBridgeStarted = false;
const agentDeviceBridgeEnabled = process.env.ZKTALK_AGENT_BRIDGE === '1';

function readAgentBridgeStateFile() {
  const statePath = path.join(app.getPath('userData'), 'agent-device-bridge.json');
  try {
    if (!fs.existsSync(statePath)) return {};
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    appendDesktopLog(
      `[agent-bridge] failed to read state: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {};
  }
}

function writeAgentBridgeStateFile(state) {
  const statePath = path.join(app.getPath('userData'), 'agent-device-bridge.json');
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    appendDesktopLog(
      `[agent-bridge] failed to write state: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const agentDeviceBridgeConfigStore = {
  get(key) {
    const state = readAgentBridgeStateFile();
    return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
  },
  set(key, value) {
    const state = readAgentBridgeStateFile();
    state[key] = value;
    writeAgentBridgeStateFile(state);
  },
};

const agentDeviceBridge = agentDeviceBridgeEnabled
  ? createAgentDeviceBridge({
      apiBaseUrl: getConfiguredApiUrl(),
      getSessionToken: () => agentDeviceBridgeToken,
      configStore: agentDeviceBridgeConfigStore,
      preferredName: require('os').hostname() || 'zkTalk Desktop',
      logger: (level, message, meta) => {
        appendDesktopLog(
          `[agent-bridge:${level}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`,
        );
      },
    })
  : null;

function agentDeviceBridgeStateSnapshot() {
  if (!agentDeviceBridge) return null;
  return {
    deviceId: agentDeviceBridge.getDeviceId?.() ?? null,
    running: agentDeviceBridge.isRunning?.() ?? false,
    agents: agentDeviceBridge.listAgents?.() ?? [],
  };
}

async function ensureAgentDeviceBridgeStarted() {
  if (!agentDeviceBridge) return null;
  if (agentDeviceBridgeStarted) return agentDeviceBridgeStateSnapshot();
  if (!agentDeviceBridgeToken) return null;
  try {
    const deviceId = await agentDeviceBridge.start();
    agentDeviceBridgeStarted = true;
    appendDesktopLog(`[agent-bridge] started deviceId=${deviceId}`);
    return agentDeviceBridgeStateSnapshot();
  } catch (error) {
    appendDesktopLog(
      `[agent-bridge] start failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function stopAgentDeviceBridge() {
  if (!agentDeviceBridge || !agentDeviceBridgeStarted) return;
  try {
    await agentDeviceBridge.stop();
    appendDesktopLog('[agent-bridge] stopped');
  } catch (error) {
    appendDesktopLog(
      `[agent-bridge] stop failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    agentDeviceBridgeStarted = false;
  }
}

const DESKTOP_ROUTE_PREFIXES = [
  '/home',
  '/dm',
  '/friends',
  '/settings',
  '/communities',
  '/desktop-harness',
  '/login',
  '/verify',
];

function getStartupRoutePath() {
  return path.join(app.getPath('userData'), 'startup-route.json');
}

function appendBootDebug(message) {
  try {
    fs.appendFileSync(BOOT_DEBUG_LOG_PATH, `[${new Date().toISOString()}] ${message}\n`);
  } catch (_) {
    // Ignore debug log failures.
  }
}

function getInitialRouteFromArgv(argv = process.argv) {
  appendBootDebug(`argv: ${JSON.stringify(argv)}`);
  for (const value of argv.slice(1)) {
    if (typeof value !== 'string') {
      continue;
    }

    if (value.startsWith('zktalk://')) {
      const route = extractRouteFromProtocolUrl(value);
      if (route) {
        return route;
      }
    }

    if (DESKTOP_ROUTE_PREFIXES.some((prefix) => value.startsWith(prefix))) {
      return value;
    }
  }

  return null;
}

function consumeStartupRoute() {
  const startupRoutePath = getStartupRoutePath();
  appendBootDebug(`consumeStartupRoute path=${startupRoutePath}`);
  if (!fs.existsSync(startupRoutePath)) {
    appendBootDebug('consumeStartupRoute missing');
    return null;
  }

  try {
    const raw = fs.readFileSync(startupRoutePath, 'utf8');
    fs.rmSync(startupRoutePath, { force: true });
    const parsed = JSON.parse(raw);
    const route = typeof parsed?.route === 'string' ? parsed.route.trim() : '';
    appendBootDebug(`consumeStartupRoute rawRoute=${route}`);
    return DESKTOP_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix)) ? route : null;
  } catch (error) {
    try {
      fs.rmSync(startupRoutePath, { force: true });
    } catch (_) {
      // Ignore cleanup failures.
    }
    appendDesktopLog(
      `Failed to consume startup route: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

function getNodeExecutable() {
  const candidates = [
    process.env.ZKTALK_NODE_PATH,
    process.env.npm_node_execpath,
    process.env.NODE,
    '/opt/homebrew/opt/node/bin/node',
    '/opt/homebrew/Cellar/node/25.8.0/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    'node',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'node') {
      return candidate;
    }

    try {
      if (fs.existsSync(candidate)) {
        return fs.realpathSync(candidate);
      }
    } catch (_) {
      // Ignore invalid candidates and continue checking.
    }
  }

  return 'node';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function guessMimeTypeFromPath(filePath) {
  const extension = path.extname(filePath).slice(1).toLowerCase();
  return FILE_MIME_MAP[extension] || 'application/octet-stream';
}

function sanitizeTempFileName(fileName) {
  const baseName = path.basename(
    typeof fileName === 'string' && fileName.trim() ? fileName : 'attachment',
  );
  const sanitized = baseName.replace(/[^A-Za-z0-9._-]/g, '_');
  return sanitized.length > 0 ? sanitized : 'attachment';
}

function toBuffer(bytes) {
  if (Buffer.isBuffer(bytes)) {
    return bytes;
  }

  if (bytes instanceof Uint8Array) {
    return Buffer.from(bytes);
  }

  if (Array.isArray(bytes)) {
    return Buffer.from(bytes);
  }

  if (bytes instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(bytes));
  }

  throw new Error('Attachment bytes payload is missing or invalid.');
}

async function openDesktopAttachment({ name, bytes }) {
  const tempDir = path.join(app.getPath('temp'), 'zktalk-opened-attachments');
  await fs.promises.mkdir(tempDir, { recursive: true });

  const safeName = sanitizeTempFileName(name);
  const tempPath = path.join(
    tempDir,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`,
  );

  await fs.promises.writeFile(tempPath, toBuffer(bytes));
  if (IS_DESKTOP_TEST_INSTANCE) {
    return tempPath;
  }

  const openResult = await shell.openPath(tempPath);
  if (typeof openResult === 'string' && openResult.length > 0) {
    throw new Error(openResult);
  }

  return tempPath;
}

async function saveDesktopAttachment(parentWindow, { name, bytes }) {
  const safeName = sanitizeTempFileName(name);
  const defaultPath = path.join(app.getPath('downloads'), safeName);
  const result = await dialog.showSaveDialog(parentWindow, {
    title: 'Save attachment',
    buttonLabel: 'Save',
    defaultPath,
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.promises.mkdir(path.dirname(result.filePath), { recursive: true });
  await fs.promises.writeFile(result.filePath, toBuffer(bytes));
  return result.filePath;
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  ensureMainWindowOnScreen();
  mainWindow.show();
  mainWindow.focus();
  writeWindowHealth({ reason: 'focusMainWindow' });
}

function ensureWindowRecoveryMonitor() {
  if (windowRecoveryInterval) {
    return;
  }

  windowRecoveryInterval = setInterval(() => {
    if (isQuitting || isRecoveringWindow) {
      return;
    }

    const windowCount = BrowserWindow.getAllWindows().length;
    if (windowCount > 0) {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        appendDesktopLog('Window recovery monitor revealing hidden main window');
        ensureMainWindowOnScreen();
        mainWindow.show();
        writeWindowHealth({ reason: 'windowRecoveryMonitor:reveal-hidden' });
      }
      return;
    }

    appendDesktopLog('Window recovery monitor detected zero desktop windows; reloading app');
    isRecoveringWindow = true;
    loadApp()
      .catch((error) => {
        appendDesktopLog(
          `Window recovery monitor failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        isRecoveringWindow = false;
      });
  }, 5000);
}

function stopWindowRecoveryMonitor() {
  if (!windowRecoveryInterval) {
    return;
  }

  clearInterval(windowRecoveryInterval);
  windowRecoveryInterval = null;
}

function getPreferredDesktopWorkArea() {
  const displays = screen.getAllDisplays();
  const preferredDisplay =
    displays.find((display) => {
      const area = display.workArea ?? display.bounds;
      return area.x <= 0 && area.y <= 0 && area.x + area.width > 0 && area.y + area.height > 0;
    }) ||
    displays.slice().sort((left, right) => {
      const leftArea = left.workArea ?? left.bounds;
      const rightArea = right.workArea ?? right.bounds;
      return (
        Math.abs(leftArea.x) +
        Math.abs(leftArea.y) -
        (Math.abs(rightArea.x) + Math.abs(rightArea.y))
      );
    })[0] ||
    screen.getPrimaryDisplay();
  return preferredDisplay.workArea ?? preferredDisplay.bounds;
}

function ensureMainWindowOnScreen() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const preferredWorkArea = getPreferredDesktopWorkArea();
  const bounds = mainWindow.getBounds();
  appendDesktopLog(
    `Window visibility check bounds=${JSON.stringify(bounds)} preferredWorkArea=${JSON.stringify(preferredWorkArea)}`,
  );
  const intersectsPreferredWorkArea =
    bounds.x < preferredWorkArea.x + preferredWorkArea.width &&
    bounds.x + bounds.width > preferredWorkArea.x &&
    bounds.y < preferredWorkArea.y + preferredWorkArea.height &&
    bounds.y + bounds.height > preferredWorkArea.y;

  if (intersectsPreferredWorkArea) {
    writeWindowHealth({ reason: 'ensureMainWindowOnScreen:visible' });
    return;
  }

  const nextBounds = {
    x: preferredWorkArea.x + Math.max(0, Math.round((preferredWorkArea.width - bounds.width) / 2)),
    y:
      preferredWorkArea.y + Math.max(0, Math.round((preferredWorkArea.height - bounds.height) / 2)),
    width: bounds.width,
    height: bounds.height,
  };
  mainWindow.setBounds(nextBounds, false);
  appendDesktopLog(`Recentered offscreen window to ${JSON.stringify(nextBounds)}`);
  writeWindowHealth({ reason: 'ensureMainWindowOnScreen:recentered' });
}

async function navigateToAppRoute(route) {
  if (!route) {
    return;
  }

  if (!resolvedAppUrl || !mainWindow || mainWindow.isDestroyed()) {
    pendingProtocolUrl = route;
    await loadApp();
    return;
  }

  focusMainWindow();
  await mainWindow.loadURL(`${resolvedAppUrl}${route}`);
}

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function getDesktopLogPath() {
  return path.join(app.getPath('userData'), 'logs', 'desktop.log');
}

function getWindowHealthPath() {
  return path.join(app.getPath('userData'), 'window-health.json');
}

function getWindowHealthSnapshotPath(pid = process.pid) {
  return path.join(app.getPath('userData'), `window-health-${pid}.json`);
}

function writeWindowHealth(state = {}) {
  try {
    const primaryHealthPath = getWindowHealthPath();
    const snapshotHealthPath = getWindowHealthSnapshotPath(process.pid);
    fs.mkdirSync(path.dirname(primaryHealthPath), { recursive: true });
    const payload = {
      updatedAt: new Date().toISOString(),
      pid: process.pid,
      packaged: app.isPackaged,
      hasMainWindow: Boolean(mainWindow && !mainWindow.isDestroyed()),
      visible: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()),
      focused: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()),
      minimized: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMinimized()),
      bounds: mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null,
      ...state,
    };
    fs.writeFileSync(primaryHealthPath, JSON.stringify(payload, null, 2));
    fs.writeFileSync(snapshotHealthPath, JSON.stringify(payload, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendBootDebug(`writeWindowHealth failed: ${message}`);
    try {
      appendDesktopLog(`writeWindowHealth failed: ${message}`);
    } catch (_) {
      // Ignore secondary logging failures.
    }
  }
}

function getSupportBundleDir() {
  return path.join(app.getPath('userData'), 'support');
}

function getSigningEnvPath() {
  if (process.env.ZKTALK_SIGNING_ENV_PATH) {
    return process.env.ZKTALK_SIGNING_ENV_PATH;
  }

  return app.isPackaged
    ? path.join(app.getPath('userData'), 'signing.env')
    : path.join(__dirname, 'signing.env');
}

function hasSigningEnv() {
  return fs.existsSync(getSigningEnvPath());
}

function ensureSigningEnvFile() {
  if (!hasSigningEnvExample()) {
    throw new Error(`Signing env example not found at ${LOCAL_SIGNING_ENV_EXAMPLE_PATH}`);
  }

  const targetPath = getSigningEnvPath();
  if (fs.existsSync(targetPath)) {
    return targetPath;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(LOCAL_SIGNING_ENV_EXAMPLE_PATH, targetPath);
  appendDesktopLog(`Created signing env at ${targetPath}`);
  return targetPath;
}

function hasReleaseNotes() {
  return fs.existsSync(LOCAL_RELEASE_NOTES_PATH);
}

function hasSigningEnvExample() {
  return fs.existsSync(LOCAL_SIGNING_ENV_EXAMPLE_PATH);
}

function hasReleaseManifest() {
  return fs.existsSync(LOCAL_RELEASE_MANIFEST_PATH);
}

function hasReleaseStatus() {
  return fs.existsSync(LOCAL_RELEASE_STATUS_PATH);
}

function hasSigningBlockersFile() {
  return fs.existsSync(LOCAL_SIGNING_BLOCKERS_PATH);
}

function hasSigningBlockersJsonFile() {
  return fs.existsSync(LOCAL_SIGNING_BLOCKERS_JSON_PATH);
}

function hasReleaseSummaryJsonFile() {
  return fs.existsSync(LOCAL_RELEASE_SUMMARY_JSON_PATH);
}

function hasReleaseChecksums() {
  return fs.existsSync(LOCAL_RELEASE_CHECKSUMS_PATH);
}

function hasReleaseIndex() {
  return fs.existsSync(LOCAL_RELEASE_INDEX_PATH);
}

function hasReleaseReport() {
  return fs.existsSync(LOCAL_RELEASE_REPORT_PATH);
}

function hasReleaseHandoff() {
  return fs.existsSync(LOCAL_RELEASE_HANDOFF_PATH);
}

function hasReleaseHandoffJsonFile() {
  return fs.existsSync(LOCAL_RELEASE_HANDOFF_JSON_PATH);
}

function hasReleaseHandoffHtmlFile() {
  return fs.existsSync(LOCAL_RELEASE_HANDOFF_HTML_PATH);
}

function hasReleaseVerification() {
  return fs.existsSync(LOCAL_RELEASE_VERIFICATION_PATH);
}

function hasReleaseVerificationJsonFile() {
  return fs.existsSync(LOCAL_RELEASE_VERIFICATION_JSON_PATH);
}

function hasReleaseVerificationHtmlFile() {
  return fs.existsSync(LOCAL_RELEASE_VERIFICATION_HTML_PATH);
}

function hasReleaseBundle() {
  return fs.existsSync(LOCAL_RELEASE_BUNDLE_DIR);
}

function hasReleaseArchive() {
  return fs.existsSync(LOCAL_RELEASE_ARCHIVE_PATH);
}

function openFileIfPresent(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} not found at ${filePath}`);
  }

  return shell.openPath(filePath);
}

function appendDesktopLog(message) {
  try {
    const logPath = getDesktopLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (_) {
    // Ignore log write failures.
  }
}

function readFileIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return null;
  }
}

function getRecentLogLines(limit = 200) {
  const content = readFileIfExists(getDesktopLogPath());
  if (!content) {
    return [];
  }

  return content.split('\n').filter(Boolean).slice(-limit);
}

function buildSupportBundlePayload() {
  const config = getDesktopConfigSnapshot();
  const windowStateRaw = readFileIfExists(getWindowStatePath());
  let windowState = null;

  if (windowStateRaw) {
    try {
      windowState = JSON.parse(windowStateRaw);
    } catch (_) {
      windowState = {
        parseError: 'Could not parse window-state.json',
        raw: windowStateRaw,
      };
    }
  }

  return {
    createdAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    runtime: {
      electron: process.versions.electron || '',
      chrome: process.versions.chrome || '',
      node: process.versions.node || '',
      platform: process.platform,
      arch: process.arch,
      packaged: app.isPackaged,
    },
    paths: {
      userData: app.getPath('userData'),
      desktopConfig: config.path,
      desktopLog: getDesktopLogPath(),
      windowState: getWindowStatePath(),
    },
    connection: {
      apiUrl: getConfiguredApiUrl(),
      healthUrl: getApiHealthUrl(),
      webUrl: getConfiguredWebUrl(),
      wsUrl: process.env.ZKTALK_WS_URL || process.env.NEXT_PUBLIC_WS_URL || '',
      livekitUrl: process.env.ZKTALK_LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
    },
    desktopConfig: {
      apiUrl: config.apiUrl || '',
      wsUrl: config.wsUrl || '',
      livekitUrl: config.livekitUrl || '',
      webUrl: config.webUrl || '',
    },
    windowState,
    recentLogs: getRecentLogLines(),
  };
}

function createSupportBundle() {
  const supportDir = getSupportBundleDir();
  mkdirSyncSafe(supportDir);
  const filePath = path.join(
    supportDir,
    `zktalk-support-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)}.json`,
  );
  const payload = buildSupportBundlePayload();
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  appendDesktopLog(`Created support bundle at ${filePath}`);
  return filePath;
}

function mkdirSyncSafe(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getFailureActions() {
  return [
    { label: 'Retry', href: 'zktalk://retry' },
    { label: 'Diagnostics', href: 'zktalk://diagnostics', variant: 'secondary' },
    { label: 'Open logs', href: 'zktalk://open-logs', variant: 'secondary' },
  ];
}

function renderFailurePage(title, details) {
  renderStatusPage(title, details, {
    actions: getFailureActions(),
    config: getDesktopConfigSnapshot(),
  });
}

function loadWindowState() {
  const defaultState = {
    width: 1440,
    height: 960,
    x: undefined,
    y: undefined,
    isMaximized: false,
  };

  try {
    const raw = fs.readFileSync(getWindowStatePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeWindowState(parsed, screen.getAllDisplays(), defaultState);
  } catch (_) {
    return defaultState;
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const bounds = mainWindow.getBounds();
  const state = {
    ...bounds,
    isMaximized: mainWindow.isMaximized(),
  };

  try {
    fs.mkdirSync(path.dirname(getWindowStatePath()), { recursive: true });
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2));
  } catch (_) {
    // Ignore state persistence failures.
  }
}

function attachWebServerLogs(childProcess) {
  if (!childProcess || webServerLogStreamsAttached) {
    return;
  }

  webServerLogStreamsAttached = true;

  const bindStream = (stream, label, mirror) => {
    if (!stream) {
      return;
    }

    stream.on('data', (chunk) => {
      const text = chunk.toString().trimEnd();
      if (text.length > 0) {
        appendDesktopLog(`[bundled-web:${label}] ${text}`);
      }
      if (mirror) {
        mirror.write(chunk);
      }
    });
  };

  bindStream(childProcess.stdout, 'stdout', process.stdout);
  bindStream(childProcess.stderr, 'stderr', process.stderr);
}

async function handleDesktopAction(url) {
  if (url === 'zktalk://open-home') {
    await navigateToAppRoute('/home');
    return true;
  }

  if (url === 'zktalk://open-inbox') {
    await navigateToAppRoute('/dm');
    return true;
  }

  if (url === 'zktalk://open-dms') {
    await navigateToAppRoute('/dm');
    return true;
  }

  if (url === 'zktalk://open-friends') {
    await navigateToAppRoute('/friends');
    return true;
  }

  if (url === 'zktalk://open-discover') {
    await navigateToAppRoute('/home');
    return true;
  }

  if (url === 'zktalk://open-settings-hub') {
    await navigateToAppRoute('/settings');
    return true;
  }

  if (url === 'zktalk://open-profile-share') {
    await navigateToAppRoute('/settings#profile-share');
    return true;
  }

  if (url === 'zktalk://open-shared-profile-from-clipboard') {
    const nextRoute = extractSharedProfileRoute(clipboard.readText());
    await navigateToAppRoute(nextRoute || '/friends');
    return true;
  }

  if (url === 'zktalk://open-config') {
    const configPath = ensureDesktopConfigFile();
    await shell.openPath(configPath);
    return true;
  }

  if (url === 'zktalk://open-logs') {
    const logPath = getDesktopLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
    }
    await shell.openPath(logPath);
    return true;
  }

  if (url === 'zktalk://open-data-folder') {
    await shell.openPath(app.getPath('userData'));
    return true;
  }

  if (url === 'zktalk://open-release-notes') {
    renderReleaseNotesPage();
    return true;
  }

  if (url === 'zktalk://open-signing-env-example') {
    await openFileIfPresent(LOCAL_SIGNING_ENV_EXAMPLE_PATH, 'Signing env example');
    return true;
  }

  if (url === 'zktalk://init-signing-env') {
    const signingEnvPath = ensureSigningEnvFile();
    await shell.openPath(signingEnvPath);
    return true;
  }

  if (url === 'zktalk://open-signing-env') {
    const signingEnvPath = ensureSigningEnvFile();
    await openFileIfPresent(signingEnvPath, 'Signing env');
    return true;
  }

  if (url === 'zktalk://open-release-dist') {
    await openFileIfPresent(LOCAL_RELEASE_DIST_DIR, 'Release dist directory');
    return true;
  }

  if (url === 'zktalk://open-release-artifacts') {
    renderReleaseArtifactsPage();
    return true;
  }

  if (url === 'zktalk://copy-diagnostics') {
    clipboard.writeText(getDiagnosticsText());
    appendDesktopLog('Copied desktop diagnostics to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-paths') {
    clipboard.writeText(getReleasePathsText());
    appendDesktopLog('Copied desktop release paths to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-status-summary') {
    clipboard.writeText(getReleaseStatusSummaryText());
    appendDesktopLog('Copied desktop release readiness summary to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-summary') {
    clipboard.writeText(getReleaseSummaryText());
    appendDesktopLog('Copied desktop release summary to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-next-steps') {
    clipboard.writeText(getReleaseNextStepsText());
    appendDesktopLog('Copied desktop release next steps to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-commands') {
    clipboard.writeText(getReleaseCommandsText());
    appendDesktopLog('Copied desktop release commands to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-recommended-release-commands') {
    clipboard.writeText(getRecommendedReleaseCommandsText());
    appendDesktopLog('Copied desktop recommended release commands to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-available-signed-release-commands') {
    clipboard.writeText(getAvailableSignedReleaseCommandsText());
    appendDesktopLog('Copied desktop available signed release commands to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-primary-release-command') {
    clipboard.writeText(getPrimaryRecommendedReleaseCommand());
    appendDesktopLog('Copied desktop primary release command to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-artifacts') {
    clipboard.writeText(getReleaseArtifactsText());
    appendDesktopLog('Copied desktop release artifacts to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-checksums') {
    clipboard.writeText(getReleaseChecksumsText());
    appendDesktopLog('Copied desktop release checksums to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-report') {
    clipboard.writeText(getReleaseReportText());
    appendDesktopLog('Copied desktop release report to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-verification') {
    clipboard.writeText(getReleaseVerificationText());
    appendDesktopLog('Copied desktop release verification to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-verification-json') {
    clipboard.writeText(getReleaseVerificationJsonText());
    appendDesktopLog('Copied desktop release verification JSON to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-bundle') {
    clipboard.writeText(getReleaseBundleText());
    appendDesktopLog('Copied desktop release bundle to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-archive') {
    clipboard.writeText(getReleaseArchiveText());
    appendDesktopLog('Copied desktop release archive to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-dashboard') {
    clipboard.writeText(getReleaseDashboardCopyText());
    appendDesktopLog('Copied desktop release dashboard to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-handoff') {
    clipboard.writeText(getReleaseHandoffText());
    appendDesktopLog('Copied desktop release handoff to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-handoff-markdown') {
    clipboard.writeText(getReleaseHandoffMarkdownText());
    appendDesktopLog('Copied desktop release handoff markdown to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-release-handoff-json') {
    clipboard.writeText(getReleaseHandoffJsonText());
    appendDesktopLog('Copied desktop release handoff JSON to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-installers') {
    clipboard.writeText(getInstallerSummaryText());
    appendDesktopLog('Copied desktop installer summary to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-signing-setup') {
    clipboard.writeText(getSigningSetupCopyText());
    appendDesktopLog('Copied desktop signing setup to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-signing-blockers') {
    clipboard.writeText(getSigningBlockingText());
    appendDesktopLog('Copied desktop signing blockers to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-signing-blockers-report') {
    clipboard.writeText(getSigningBlockersReportText());
    appendDesktopLog('Copied desktop signing blockers report to clipboard');
    return true;
  }

  if (url === 'zktalk://copy-signing-blockers-json') {
    clipboard.writeText(getSigningBlockersJsonText());
    appendDesktopLog('Copied desktop signing blockers JSON to clipboard');
    return true;
  }

  if (url === 'zktalk://open-release-manifest') {
    renderReleaseArtifactsPage();
    return true;
  }

  if (url === 'zktalk://open-release-dashboard') {
    renderReleaseDashboardPage();
    return true;
  }

  if (url === 'zktalk://open-release-handoff') {
    renderReleaseHandoffPage();
    return true;
  }

  if (url === 'zktalk://open-release-handoff-markdown') {
    renderReleaseHandoffMarkdownPage();
    return true;
  }

  if (url === 'zktalk://open-release-handoff-file') {
    await openFileIfPresent(LOCAL_RELEASE_HANDOFF_PATH, 'Release handoff');
    return true;
  }

  if (url === 'zktalk://open-release-handoff-json') {
    renderReleaseHandoffJsonPage();
    return true;
  }

  if (url === 'zktalk://open-release-handoff-json-file') {
    await openFileIfPresent(LOCAL_RELEASE_HANDOFF_JSON_PATH, 'Release handoff JSON');
    return true;
  }

  if (url === 'zktalk://open-release-handoff-html-file') {
    await openFileIfPresent(LOCAL_RELEASE_HANDOFF_HTML_PATH, 'Release handoff HTML');
    return true;
  }

  if (url === 'zktalk://open-release-commands') {
    renderReleaseCommandsPage();
    return true;
  }

  if (url === 'zktalk://open-signing-setup') {
    renderSigningSetupPage();
    return true;
  }

  if (url === 'zktalk://open-signing-blockers') {
    renderSigningBlockersPage();
    return true;
  }

  if (url === 'zktalk://open-signing-blockers-report') {
    renderSigningBlockersReportPage();
    return true;
  }

  if (url === 'zktalk://open-signing-blockers-file') {
    await openFileIfPresent(LOCAL_SIGNING_BLOCKERS_PATH, 'Signing blockers');
    return true;
  }

  if (url === 'zktalk://open-signing-blockers-json') {
    renderSigningBlockersJsonPage();
    return true;
  }

  if (url === 'zktalk://open-signing-blockers-json-file') {
    await openFileIfPresent(LOCAL_SIGNING_BLOCKERS_JSON_PATH, 'Signing blockers JSON');
    return true;
  }

  if (url === 'zktalk://open-release-manifest-json') {
    await openFileIfPresent(LOCAL_RELEASE_MANIFEST_PATH, 'Release manifest');
    return true;
  }

  if (url === 'zktalk://open-release-status') {
    renderReleaseStatusPage();
    return true;
  }

  if (url === 'zktalk://open-release-summary') {
    renderReleaseSummaryPage();
    return true;
  }

  if (url === 'zktalk://open-release-status-json') {
    await openFileIfPresent(LOCAL_RELEASE_STATUS_PATH, 'Release status');
    return true;
  }

  if (url === 'zktalk://open-release-summary-json') {
    renderReleaseSummaryJsonPage();
    return true;
  }

  if (url === 'zktalk://open-release-summary-json-file') {
    await openFileIfPresent(LOCAL_RELEASE_SUMMARY_JSON_PATH, 'Release summary JSON');
    return true;
  }

  if (url === 'zktalk://open-release-checksums') {
    renderReleaseChecksumsPage();
    return true;
  }

  if (url === 'zktalk://open-release-checksums-file') {
    await openFileIfPresent(LOCAL_RELEASE_CHECKSUMS_PATH, 'Release checksums');
    return true;
  }

  if (url === 'zktalk://open-release-index') {
    renderReleaseIndexPage();
    return true;
  }

  if (url === 'zktalk://open-release-index-file') {
    await openFileIfPresent(LOCAL_RELEASE_INDEX_PATH, 'Release index');
    return true;
  }

  if (url === 'zktalk://open-release-report') {
    renderReleaseReportPage();
    return true;
  }

  if (url === 'zktalk://open-release-report-file') {
    await openFileIfPresent(LOCAL_RELEASE_REPORT_PATH, 'Release report');
    return true;
  }

  if (url === 'zktalk://open-release-verification') {
    renderReleaseVerificationPage();
    return true;
  }

  if (url === 'zktalk://open-release-verification-file') {
    await openFileIfPresent(LOCAL_RELEASE_VERIFICATION_PATH, 'Release verification report');
    return true;
  }

  if (url === 'zktalk://open-release-verification-json') {
    renderReleaseVerificationJsonPage();
    return true;
  }

  if (url === 'zktalk://open-release-verification-json-file') {
    await openFileIfPresent(LOCAL_RELEASE_VERIFICATION_JSON_PATH, 'Release verification JSON');
    return true;
  }

  if (url === 'zktalk://open-release-verification-html-file') {
    await openFileIfPresent(LOCAL_RELEASE_VERIFICATION_HTML_PATH, 'Release verification HTML');
    return true;
  }

  if (url === 'zktalk://open-release-bundle') {
    renderReleaseBundlePage();
    return true;
  }

  if (url === 'zktalk://open-release-bundle-folder') {
    await openFileIfPresent(LOCAL_RELEASE_BUNDLE_DIR, 'Release bundle');
    return true;
  }

  if (url === 'zktalk://open-release-archive') {
    renderReleaseArchivePage();
    return true;
  }

  if (url === 'zktalk://open-release-archive-file') {
    await openFileIfPresent(LOCAL_RELEASE_ARCHIVE_PATH, 'Release archive');
    return true;
  }

  if (url === 'zktalk://open-mac-dmg') {
    const macDmgPath = getMacDmgPath();
    await openFileIfPresent(macDmgPath, 'macOS installer');
    return true;
  }

  if (url === 'zktalk://open-win-x64-installer') {
    const windowsX64InstallerPath = getWindowsX64InstallerPath();
    await openFileIfPresent(windowsX64InstallerPath, 'Windows x64 installer');
    return true;
  }

  if (url === 'zktalk://open-win-arm64-installer') {
    const windowsArm64InstallerPath = getWindowsArm64InstallerPath();
    await openFileIfPresent(windowsArm64InstallerPath, 'Windows ARM64 installer');
    return true;
  }

  if (url === 'zktalk://open-support-folder') {
    mkdirSyncSafe(getSupportBundleDir());
    await shell.openPath(getSupportBundleDir());
    return true;
  }

  if (url === 'zktalk://export-support-bundle') {
    const bundlePath = createSupportBundle();
    await shell.openPath(bundlePath);
    return true;
  }

  if (url === 'zktalk://diagnostics') {
    renderDiagnosticsPage();
    return true;
  }

  if (url === 'zktalk://settings') {
    renderConnectionSettingsPage();
    return true;
  }

  if (url === 'zktalk://back-to-app') {
    if (resolvedAppUrl && mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(resolvedAppUrl);
    } else {
      await loadApp();
    }
    return true;
  }

  if (url === 'zktalk://retry') {
    loadApp().catch(() => {});
    return true;
  }

  return false;
}

async function handleIncomingProtocolUrl(url) {
  appendDesktopLog(`Received protocol URL: ${url}`);
  if (await handleDesktopAction(url)) {
    appendDesktopLog(`Handled desktop action URL: ${url}`);
    return;
  }

  const route = extractRouteFromProtocolUrl(url);
  if (!route) {
    appendDesktopLog(`Protocol URL produced no route: ${url}`);
    return;
  }

  appendDesktopLog(`Resolved protocol route: ${route}`);

  if (!resolvedAppUrl || !mainWindow || mainWindow.isDestroyed()) {
    pendingProtocolUrl = route;
    appendDesktopLog(`Queued pending protocol route: ${route}`);
    loadApp().catch(() => {});
    return;
  }

  focusMainWindow();
  appendDesktopLog(`Navigating main window to protocol route: ${route}`);
  await loadMainWindowUrl(`${resolvedAppUrl}${route}`, 'protocol route handoff');
}

function normalizeBaseUrl(url) {
  return typeof url === 'string' ? url.replace(/\/+$/, '') : '';
}

function normalizeOptionalUrl(url) {
  return typeof url === 'string' && url.trim().length > 0 ? normalizeBaseUrl(url.trim()) : '';
}

async function loadMainWindowUrl(url, reason) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  try {
    await mainWindow.loadURL(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ERR_ABORTED')) {
      appendDesktopLog(`Ignoring expected loadURL abort after ${reason}: ${url}`);
      return;
    }
    throw error;
  }
}

function isLoopbackHostname(hostname) {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
}

function getReroutedAppUrl(url) {
  if (!resolvedAppUrl || typeof url !== 'string' || url.length === 0) {
    return null;
  }

  try {
    const candidateUrl = new URL(url);
    const currentUrl = new URL(resolvedAppUrl);

    if (candidateUrl.origin === currentUrl.origin) {
      return url;
    }

    if (
      candidateUrl.protocol === currentUrl.protocol &&
      isLoopbackHostname(candidateUrl.hostname) &&
      isLoopbackHostname(currentUrl.hostname)
    ) {
      return `${currentUrl.origin}${candidateUrl.pathname}${candidateUrl.search}${candidateUrl.hash}`;
    }
  } catch (_) {
    return null;
  }

  return null;
}

function deriveWebSocketUrl(apiUrl) {
  try {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/api/ws';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

function getDesktopConfigPath() {
  if (process.env.ZKTALK_CONFIG_PATH) {
    return process.env.ZKTALK_CONFIG_PATH;
  }

  return app.isPackaged
    ? path.join(app.getPath('userData'), 'desktop.config.json')
    : LOCAL_DESKTOP_CONFIG_PATH;
}

function getLegacyUserDesktopConfigPath() {
  return path.join(app.getPath('appData'), 'zkTalk', 'desktop.config.json');
}

function getDefaultDesktopConfig() {
  return {
    apiUrl: 'http://127.0.0.1:4000',
    wsUrl: 'ws://127.0.0.1:4000/api/ws',
    livekitUrl: 'ws://127.0.0.1:7880',
    webUrl: '',
    localAgentLanguagePreset: 'manual_only',
    appLocale: 'ko',
  };
}

function normalizeLocalAgentLanguagePreset(value) {
  return LOCAL_AGENT_LANGUAGE_PRESET_IDS.has(value)
    ? value
    : getDefaultDesktopConfig().localAgentLanguagePreset;
}

function normalizeDesktopAppLocale(value) {
  if (typeof value !== 'string') {
    return getDefaultDesktopConfig().appLocale;
  }

  const normalized = value.trim().toLowerCase();
  return DESKTOP_APP_LOCALE_IDS.has(normalized) ? normalized : getDefaultDesktopConfig().appLocale;
}

function getDesktopConfigSnapshot() {
  const configPath = ensureDesktopConfigFile();

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultDesktopConfig(),
      ...parsed,
      localAgentLanguagePreset: normalizeLocalAgentLanguagePreset(parsed.localAgentLanguagePreset),
      appLocale: normalizeDesktopAppLocale(parsed.appLocale),
      path: configPath,
    };
  } catch (_) {
    return {
      ...getDefaultDesktopConfig(),
      path: configPath,
    };
  }
}

function ensureDesktopConfigFile() {
  const configPath = loadedDesktopConfigPath || getDesktopConfigPath();
  if (fs.existsSync(configPath)) {
    return configPath;
  }

  const legacyConfigPath = getLegacyUserDesktopConfigPath();
  if (legacyConfigPath !== configPath && fs.existsSync(legacyConfigPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.copyFileSync(legacyConfigPath, configPath);
    loadedDesktopConfigPath = configPath;
    appendDesktopLog(`Migrated desktop config from ${legacyConfigPath} to ${configPath}`);
    return configPath;
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(getDefaultDesktopConfig(), null, 2));
  loadedDesktopConfigPath = configPath;
  return configPath;
}

function writeDesktopConfig(nextConfig) {
  const configPath = ensureDesktopConfigFile();
  const currentConfig = getDesktopConfigSnapshot();
  const apiUrl = normalizeOptionalUrl(nextConfig.apiUrl) || getDefaultDesktopConfig().apiUrl;
  const wsUrl = normalizeOptionalUrl(nextConfig.wsUrl) || deriveWebSocketUrl(apiUrl);
  const livekitUrl =
    normalizeOptionalUrl(nextConfig.livekitUrl) || getDefaultDesktopConfig().livekitUrl;
  const webUrl = normalizeOptionalUrl(nextConfig.webUrl);
  const localAgentLanguagePreset = normalizeLocalAgentLanguagePreset(
    nextConfig.localAgentLanguagePreset,
  );
  const appLocale = normalizeDesktopAppLocale(nextConfig.appLocale ?? currentConfig.appLocale);

  const payload = {
    apiUrl,
    wsUrl,
    livekitUrl,
    webUrl,
    localAgentLanguagePreset,
    appLocale,
  };

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(payload, null, 2));
  loadedDesktopConfigPath = configPath;
  return {
    ...payload,
    path: configPath,
  };
}

function setOptionalEnv(name, value) {
  if (value) {
    process.env[name] = value;
    return;
  }

  delete process.env[name];
}

function loadDesktopConfig() {
  const primaryConfigPath = process.env.ZKTALK_CONFIG_PATH || LOCAL_DESKTOP_CONFIG_PATH;
  const fallbackConfigPath = path.join(app.getPath('userData'), 'desktop.config.json');
  const legacyConfigPath = getLegacyUserDesktopConfigPath();
  const candidates = [primaryConfigPath, fallbackConfigPath, legacyConfigPath];

  for (const candidatePath of candidates) {
    try {
      if (!fs.existsSync(candidatePath)) {
        continue;
      }

      const raw = fs.readFileSync(candidatePath, 'utf8');
      const config = JSON.parse(raw);
      loadedDesktopConfigPath = candidatePath;
      const apiUrl =
        normalizeOptionalUrl(process.env.ZKTALK_API_URL) ||
        normalizeOptionalUrl(config.apiUrl) ||
        getDefaultDesktopConfig().apiUrl;
      const wsUrl =
        normalizeOptionalUrl(process.env.ZKTALK_WS_URL) ||
        (typeof config.wsUrl === 'string' && config.wsUrl.length > 0
          ? normalizeOptionalUrl(config.wsUrl)
          : deriveWebSocketUrl(apiUrl));
      const livekitUrl =
        normalizeOptionalUrl(process.env.ZKTALK_LIVEKIT_URL) ||
        normalizeOptionalUrl(config.livekitUrl);
      const webUrl =
        normalizeOptionalUrl(process.env.ZKTALK_WEB_URL) || normalizeOptionalUrl(config.webUrl);
      const localAgentLanguagePreset = normalizeLocalAgentLanguagePreset(
        config.localAgentLanguagePreset,
      );
      const appLocale = normalizeDesktopAppLocale(config.appLocale);
      const openRouterApiKey =
        typeof process.env.OPENROUTER_API_KEY === 'string'
          ? process.env.OPENROUTER_API_KEY.trim()
          : '';

      setOptionalEnv('ZKTALK_API_URL', apiUrl);
      setOptionalEnv('NEXT_PUBLIC_API_URL', apiUrl);
      setOptionalEnv('ZKTALK_WS_URL', wsUrl);
      setOptionalEnv('NEXT_PUBLIC_WS_URL', wsUrl);
      setOptionalEnv('ZKTALK_LIVEKIT_URL', livekitUrl);
      setOptionalEnv('NEXT_PUBLIC_LIVEKIT_URL', livekitUrl);
      setOptionalEnv('ZKTALK_WEB_URL', webUrl);
      setOptionalEnv('ZKTALK_LOCAL_AGENT_LANGUAGE_PRESET', localAgentLanguagePreset);
      setOptionalEnv('ZKTALK_APP_LOCALE', appLocale);
      setOptionalEnv('OPENROUTER_API_KEY', openRouterApiKey);
      appendDesktopLog(`Loaded desktop config from ${candidatePath}`);

      return;
    } catch (error) {
      appendDesktopLog(
        `Failed to load desktop config from ${candidatePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error(`[desktop-config] Failed to load ${candidatePath}`, error);
    }
  }

  const defaults = getDefaultDesktopConfig();
  setOptionalEnv('ZKTALK_API_URL', defaults.apiUrl);
  setOptionalEnv('NEXT_PUBLIC_API_URL', defaults.apiUrl);
  setOptionalEnv('ZKTALK_WS_URL', defaults.wsUrl);
  setOptionalEnv('NEXT_PUBLIC_WS_URL', defaults.wsUrl);
  setOptionalEnv('ZKTALK_LIVEKIT_URL', defaults.livekitUrl);
  setOptionalEnv('NEXT_PUBLIC_LIVEKIT_URL', defaults.livekitUrl);
  setOptionalEnv('ZKTALK_LOCAL_AGENT_LANGUAGE_PRESET', defaults.localAgentLanguagePreset);
  setOptionalEnv('ZKTALK_APP_LOCALE', defaults.appLocale);
  if (typeof process.env.OPENROUTER_API_KEY === 'string') {
    setOptionalEnv('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY.trim());
  }
  delete process.env.ZKTALK_WEB_URL;
}

function getConfiguredApiUrl() {
  return normalizeBaseUrl(
    process.env.ZKTALK_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000',
  );
}

function getConfiguredWebUrl() {
  return normalizeOptionalUrl(process.env.ZKTALK_WEB_URL || '');
}

function getApiHealthUrl() {
  return `${getConfiguredApiUrl()}/api/health`;
}

function getDiagnosticsLines() {
  const config = getDesktopConfigSnapshot();
  return [
    `App version: ${app.getVersion()}`,
    `Electron: ${process.versions.electron || ''}`,
    `Chrome: ${process.versions.chrome || ''}`,
    `Node: ${process.versions.node || ''}`,
    `Platform: ${process.platform} ${process.arch}`,
    `Packaged: ${app.isPackaged ? 'yes' : 'no'}`,
    `API URL: ${getConfiguredApiUrl()}`,
    `Health URL: ${getApiHealthUrl()}`,
    `External web URL: ${getConfiguredWebUrl() || '(none)'}`,
    `Local bridge language preset: ${config.localAgentLanguagePreset}`,
    `Desktop config: ${config.path}`,
    `Desktop logs: ${getDesktopLogPath()}`,
    `Support bundles: ${getSupportBundleDir()}`,
    `User data: ${app.getPath('userData')}`,
    `Signing env example: ${hasSigningEnvExample() ? LOCAL_SIGNING_ENV_EXAMPLE_PATH : '(not bundled)'}`,
    `Signing env: ${hasSigningEnv() ? getSigningEnvPath() : '(not generated)'}`,
    `Release signing blockers: ${hasSigningBlockersFile() ? LOCAL_SIGNING_BLOCKERS_PATH : '(not generated)'}`,
    `Release signing blockers JSON: ${hasSigningBlockersJsonFile() ? LOCAL_SIGNING_BLOCKERS_JSON_PATH : '(not generated)'}`,
    `Release summary JSON: ${hasReleaseSummaryJsonFile() ? LOCAL_RELEASE_SUMMARY_JSON_PATH : '(not generated)'}`,
    `Release dist dir: ${fs.existsSync(LOCAL_RELEASE_DIST_DIR) ? LOCAL_RELEASE_DIST_DIR : '(not generated)'}`,
    `Release manifest: ${hasReleaseManifest() ? LOCAL_RELEASE_MANIFEST_PATH : '(not generated)'}`,
    `Release status: ${hasReleaseStatus() ? LOCAL_RELEASE_STATUS_PATH : '(not generated)'}`,
    `Release checksums: ${hasReleaseChecksums() ? LOCAL_RELEASE_CHECKSUMS_PATH : '(not generated)'}`,
    `Release index: ${hasReleaseIndex() ? LOCAL_RELEASE_INDEX_PATH : '(not generated)'}`,
    `Release report: ${hasReleaseReport() ? LOCAL_RELEASE_REPORT_PATH : '(not generated)'}`,
    `Release handoff: ${hasReleaseHandoff() ? LOCAL_RELEASE_HANDOFF_PATH : '(not generated)'}`,
    `Release handoff JSON: ${hasReleaseHandoffJsonFile() ? LOCAL_RELEASE_HANDOFF_JSON_PATH : '(not generated)'}`,
    `Release handoff HTML: ${hasReleaseHandoffHtmlFile() ? LOCAL_RELEASE_HANDOFF_HTML_PATH : '(not generated)'}`,
    `Release verification: ${hasReleaseVerification() ? LOCAL_RELEASE_VERIFICATION_PATH : '(not generated)'}`,
    `Release verification JSON: ${hasReleaseVerificationJsonFile() ? LOCAL_RELEASE_VERIFICATION_JSON_PATH : '(not generated)'}`,
    `Release verification HTML: ${hasReleaseVerificationHtmlFile() ? LOCAL_RELEASE_VERIFICATION_HTML_PATH : '(not generated)'}`,
    `Release bundle: ${hasReleaseBundle() ? LOCAL_RELEASE_BUNDLE_DIR : '(not generated)'}`,
    `Release archive: ${hasReleaseArchive() ? LOCAL_RELEASE_ARCHIVE_PATH : '(not generated)'}`,
  ];
}

function getReleaseStatusSummaryLines() {
  if (!hasReleaseStatus()) {
    return ['Release readiness: (not generated)'];
  }

  try {
    const raw = fs.readFileSync(LOCAL_RELEASE_STATUS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const summary = parsed && typeof parsed === 'object' ? parsed.summary : null;
    const nextSteps =
      parsed && typeof parsed === 'object' && Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps
        : [];

    const lines = [
      `Release readiness (macOS): ${summary && typeof summary.macos === 'string' ? summary.macos : 'unknown'}`,
      `Release readiness (Windows): ${summary && typeof summary.windows === 'string' ? summary.windows : 'unknown'}`,
    ];

    if (nextSteps.length > 0) {
      lines.push('Release next steps:');
      for (const step of nextSteps) {
        lines.push(`- ${step}`);
      }
    }

    return lines;
  } catch (error) {
    return [
      `Release readiness: could not read ${LOCAL_RELEASE_STATUS_PATH}`,
      `Release readiness error: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
}

function readReleaseStatusSnapshot() {
  if (!hasReleaseStatus()) {
    return null;
  }

  try {
    const raw = fs.readFileSync(LOCAL_RELEASE_STATUS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function isReleaseReadyStatus(value) {
  return typeof value === 'string' && value.toUpperCase() === 'READY';
}

function readReleaseManifestSnapshot() {
  if (!hasReleaseManifest()) {
    return null;
  }

  try {
    const raw = fs.readFileSync(LOCAL_RELEASE_MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function readReleaseVerificationSnapshot() {
  if (!hasReleaseVerificationJsonFile()) {
    return null;
  }

  try {
    const raw = fs.readFileSync(LOCAL_RELEASE_VERIFICATION_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function findReleaseArtifactPath(predicate) {
  const releaseManifest = readReleaseManifestSnapshot();
  if (!releaseManifest) {
    return '';
  }

  const artifacts = Array.isArray(releaseManifest.artifacts) ? releaseManifest.artifacts : [];
  const artifact = artifacts.find(
    (entry) => entry && typeof entry === 'object' && predicate(entry),
  );
  return artifact && typeof artifact.path === 'string' ? artifact.path : '';
}

function getMacDmgPath() {
  return findReleaseArtifactPath(
    (artifact) =>
      typeof artifact.name === 'string' &&
      artifact.name.endsWith('.dmg') &&
      !artifact.name.endsWith('.dmg.blockmap'),
  );
}

function getWindowsX64InstallerPath() {
  return findReleaseArtifactPath(
    (artifact) =>
      typeof artifact.name === 'string' &&
      artifact.name.includes('win-x64') &&
      artifact.name.endsWith('.exe') &&
      !artifact.name.endsWith('.exe.blockmap'),
  );
}

function getWindowsArm64InstallerPath() {
  return findReleaseArtifactPath(
    (artifact) =>
      typeof artifact.name === 'string' &&
      artifact.name.includes('win-arm64') &&
      artifact.name.endsWith('.exe') &&
      !artifact.name.endsWith('.exe.blockmap'),
  );
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return 'unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function getDiagnosticsText() {
  return [
    ...getDiagnosticsLines(),
    '',
    getPrimaryRecommendedReleaseCommandText(),
    '',
    ...getReleaseStatusSummaryLines(),
  ].join('\n');
}

function getReleasePathsText() {
  return getDiagnosticsLines()
    .filter((line) => line.startsWith('Signing env') || line.startsWith('Release '))
    .join('\n');
}

function getReleaseStatusSummaryText() {
  return getReleaseStatusSummaryLines().join('\n');
}

function getReleaseNextStepsLines() {
  const releaseStatus = readReleaseStatusSnapshot();
  if (!releaseStatus || !Array.isArray(releaseStatus.nextSteps)) {
    return [];
  }

  return releaseStatus.nextSteps.filter((step) => typeof step === 'string' && step.length > 0);
}

function getReleaseNextStepsText() {
  const nextSteps = getReleaseNextStepsLines();
  if (nextSteps.length === 0) {
    return 'Next steps: none';
  }

  return ['Next steps:', ...nextSteps.map((step) => `- ${step}`)].join('\n');
}

function getAvailableSignedReleaseCommandsLines() {
  if (!hasSigningEnv()) {
    return [];
  }

  const releaseStatus = readReleaseStatusSnapshot();
  const targets =
    releaseStatus && typeof releaseStatus.targets === 'object' ? releaseStatus.targets : null;
  const summary =
    releaseStatus && typeof releaseStatus.summary === 'object' ? releaseStatus.summary : {};

  const lines = [];

  const targetEntries = [
    ['all', 'Signed all-platform release'],
    ['mac', 'Signed macOS release'],
    ['win:x64', 'Signed Windows x64 release'],
    ['win:arm64', 'Signed Windows arm64 release'],
  ];

  for (const [key, label] of targetEntries) {
    const entry = targets && typeof targets[key] === 'object' ? targets[key] : null;
    if (!entry || entry.ready !== true || typeof entry.command !== 'string') {
      continue;
    }
    lines.push(`- ${label}: ${entry.command}`);
  }

  if (lines.length > 0) {
    return lines;
  }

  if (isReleaseReadyStatus(summary.macos) && isReleaseReadyStatus(summary.windows)) {
    return ['- Signed all-platform release: npm run release:signed'];
  }

  if (isReleaseReadyStatus(summary.macos)) {
    lines.push('- Signed macOS release: npm run release:signed:mac');
  }

  if (isReleaseReadyStatus(summary.windows)) {
    lines.push('- Signed Windows x64 release: npm run release:signed:win:x64');
    lines.push('- Signed Windows arm64 release: npm run release:signed:win:arm64');
  }

  return lines;
}

function getAvailableSignedReleaseCommandsText() {
  const lines = getAvailableSignedReleaseCommandsLines();
  if (lines.length === 0) {
    return 'Available signed release commands: none yet';
  }

  return ['Available signed release commands:', ...lines].join('\n');
}

function getReleaseStatusPageText() {
  const releaseStatus = readReleaseStatusSnapshot();
  if (!releaseStatus) {
    return [
      'Release status is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_STATUS_PATH}`,
      '',
      'Run `npm run release:status` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  const lines = [];

  if (typeof releaseStatus.generatedAt === 'string' && releaseStatus.generatedAt.length > 0) {
    lines.push(`Generated at: ${releaseStatus.generatedAt}`);
  }

  const summary =
    releaseStatus.summary && typeof releaseStatus.summary === 'object' ? releaseStatus.summary : {};
  lines.push(`macOS readiness: ${typeof summary.macos === 'string' ? summary.macos : 'unknown'}`);
  lines.push(
    `Windows readiness: ${typeof summary.windows === 'string' ? summary.windows : 'unknown'}`,
  );
  lines.push(getPrimaryRecommendedReleaseCommandText());

  const sections =
    releaseStatus.sections && typeof releaseStatus.sections === 'object'
      ? releaseStatus.sections
      : {};

  for (const [sectionName, sectionItems] of Object.entries(sections)) {
    if (!Array.isArray(sectionItems) || sectionItems.length === 0) {
      continue;
    }

    lines.push('');
    lines.push(`${sectionName}:`);

    for (const item of sectionItems) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const label = typeof item.label === 'string' ? item.label : 'Unknown';
      const value = typeof item.value === 'string' ? item.value : 'unknown';
      lines.push(`- ${label}: ${value}`);
    }
  }

  if (Array.isArray(releaseStatus.nextSteps) && releaseStatus.nextSteps.length > 0) {
    lines.push('');
    lines.push('Next steps:');
    for (const step of releaseStatus.nextSteps) {
      if (typeof step === 'string' && step.length > 0) {
        lines.push(`- ${step}`);
      }
    }
  }

  const availableSignedCommands = getAvailableSignedReleaseCommandsLines();
  if (availableSignedCommands.length > 0) {
    lines.push('', 'Available signed release commands:');
    lines.push(...availableSignedCommands);
  }

  return lines.join('\n');
}

function getReleaseArtifactsPageText() {
  const releaseManifest = readReleaseManifestSnapshot();
  if (!releaseManifest) {
    return [
      'Release artifacts are not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_MANIFEST_PATH}`,
      '',
      'Run `npm run release:manifest` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  const lines = [];

  if (typeof releaseManifest.generatedAt === 'string' && releaseManifest.generatedAt.length > 0) {
    lines.push(`Generated at: ${releaseManifest.generatedAt}`);
  }

  if (typeof releaseManifest.distDir === 'string' && releaseManifest.distDir.length > 0) {
    lines.push(`Dist dir: ${releaseManifest.distDir}`);
  }

  const artifacts = Array.isArray(releaseManifest.artifacts) ? releaseManifest.artifacts : [];
  if (artifacts.length === 0) {
    lines.push('');
    lines.push('No artifacts were found in the manifest.');
    return lines.join('\n');
  }

  lines.push('');
  lines.push('Artifacts:');

  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== 'object') {
      continue;
    }

    const name = typeof artifact.name === 'string' ? artifact.name : 'Unknown artifact';
    const pathValue = typeof artifact.path === 'string' ? artifact.path : '(missing path)';
    const sha256 = typeof artifact.sha256 === 'string' ? artifact.sha256 : '(missing sha256)';
    lines.push(`- ${name}`);
    lines.push(`  Size: ${formatBytes(artifact.sizeBytes)}`);
    lines.push(`  SHA256: ${sha256}`);
    lines.push(`  Path: ${pathValue}`);
  }

  return lines.join('\n');
}

function getReleaseArtifactsText() {
  const releaseManifest = readReleaseManifestSnapshot();
  if (!releaseManifest) {
    return [
      'Release artifacts are not available.',
      `Expected file: ${LOCAL_RELEASE_MANIFEST_PATH}`,
    ].join('\n');
  }

  const artifacts = Array.isArray(releaseManifest.artifacts) ? releaseManifest.artifacts : [];
  if (artifacts.length === 0) {
    return 'Release artifacts: none';
  }

  const lines = [];

  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== 'object') {
      continue;
    }

    const name = typeof artifact.name === 'string' ? artifact.name : 'Unknown artifact';
    const size = formatBytes(artifact.sizeBytes);
    const sha256 = typeof artifact.sha256 === 'string' ? artifact.sha256 : '(missing sha256)';
    const pathValue = typeof artifact.path === 'string' ? artifact.path : '(missing path)';
    lines.push(`${name}`);
    lines.push(`  Size: ${size}`);
    lines.push(`  SHA256: ${sha256}`);
    lines.push(`  Path: ${pathValue}`);
  }

  return lines.join('\n');
}

function getReleaseChecksumsText() {
  const checksums = readFileIfExists(LOCAL_RELEASE_CHECKSUMS_PATH);
  if (!checksums) {
    return [
      'Release checksums are not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_CHECKSUMS_PATH}`,
      '',
      'Run `npm run release:checksums` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  return checksums.trim();
}

function getReleaseSummaryJsonText() {
  const summary = readFileIfExists(LOCAL_RELEASE_SUMMARY_JSON_PATH);
  if (!summary) {
    return [
      'Release summary JSON is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_SUMMARY_JSON_PATH}`,
      '',
      'Run `npm run release:summary` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  return summary.trim();
}

function getReleaseSummaryText() {
  const rawSummary = readFileIfExists(LOCAL_RELEASE_SUMMARY_JSON_PATH);
  if (!rawSummary) {
    return [
      'Release summary is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_SUMMARY_JSON_PATH}`,
      '',
      'Run `npm run release:summary` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  try {
    const summary = JSON.parse(rawSummary);
    const readiness = summary && typeof summary.readiness === 'object' ? summary.readiness : {};
    const blockers = Array.isArray(summary?.blockers) ? summary.blockers : [];
    const nextSteps = Array.isArray(summary?.nextSteps) ? summary.nextSteps : [];
    const artifacts = Array.isArray(summary?.artifacts) ? summary.artifacts : [];

    const lines = [
      'Release summary',
      '',
      `macOS readiness: ${typeof readiness.macos === 'string' ? readiness.macos : 'unknown'}`,
      `Windows readiness: ${typeof readiness.windows === 'string' ? readiness.windows : 'unknown'}`,
      `Primary command: ${typeof summary?.primaryCommand === 'string' ? summary.primaryCommand : 'unknown'}`,
    ];

    const targets = summary && typeof summary.targets === 'object' ? summary.targets : {};
    const availableTargetCommands = Object.entries(targets)
      .filter(
        ([, entry]) =>
          entry &&
          typeof entry === 'object' &&
          entry.ready === true &&
          typeof entry.command === 'string',
      )
      .map(([key, entry]) => `- ${key}: ${entry.command}`);

    lines.push('', 'Available signed release commands:');
    lines.push(...(availableTargetCommands.length > 0 ? availableTargetCommands : ['- None']));

    lines.push('', 'Signing blockers:');
    lines.push(
      ...(blockers.length > 0
        ? blockers.map(
            (item) =>
              `- ${item.platform || 'Unknown'}: ${item.label || 'Unknown'} = ${item.value || 'unknown'}`,
          )
        : ['- None']),
    );

    lines.push('', 'Next steps:');
    lines.push(...(nextSteps.length > 0 ? nextSteps.map((step) => `- ${step}`) : ['- None']));

    lines.push('', `Artifacts: ${artifacts.length}`);
    if (artifacts.length > 0) {
      lines.push(
        ...artifacts.map(
          (artifact) =>
            `- ${artifact.name || 'Unknown artifact'} (${formatBytes(artifact.sizeBytes)})`,
        ),
      );
    }

    return lines.join('\n');
  } catch (error) {
    return [
      'Release summary could not be parsed.',
      '',
      `File: ${LOCAL_RELEASE_SUMMARY_JSON_PATH}`,
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    ].join('\n');
  }
}

function getReleaseHandoffJsonText() {
  const handoffJson = readFileIfExists(LOCAL_RELEASE_HANDOFF_JSON_PATH);
  if (!handoffJson) {
    return [
      'Release handoff JSON is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_HANDOFF_JSON_PATH}`,
      '',
      'Run `npm run release:handoff` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  return handoffJson.trim();
}

function getReleaseReportText() {
  const report = readFileIfExists(LOCAL_RELEASE_REPORT_PATH);
  if (!report) {
    return [
      'Release report is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_REPORT_PATH}`,
      '',
      'Run `npm run release:report` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  return report.trim();
}

function getReleaseVerificationText() {
  const verification = readFileIfExists(LOCAL_RELEASE_VERIFICATION_PATH);
  if (!verification) {
    return [
      'Release verification report is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_VERIFICATION_PATH}`,
      '',
      'Run `npm run release:verification` or `npm run release:unsigned` from apps/desktop to generate it.',
    ].join('\n');
  }

  return verification.trim();
}

function getReleaseVerificationJsonText() {
  const verificationJson = readFileIfExists(LOCAL_RELEASE_VERIFICATION_JSON_PATH);
  if (!verificationJson) {
    return [
      'Release verification JSON is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_VERIFICATION_JSON_PATH}`,
      '',
      'Run `npm run release:verification` or `npm run release:unsigned` from apps/desktop to generate it.',
    ].join('\n');
  }

  return verificationJson.trim();
}

function getReleaseVerificationSummaryLines() {
  const verification = readReleaseVerificationSnapshot();
  if (!verification) {
    return ['Verification: (not generated)'];
  }

  const summary =
    verification.summary && typeof verification.summary === 'object' ? verification.summary : {};
  const checks =
    verification.checks && typeof verification.checks === 'object' ? verification.checks : {};

  const lines = [
    `Verification passed: ${typeof summary.passedChecks === 'number' ? summary.passedChecks : 'unknown'}`,
    `Verification failed: ${typeof summary.failedChecks === 'number' ? summary.failedChecks : 'unknown'}`,
  ];

  for (const [name, check] of Object.entries(checks)) {
    const ok = check && typeof check === 'object' ? Boolean(check.ok) : false;
    lines.push(`- ${name}: ${ok ? 'PASS' : 'FAIL'}`);
  }

  return lines;
}

function getReleaseVerificationSummaryText() {
  return getReleaseVerificationSummaryLines().join('\n');
}

function getReleaseBundleText() {
  if (!hasReleaseBundle()) {
    return [
      'Release bundle is not available.',
      '',
      `Expected directory: ${LOCAL_RELEASE_BUNDLE_DIR}`,
      '',
      'Run `npm run release:bundle` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  const lines = [`Bundle directory: ${LOCAL_RELEASE_BUNDLE_DIR}`, '', 'Bundle contents:'];

  const entries = fs
    .readdirSync(LOCAL_RELEASE_BUNDLE_DIR, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const entryPath = path.join(LOCAL_RELEASE_BUNDLE_DIR, entry.name);
    const stats = fs.statSync(entryPath);
    const typeLabel = entry.isDirectory() ? 'dir' : 'file';
    lines.push(`- ${entry.name} (${typeLabel}, ${formatBytes(stats.size)})`);
  }

  return lines.join('\n');
}

function getReleaseArchiveText() {
  if (!hasReleaseArchive()) {
    return [
      'Release archive is not available.',
      '',
      `Expected file: ${LOCAL_RELEASE_ARCHIVE_PATH}`,
      '',
      'Run `npm run release:archive` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  const stats = fs.statSync(LOCAL_RELEASE_ARCHIVE_PATH);
  return [`Archive file: ${LOCAL_RELEASE_ARCHIVE_PATH}`, `Size: ${formatBytes(stats.size)}`].join(
    '\n',
  );
}

function getReleaseIndexText() {
  const lines = ['Release index overview'];
  const releaseStatusSummary = getReleaseStatusSummaryLines();
  const releaseManifestSnapshot = readReleaseManifestSnapshot();

  if (releaseStatusSummary.length > 0) {
    lines.push('', ...releaseStatusSummary);
  }

  if (releaseManifestSnapshot?.artifacts?.length) {
    lines.push('', 'Artifacts:');
    for (const artifact of releaseManifestSnapshot.artifacts) {
      if (!artifact || typeof artifact !== 'object') {
        continue;
      }

      const name = typeof artifact.name === 'string' ? artifact.name : 'Unknown artifact';
      const size = formatBytes(artifact.sizeBytes);
      const sha256 = typeof artifact.sha256 === 'string' ? artifact.sha256 : '(missing sha256)';
      const pathValue = typeof artifact.path === 'string' ? artifact.path : '(missing path)';
      lines.push(`- ${name}`);
      lines.push(`  Size: ${size}`);
      lines.push(`  SHA256: ${sha256}`);
      lines.push(`  Path: ${pathValue}`);
    }
  } else {
    lines.push('', 'Artifacts: none');
  }

  lines.push(
    '',
    `Release index file: ${hasReleaseIndex() ? LOCAL_RELEASE_INDEX_PATH : '(not generated)'}`,
    `Release status JSON: ${hasReleaseStatus() ? LOCAL_RELEASE_STATUS_PATH : '(not generated)'}`,
    `Signing blockers: ${hasSigningBlockersFile() ? LOCAL_SIGNING_BLOCKERS_PATH : '(not generated)'}`,
    `Signing blockers JSON: ${hasSigningBlockersJsonFile() ? LOCAL_SIGNING_BLOCKERS_JSON_PATH : '(not generated)'}`,
    `Release manifest JSON: ${hasReleaseManifest() ? LOCAL_RELEASE_MANIFEST_PATH : '(not generated)'}`,
    `Release report: ${hasReleaseReport() ? LOCAL_RELEASE_REPORT_PATH : '(not generated)'}`,
    `Release handoff: ${hasReleaseHandoff() ? LOCAL_RELEASE_HANDOFF_PATH : '(not generated)'}`,
    `Release handoff JSON: ${hasReleaseHandoffJsonFile() ? LOCAL_RELEASE_HANDOFF_JSON_PATH : '(not generated)'}`,
    `Release handoff HTML: ${hasReleaseHandoffHtmlFile() ? LOCAL_RELEASE_HANDOFF_HTML_PATH : '(not generated)'}`,
    `Release verification: ${hasReleaseVerification() ? LOCAL_RELEASE_VERIFICATION_PATH : '(not generated)'}`,
    `Release verification JSON: ${hasReleaseVerificationJsonFile() ? LOCAL_RELEASE_VERIFICATION_JSON_PATH : '(not generated)'}`,
    `Release verification HTML: ${hasReleaseVerificationHtmlFile() ? LOCAL_RELEASE_VERIFICATION_HTML_PATH : '(not generated)'}`,
    `Release bundle: ${hasReleaseBundle() ? LOCAL_RELEASE_BUNDLE_DIR : '(not generated)'}`,
    `Release archive: ${hasReleaseArchive() ? LOCAL_RELEASE_ARCHIVE_PATH : '(not generated)'}`,
  );

  return lines.join('\n');
}

function getInstallerArtifacts() {
  const releaseManifest = readReleaseManifestSnapshot();
  if (!releaseManifest) {
    return [];
  }

  const artifacts = Array.isArray(releaseManifest.artifacts) ? releaseManifest.artifacts : [];
  return artifacts.filter(
    (artifact) =>
      artifact &&
      typeof artifact === 'object' &&
      typeof artifact.name === 'string' &&
      ((artifact.name.endsWith('.dmg') && !artifact.name.endsWith('.dmg.blockmap')) ||
        (artifact.name.endsWith('.exe') && !artifact.name.endsWith('.exe.blockmap'))),
  );
}

function getInstallerSummaryLines() {
  const installers = getInstallerArtifacts();
  if (installers.length === 0) {
    return ['Installers: none found'];
  }

  const lines = ['Installers:'];

  for (const installer of installers) {
    const name = typeof installer.name === 'string' ? installer.name : 'Unknown installer';
    const sha256 = typeof installer.sha256 === 'string' ? installer.sha256 : '(missing sha256)';
    const pathValue = typeof installer.path === 'string' ? installer.path : '(missing path)';
    lines.push(`- ${name}`);
    lines.push(`  Size: ${formatBytes(installer.sizeBytes)}`);
    lines.push(`  SHA256: ${sha256}`);
    lines.push(`  Path: ${pathValue}`);
  }

  return lines;
}

function getInstallerSummaryText() {
  return getInstallerSummaryLines().join('\n');
}

function getReleaseDashboardText() {
  return [
    ...getReleaseStatusSummaryLines(),
    '',
    getPrimaryRecommendedReleaseCommandText(),
    '',
    getAvailableSignedReleaseCommandsText(),
    '',
    ...getSigningBlockingSummaryLines(),
    '',
    ...getReleaseVerificationSummaryLines(),
    '',
    ...getInstallerSummaryLines(),
    '',
    `Release dist dir: ${fs.existsSync(LOCAL_RELEASE_DIST_DIR) ? LOCAL_RELEASE_DIST_DIR : '(not generated)'}`,
    `Release manifest: ${hasReleaseManifest() ? LOCAL_RELEASE_MANIFEST_PATH : '(not generated)'}`,
    `Release checksums: ${hasReleaseChecksums() ? LOCAL_RELEASE_CHECKSUMS_PATH : '(not generated)'}`,
    `Release report: ${hasReleaseReport() ? LOCAL_RELEASE_REPORT_PATH : '(not generated)'}`,
    `Release bundle: ${hasReleaseBundle() ? LOCAL_RELEASE_BUNDLE_DIR : '(not generated)'}`,
    `Release archive: ${hasReleaseArchive() ? LOCAL_RELEASE_ARCHIVE_PATH : '(not generated)'}`,
  ].join('\n');
}

function getReleaseDashboardCopyText() {
  return [
    getReleaseStatusSummaryText(),
    '',
    getAvailableSignedReleaseCommandsText(),
    '',
    getReleaseNextStepsText(),
    '',
    getSigningBlockingText(),
    '',
    getReleaseVerificationSummaryText(),
    '',
    getInstallerSummaryText(),
    '',
    getReleasePathsText(),
  ].join('\n');
}

function getReleaseHandoffText() {
  return [
    'Desktop release handoff',
    '',
    getReleaseStatusSummaryText(),
    '',
    getPrimaryRecommendedReleaseCommandText(),
    '',
    getAvailableSignedReleaseCommandsText(),
    '',
    getReleaseNextStepsText(),
    '',
    getSigningBlockingText(),
    '',
    getReleaseVerificationSummaryText(),
    '',
    getInstallerSummaryText(),
    '',
    getReleasePathsText(),
  ].join('\n');
}

function getReleaseHandoffMarkdownText() {
  const availableSignedCommands = getAvailableSignedReleaseCommandsLines();
  return [
    '# Desktop Release Handoff',
    '',
    '## Readiness',
    '',
    ...getReleaseStatusSummaryLines().map((line) => `- ${line}`),
    '',
    '## Primary Command',
    '',
    `\`${getPrimaryRecommendedReleaseCommand()}\``,
    '',
    '## Available Signed Release Commands',
    '',
    ...(availableSignedCommands.length > 0 ? availableSignedCommands : ['- None']),
    '',
    '## Next Steps',
    '',
    ...getReleaseNextStepsLines().map((line) => `- ${line}`),
    '',
    '## Signing Blockers',
    '',
    ...(getSigningBlockingLines().length > 0
      ? getSigningBlockingLines().map((line) => `- ${line}`)
      : ['- None']),
    '',
    '## Verification',
    '',
    ...getReleaseVerificationSummaryLines().map((line) =>
      line.startsWith('- ') ? line : `- ${line}`,
    ),
    '',
    '## Installers',
    '',
    ...getInstallerSummaryLines(),
    '',
    '## Paths',
    '',
    ...getReleasePathsText()
      .split('\n')
      .filter(Boolean)
      .map((line) => `- ${line}`),
  ].join('\n');
}

function getReleaseCommandsText() {
  const lines = [
    'Desktop release commands',
    '',
    getRecommendedReleaseCommandsText(),
    '',
    'Workspace:',
    `cd ${path.join(__dirname)}`,
    '',
    'Unsigned refresh:',
    'npm run release:refresh',
    '',
    'Unsigned verification only:',
    'npm run release:unsigned',
    '',
    'Archive verification only:',
    'npm run release:verify:archive',
    '',
    'Verification report refresh:',
    'npm run release:verification',
    '',
    'Signed release readiness:',
    'npm run release:check:signed',
    '',
    'Signed release build:',
    'npm run release:signed',
    '',
    'Targeted signed release builds:',
    'npm run release:signed:mac',
    'npm run release:signed:win:x64',
    'npm run release:signed:win:arm64',
    '',
    getAvailableSignedReleaseCommandsText(),
  ];

  if (!hasSigningEnv()) {
    lines.push('', 'Signing env:', 'npm run release:init-signing');
  }

  return lines.join('\n');
}

function getRecommendedReleaseCommandsLines() {
  const releaseStatus = readReleaseStatusSnapshot();
  const summary =
    releaseStatus && typeof releaseStatus.summary === 'object' ? releaseStatus.summary : {};
  const macosReadiness = typeof summary.macos === 'string' ? summary.macos : 'unknown';
  const windowsReadiness = typeof summary.windows === 'string' ? summary.windows : 'unknown';

  if (!hasSigningEnv()) {
    return [
      'Recommended now:',
      '- npm run release:init-signing',
      '- Fill apps/desktop/signing.env with real signing credentials',
      '- npm run release:check:signed',
    ];
  }

  const availableSignedCommands = getAvailableSignedReleaseCommandsLines().map((line) =>
    line.replace(/^- [^:]+:\s*/, '- '),
  );

  if (availableSignedCommands.length > 0) {
    return ['Recommended now:', ...availableSignedCommands];
  }

  return [
    'Recommended now:',
    '- npm run release:check:signed',
    '- Review blockers in Desktop signing setup',
    '- npm run release:signed',
  ];
}

function getRecommendedReleaseCommandsText() {
  return getRecommendedReleaseCommandsLines().join('\n');
}

function getPrimaryRecommendedReleaseCommand() {
  const commandLine = getRecommendedReleaseCommandsLines().find(
    (line) => typeof line === 'string' && line.startsWith('- npm run '),
  );

  if (!commandLine) {
    return 'No recommended release command available.';
  }

  return commandLine.replace(/^- /, '');
}

function getPrimaryRecommendedReleaseCommandText() {
  return `Primary release command: ${getPrimaryRecommendedReleaseCommand()}`;
}

function getSigningSetupText() {
  const releaseStatus = readReleaseStatusSnapshot();
  const lines = [
    'Signing setup',
    '',
    `Signing env example: ${hasSigningEnvExample() ? LOCAL_SIGNING_ENV_EXAMPLE_PATH : '(not bundled)'}`,
    `Signing env: ${hasSigningEnv() ? getSigningEnvPath() : '(not generated)'}`,
    '',
    getPrimaryRecommendedReleaseCommandText(),
    '',
    ...getReleaseStatusSummaryLines(),
  ];

  const blockingItems = getSigningBlockingLines();
  if (blockingItems.length > 0) {
    lines.push('', 'Blocking items:');
    lines.push(...blockingItems.map((item) => `- ${item}`));
  }

  const sections =
    releaseStatus &&
    typeof releaseStatus === 'object' &&
    releaseStatus.sections &&
    typeof releaseStatus.sections === 'object'
      ? releaseStatus.sections
      : {};

  const signingSections = [
    ['macOS signing checklist', Array.isArray(sections.macos) ? sections.macos : []],
    ['Windows signing checklist', Array.isArray(sections.windows) ? sections.windows : []],
  ];

  for (const [title, items] of signingSections) {
    if (!items.length) {
      continue;
    }

    lines.push('', `${title}:`);
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const label = typeof item.label === 'string' ? item.label : 'Unknown';
      const value = typeof item.value === 'string' ? item.value : 'unknown';
      lines.push(`- ${label}: ${value}`);
    }
  }

  if (hasReleaseNotes()) {
    lines.push('', `Release notes: ${LOCAL_RELEASE_NOTES_PATH}`);
  }

  return lines.join('\n');
}

function getSigningSetupCopyText() {
  return [getSigningSetupText(), '', getReleasePathsText()].join('\n');
}

function getSigningBlockingLines() {
  const releaseStatus = readReleaseStatusSnapshot();
  const sections =
    releaseStatus &&
    typeof releaseStatus === 'object' &&
    releaseStatus.sections &&
    typeof releaseStatus.sections === 'object'
      ? releaseStatus.sections
      : {};

  const blockingLines = [];
  const signingSections = [
    ['macOS', Array.isArray(sections.macos) ? sections.macos : []],
    ['Windows', Array.isArray(sections.windows) ? sections.windows : []],
  ];

  for (const [platformName, items] of signingSections) {
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const label = typeof item.label === 'string' ? item.label : 'Unknown';
      const value = typeof item.value === 'string' ? item.value : 'unknown';
      if (value === 'OK') {
        continue;
      }

      blockingLines.push(`${platformName}: ${label} = ${value}`);
    }
  }

  return blockingLines;
}

function getSigningBlockingText() {
  const blockingLines = getSigningBlockingLines();
  if (blockingLines.length === 0) {
    return 'Signing blockers: none';
  }

  return ['Signing blockers:', ...blockingLines.map((item) => `- ${item}`)].join('\n');
}

function getSigningBlockingSummaryLines() {
  const blockingLines = getSigningBlockingLines();
  return [
    'Signing blockers:',
    ...(blockingLines.length > 0 ? blockingLines.map((item) => `- ${item}`) : ['- None']),
  ];
}

function getSigningBlockersPageText() {
  const blockingLines = getSigningBlockingLines();
  const lines = [
    'Signing blockers',
    '',
    getPrimaryRecommendedReleaseCommandText(),
    '',
    ...getReleaseStatusSummaryLines(),
  ];

  if (blockingLines.length === 0) {
    lines.push('', 'No signing blockers found.');
  } else {
    lines.push('', 'Blocking items:');
    lines.push(...blockingLines.map((item) => `- ${item}`));
  }

  const nextSteps = getReleaseNextStepsLines();
  if (nextSteps.length > 0) {
    lines.push('', 'Next steps:');
    lines.push(...nextSteps.map((step) => `- ${step}`));
  }

  lines.push('', `Signing env: ${hasSigningEnv() ? getSigningEnvPath() : '(not generated)'}`);
  lines.push(
    `Signing env example: ${hasSigningEnvExample() ? LOCAL_SIGNING_ENV_EXAMPLE_PATH : '(not bundled)'}`,
  );
  lines.push(
    `Signing blockers file: ${hasSigningBlockersFile() ? LOCAL_SIGNING_BLOCKERS_PATH : '(not generated)'}`,
  );
  lines.push(
    `Signing blockers JSON: ${hasSigningBlockersJsonFile() ? LOCAL_SIGNING_BLOCKERS_JSON_PATH : '(not generated)'}`,
  );

  return lines.join('\n');
}

function getSigningBlockersReportText() {
  const report = readFileIfExists(LOCAL_SIGNING_BLOCKERS_PATH);
  if (!report) {
    return [
      'Signing blockers report is not available.',
      '',
      `Expected file: ${LOCAL_SIGNING_BLOCKERS_PATH}`,
      '',
      'Run `npm run release:signing-blockers` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  return report.trim();
}

function getSigningBlockersJsonText() {
  const json = readFileIfExists(LOCAL_SIGNING_BLOCKERS_JSON_PATH);
  if (!json) {
    return [
      'Signing blockers JSON is not available.',
      '',
      `Expected file: ${LOCAL_SIGNING_BLOCKERS_JSON_PATH}`,
      '',
      'Run `npm run release:signing-blockers` or `npm run release:refresh` from apps/desktop to generate it.',
    ].join('\n');
  }

  return json.trim();
}

function getReleaseHubActions(currentPage) {
  const actions = [];

  if (currentPage !== 'dashboard') {
    actions.push({
      label: 'Open release dashboard',
      href: 'zktalk://open-release-dashboard',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'handoff') {
    actions.push({
      label: 'Open release handoff',
      href: 'zktalk://open-release-handoff',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'handoff-json' && hasReleaseHandoffJsonFile()) {
    actions.push({
      label: 'Open release handoff JSON',
      href: 'zktalk://open-release-handoff-json',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'status') {
    actions.push({
      label: 'Open release readiness',
      href: 'zktalk://open-release-status',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'artifacts') {
    actions.push({
      label: 'Open release artifacts',
      href: 'zktalk://open-release-artifacts',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'checksums') {
    actions.push({
      label: 'Open release checksums',
      href: 'zktalk://open-release-checksums',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'index') {
    actions.push({
      label: 'Open release index',
      href: 'zktalk://open-release-index',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'commands') {
    actions.push({
      label: 'Open release commands',
      href: 'zktalk://open-release-commands',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'report') {
    actions.push({
      label: 'Open release report',
      href: 'zktalk://open-release-report',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'verification' && hasReleaseVerification()) {
    actions.push({
      label: 'Open release verification',
      href: 'zktalk://open-release-verification',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'bundle') {
    actions.push({
      label: 'Open release bundle',
      href: 'zktalk://open-release-bundle',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'archive') {
    actions.push({
      label: 'Open release archive',
      href: 'zktalk://open-release-archive',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'signing') {
    actions.push({
      label: 'Open signing setup',
      href: 'zktalk://open-signing-setup',
      variant: 'secondary',
    });
  }

  if (currentPage !== 'signing-blockers') {
    actions.push({
      label: 'Open signing blockers',
      href: 'zktalk://open-signing-blockers',
      variant: 'secondary',
    });
  }

  return actions;
}

function renderReleaseDashboardPage() {
  const macDmgPath = getMacDmgPath();
  const windowsX64InstallerPath = getWindowsX64InstallerPath();
  const windowsArm64InstallerPath = getWindowsArm64InstallerPath();

  renderStatusPage('Desktop release dashboard', getReleaseDashboardText(), {
    actions: [
      { label: 'Copy release dashboard', href: 'zktalk://copy-release-dashboard' },
      {
        label: 'Copy release handoff markdown',
        href: 'zktalk://copy-release-handoff-markdown',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Copy release handoff JSON',
              href: 'zktalk://copy-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy primary release command',
        href: 'zktalk://copy-primary-release-command',
        variant: 'secondary',
      },
      {
        label: 'Copy recommended release commands',
        href: 'zktalk://copy-recommended-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy available signed release commands',
        href: 'zktalk://copy-available-signed-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy release next steps',
        href: 'zktalk://copy-release-next-steps',
        variant: 'secondary',
      },
      {
        label: 'Copy release commands',
        href: 'zktalk://copy-release-commands',
        variant: 'secondary',
      },
      { label: 'Copy installers', href: 'zktalk://copy-installers' },
      ...(macDmgPath
        ? [{ label: 'Open macOS installer', href: 'zktalk://open-mac-dmg', variant: 'secondary' }]
        : []),
      ...(windowsX64InstallerPath
        ? [
            {
              label: 'Open Windows x64 installer',
              href: 'zktalk://open-win-x64-installer',
              variant: 'secondary',
            },
          ]
        : []),
      ...(windowsArm64InstallerPath
        ? [
            {
              label: 'Open Windows ARM64 installer',
              href: 'zktalk://open-win-arm64-installer',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('dashboard'),
      {
        label: hasSigningEnv() ? 'Open signing env' : 'Initialize signing env',
        href: hasSigningEnv() ? 'zktalk://open-signing-env' : 'zktalk://init-signing-env',
        variant: 'secondary',
      },
      ...(hasSigningEnvExample()
        ? [
            {
              label: 'Open signing env example',
              href: 'zktalk://open-signing-env-example',
              variant: 'secondary',
            },
          ]
        : []),
      ...(fs.existsSync(LOCAL_RELEASE_DIST_DIR)
        ? [
            {
              label: 'Open release dist folder',
              href: 'zktalk://open-release-dist',
              variant: 'secondary',
            },
          ]
        : []),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseHandoffPage() {
  renderStatusPage('Desktop release handoff', getReleaseHandoffText(), {
    actions: [
      { label: 'Copy release handoff', href: 'zktalk://copy-release-handoff' },
      {
        label: 'Open release handoff markdown',
        href: 'zktalk://open-release-handoff-markdown',
        variant: 'secondary',
      },
      {
        label: 'Copy release handoff markdown',
        href: 'zktalk://copy-release-handoff-markdown',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Open release handoff JSON',
              href: 'zktalk://open-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Copy release handoff JSON',
              href: 'zktalk://copy-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy primary release command',
        href: 'zktalk://copy-primary-release-command',
        variant: 'secondary',
      },
      { label: 'Copy installers', href: 'zktalk://copy-installers', variant: 'secondary' },
      ...getReleaseHubActions('handoff'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseHandoffMarkdownPage() {
  renderStatusPage('Desktop release handoff markdown', getReleaseHandoffMarkdownText(), {
    actions: [
      { label: 'Copy release handoff markdown', href: 'zktalk://copy-release-handoff-markdown' },
      {
        label: 'Copy release handoff',
        href: 'zktalk://copy-release-handoff',
        variant: 'secondary',
      },
      {
        label: 'Open release handoff',
        href: 'zktalk://open-release-handoff',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Open release handoff JSON',
              href: 'zktalk://open-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('handoff-markdown'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseHandoffJsonPage() {
  renderStatusPage('Desktop release handoff JSON', getReleaseHandoffJsonText(), {
    actions: [
      { label: 'Copy release handoff JSON', href: 'zktalk://copy-release-handoff-json' },
      {
        label: 'Open release handoff',
        href: 'zktalk://open-release-handoff',
        variant: 'secondary',
      },
      ...(hasReleaseHandoff()
        ? [
            {
              label: 'Open release handoff file',
              href: 'zktalk://open-release-handoff-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Open release handoff JSON file',
              href: 'zktalk://open-release-handoff-json-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('handoff-json'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderSigningSetupPage() {
  renderStatusPage('Desktop signing setup', getSigningSetupText(), {
    actions: [
      { label: 'Copy signing setup', href: 'zktalk://copy-signing-setup' },
      { label: 'Copy signing blockers', href: 'zktalk://copy-signing-blockers' },
      {
        label: 'Open signing blockers',
        href: 'zktalk://open-signing-blockers',
        variant: 'secondary',
      },
      ...(hasSigningBlockersFile()
        ? [
            {
              label: 'Open signing blockers file',
              href: 'zktalk://open-signing-blockers-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasSigningBlockersJsonFile()
        ? [
            {
              label: 'Open signing blockers JSON',
              href: 'zktalk://open-signing-blockers-json',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy release handoff markdown',
        href: 'zktalk://copy-release-handoff-markdown',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Open release handoff JSON',
              href: 'zktalk://open-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Copy release handoff JSON',
              href: 'zktalk://copy-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy primary release command',
        href: 'zktalk://copy-primary-release-command',
        variant: 'secondary',
      },
      {
        label: 'Copy recommended release commands',
        href: 'zktalk://copy-recommended-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy available signed release commands',
        href: 'zktalk://copy-available-signed-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy release next steps',
        href: 'zktalk://copy-release-next-steps',
        variant: 'secondary',
      },
      {
        label: 'Copy release commands',
        href: 'zktalk://copy-release-commands',
        variant: 'secondary',
      },
      {
        label: hasSigningEnv() ? 'Open signing env' : 'Initialize signing env',
        href: hasSigningEnv() ? 'zktalk://open-signing-env' : 'zktalk://init-signing-env',
        variant: 'secondary',
      },
      ...(hasSigningEnvExample()
        ? [
            {
              label: 'Open signing env example',
              href: 'zktalk://open-signing-env-example',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('signing'),
      ...(hasReleaseNotes()
        ? [
            {
              label: 'Open release notes',
              href: 'zktalk://open-release-notes',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoff()
        ? [
            {
              label: 'Open release handoff file',
              href: 'zktalk://open-release-handoff-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderSigningBlockersPage() {
  renderStatusPage('Desktop signing blockers', getSigningBlockersPageText(), {
    actions: [
      { label: 'Copy signing blockers', href: 'zktalk://copy-signing-blockers' },
      ...(hasSigningBlockersFile()
        ? [
            {
              label: 'Open signing blockers report',
              href: 'zktalk://open-signing-blockers-report',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasSigningBlockersFile()
        ? [
            {
              label: 'Open signing blockers file',
              href: 'zktalk://open-signing-blockers-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasSigningBlockersJsonFile()
        ? [
            {
              label: 'Open signing blockers JSON',
              href: 'zktalk://open-signing-blockers-json',
              variant: 'secondary',
            },
          ]
        : []),
      { label: 'Open signing setup', href: 'zktalk://open-signing-setup', variant: 'secondary' },
      {
        label: hasSigningEnv() ? 'Open signing env' : 'Initialize signing env',
        href: hasSigningEnv() ? 'zktalk://open-signing-env' : 'zktalk://init-signing-env',
        variant: 'secondary',
      },
      ...(hasSigningEnvExample()
        ? [
            {
              label: 'Open signing env example',
              href: 'zktalk://open-signing-env-example',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy release handoff markdown',
        href: 'zktalk://copy-release-handoff-markdown',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Open release handoff JSON',
              href: 'zktalk://open-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Copy release handoff JSON',
              href: 'zktalk://copy-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy primary release command',
        href: 'zktalk://copy-primary-release-command',
        variant: 'secondary',
      },
      {
        label: 'Copy release next steps',
        href: 'zktalk://copy-release-next-steps',
        variant: 'secondary',
      },
      ...getReleaseHubActions('signing-blockers'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderSigningBlockersReportPage() {
  renderStatusPage('Desktop signing blockers report', getSigningBlockersReportText(), {
    actions: [
      { label: 'Copy signing blockers report', href: 'zktalk://copy-signing-blockers-report' },
      {
        label: 'Copy signing blockers',
        href: 'zktalk://copy-signing-blockers',
        variant: 'secondary',
      },
      {
        label: 'Open signing blockers',
        href: 'zktalk://open-signing-blockers',
        variant: 'secondary',
      },
      ...(hasSigningBlockersFile()
        ? [
            {
              label: 'Open signing blockers file',
              href: 'zktalk://open-signing-blockers-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasSigningBlockersJsonFile()
        ? [
            {
              label: 'Open signing blockers JSON',
              href: 'zktalk://open-signing-blockers-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('signing-blockers-report'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderSigningBlockersJsonPage() {
  renderStatusPage('Desktop signing blockers JSON', getSigningBlockersJsonText(), {
    actions: [
      { label: 'Copy signing blockers JSON', href: 'zktalk://copy-signing-blockers-json' },
      {
        label: 'Open signing blockers',
        href: 'zktalk://open-signing-blockers',
        variant: 'secondary',
      },
      ...(hasSigningBlockersFile()
        ? [
            {
              label: 'Open signing blockers report',
              href: 'zktalk://open-signing-blockers-report',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasSigningBlockersJsonFile()
        ? [
            {
              label: 'Open signing blockers JSON file',
              href: 'zktalk://open-signing-blockers-json-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('signing-blockers-json'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseStatusPage() {
  renderStatusPage('Desktop release readiness', getReleaseStatusPageText(), {
    actions: [
      { label: 'Copy release readiness', href: 'zktalk://copy-release-status-summary' },
      ...(hasReleaseSummaryJsonFile()
        ? [
            {
              label: 'Open release summary',
              href: 'zktalk://open-release-summary',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy release handoff markdown',
        href: 'zktalk://copy-release-handoff-markdown',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Open release handoff JSON',
              href: 'zktalk://open-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Copy release handoff JSON',
              href: 'zktalk://copy-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy primary release command',
        href: 'zktalk://copy-primary-release-command',
        variant: 'secondary',
      },
      {
        label: 'Copy recommended release commands',
        href: 'zktalk://copy-recommended-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy release next steps',
        href: 'zktalk://copy-release-next-steps',
        variant: 'secondary',
      },
      {
        label: 'Copy release commands',
        href: 'zktalk://copy-release-commands',
        variant: 'secondary',
      },
      ...getReleaseHubActions('status'),
      {
        label: 'Open release status JSON',
        href: 'zktalk://open-release-status-json',
        variant: 'secondary',
      },
      {
        label: 'Open signing env',
        href: hasSigningEnv() ? 'zktalk://open-signing-env' : 'zktalk://init-signing-env',
        variant: 'secondary',
      },
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseSummaryPage() {
  renderStatusPage('Desktop release summary', getReleaseSummaryText(), {
    actions: [
      { label: 'Copy release summary', href: 'zktalk://copy-release-summary' },
      ...(hasReleaseSummaryJsonFile()
        ? [
            {
              label: 'Open release summary JSON',
              href: 'zktalk://open-release-summary-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseSummaryJsonFile()
        ? [
            {
              label: 'Open release summary JSON file',
              href: 'zktalk://open-release-summary-json-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('release-summary'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseSummaryJsonPage() {
  renderStatusPage('Desktop release summary JSON', getReleaseSummaryJsonText(), {
    actions: [
      {
        label: 'Open release summary',
        href: 'zktalk://open-release-summary',
        variant: 'secondary',
      },
      ...(hasReleaseSummaryJsonFile()
        ? [
            {
              label: 'Open release summary JSON file',
              href: 'zktalk://open-release-summary-json-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('release-summary-json'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseArtifactsPage() {
  const macDmgPath = getMacDmgPath();
  const windowsX64InstallerPath = getWindowsX64InstallerPath();
  const windowsArm64InstallerPath = getWindowsArm64InstallerPath();

  renderStatusPage('Desktop release artifacts', getReleaseArtifactsPageText(), {
    actions: [
      { label: 'Copy release artifacts', href: 'zktalk://copy-release-artifacts' },
      { label: 'Open release manifest JSON', href: 'zktalk://open-release-manifest-json' },
      ...(macDmgPath
        ? [{ label: 'Open macOS installer', href: 'zktalk://open-mac-dmg', variant: 'secondary' }]
        : []),
      ...(windowsX64InstallerPath
        ? [
            {
              label: 'Open Windows x64 installer',
              href: 'zktalk://open-win-x64-installer',
              variant: 'secondary',
            },
          ]
        : []),
      ...(windowsArm64InstallerPath
        ? [
            {
              label: 'Open Windows ARM64 installer',
              href: 'zktalk://open-win-arm64-installer',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('artifacts'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseChecksumsPage() {
  renderStatusPage('Desktop release checksums', getReleaseChecksumsText(), {
    actions: [
      { label: 'Copy release checksums', href: 'zktalk://copy-release-checksums' },
      {
        label: 'Open release checksums file',
        href: 'zktalk://open-release-checksums-file',
        variant: 'secondary',
      },
      ...getReleaseHubActions('checksums'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseIndexPage() {
  renderStatusPage('Desktop release index', getReleaseIndexText(), {
    actions: [
      {
        label: 'Open release index file',
        href: 'zktalk://open-release-index-file',
        variant: 'secondary',
      },
      ...getReleaseHubActions('index'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseCommandsPage() {
  renderStatusPage('Desktop release commands', getReleaseCommandsText(), {
    actions: [
      {
        label: 'Copy release handoff markdown',
        href: 'zktalk://copy-release-handoff-markdown',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Open release handoff JSON',
              href: 'zktalk://open-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffHtmlFile()
        ? [
            {
              label: 'Open release handoff HTML file',
              href: 'zktalk://open-release-handoff-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Copy release handoff JSON',
              href: 'zktalk://copy-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy primary release command',
        href: 'zktalk://copy-primary-release-command',
        variant: 'secondary',
      },
      {
        label: 'Copy recommended release commands',
        href: 'zktalk://copy-recommended-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy available signed release commands',
        href: 'zktalk://copy-available-signed-release-commands',
        variant: 'secondary',
      },
      { label: 'Copy release commands', href: 'zktalk://copy-release-commands' },
      ...getReleaseHubActions('commands'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseReportPage() {
  renderStatusPage('Desktop release report', getReleaseReportText(), {
    actions: [
      { label: 'Copy release report', href: 'zktalk://copy-release-report' },
      {
        label: 'Open release report file',
        href: 'zktalk://open-release-report-file',
        variant: 'secondary',
      },
      ...getReleaseHubActions('report'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseVerificationPage() {
  renderStatusPage('Desktop release verification', getReleaseVerificationText(), {
    actions: [
      { label: 'Copy release verification', href: 'zktalk://copy-release-verification' },
      ...(hasReleaseVerification()
        ? [
            {
              label: 'Open release verification file',
              href: 'zktalk://open-release-verification-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseVerificationJsonFile()
        ? [
            {
              label: 'Open release verification JSON',
              href: 'zktalk://open-release-verification-json',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseVerificationHtmlFile()
        ? [
            {
              label: 'Open release verification HTML file',
              href: 'zktalk://open-release-verification-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('verification'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseVerificationJsonPage() {
  renderStatusPage('Desktop release verification JSON', getReleaseVerificationJsonText(), {
    actions: [
      { label: 'Copy release verification JSON', href: 'zktalk://copy-release-verification-json' },
      ...(hasReleaseVerification()
        ? [
            {
              label: 'Open release verification',
              href: 'zktalk://open-release-verification',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseVerificationJsonFile()
        ? [
            {
              label: 'Open release verification JSON file',
              href: 'zktalk://open-release-verification-json-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseVerificationHtmlFile()
        ? [
            {
              label: 'Open release verification HTML file',
              href: 'zktalk://open-release-verification-html-file',
              variant: 'secondary',
            },
          ]
        : []),
      ...getReleaseHubActions('verification-json'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseBundlePage() {
  renderStatusPage('Desktop release bundle', getReleaseBundleText(), {
    actions: [
      { label: 'Copy release bundle', href: 'zktalk://copy-release-bundle' },
      {
        label: 'Open release bundle folder',
        href: 'zktalk://open-release-bundle-folder',
        variant: 'secondary',
      },
      ...getReleaseHubActions('bundle'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseArchivePage() {
  renderStatusPage('Desktop release archive', getReleaseArchiveText(), {
    actions: [
      { label: 'Copy release archive', href: 'zktalk://copy-release-archive' },
      {
        label: 'Open release archive file',
        href: 'zktalk://open-release-archive-file',
        variant: 'secondary',
      },
      ...getReleaseHubActions('archive'),
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function renderReleaseNotesPage() {
  const notes = readFileIfExists(LOCAL_RELEASE_NOTES_PATH);

  if (!notes) {
    renderFailurePage(
      'Release notes not available',
      [
        'The desktop app could not find bundled release notes.',
        '',
        'Rebuild the desktop app if you need release documentation inside the packaged app.',
      ].join('\n'),
    );
    return;
  }

  renderStatusPage('Desktop release notes', notes, {
    actions: [
      { label: 'Copy diagnostics', href: 'zktalk://copy-diagnostics' },
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function installApplicationMenu() {
  const { appLocale } = getDesktopConfigSnapshot();
  const menuLabels = getDesktopMenuLabels(appLocale);
  const releaseItems = [
    {
      label: 'Open release dashboard',
      click: () => {
        handleDesktopAction('zktalk://open-release-dashboard').catch(() => {});
      },
    },
    {
      label: 'Open release handoff',
      click: () => {
        handleDesktopAction('zktalk://open-release-handoff').catch(() => {});
      },
    },
    {
      label: 'Open release handoff markdown',
      click: () => {
        handleDesktopAction('zktalk://open-release-handoff-markdown').catch(() => {});
      },
    },
    {
      label: 'Open signing setup',
      click: () => {
        handleDesktopAction('zktalk://open-signing-setup').catch(() => {});
      },
    },
    {
      label: 'Open signing blockers',
      click: () => {
        handleDesktopAction('zktalk://open-signing-blockers').catch(() => {});
      },
    },
    ...(hasSigningBlockersFile()
      ? [
          {
            label: 'Open signing blockers report',
            click: () => {
              handleDesktopAction('zktalk://open-signing-blockers-report').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasSigningBlockersFile()
      ? [
          {
            label: 'Open signing blockers file',
            click: () => {
              handleDesktopAction('zktalk://open-signing-blockers-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasSigningBlockersJsonFile()
      ? [
          {
            label: 'Open signing blockers JSON',
            click: () => {
              handleDesktopAction('zktalk://open-signing-blockers-json').catch(() => {});
            },
          },
          {
            label: 'Open signing blockers JSON file',
            click: () => {
              handleDesktopAction('zktalk://open-signing-blockers-json-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseNotes()
      ? [
          {
            label: 'Open release notes',
            click: () => {
              handleDesktopAction('zktalk://open-release-notes').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseManifest()
      ? [
          {
            label: 'Open release artifacts',
            click: () => {
              handleDesktopAction('zktalk://open-release-manifest').catch(() => {});
            },
          },
          {
            label: 'Open release manifest JSON',
            click: () => {
              handleDesktopAction('zktalk://open-release-manifest-json').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseStatus()
      ? [
          {
            label: 'Open release status',
            click: () => {
              handleDesktopAction('zktalk://open-release-status').catch(() => {});
            },
          },
          {
            label: 'Open release status JSON',
            click: () => {
              handleDesktopAction('zktalk://open-release-status-json').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseSummaryJsonFile()
      ? [
          {
            label: 'Open release summary',
            click: () => {
              handleDesktopAction('zktalk://open-release-summary').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseSummaryJsonFile()
      ? [
          {
            label: 'Open release summary JSON',
            click: () => {
              handleDesktopAction('zktalk://open-release-summary-json').catch(() => {});
            },
          },
          {
            label: 'Open release summary JSON file',
            click: () => {
              handleDesktopAction('zktalk://open-release-summary-json-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseHandoffJsonFile()
      ? [
          {
            label: 'Open release handoff JSON',
            click: () => {
              handleDesktopAction('zktalk://open-release-handoff-json').catch(() => {});
            },
          },
          {
            label: 'Open release handoff JSON file',
            click: () => {
              handleDesktopAction('zktalk://open-release-handoff-json-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasSigningBlockersFile()
      ? [
          {
            label: 'Open signing blockers file',
            click: () => {
              handleDesktopAction('zktalk://open-signing-blockers-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseChecksums()
      ? [
          {
            label: 'Open release checksums',
            click: () => {
              handleDesktopAction('zktalk://open-release-checksums').catch(() => {});
            },
          },
          {
            label: 'Open release checksums file',
            click: () => {
              handleDesktopAction('zktalk://open-release-checksums-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseIndex()
      ? [
          {
            label: 'Open release index',
            click: () => {
              handleDesktopAction('zktalk://open-release-index').catch(() => {});
            },
          },
          {
            label: 'Open release index file',
            click: () => {
              handleDesktopAction('zktalk://open-release-index-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseReport()
      ? [
          {
            label: 'Open release report',
            click: () => {
              handleDesktopAction('zktalk://open-release-report').catch(() => {});
            },
          },
          {
            label: 'Open release report file',
            click: () => {
              handleDesktopAction('zktalk://open-release-report-file').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseBundle()
      ? [
          {
            label: 'Open release bundle',
            click: () => {
              handleDesktopAction('zktalk://open-release-bundle').catch(() => {});
            },
          },
          {
            label: 'Open release bundle folder',
            click: () => {
              handleDesktopAction('zktalk://open-release-bundle-folder').catch(() => {});
            },
          },
        ]
      : []),
    ...(hasReleaseArchive()
      ? [
          {
            label: 'Open release archive',
            click: () => {
              handleDesktopAction('zktalk://open-release-archive').catch(() => {});
            },
          },
          {
            label: 'Open release archive file',
            click: () => {
              handleDesktopAction('zktalk://open-release-archive-file').catch(() => {});
            },
          },
        ]
      : []),
  ];

  const template = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: menuLabels.edit,
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: menuLabels.view,
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: menuLabels.window,
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(process.platform === 'darwin' ? [{ type: 'separator' }, { role: 'front' }] : []),
      ],
    },
    {
      label: menuLabels.go,
      submenu: buildGoMenuSubmenu(handleDesktopAction, { locale: appLocale }),
    },
    {
      label: menuLabels.help,
      submenu: [
        {
          label: menuLabels.connectionSettings,
          click: () => {
            renderConnectionSettingsPage();
          },
        },
        {
          label: menuLabels.openWebsite,
          click: () => {
            shell.openExternal('https://zktalk.app').catch(() => {});
          },
        },
        {
          label: menuLabels.openDesktopConfig,
          click: () => {
            const configPath = ensureDesktopConfigFile();
            shell.openPath(configPath).catch(() => {});
          },
        },
        {
          label: menuLabels.openDesktopLogs,
          click: () => {
            handleDesktopAction('zktalk://open-logs').catch(() => {});
          },
        },
        {
          label: menuLabels.openAppDataFolder,
          click: () => {
            handleDesktopAction('zktalk://open-data-folder').catch(() => {});
          },
        },
        {
          label: menuLabels.exportSupportBundle,
          click: () => {
            handleDesktopAction('zktalk://export-support-bundle').catch(() => {});
          },
        },
        {
          label: menuLabels.diagnostics,
          click: () => {
            renderDiagnosticsPage();
          },
        },
        {
          label: menuLabels.copyDiagnosticsSummary,
          click: () => {
            handleDesktopAction('zktalk://copy-diagnostics').catch(() => {});
          },
        },
        {
          label: 'Copy release paths',
          click: () => {
            handleDesktopAction('zktalk://copy-release-paths').catch(() => {});
          },
        },
        {
          label: 'Copy release readiness',
          click: () => {
            handleDesktopAction('zktalk://copy-release-status-summary').catch(() => {});
          },
        },
        {
          label: 'Copy release next steps',
          click: () => {
            handleDesktopAction('zktalk://copy-release-next-steps').catch(() => {});
          },
        },
        {
          label: 'Copy release commands',
          click: () => {
            handleDesktopAction('zktalk://copy-release-commands').catch(() => {});
          },
        },
        {
          label: 'Copy release handoff',
          click: () => {
            handleDesktopAction('zktalk://copy-release-handoff').catch(() => {});
          },
        },
        {
          label: 'Copy release handoff markdown',
          click: () => {
            handleDesktopAction('zktalk://copy-release-handoff-markdown').catch(() => {});
          },
        },
        ...(hasReleaseHandoffJsonFile()
          ? [
              {
                label: 'Open release handoff JSON',
                click: () => {
                  handleDesktopAction('zktalk://open-release-handoff-json').catch(() => {});
                },
              },
              {
                label: 'Copy release handoff JSON',
                click: () => {
                  handleDesktopAction('zktalk://copy-release-handoff-json').catch(() => {});
                },
              },
            ]
          : []),
        {
          label: 'Copy primary release command',
          click: () => {
            handleDesktopAction('zktalk://copy-primary-release-command').catch(() => {});
          },
        },
        {
          label: 'Copy recommended release commands',
          click: () => {
            handleDesktopAction('zktalk://copy-recommended-release-commands').catch(() => {});
          },
        },
        {
          label: 'Copy available signed release commands',
          click: () => {
            handleDesktopAction('zktalk://copy-available-signed-release-commands').catch(() => {});
          },
        },
        {
          label: 'Copy release artifacts',
          click: () => {
            handleDesktopAction('zktalk://copy-release-artifacts').catch(() => {});
          },
        },
        {
          label: 'Copy release checksums',
          click: () => {
            handleDesktopAction('zktalk://copy-release-checksums').catch(() => {});
          },
        },
        {
          label: 'Copy release report',
          click: () => {
            handleDesktopAction('zktalk://copy-release-report').catch(() => {});
          },
        },
        ...(hasReleaseVerification()
          ? [
              {
                label: 'Copy release verification',
                click: () => {
                  handleDesktopAction('zktalk://copy-release-verification').catch(() => {});
                },
              },
            ]
          : []),
        ...(hasReleaseVerificationJsonFile()
          ? [
              {
                label: 'Copy release verification JSON',
                click: () => {
                  handleDesktopAction('zktalk://copy-release-verification-json').catch(() => {});
                },
              },
            ]
          : []),
        ...(hasReleaseVerificationHtmlFile()
          ? [
              {
                label: 'Open release verification HTML file',
                click: () => {
                  handleDesktopAction('zktalk://open-release-verification-html-file').catch(
                    () => {},
                  );
                },
              },
            ]
          : []),
        {
          label: 'Copy signing blockers',
          click: () => {
            handleDesktopAction('zktalk://copy-signing-blockers').catch(() => {});
          },
        },
        ...(hasSigningBlockersFile()
          ? [
              {
                label: 'Copy signing blockers report',
                click: () => {
                  handleDesktopAction('zktalk://copy-signing-blockers-report').catch(() => {});
                },
              },
            ]
          : []),
        ...(hasSigningEnvExample()
          ? [
              {
                label: hasSigningEnv() ? 'Open signing env' : 'Initialize signing env',
                click: () => {
                  handleDesktopAction(
                    hasSigningEnv() ? 'zktalk://open-signing-env' : 'zktalk://init-signing-env',
                  ).catch(() => {});
                },
              },
            ]
          : []),
        ...(hasSigningEnvExample()
          ? [
              {
                label: 'Open signing env example',
                click: () => {
                  handleDesktopAction('zktalk://open-signing-env-example').catch(() => {});
                },
              },
            ]
          : []),
        {
          label: 'Open release dist folder',
          click: () => {
            handleDesktopAction('zktalk://open-release-dist').catch(() => {});
          },
        },
        ...releaseItems,
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerProtocolClient() {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient('zktalk');
    return;
  }

  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient('zktalk', process.execPath, [path.resolve(process.argv[1])]);
  }
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const windowState = loadWindowState();
  const shouldCenterOnPrimaryDisplay =
    !Number.isFinite(windowState.x) || !Number.isFinite(windowState.y);
  const preferredWorkArea = getPreferredDesktopWorkArea();
  const centeredBounds = {
    x:
      preferredWorkArea.x +
      Math.max(0, Math.round((preferredWorkArea.width - windowState.width) / 2)),
    y:
      preferredWorkArea.y +
      Math.max(0, Math.round((preferredWorkArea.height - windowState.height) / 2)),
    width: windowState.width,
    height: windowState.height,
  };

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: '#0b1020',
    title: 'zkTalk',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  writeWindowHealth({ reason: 'createWindow' });

  const revealHiddenWindow = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) {
      return;
    }

    appendDesktopLog(`Forcing hidden window visible after ${reason}`);
    ensureMainWindowOnScreen();
    mainWindow.show();
    mainWindow.focus();
    writeWindowHealth({ reason: `revealHiddenWindow:${reason}` });
  };

  const revealTimeouts = [
    setTimeout(() => revealHiddenWindow('startup timeout (3s)'), 3000),
    setTimeout(() => revealHiddenWindow('startup timeout (6s)'), 6000),
  ];

  const clearRevealTimeouts = () => {
    while (revealTimeouts.length > 0) {
      clearTimeout(revealTimeouts.pop());
    }
  };

  if (shouldCenterOnPrimaryDisplay) {
    mainWindow.setBounds(centeredBounds, false);
  }

  const desktopSession = mainWindow.webContents.session;
  desktopSession.webRequest.onCompleted((details) => {
    if (
      details.resourceType === 'script' ||
      details.resourceType === 'xhr' ||
      details.resourceType === 'fetch'
    ) {
      appendDesktopLog(
        `Request completed: ${details.statusCode} ${details.resourceType} ${details.url}`,
      );
    }
  });

  desktopSession.webRequest.onErrorOccurred((details) => {
    appendDesktopLog(`Request failed: ${details.error} ${details.resourceType} ${details.url}`);
  });

  mainWindow.once('ready-to-show', () => {
    clearRevealTimeouts();
    if (shouldCenterOnPrimaryDisplay) {
      mainWindow.setBounds(centeredBounds, false);
    }
    ensureMainWindowOnScreen();
    focusMainWindow();
    writeWindowHealth({ reason: 'ready-to-show' });
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);
  mainWindow.on('show', () => writeWindowHealth({ reason: 'show' }));
  mainWindow.on('hide', () => writeWindowHealth({ reason: 'hide' }));
  mainWindow.on('focus', () => writeWindowHealth({ reason: 'focus' }));
  mainWindow.on('blur', () => writeWindowHealth({ reason: 'blur' }));
  mainWindow.on('minimize', () => writeWindowHealth({ reason: 'minimize' }));
  mainWindow.on('restore', () => writeWindowHealth({ reason: 'restore' }));
  mainWindow.on('closed', () => {
    clearRevealTimeouts();
    writeWindowHealth({ reason: 'closed', hasMainWindow: false, visible: false, bounds: null });
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('zktalk://')) {
      handleDesktopAction(url).catch(() => {});
      return { action: 'deny' };
    }

    const targetUrl = getReroutedAppUrl(url);
    if (targetUrl) {
      if (targetUrl !== url) {
        appendDesktopLog(`Rewriting popup navigation from ${url} to ${targetUrl}`);
        mainWindow.loadURL(targetUrl).catch(() => {});
        return { action: 'deny' };
      }

      return { action: 'allow' };
    }

    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('zktalk://')) {
      event.preventDefault();
      handleDesktopAction(url).catch(() => {});
      return;
    }

    const targetUrl = getReroutedAppUrl(url);
    if (targetUrl) {
      if (targetUrl !== url) {
        event.preventDefault();
        appendDesktopLog(`Rewriting main-frame navigation from ${url} to ${targetUrl}`);
        mainWindow.loadURL(targetUrl).catch(() => {});
      }

      return;
    }

    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    appendDesktopLog(
      `Renderer process gone: reason=${details.reason} exitCode=${details.exitCode}`,
    );
    if (!isQuitting) {
      renderFailurePage(
        'zkTalk renderer stopped',
        [
          'The desktop window process stopped unexpectedly.',
          `Reason: ${details.reason}`,
          `Exit code: ${details.exitCode}`,
          '',
          'Open diagnostics or logs for more detail, then retry the app.',
        ].join('\n'),
      );
    }
  });

  mainWindow.webContents.on('did-start-loading', () => {
    revealHiddenWindow('did-start-loading');
    writeWindowHealth({ reason: 'did-start-loading' });
    appendDesktopLog(`Main frame started loading: ${mainWindow.webContents.getURL() || '(empty)'}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    clearRevealTimeouts();
    ensureMainWindowOnScreen();
    writeWindowHealth({ reason: 'did-finish-load' });
    appendDesktopLog(
      `Main frame finished loading: ${mainWindow.webContents.getURL() || '(empty)'}`,
    );
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    appendDesktopLog(`Renderer console[level=${level}] ${sourceId}:${line} ${message}`);
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      if (!isMainFrame) {
        return;
      }

      if (errorCode === -3 || errorDescription === 'ERR_ABORTED') {
        appendDesktopLog(
          `Ignoring expected main-frame abort: code=${errorCode} description=${errorDescription} url=${validatedUrl}`,
        );
        return;
      }

      const targetUrl = getReroutedAppUrl(validatedUrl);
      if (targetUrl && targetUrl !== validatedUrl) {
        appendDesktopLog(
          `Retrying failed main-frame load with rewritten URL ${targetUrl} (from ${validatedUrl})`,
        );
        mainWindow.loadURL(targetUrl).catch(() => {});
        return;
      }

      appendDesktopLog(
        `Main frame load failed: code=${errorCode} description=${errorDescription} url=${validatedUrl}`,
      );
      if (!isQuitting) {
        renderFailurePage(
          'zkTalk could not load',
          [
            `URL: ${validatedUrl || '(unknown)'}`,
            `Error: ${errorDescription} (${errorCode})`,
            '',
            'Check diagnostics or logs, then retry the app.',
          ].join('\n'),
        );
      }
    },
  );
}

function renderStatusPage(title, body, options = {}) {
  if (!mainWindow) {
    return;
  }

  const { appLocale } = getDesktopConfigSnapshot();
  const menuLabels = getDesktopMenuLabels(appLocale);
  const config = options.config;
  const actions = options.actions ?? [];
  const actionsHtml =
    actions.length > 0
      ? `<div class="actions">${actions
          .map(
            (action) =>
              `<a class="button ${action.variant === 'secondary' ? 'secondary' : ''}" href="${action.href}">${action.label}</a>`,
          )
          .join('')}</div>`
      : '';
  const configEditorHtml = config
    ? `<form id="desktop-config-form" class="config-form">
        <div class="field">
          <label for="apiUrl">${menuLabels.apiUrlLabel}</label>
          <input id="apiUrl" name="apiUrl" type="url" value="${escapeHtml(config.apiUrl || '')}" placeholder="http://localhost:4000" />
        </div>
        <div class="field">
          <label for="wsUrl">${menuLabels.wsUrlLabel}</label>
          <input id="wsUrl" name="wsUrl" type="url" value="${escapeHtml(config.wsUrl || '')}" placeholder="ws://localhost:4000/api/ws" />
        </div>
        <div class="field">
          <label for="livekitUrl">${menuLabels.livekitUrlLabel}</label>
          <input id="livekitUrl" name="livekitUrl" type="url" value="${escapeHtml(config.livekitUrl || '')}" placeholder="ws://localhost:7880" />
        </div>
        <div class="field">
          <label for="webUrl">${menuLabels.webUrlLabel}</label>
          <input id="webUrl" name="webUrl" type="url" value="${escapeHtml(config.webUrl || '')}" placeholder="https://app.example.com" />
        </div>
        <div class="field">
          <label for="localAgentLanguagePreset">${menuLabels.localAgentLanguagePresetLabel}</label>
          <select id="localAgentLanguagePreset" name="localAgentLanguagePreset">
            <option value="manual_only"${config.localAgentLanguagePreset === 'manual_only' ? ' selected' : ''}>manual_only</option>
            <option value="english_only"${config.localAgentLanguagePreset === 'english_only' ? ' selected' : ''}>english_only</option>
            <option value="korean_preferred_english_readable"${config.localAgentLanguagePreset === 'korean_preferred_english_readable' ? ' selected' : ''}>korean_preferred_english_readable</option>
          </select>
        </div>
        <p class="hint">${menuLabels.localAgentLanguagePresetHint}</p>
        <p class="hint">${menuLabels.desktopConfigPathHint.replace('{{path}}', escapeHtml(config.path || ''))}</p>
        <div class="actions">
          <button type="submit" class="button">${menuLabels.saveAndRetry}</button>
          <button type="button" class="button secondary" id="open-config-button">${menuLabels.openConfigFile}</button>
        </div>
        <p id="config-status" class="status"></p>
      </form>`
    : '';

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        :root {
          color-scheme: dark;
        }
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top, rgba(59, 130, 246, 0.16), transparent 45%),
            linear-gradient(180deg, #0b1020 0%, #111827 100%);
          color: #e5e7eb;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .card {
          width: min(520px, calc(100vw - 48px));
          padding: 28px;
          border-radius: 20px;
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        }
        h1 {
          margin: 0 0 12px;
          font-size: 24px;
        }
        p {
          margin: 0;
          font-size: 15px;
          line-height: 1.65;
          color: #cbd5e1;
          white-space: pre-wrap;
        }
        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 20px;
        }
        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          padding: 12px 16px;
          border-radius: 12px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          border: 0;
          cursor: pointer;
        }
        .button.secondary {
          background: rgba(148, 163, 184, 0.15);
          border: 1px solid rgba(148, 163, 184, 0.24);
          color: #e5e7eb;
        }
        .meta {
          margin-top: 16px;
          display: grid;
          gap: 6px;
        }
        .meta-line {
          font-size: 12px;
          color: #94a3b8;
          word-break: break-all;
        }
        .config-form {
          margin-top: 22px;
          display: grid;
          gap: 14px;
        }
        .field {
          display: grid;
          gap: 8px;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e1;
        }
        input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(15, 23, 42, 0.9);
          color: #f8fafc;
          padding: 12px 14px;
          font-size: 14px;
        }
        select {
          width: 100%;
          box-sizing: border-box;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          background: rgba(15, 23, 42, 0.9);
          color: #f8fafc;
          padding: 12px 14px;
          font-size: 14px;
        }
        .hint, .status {
          font-size: 13px;
          color: #94a3b8;
        }
        .status[data-tone="error"] {
          color: #fca5a5;
        }
        .status[data-tone="success"] {
          color: #86efac;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>${title}</h1>
        <p>${body}</p>
        ${actionsHtml}
        <div class="meta">
          <div class="meta-line">${menuLabels.desktopConfigMeta}: ${escapeHtml((config && config.path) || loadedDesktopConfigPath || getDesktopConfigPath())}</div>
          <div class="meta-line">${menuLabels.desktopLogsMeta}: ${escapeHtml(getDesktopLogPath())}</div>
        </div>
        ${configEditorHtml}
      </div>
      <script>
        const desktopApi = window.zkTalkDesktop;
        const form = document.getElementById('desktop-config-form');
        const openConfigButton = document.getElementById('open-config-button');
        const statusNode = document.getElementById('config-status');

        function setStatus(message, tone) {
          if (!statusNode) {
            return;
          }

          statusNode.textContent = message || '';
          if (tone) {
            statusNode.dataset.tone = tone;
          } else {
            delete statusNode.dataset.tone;
          }
        }

        if (openConfigButton && desktopApi?.openConfig) {
          openConfigButton.addEventListener('click', () => {
            desktopApi.openConfig().catch(() => {
              setStatus(${JSON.stringify(menuLabels.openConfigFileError)}, 'error');
            });
          });
        }

        document.querySelectorAll('a[href="zktalk://open-logs"]').forEach((button) => {
          button.addEventListener('click', (event) => {
            event.preventDefault();
            desktopApi?.openLogs?.().catch(() => {
              setStatus(${JSON.stringify(menuLabels.openLogsError)}, 'error');
            });
          });
        });

        if (form && desktopApi?.saveConfig) {
          form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
              submitButton.disabled = true;
            }
            setStatus(${JSON.stringify(menuLabels.savingConnectionSettings)}, '');

            try {
              const formData = new FormData(form);
              await desktopApi.saveConfig({
                apiUrl: formData.get('apiUrl'),
                wsUrl: formData.get('wsUrl'),
                livekitUrl: formData.get('livekitUrl'),
                webUrl: formData.get('webUrl'),
                localAgentLanguagePreset: formData.get('localAgentLanguagePreset'),
              });
              setStatus(${JSON.stringify(menuLabels.savedConnectionSettings)}, 'success');
              await desktopApi.retryLoad();
            } catch (error) {
              setStatus(error?.message || ${JSON.stringify(menuLabels.saveConnectionSettingsError)}, 'error');
              if (submitButton) {
                submitButton.disabled = false;
              }
            }
          });
        }
      </script>
    </body>
  </html>`;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function renderConnectionSettingsPage() {
  const { appLocale } = getDesktopConfigSnapshot();
  const menuLabels = getDesktopMenuLabels(appLocale);
  const actions = [
    { label: menuLabels.retryConnection, href: 'zktalk://retry' },
    { label: menuLabels.openConfigFile, href: 'zktalk://open-config', variant: 'secondary' },
    { label: menuLabels.openLogs, href: 'zktalk://open-logs', variant: 'secondary' },
  ];

  if (resolvedAppUrl) {
    actions.push({ label: menuLabels.backToApp, href: 'zktalk://back-to-app', variant: 'secondary' });
  }

  renderStatusPage(
    menuLabels.connectionSettingsTitle,
    menuLabels.connectionSettingsBody,
    {
      actions,
      config: getDesktopConfigSnapshot(),
    },
  );
}

function renderDiagnosticsPage() {
  const releaseActions = [
    {
      label: 'Open release dashboard',
      href: 'zktalk://open-release-dashboard',
      variant: 'secondary',
    },
    { label: 'Open release handoff', href: 'zktalk://open-release-handoff', variant: 'secondary' },
    {
      label: 'Open release handoff markdown',
      href: 'zktalk://open-release-handoff-markdown',
      variant: 'secondary',
    },
    ...(hasReleaseHandoffJsonFile()
      ? [
          {
            label: 'Open release handoff JSON',
            href: 'zktalk://open-release-handoff-json',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseHandoffHtmlFile()
      ? [
          {
            label: 'Open release handoff HTML file',
            href: 'zktalk://open-release-handoff-html-file',
            variant: 'secondary',
          },
        ]
      : []),
    { label: 'Open signing setup', href: 'zktalk://open-signing-setup', variant: 'secondary' },
    {
      label: 'Open signing blockers',
      href: 'zktalk://open-signing-blockers',
      variant: 'secondary',
    },
    ...(hasSigningBlockersFile()
      ? [
          {
            label: 'Open signing blockers report',
            href: 'zktalk://open-signing-blockers-report',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasSigningBlockersJsonFile()
      ? [
          {
            label: 'Open signing blockers JSON',
            href: 'zktalk://open-signing-blockers-json',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasSigningBlockersJsonFile()
      ? [
          {
            label: 'Open signing blockers JSON file',
            href: 'zktalk://open-signing-blockers-json-file',
            variant: 'secondary',
          },
        ]
      : []),
    { label: 'Open release notes', href: 'zktalk://open-release-notes', variant: 'secondary' },
    ...(hasSigningEnvExample()
      ? [
          {
            label: hasSigningEnv() ? 'Open signing env' : 'Initialize signing env',
            href: hasSigningEnv() ? 'zktalk://open-signing-env' : 'zktalk://init-signing-env',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasSigningEnvExample()
      ? [
          {
            label: 'Open signing env example',
            href: 'zktalk://open-signing-env-example',
            variant: 'secondary',
          },
        ]
      : []),
    ...(fs.existsSync(LOCAL_RELEASE_DIST_DIR)
      ? [
          {
            label: 'Open release dist folder',
            href: 'zktalk://open-release-dist',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseManifest()
      ? [
          {
            label: 'Open release artifacts',
            href: 'zktalk://open-release-manifest',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseManifest()
      ? [
          {
            label: 'Open release manifest JSON',
            href: 'zktalk://open-release-manifest-json',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseStatus()
      ? [
          {
            label: 'Open release status',
            href: 'zktalk://open-release-status',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseSummaryJsonFile()
      ? [
          {
            label: 'Open release summary',
            href: 'zktalk://open-release-summary',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseStatus()
      ? [
          {
            label: 'Open release status JSON',
            href: 'zktalk://open-release-status-json',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseSummaryJsonFile()
      ? [
          {
            label: 'Open release summary JSON',
            href: 'zktalk://open-release-summary-json',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseSummaryJsonFile()
      ? [
          {
            label: 'Open release summary JSON file',
            href: 'zktalk://open-release-summary-json-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseChecksums()
      ? [
          {
            label: 'Open release checksums',
            href: 'zktalk://open-release-checksums',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseChecksums()
      ? [
          {
            label: 'Open release checksums file',
            href: 'zktalk://open-release-checksums-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseIndex()
      ? [{ label: 'Open release index', href: 'zktalk://open-release-index', variant: 'secondary' }]
      : []),
    ...(hasReleaseIndex()
      ? [
          {
            label: 'Open release index file',
            href: 'zktalk://open-release-index-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseHandoff()
      ? [
          {
            label: 'Open release handoff file',
            href: 'zktalk://open-release-handoff-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseHandoffJsonFile()
      ? [
          {
            label: 'Open release handoff JSON file',
            href: 'zktalk://open-release-handoff-json-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseHandoffHtmlFile()
      ? [
          {
            label: 'Open release handoff HTML file',
            href: 'zktalk://open-release-handoff-html-file',
            variant: 'secondary',
          },
        ]
      : []),
    {
      label: 'Open release commands',
      href: 'zktalk://open-release-commands',
      variant: 'secondary',
    },
    ...(hasReleaseReport()
      ? [
          {
            label: 'Open release report',
            href: 'zktalk://open-release-report',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseReport()
      ? [
          {
            label: 'Open release report file',
            href: 'zktalk://open-release-report-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseVerification()
      ? [
          {
            label: 'Open release verification',
            href: 'zktalk://open-release-verification',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseVerification()
      ? [
          {
            label: 'Open release verification file',
            href: 'zktalk://open-release-verification-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseVerificationJsonFile()
      ? [
          {
            label: 'Open release verification JSON',
            href: 'zktalk://open-release-verification-json',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseVerificationJsonFile()
      ? [
          {
            label: 'Open release verification JSON file',
            href: 'zktalk://open-release-verification-json-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseVerificationHtmlFile()
      ? [
          {
            label: 'Open release verification HTML file',
            href: 'zktalk://open-release-verification-html-file',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseBundle()
      ? [
          {
            label: 'Open release bundle',
            href: 'zktalk://open-release-bundle',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseBundle()
      ? [
          {
            label: 'Open release bundle folder',
            href: 'zktalk://open-release-bundle-folder',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseArchive()
      ? [
          {
            label: 'Open release archive',
            href: 'zktalk://open-release-archive',
            variant: 'secondary',
          },
        ]
      : []),
    ...(hasReleaseArchive()
      ? [
          {
            label: 'Open release archive file',
            href: 'zktalk://open-release-archive-file',
            variant: 'secondary',
          },
        ]
      : []),
  ];

  renderStatusPage('Desktop diagnostics', getDiagnosticsText(), {
    actions: [
      { label: 'Connection settings', href: 'zktalk://settings' },
      { label: 'Export support bundle', href: 'zktalk://export-support-bundle' },
      { label: 'Copy diagnostics', href: 'zktalk://copy-diagnostics', variant: 'secondary' },
      { label: 'Copy release paths', href: 'zktalk://copy-release-paths', variant: 'secondary' },
      {
        label: 'Copy release readiness',
        href: 'zktalk://copy-release-status-summary',
        variant: 'secondary',
      },
      ...(hasReleaseSummaryJsonFile()
        ? [
            {
              label: 'Copy release summary',
              href: 'zktalk://copy-release-summary',
              variant: 'secondary',
            },
          ]
        : []),
      {
        label: 'Copy release next steps',
        href: 'zktalk://copy-release-next-steps',
        variant: 'secondary',
      },
      {
        label: 'Copy release commands',
        href: 'zktalk://copy-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy primary release command',
        href: 'zktalk://copy-primary-release-command',
        variant: 'secondary',
      },
      {
        label: 'Copy recommended release commands',
        href: 'zktalk://copy-recommended-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy available signed release commands',
        href: 'zktalk://copy-available-signed-release-commands',
        variant: 'secondary',
      },
      {
        label: 'Copy release artifacts',
        href: 'zktalk://copy-release-artifacts',
        variant: 'secondary',
      },
      {
        label: 'Copy release checksums',
        href: 'zktalk://copy-release-checksums',
        variant: 'secondary',
      },
      { label: 'Copy release report', href: 'zktalk://copy-release-report', variant: 'secondary' },
      ...(hasReleaseVerification()
        ? [
            {
              label: 'Copy release verification',
              href: 'zktalk://copy-release-verification',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasReleaseVerificationJsonFile()
        ? [
            {
              label: 'Copy release verification JSON',
              href: 'zktalk://copy-release-verification-json',
              variant: 'secondary',
            },
          ]
        : []),
      { label: 'Copy release bundle', href: 'zktalk://copy-release-bundle', variant: 'secondary' },
      {
        label: 'Copy release archive',
        href: 'zktalk://copy-release-archive',
        variant: 'secondary',
      },
      {
        label: 'Copy release dashboard',
        href: 'zktalk://copy-release-dashboard',
        variant: 'secondary',
      },
      {
        label: 'Copy release handoff',
        href: 'zktalk://copy-release-handoff',
        variant: 'secondary',
      },
      {
        label: 'Copy release handoff markdown',
        href: 'zktalk://copy-release-handoff-markdown',
        variant: 'secondary',
      },
      ...(hasReleaseHandoffJsonFile()
        ? [
            {
              label: 'Copy release handoff JSON',
              href: 'zktalk://copy-release-handoff-json',
              variant: 'secondary',
            },
          ]
        : []),
      { label: 'Copy installers', href: 'zktalk://copy-installers', variant: 'secondary' },
      { label: 'Copy signing setup', href: 'zktalk://copy-signing-setup', variant: 'secondary' },
      {
        label: 'Copy signing blockers',
        href: 'zktalk://copy-signing-blockers',
        variant: 'secondary',
      },
      ...(hasSigningBlockersFile()
        ? [
            {
              label: 'Copy signing blockers report',
              href: 'zktalk://copy-signing-blockers-report',
              variant: 'secondary',
            },
          ]
        : []),
      ...(hasSigningBlockersJsonFile()
        ? [
            {
              label: 'Copy signing blockers JSON',
              href: 'zktalk://copy-signing-blockers-json',
              variant: 'secondary',
            },
          ]
        : []),
      { label: 'Open config file', href: 'zktalk://open-config', variant: 'secondary' },
      { label: 'Open logs', href: 'zktalk://open-logs', variant: 'secondary' },
      { label: 'Open support folder', href: 'zktalk://open-support-folder', variant: 'secondary' },
      { label: 'Open data folder', href: 'zktalk://open-data-folder', variant: 'secondary' },
      ...releaseActions,
      ...(resolvedAppUrl
        ? [{ label: 'Back to app', href: 'zktalk://back-to-app', variant: 'secondary' }]
        : []),
    ],
    config: getDesktopConfigSnapshot(),
  });
}

function getStandaloneEntry() {
  if (getConfiguredWebUrl()) {
    return null;
  }

  return app.isPackaged ? PACKAGED_STANDALONE_ENTRY : LOCAL_STANDALONE_ENTRY;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        if (!port) {
          reject(new Error('Failed to resolve an open port.'));
          return;
        }

        resolve(port);
      });
    });
  });
}

function probeServer(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode && response.statusCode < 500);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await probeServer(url)) {
      return true;
    }

    if (webServerProcess && webServerProcess.exitCode !== null) {
      break;
    }

    await wait(400);
  }

  return false;
}

async function ensureApiReachable() {
  const healthUrl = getApiHealthUrl();
  const isReachable = await probeServer(healthUrl);
  if (!isReachable) {
    appendDesktopLog(`API health check failed for ${healthUrl}`);
  }
  return isReachable;
}

async function resolveReachableDevWebUrl() {
  for (const candidate of [DEV_WEB_URL_LOOPBACK, DEV_WEB_URL]) {
    if (await probeServer(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function startBundledServer() {
  if (webServerProcess && webServerProcess.exitCode === null && webServerUrl) {
    return webServerUrl;
  }

  const entry = getStandaloneEntry();
  if (!entry) {
    return getConfiguredWebUrl();
  }

  const port = await getAvailablePort();
  const url = `http://${HOST}:${port}`;
  webServerUrl = url;

  const nodeExecutable = getNodeExecutable();

  webServerProcess = spawn(nodeExecutable, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      HOSTNAME: HOST,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      PORT: String(port),
      NEXT_PUBLIC_API_URL: process.env.ZKTALK_API_URL || 'http://127.0.0.1:4000',
      NEXT_PUBLIC_WS_URL: process.env.ZKTALK_WS_URL || 'ws://127.0.0.1:4000/api/ws',
      NEXT_PUBLIC_LIVEKIT_URL: process.env.ZKTALK_LIVEKIT_URL || 'ws://127.0.0.1:7880',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  webServerLogStreamsAttached = false;
  attachWebServerLogs(webServerProcess);
  appendDesktopLog(`Starting bundled web server from ${entry} on ${url} using ${nodeExecutable}`);

  webServerProcess.on('exit', () => {
    appendDesktopLog('Bundled web server exited');
    webServerProcess = null;
    webServerUrl = null;
    webServerLogStreamsAttached = false;

    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      renderStatusPage(
        'zkTalk stopped',
        'The bundled desktop server exited unexpectedly.\n\nOpen the desktop logs for details, then retry or rebuild the desktop bundle if needed.',
        {
          actions: [
            { label: 'Retry', href: 'zktalk://retry' },
            { label: 'Open logs', href: 'zktalk://open-logs', variant: 'secondary' },
          ],
        },
      );
    }
  });

  const isReady = await waitForServer(url, 15000);
  if (!isReady) {
    appendDesktopLog(`Bundled web server timed out while starting from ${entry}`);
    throw new Error(`Timed out while starting bundled web server from ${entry}`);
  }

  return url;
}

function stopBundledServer() {
  if (!webServerProcess) {
    return;
  }

  try {
    appendDesktopLog('Stopping bundled web server');
    webServerProcess.kill();
  } catch (_) {
    // Ignore termination failures during shutdown.
  }

  webServerProcess = null;
  webServerUrl = null;
}

async function loadApp() {
  appendBootDebug('loadApp start');
  ensureDesktopConfigFile();
  loadDesktopConfig();
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    focusMainWindow();
  }

  const configuredWebUrl = getConfiguredWebUrl();
  const reachableDevWebUrl = configuredWebUrl ? null : await resolveReachableDevWebUrl();
  if (configuredWebUrl) {
    appendDesktopLog(`Using external web URL ${configuredWebUrl}`);
    stopBundledServer();
  } else if (reachableDevWebUrl) {
    appendDesktopLog(`Using reachable dev web URL ${reachableDevWebUrl}`);
    stopBundledServer();
  }

  try {
    const standaloneEntry = configuredWebUrl || reachableDevWebUrl ? null : getStandaloneEntry();
    const bundledUrl = standaloneEntry ? await startBundledServer() : null;
    const fallbackUrl =
      configuredWebUrl ||
      reachableDevWebUrl ||
      bundledUrl ||
      DEV_WEB_URL_LOOPBACK ||
      DEV_WEB_URL;
    const isApiReachable = await ensureApiReachable();

    if (!isApiReachable) {
      renderStatusPage(
        'zkTalk needs a reachable server',
        [
          `Current API: ${getConfiguredApiUrl()}`,
          `Health check: ${getApiHealthUrl()}`,
          '',
          `Desktop config: ${loadedDesktopConfigPath || getDesktopConfigPath()}`,
          '',
          'What to do next:',
          '- Start the zkTalk API server',
          '- Or update the desktop config to point at your running API',
          '- Then reopen the app',
          '',
          'Tip: Use Help > Open desktop config to edit the connection.',
        ].join('\n'),
        {
          actions: [
            { label: 'Retry', href: 'zktalk://retry' },
            { label: 'Open config', href: 'zktalk://open-config', variant: 'secondary' },
            { label: 'Open logs', href: 'zktalk://open-logs', variant: 'secondary' },
          ],
          config: getDesktopConfigSnapshot(),
        },
      );
      return;
    }

    resolvedAppUrl = fallbackUrl;
    const initialRoute = pendingProtocolUrl || '/home';
    pendingProtocolUrl = null;
    const initialUrl = `${resolvedAppUrl}${initialRoute}`;
    appendBootDebug(`loadApp initialUrl=${initialUrl}`);
    appendDesktopLog(`Loading desktop app from ${initialUrl}`);
    await mainWindow.loadURL(initialUrl);
  } catch (error) {
    appendBootDebug(`loadApp error=${error instanceof Error ? error.message : String(error)}`);
    const fallbackUrl = configuredWebUrl || reachableDevWebUrl || DEV_WEB_URL_LOOPBACK || DEV_WEB_URL;
    const isFallbackReady = await probeServer(fallbackUrl);

    if (isFallbackReady) {
      resolvedAppUrl = fallbackUrl;
      appendDesktopLog(`Falling back to external/dev web URL ${fallbackUrl}`);
      await mainWindow.loadURL(fallbackUrl);
      return;
    }

    const standaloneEntry = getStandaloneEntry();
    renderStatusPage(
      'zkTalk could not start',
      [
        'The desktop app could not find a ready web bundle.',
        standaloneEntry
          ? `Expected bundle: ${standaloneEntry}`
          : 'No standalone bundle path was configured.',
        '',
        'Try one of these:',
        '- Build the web bundle first',
        '- Set ZKTALK_WEB_URL to a running web deployment',
        `- Update desktop config: ${loadedDesktopConfigPath || getDesktopConfigPath()}`,
        '- Rebuild the desktop package',
        '',
        `Details: ${error instanceof Error ? error.message : String(error)}`,
      ].join('\n'),
      {
        actions: [
          { label: 'Retry', href: 'zktalk://retry' },
          { label: 'Open config', href: 'zktalk://open-config', variant: 'secondary' },
          { label: 'Open logs', href: 'zktalk://open-logs', variant: 'secondary' },
        ],
        config: getDesktopConfigSnapshot(),
      },
    );
  }
}

ipcMain.handle('desktop-config:get', () => getDesktopConfigSnapshot());
ipcMain.on('desktop-config:sync', (event) => {
  event.returnValue = getDesktopConfigSnapshot();
});
ipcMain.handle('desktop-config:open', async () => {
  const configPath = ensureDesktopConfigFile();
  await shell.openPath(configPath);
  return configPath;
});
ipcMain.handle('desktop-logs:open', async () => {
  const logPath = getDesktopLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '');
  }
  await shell.openPath(logPath);
  return logPath;
});
ipcMain.handle('local-machine-bridge:get-state', () => desktopLocalMachineBridge.getSnapshot());
ipcMain.handle('local-machine-bridge:register', (_event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Local machine bridge registration payload is missing.');
  }

  const snapshot = desktopLocalMachineBridge.registerMachine(payload);
  appendDesktopLog(
    `Registered local machine bridge ${snapshot.machine?.name || '(unknown)'} for ${snapshot.machine?.ownerUserId || '(unknown owner)'}`,
  );
  return snapshot;
});
ipcMain.handle('local-machine-bridge:heartbeat', (_event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Local machine bridge heartbeat payload is missing.');
  }

  const snapshot = desktopLocalMachineBridge.heartbeat(payload);
  appendDesktopLog(
    `Local machine heartbeat ${snapshot.machine?.id || '(unknown machine)'} => ${snapshot.presence?.status || 'unknown'}`,
  );
  return snapshot;
});
ipcMain.handle('local-machine-bridge:ensure-online', (_event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Local machine bridge ensure-online payload is missing.');
  }

  const snapshot = desktopLocalMachineBridge.ensureOnline(payload);
  appendDesktopLog(
    `Ensured local machine bridge ${snapshot.machine?.id || '(unknown machine)'} => ${snapshot.presence?.status || 'unknown'}`,
  );
  return snapshot;
});
ipcMain.handle('local-machine-bridge:disconnect', (_event, payload) => {
  const snapshot = desktopLocalMachineBridge.disconnect(
    payload && typeof payload === 'object' ? payload : {},
  );
  appendDesktopLog(
    `Disconnected local machine bridge ${snapshot.machine?.id || '(unknown machine)'} => ${snapshot.presence?.status || 'unknown'}`,
  );
  return snapshot;
});
ipcMain.handle('local-machine-bridge:dispatch-command', async (_event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Local machine bridge dispatch payload is missing.');
  }

  const result = await desktopLocalMachineBridge.dispatchCommand(payload);
  appendDesktopLog(
    `Local machine command ${result.updates?.at(-1)?.commandId || '(unknown command)'} => ${result.updates?.at(-1)?.status || 'unknown'}`,
  );
  return result;
});
// ── Agent Device Bridge IPC ────────────────────────────────────────
ipcMain.handle('agent-device-bridge:set-token', async (_event, payload) => {
  const token = payload && typeof payload === 'object' ? payload.token : null;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('agent-device-bridge:set-token requires a non-empty token.');
  }
  if (!agentDeviceBridge) {
    appendDesktopLog(
      '[agent-bridge] token received but bridge disabled (set ZKTALK_AGENT_BRIDGE=1 to enable).',
    );
    return { enabled: false, running: false };
  }
  const tokenChanged = agentDeviceBridgeToken !== token;
  agentDeviceBridgeToken = token;
  if (tokenChanged && agentDeviceBridgeStarted) {
    // Token rotated while bridge is active — restart so the in-flight
    // fetches pick up the new credential.
    await stopAgentDeviceBridge();
  }
  const state = await ensureAgentDeviceBridgeStarted();
  return { enabled: true, running: agentDeviceBridgeStarted, state };
});
ipcMain.handle('agent-device-bridge:clear-token', async () => {
  agentDeviceBridgeToken = null;
  await stopAgentDeviceBridge();
  return { enabled: agentDeviceBridgeEnabled, running: false };
});
ipcMain.handle('agent-device-bridge:get-state', () => {
  if (!agentDeviceBridge) {
    return { enabled: false, running: false, state: null };
  }
  return {
    enabled: true,
    running: agentDeviceBridgeStarted,
    state: agentDeviceBridgeStateSnapshot(),
  };
});
ipcMain.handle('desktop-config:save', (_event, config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Desktop config payload is missing.');
  }

  const savedConfig = writeDesktopConfig(config);
  appendDesktopLog(`Saved desktop config to ${savedConfig.path}`);
  loadDesktopConfig();
  installApplicationMenu();
  return savedConfig;
});
ipcMain.handle('desktop-files:pick', async (event, options) => {
  appendDesktopLog(`desktop-files:pick requested multiple=${options?.multiple !== false}`);
  const properties = ['openFile'];
  if (options?.multiple !== false) {
    properties.push('multiSelections');
  }

  const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow ?? undefined;
  if (parentWindow && !parentWindow.isVisible()) {
    parentWindow.show();
  }
  parentWindow?.focus();

  const result = await dialog.showOpenDialog(parentWindow, {
    title: 'Select files to attach',
    buttonLabel: 'Attach',
    properties,
  });

  if (result.canceled) {
    appendDesktopLog('desktop-files:pick canceled');
    return [];
  }

  appendDesktopLog(`desktop-files:pick selected ${result.filePaths.length} file(s)`);

  return Promise.all(
    result.filePaths.map(async (filePath) => {
      const stats = await fs.promises.stat(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        type: guessMimeTypeFromPath(filePath),
        size: stats.size,
        lastModified: Math.round(stats.mtimeMs),
      };
    }),
  );
});
ipcMain.handle('desktop-files:read-chunk', async (_event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Desktop read chunk payload is missing.');
  }

  const filePath = typeof payload.path === 'string' ? payload.path : '';
  const start = Number.isFinite(payload.start) ? Math.max(0, payload.start) : 0;
  const end = Number.isFinite(payload.end) ? Math.max(start, payload.end) : start;

  if (!filePath) {
    throw new Error('Desktop read chunk path is missing.');
  }

  const length = Math.max(0, end - start);
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);
    return Array.from(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
});
ipcMain.handle('desktop-files:open', async (_event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Desktop attachment payload is missing.');
  }

  const tempPath = await openDesktopAttachment(payload);
  appendDesktopLog(`Opened desktop attachment via temp file ${tempPath}`);
  return { path: tempPath };
});
ipcMain.handle('desktop-files:save', async (event, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Desktop attachment payload is missing.');
  }

  const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow ?? undefined;
  if (parentWindow && !parentWindow.isVisible()) {
    parentWindow.show();
  }
  parentWindow?.focus();

  const savedPath = await saveDesktopAttachment(parentWindow, payload);
  if (!savedPath) {
    appendDesktopLog('desktop-files:save canceled');
    return { canceled: true };
  }

  appendDesktopLog(`Saved desktop attachment to ${savedPath}`);
  return { path: savedPath, canceled: false };
});
ipcMain.handle('desktop:retry-load', async () => {
  await loadApp();
  return true;
});

process.on('uncaughtException', (error) => {
  const message = error instanceof Error ? `${error.stack || error.message}` : String(error);
  appendDesktopLog(`Uncaught exception: ${message}`);
  if (!isQuitting) {
    renderFailurePage(
      'zkTalk hit an unexpected error',
      ['The desktop process hit an unexpected error.', '', message].join('\n'),
    );
  }
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? `${reason.stack || reason.message}` : String(reason);
  appendDesktopLog(`Unhandled rejection: ${message}`);
  if (!isQuitting) {
    renderFailurePage(
      'zkTalk hit an unexpected error',
      ['A background task failed unexpectedly.', '', message].join('\n'),
    );
  }
});

const gotSingleInstanceLock = IS_DESKTOP_TEST_INSTANCE ? true : app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  appendBootDebug('singleInstanceLock=false');
  app.quit();
} else {
  appendBootDebug('singleInstanceLock=true');
  app.on('second-instance', (_event, argv) => {
    appendDesktopLog(`second-instance argv: ${JSON.stringify(argv)}`);
    focusMainWindow();
    const protocolUrl = argv.find((value) => value.startsWith('zktalk://'));
    if (protocolUrl) {
      handleIncomingProtocolUrl(protocolUrl).catch(() => {});
      return;
    }

    const route = getInitialRouteFromArgv(argv);
    if (route) {
      navigateToAppRoute(route).catch(() => {});
    }
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    appendDesktopLog(`open-url event: ${url}`);
    handleIncomingProtocolUrl(url).catch(() => {});
  });

  app.whenReady().then(() => {
    appendBootDebug('app.whenReady');
    if (process.platform === 'darwin') {
      app.setActivationPolicy('regular');
      app.dock?.show();
    }
    const initialRoute = getInitialRouteFromArgv(process.argv) || consumeStartupRoute();
    appendBootDebug(`initialRoute=${initialRoute || ''}`);
    if (initialRoute) {
      pendingProtocolUrl = initialRoute;
    }
    registerProtocolClient();
    installApplicationMenu();
    ensureWindowRecoveryMonitor();
    return loadApp();
  });
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    loadApp().catch(() => {});
  } else {
    focusMainWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopWindowRecoveryMonitor();
  desktopLocalMachineBridge.stopAutoHeartbeat();
  // Fire-and-forget — best-effort stop of the agent-device-bridge so we
  // don't hang quit on an outstanding heartbeat/dispatch fetch.
  void stopAgentDeviceBridge();
  stopBundledServer();
});

app.on('window-all-closed', () => {
  stopBundledServer();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
