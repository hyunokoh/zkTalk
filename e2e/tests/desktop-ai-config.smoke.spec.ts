import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, expect, test } from '@playwright/test';
import { getSeedData } from '../utils/seed';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const desktopAppDir = path.join(repoRoot, 'apps', 'desktop');
const electronBinaryPath = path.join(desktopAppDir, 'node_modules', '.bin', 'electron');
const apiPort = Number(process.env.ZKTALK_API_PORT ?? '4000');
const webPort = Number(process.env.ZKTALK_WEB_PORT ?? '3000');
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const wsBaseUrl = `ws://127.0.0.1:${apiPort}/api/ws`;
type ElectronApplication = Awaited<ReturnType<typeof electron.launch>>;

async function launchDesktopShell(initialArg: string) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zktalk-desktop-ai-'));
  const configPath = path.join(userDataDir, 'desktop.config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        apiUrl: apiBaseUrl,
        wsUrl: wsBaseUrl,
        livekitUrl: 'ws://127.0.0.1:7880',
        webUrl: webBaseUrl,
      },
      null,
      2,
    ),
  );

  const app = await electron.launch({
    executablePath: electronBinaryPath,
    cwd: desktopAppDir,
    args: ['.', initialArg],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ZKTALK_DESKTOP_TEST: '1',
      ZKTALK_USER_DATA_DIR: userDataDir,
      ZKTALK_CONFIG_PATH: configPath,
      ZKTALK_WEB_URL: webBaseUrl,
      ZKTALK_API_URL: apiBaseUrl,
      ZKTALK_WS_URL: wsBaseUrl,
      ZKTALK_LIVEKIT_URL: 'ws://127.0.0.1:7880',
      NEXT_PUBLIC_API_URL: apiBaseUrl,
      NEXT_PUBLIC_WS_URL: wsBaseUrl,
      NEXT_PUBLIC_LIVEKIT_URL: 'ws://127.0.0.1:7880',
    },
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  return { app, window, userDataDir };
}

async function closeDesktopShell(app: ElectronApplication | null, userDataDir: string | null) {
  if (app) {
    await app.close();
  }
  if (userDataDir) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

async function waitForElectronPath(app: ElectronApplication, fallbackPage: any, expectedPath: string) {
  await expect
    .poll(
      async () => {
        const activePage = app.windows().at(-1) ?? fallbackPage;
        const currentUrl = activePage.url();
        try {
          return new URL(currentUrl).pathname;
        } catch {
          return currentUrl;
        }
      },
      { timeout: 20_000 },
    )
    .toBe(expectedPath);

  return app.windows().at(-1) ?? fallbackPage;
}

async function expectDesktopBridge(page: any) {
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const desktopWindow = window as typeof window & {
          zkTalkDesktop?: {
            getConfig?: () => Promise<unknown>;
            saveConfig?: (nextConfig: unknown) => Promise<unknown>;
            retryLoad?: () => Promise<unknown>;
          };
          zkTalkDesktopConfig?: {
            apiUrl?: string;
          };
        };
        const desktopApi = desktopWindow.zkTalkDesktop;
        const desktopConfig = desktopWindow.zkTalkDesktopConfig;
        return Boolean(
          desktopApi
          && typeof desktopApi.getConfig === 'function'
          && typeof desktopApi.saveConfig === 'function'
          && typeof desktopApi.retryLoad === 'function'
          && desktopConfig?.apiUrl,
        );
      });
    })
    .toBeTruthy();
}

test.describe.serial('desktop ai/config smoke', () => {
  let app: ElectronApplication | null = null;
  let userDataDir: string | null = null;

  test.skip(process.platform !== 'darwin', 'desktop smoke runs on macOS');
  test.skip(!fs.existsSync(electronBinaryPath), 'desktop electron binary is not installed');

  test.afterEach(async () => {
    await closeDesktopShell(app, userDataDir);
    app = null;
    userDataDir = null;
  });

  test('direct login-route launch exposes desktop bridge config', async () => {
    const launch = await launchDesktopShell('/login');
    app = launch.app;
    userDataDir = launch.userDataDir;
    const page = launch.window;

    await expectDesktopBridge(page);
    const loginPage = await waitForElectronPath(app, page, '/login');

    const desktopConfig = await loginPage.evaluate(async () => {
      const desktopWindow = window as typeof window & {
        zkTalkDesktop?: { getConfig?: () => Promise<unknown> };
      };
      return desktopWindow.zkTalkDesktop?.getConfig?.();
    });

    expect(desktopConfig).toMatchObject({
      apiUrl: apiBaseUrl,
      wsUrl: wsBaseUrl,
      webUrl: webBaseUrl,
    });
  });

  test('desktop shell exposes AI settings and AI prompt path', async () => {
    const seed = await getSeedData();
    const launch = await launchDesktopShell('/login');
    app = launch.app;
    userDataDir = launch.userDataDir;
    const page = launch.window;

    await expectDesktopBridge(page);
    const loginPage = await waitForElectronPath(app, page, '/login');
    await loginPage.evaluate((token) => {
      window.localStorage.setItem('zktalk_session_token', token);
    }, seed.userB.sessionToken);

    await loginPage.reload();
    await loginPage.waitForLoadState('domcontentloaded');
    await loginPage.goto(`${webBaseUrl}/settings/ai`);
    await expect(loginPage.getByRole('heading', { name: 'AI settings' })).toBeVisible();
    await expect(loginPage.getByText('Qwen via OpenRouter')).toBeVisible();

    try {
      await loginPage.goto(`${webBaseUrl}/home`);
    } catch {
      // Electron can raise an expected abort during reroute.
    }
    await expect
      .poll(() => {
        try {
          return new URL(loginPage.url()).pathname;
        } catch {
          return loginPage.url();
        }
      }, { timeout: 10_000 })
      .toBe('/home');

    const aiButton = loginPage.getByTestId('community-rail-ai-button');
    await expect(aiButton).toBeVisible();
    await aiButton.click();

    const input = loginPage.locator('textarea').last();
    await expect(input).toBeVisible();
    const assistantMessageRows = loginPage.locator('.rounded-bl-md');
    const assistantBubbleCountBefore = await assistantMessageRows.count();
    await input.fill('안녕! 너는 누구야? 한 문장으로.');
    await loginPage.keyboard.press('Enter');

    await expect
      .poll(async () => {
        const assistantBubbleCountAfter = await assistantMessageRows.count();
        return assistantBubbleCountAfter > assistantBubbleCountBefore;
      }, { timeout: 20_000 })
      .toBeTruthy();
  });
});
