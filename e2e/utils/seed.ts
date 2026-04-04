import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SeedUser {
  id: string;
  email: string;
  displayName: string;
  sessionToken: string;
}

export interface UiSeedData {
  ok: true;
  userA: SeedUser;
  userB: SeedUser;
  userC: SeedUser;
  communityId: string;
  communitySlug: string;
  communityName: string;
  channelId: string;
  channelName: string;
  forumChannelId: string;
  threadId: string;
  conversationId: string;
  directConversationId: string;
  groupConversationId: string;
  harnessConversationId: string;
  harnessMessageText: string;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const cacheDir = path.join(repoRoot, '.tmp', 'e2e');
const cachePath = path.join(cacheDir, 'ui-seed-v2.json');
const cacheMaxAgeMs = 10 * 60 * 1000;
const apiPort = process.env.ZKTALK_API_PORT ?? '4000';
const baseUrl = process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${apiPort}`;

let seedPromise: Promise<UiSeedData> | null = null;

function readCachedSeed(): UiSeedData | null {
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const stat = fs.statSync(cachePath);
  if (Date.now() - stat.mtimeMs > cacheMaxAgeMs) {
    return null;
  }

  return JSON.parse(fs.readFileSync(cachePath, 'utf8')) as UiSeedData;
}

function writeCachedSeed(seed: UiSeedData) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(seed, null, 2));
}

function runSeedScript(): UiSeedData {
  const output = execFileSync(
    '/opt/homebrew/bin/node',
    ['apps/api/scripts/two-user-messaging-e2e.mjs', '--include-tokens'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:${process.env.PATH ?? ''}`,
        ZKTALK_BASE_URL: baseUrl,
        ZKTALK_E2E_INCLUDE_TOKENS: '1',
      },
    },
  ).trim();

  const seed = JSON.parse(output) as UiSeedData;
  writeCachedSeed(seed);
  return seed;
}

export async function getSeedData(): Promise<UiSeedData> {
  if (!seedPromise) {
    seedPromise = Promise.resolve(readCachedSeed() ?? runSeedScript());
  }
  return seedPromise;
}
