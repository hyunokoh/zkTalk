import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const cacheDir = path.join(repoRoot, '.tmp', 'e2e');
const cachePath = path.join(cacheDir, 'ui-seed-v3.json');
const cacheMaxAgeMs = 10 * 60 * 1000;
const apiPort = process.env.ZKTALK_API_PORT ?? '4000';
const baseUrl = process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
let seedPromise = null;
function readCachedSeed() {
    if (!fs.existsSync(cachePath)) {
        return null;
    }
    const stat = fs.statSync(cachePath);
    if (Date.now() - stat.mtimeMs > cacheMaxAgeMs) {
        return null;
    }
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}
function writeCachedSeed(seed) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(seed, null, 2));
}
function runSeedScript() {
    const output = execFileSync('/opt/homebrew/bin/node', ['apps/api/scripts/two-user-messaging-e2e.mjs', '--include-tokens'], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:${process.env.PATH ?? ''}`,
            ZKTALK_BASE_URL: baseUrl,
            ZKTALK_E2E_INCLUDE_TOKENS: '1',
        },
    }).trim();
    const seed = JSON.parse(output);
    writeCachedSeed(seed);
    return seed;
}
export async function getSeedData() {
    if (!seedPromise) {
        seedPromise = Promise.resolve(readCachedSeed() ?? runSeedScript());
    }
    return seedPromise;
}
