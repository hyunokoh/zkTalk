import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..');
const nodeBinPath = `/opt/homebrew/bin:${process.env.PATH ?? ''}`;
const apiPort = Number(process.env.ZKTALK_API_PORT ?? '4000');
const webPort = Number(process.env.ZKTALK_WEB_PORT ?? '3000');
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const wsBaseUrl = `ws://127.0.0.1:${apiPort}/api/ws`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: path.join(currentDir, 'tests'),
  testMatch: ['**/*.spec.ts'],
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(currentDir, 'playwright-report') }],
  ],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: webBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'PATH=/opt/homebrew/bin:$PATH pnpm exec tsx watch src/server.ts',
      cwd: path.join(repoRoot, 'apps', 'api'),
      env: {
        ...process.env,
        PATH: nodeBinPath,
        NODE_ENV: 'test',
        PORT: String(apiPort),
      },
      url: `${apiBaseUrl}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `PATH=/opt/homebrew/bin:$PATH NEXT_PUBLIC_API_URL=${apiBaseUrl} NEXT_PUBLIC_WS_URL=${wsBaseUrl} NEXT_PUBLIC_LIVEKIT_URL=ws://127.0.0.1:7880 pnpm exec next dev --port ${webPort}`,
      cwd: path.join(repoRoot, 'apps', 'web'),
      env: {
        ...process.env,
        PATH: nodeBinPath,
        NODE_ENV: 'test',
        PORT: String(webPort),
        NEXT_PUBLIC_API_URL: apiBaseUrl,
        NEXT_PUBLIC_WS_URL: wsBaseUrl,
        NEXT_PUBLIC_LIVEKIT_URL: 'ws://127.0.0.1:7880',
      },
      url: `${webBaseUrl}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
