const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const webDir = path.resolve(__dirname, '..', '..', 'web');
const nextDir = path.join(webDir, '.next');
const nextServerAppDir = path.join(nextDir, 'server', 'app');
const standaloneServerAppDir = path.join(nextDir, 'standalone', 'apps', 'web', '.next', 'server', 'app');
const standaloneStaticDir = path.join(nextDir, 'standalone', 'apps', 'web', '.next', 'static');
const nextStaticDir = path.join(nextDir, 'static');
const buildLockDir = path.join(webDir, '.next-build.lock');
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

try {
  fs.mkdirSync(buildLockDir);
} catch (error) {
  if (error && error.code === 'EEXIST') {
    console.error('Another web build is already running for apps/web. Please wait for it to finish and try again.');
    process.exit(1);
  }

  throw error;
}

function releaseLock() {
  fs.rmSync(buildLockDir, { recursive: true, force: true });
}

process.on('exit', releaseLock);
process.on('SIGINT', () => {
  releaseLock();
  process.exit(130);
});
process.on('SIGTERM', () => {
  releaseLock();
  process.exit(143);
});

fs.rmSync(nextDir, { recursive: true, force: true });

function syncMissingClientReferenceManifests() {
  if (!fs.existsSync(nextServerAppDir) || !fs.existsSync(standaloneServerAppDir)) {
    return;
  }

  const stack = [nextServerAppDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(sourcePath);
        continue;
      }

      if (!entry.isFile() || entry.name !== 'page_client-reference-manifest.js') {
        continue;
      }

      const relativePath = path.relative(nextServerAppDir, sourcePath);
      const targetPath = path.join(standaloneServerAppDir, relativePath);

      if (fs.existsSync(targetPath)) {
        continue;
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  const routeGroupManifestPath = path.join(
    standaloneServerAppDir,
    '(app)',
    'page_client-reference-manifest.js',
  );
  const fallbackRootManifestPath = path.join(
    nextServerAppDir,
    'page_client-reference-manifest.js',
  );

  if (!fs.existsSync(routeGroupManifestPath) && fs.existsSync(fallbackRootManifestPath)) {
    fs.mkdirSync(path.dirname(routeGroupManifestPath), { recursive: true });
    fs.copyFileSync(fallbackRootManifestPath, routeGroupManifestPath);
  }
}

function syncStandaloneStaticAssets() {
  if (!fs.existsSync(nextStaticDir)) {
    return;
  }

  fs.rmSync(standaloneStaticDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(standaloneStaticDir), { recursive: true });
  fs.cpSync(nextStaticDir, standaloneStaticDir, { recursive: true });
}

const child = spawn(npxCommand, ['next', 'build'], {
  cwd: webDir,
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  if (code === 0) {
    syncMissingClientReferenceManifests();
    syncStandaloneStaticAssets();
  }

  releaseLock();
  process.exit(code ?? 1);
});
