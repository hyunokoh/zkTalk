const SESSION_TOKEN_KEY = 'zktalk_session_token';
const APP_SHELL_TEST_ID = 'community-rail-profile-link';
const SESSION_COOKIE_NAME = 'zktalk_session';
async function setSessionCookie(page, token) {
    await page.context().addCookies([
        {
            name: SESSION_COOKIE_NAME,
            value: token,
            domain: '127.0.0.1',
            path: '/',
            httpOnly: false,
            sameSite: 'Lax',
        },
        {
            name: SESSION_COOKIE_NAME,
            value: token,
            domain: 'localhost',
            path: '/',
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
    await page.goto('/home');
    await page.getByTestId(APP_SHELL_TEST_ID).waitFor({ state: 'visible' });
    if (url !== '/home') {
        await page.goto(url);
        await page.getByTestId(APP_SHELL_TEST_ID).waitFor({ state: 'visible' });
    }
}
export async function openAuthenticatedPage(browser, token, url) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await bootstrapAuthenticatedPage(page, token, url);
    return { context, page };
}
