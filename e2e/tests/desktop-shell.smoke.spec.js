import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, expect, test, } from '@playwright/test';
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
const TINY_JPG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAPEA8QDw8PEA8PDw8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OFw8QFS0dFR0rLS0tKy0rLSstLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK//AABEIAAEAAgMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAB2gD/xAAVEAEBAAAAAAAAAAAAAAAAAAABAP/aAAgBAQABBQJX/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAwEBPwEf/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPwEf/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQAGPwJf/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQABPyFf/9k=', 'base64');
const TINY_PDF = Buffer.from('%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n', 'utf8');
function buildDesktopHarnessProtocolUrl({ mode, sessionToken, body, channelId, communitySlug, conversationId, }) {
    const params = new URLSearchParams({
        mode,
        sessionToken,
        body,
        nonce: String(Date.now()),
    });
    if (mode === 'channel') {
        if (!channelId || !communitySlug) {
            throw new Error('channel mode requires communitySlug and channelId');
        }
        params.set('communitySlug', communitySlug);
        params.set('channelId', channelId);
    }
    else {
        if (!conversationId) {
            throw new Error('dm mode requires conversationId');
        }
        params.set('conversationId', conversationId);
    }
    return `zktalk://desktop-harness?${params.toString()}`;
}
async function launchDesktopShell(initialArg) {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zktalk-desktop-smoke-'));
    const configPath = path.join(userDataDir, 'desktop.config.json');
    fs.writeFileSync(configPath, JSON.stringify({
        apiUrl: apiBaseUrl,
        wsUrl: wsBaseUrl,
        livekitUrl: 'ws://127.0.0.1:7880',
        webUrl: webBaseUrl,
    }, null, 2));
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
async function closeDesktopShell(app, userDataDir) {
    if (app) {
        await app.close();
    }
    if (userDataDir) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    }
}
async function waitForChannelMessage(request, token, channelId, body) {
    await expect
        .poll(async () => {
        const response = await request.get(`${apiBaseUrl}/api/channels/${channelId}/messages?limit=20`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok()) {
            return false;
        }
        const payload = (await response.json());
        const messages = payload.messages ?? payload.items ?? [];
        return messages.some((entry) => {
            const message = entry.message ?? entry;
            return message.bodyMarkdown === body || message.bodyPlaintext === body;
        });
    }, { timeout: 20_000 })
        .toBeTruthy();
}
async function waitForDmMessage(request, token, conversationId, body) {
    await expect
        .poll(async () => {
        const response = await request.get(`${apiBaseUrl}/api/dm/conversations/${conversationId}/messages`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok()) {
            return false;
        }
        const payload = (await response.json());
        const messages = payload.messages ?? payload.items ?? [];
        return messages.some((entry) => {
            const message = entry.message ?? entry;
            return message.bodyMarkdown === body || message.bodyPlaintext === body;
        });
    }, { timeout: 20_000 })
        .toBeTruthy();
}
async function waitForDesktopLogMatch(userDataDir, matcher) {
    const logPath = path.join(userDataDir, 'logs', 'desktop.log');
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
        if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, 'utf8');
            const matchedValue = content.match(matcher)?.[1]?.trim();
            if (matchedValue) {
                return matchedValue;
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out waiting for desktop log match: ${matcher}`);
}
async function launchDesktopChannelShell(request) {
    const seed = await getSeedData();
    const bootstrapBody = `desktop-shell-bootstrap-${Date.now()}`;
    const protocolUrl = buildDesktopHarnessProtocolUrl({
        mode: 'channel',
        sessionToken: seed.userB.sessionToken,
        communitySlug: seed.communitySlug,
        channelId: seed.channelId,
        body: bootstrapBody,
    });
    const launch = await launchDesktopShell(protocolUrl);
    const channelPage = await waitForElectronPath(launch.app, launch.window, `/communities/${seed.communitySlug}/channels/${seed.channelId}`);
    await expectDesktopBridge(channelPage);
    await waitForChannelMessage(request, seed.userA.sessionToken, seed.channelId, bootstrapBody);
    await expect(channelPage.getByTestId('message-row').filter({ hasText: bootstrapBody }).first()).toBeVisible({ timeout: 10_000 });
    return {
        seed,
        page: channelPage,
        app: launch.app,
        userDataDir: launch.userDataDir,
    };
}
async function expectDesktopBridge(page) {
    await expect
        .poll(async () => {
        return page.evaluate(() => {
            const desktopWindow = window;
            const desktopApi = desktopWindow.zkTalkDesktop;
            const desktopConfig = desktopWindow.zkTalkDesktopConfig;
            return Boolean(desktopApi
                && typeof desktopApi.getConfig === 'function'
                && typeof desktopApi.saveConfig === 'function'
                && typeof desktopApi.retryLoad === 'function'
                && desktopConfig?.apiUrl);
        });
    })
        .toBeTruthy();
}
async function waitForElectronPath(app, fallbackPage, expectedPath) {
    await expect
        .poll(async () => {
        const activePage = app.windows().at(-1) ?? fallbackPage;
        const currentUrl = activePage.url();
        try {
            return new URL(currentUrl).pathname;
        }
        catch {
            return currentUrl;
        }
    }, { timeout: 20_000 })
        .toBe(expectedPath);
    return app.windows().at(-1) ?? fallbackPage;
}
test.describe.serial('desktop shell smoke', () => {
    let app = null;
    let userDataDir = null;
    test.skip(process.platform !== 'darwin', 'desktop shell smoke is currently exercised on macOS');
    test.skip(!fs.existsSync(electronBinaryPath), 'desktop electron binary is not installed');
    test.afterEach(async () => {
        await closeDesktopShell(app, userDataDir);
        app = null;
        userDataDir = null;
    });
    test('launch protocol URL posts the channel message and redirects into the seeded channel', async ({ request, }) => {
        const seed = await getSeedData();
        const body = `desktop-shell-channel-${Date.now()}`;
        const protocolUrl = buildDesktopHarnessProtocolUrl({
            mode: 'channel',
            sessionToken: seed.userB.sessionToken,
            communitySlug: seed.communitySlug,
            channelId: seed.channelId,
            body,
        });
        const launch = await launchDesktopShell(protocolUrl);
        app = launch.app;
        userDataDir = launch.userDataDir;
        const page = launch.window;
        await expectDesktopBridge(page);
        const channelPage = await waitForElectronPath(app, page, `/communities/${seed.communitySlug}/channels/${seed.channelId}`);
        await waitForChannelMessage(request, seed.userA.sessionToken, seed.channelId, body);
        await expect(channelPage.getByTestId('message-row').filter({ hasText: body }).first()).toBeVisible({ timeout: 10_000 });
        await expect
            .poll(() => channelPage.evaluate(() => window.localStorage.getItem('zktalk_session_token')))
            .toBe(seed.userB.sessionToken);
    });
    test('direct login-route launch exposes the desktop bridge config in an isolated shell', async () => {
        const launch = await launchDesktopShell('/login');
        app = launch.app;
        userDataDir = launch.userDataDir;
        const page = launch.window;
        await expectDesktopBridge(page);
        const loginPage = await waitForElectronPath(app, page, '/login');
        const desktopConfig = await loginPage.evaluate(async () => {
            const desktopWindow = window;
            return desktopWindow.zkTalkDesktop?.getConfig?.();
        });
        expect(desktopConfig).toMatchObject({
            apiUrl: apiBaseUrl,
            wsUrl: wsBaseUrl,
            webUrl: webBaseUrl,
        });
        await expect
            .poll(() => loginPage.evaluate(() => window.localStorage.getItem('zktalk_session_token')))
            .toBeNull();
    });
    test('desktop shell sends a jpg attachment and opens its image preview in the channel UI', async ({ request, }) => {
        const launch = await launchDesktopChannelShell(request);
        app = launch.app;
        userDataDir = launch.userDataDir;
        const page = launch.page;
        const fileName = `desktop-shell-photo-${Date.now()}.jpg`;
        await page.getByTestId('channel-composer-attachment-input').setInputFiles({
            name: fileName,
            mimeType: 'image/jpeg',
            buffer: TINY_JPG,
        });
        const pendingAttachment = page
            .getByTestId('channel-composer-pending-attachment')
            .filter({ hasText: fileName })
            .first();
        await expect(pendingAttachment).toBeVisible();
        await expect(page.getByTestId('channel-composer-send-button')).toBeEnabled();
        await page.getByTestId('channel-composer-send-button').click();
        const row = page.getByTestId('message-row').filter({
            has: page.getByAltText(fileName),
        }).first();
        await expect(row).toBeVisible();
        const imageButton = row.getByTestId('attachment-image-button').first();
        await expect(imageButton).toHaveAttribute('data-attachment-ready', 'true');
        await expect(row).not.toContainText('(첨부파일)');
        await imageButton.click();
        await expect(page.getByRole('img', { name: fileName })).toHaveCount(2);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('img', { name: fileName })).toHaveCount(1);
    });
    test('desktop shell sends a pdf attachment and opens it through the desktop bridge temp file path', async ({ request, }) => {
        const launch = await launchDesktopChannelShell(request);
        app = launch.app;
        userDataDir = launch.userDataDir;
        const page = launch.page;
        const fileName = `desktop-shell-doc-${Date.now()}.pdf`;
        await page.getByTestId('channel-composer-attachment-input').setInputFiles({
            name: fileName,
            mimeType: 'application/pdf',
            buffer: TINY_PDF,
        });
        const pendingAttachment = page
            .getByTestId('channel-composer-pending-attachment')
            .filter({ hasText: fileName })
            .first();
        await expect(pendingAttachment).toBeVisible();
        await expect(page.getByTestId('channel-composer-send-button')).toBeEnabled();
        await page.getByTestId('channel-composer-send-button').click();
        const row = page.getByTestId('message-row').filter({ hasText: fileName }).first();
        await expect(row).toBeVisible();
        await expect(row.getByTestId('attachment-file-button').first()).toBeVisible();
        await expect(row).not.toContainText('(첨부파일)');
        await row.getByTestId('attachment-file-button').first().click();
        const openedPath = await waitForDesktopLogMatch(userDataDir, /Opened desktop attachment via temp file (.+)$/m);
        expect(openedPath).toContain(`${path.sep}zktalk-opened-attachments${path.sep}`);
        expect(openedPath).toContain(fileName);
        expect(fs.existsSync(openedPath)).toBeTruthy();
        expect(fs.statSync(openedPath).size).toBe(TINY_PDF.byteLength);
    });
});
