import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const manifestPath = path.join(distDir, 'release-manifest.json');

const artifactExtensions = new Set(['.dmg', '.exe', '.blockmap']);

function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function collectArtifacts(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      continue;
    }

    const ext = path.extname(entry.name);
    if (!artifactExtensions.has(ext)) {
      continue;
    }

    const stats = statSync(fullPath);
    files.push({
      name: entry.name,
      path: fullPath,
      sizeBytes: stats.size,
      sha256: sha256(fullPath),
    });
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

const manifest = {
  generatedAt: new Date().toISOString(),
  distDir,
  artifacts: collectArtifacts(distDir),
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Wrote release manifest: ${manifestPath}`);
for (const artifact of manifest.artifacts) {
  console.log(`${artifact.name}  ${artifact.sizeBytes} bytes  sha256=${artifact.sha256}`);
}
