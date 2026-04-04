const SESSION_TOKEN_KEY = 'zktalk_session_token';
const APP_SHELL_TEST_ID = 'community-rail-profile-link';
export async function setSessionToken(page, token) {
    await page.addInitScript(({ storageKey, sessionToken }) => {
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
