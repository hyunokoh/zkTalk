const SESSION_TOKEN_KEY = 'zktalk_session_token';
const APP_SHELL_TEST_ID = 'community-rail-profile-link';
const SESSION_COOKIE_NAME = 'zktalk_session';
const APP_SHELL_WAIT_MS = 15000;
const APP_SHELL_RETRY_COUNT = 3;
const WEB_PORT = Number(process.env.ZKTALK_WEB_PORT ?? '3000');
const API_PORT = Number(process.env.ZKTALK_API_PORT ?? '4000');
async function setSessionCookie(page, token) {
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
            value: token,
            url: `http://127.0.0.1:${WEB_PORT}`,
            httpOnly: false,
            sameSite: 'Lax',
        },
        {
            name: SESSION_COOKIE_NAME,
            value: token,
      url: `http://localhost:${WEB_PORT}`,
      httpOnly: false,
      sameSite: 'Lax',
    },
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      url: `http://127.0.0.1:${API_PORT}`,
      httpOnly: false,
      sameSite: 'Lax',
    },
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      url: `http://localhost:${API_PORT}`,
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);
}
export async function setSessionToken(page, token) {
    await setSessionCookie(page, token);
    await page.addInitScript(({ storageKey, sessionToken }) => {
        window.sessionStorage.setItem(storageKey, sessionToken);
        window.localStorage.setItem(storageKey, sessionToken);
    }, { storageKey: SESSION_TOKEN_KEY, sessionToken: token });
}
export async function bootstrapAuthenticatedPage(page, token, url = '/home') {
    await setSessionToken(page, token);
    await page.goto('/login');
    await page.evaluate(({ storageKey, sessionToken }) => {
        window.sessionStorage.setItem(storageKey, sessionToken);
        window.localStorage.setItem(storageKey, sessionToken);
    }, { storageKey: SESSION_TOKEN_KEY, sessionToken: token });
    await waitForAuthenticatedShell(page, '/home');
    if (url !== '/home') {
        await waitForAuthenticatedRoute(page, url);
    }
}
async function waitForAuthenticatedShell(page, url) {
    let lastError;
    for (let attempt = 0; attempt < APP_SHELL_RETRY_COUNT; attempt += 1) {
        try {
            await page.goto(url);
        }
        catch (error) {
            if (!(error instanceof Error) || !error.message.includes('net::ERR_ABORTED')) {
                throw error;
            }
        }
        try {
            await page.getByTestId(APP_SHELL_TEST_ID).waitFor({
                state: 'visible',
                timeout: APP_SHELL_WAIT_MS,
            });
            return;
        }
        catch (error) {
            lastError = error;
            await page.reload();
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Authenticated shell did not become visible');
}
async function waitForAuthenticatedRoute(page, url) {
    let lastError;
    for (let attempt = 0; attempt < APP_SHELL_RETRY_COUNT; attempt += 1) {
        try {
            await page.goto(url);
        }
        catch (error) {
            if (!(error instanceof Error) || !error.message.includes('net::ERR_ABORTED')) {
                throw error;
            }
        }
        try {
            await Promise.race([
                page.getByTestId(APP_SHELL_TEST_ID).waitFor({
                    state: 'visible',
                    timeout: APP_SHELL_WAIT_MS,
                }),
                page.waitForLoadState('domcontentloaded', {
                    timeout: APP_SHELL_WAIT_MS,
                }),
            ]);
            return;
        }
        catch (error) {
            lastError = error;
            await page.reload();
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Authenticated route did not become visible');
}
export async function openAuthenticatedPage(browser, token, url) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await bootstrapAuthenticatedPage(page, token, url);
    return { context, page };
}
