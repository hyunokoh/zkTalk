import type { Browser, BrowserContext, Page } from '@playwright/test';

const SESSION_TOKEN_KEY = 'zktalk_session_token';
const APP_SHELL_TEST_ID = 'community-rail-profile-link';
const SESSION_COOKIE_NAME = 'zktalk_session';

async function setSessionCookie(page: Page, token: string) {
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

export async function setSessionToken(page: Page, token: string) {
  await setSessionCookie(page, token);
  await page.addInitScript(
    ({ storageKey, sessionToken }) => {
      window.sessionStorage.setItem(storageKey, sessionToken);
      window.localStorage.setItem(storageKey, sessionToken);
    },
    { storageKey: SESSION_TOKEN_KEY, sessionToken: token },
  );
}

export async function bootstrapAuthenticatedPage(
  page: Page,
  token: string,
  url: string = '/home',
) {
  await setSessionToken(page, token);
  await page.goto('/home');
  await page.getByTestId(APP_SHELL_TEST_ID).waitFor({ state: 'visible' });

  if (url !== '/home') {
    await page.goto(url);
    await page.getByTestId(APP_SHELL_TEST_ID).waitFor({ state: 'visible' });
  }
}

export async function openAuthenticatedPage(
  browser: Browser,
  token: string,
  url: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await bootstrapAuthenticatedPage(page, token, url);
  return { context, page };
}
