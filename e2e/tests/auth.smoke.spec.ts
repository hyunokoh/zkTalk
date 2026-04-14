import { expect, test } from '@playwright/test';

const webBaseUrl = process.env.ZKTALK_WEB_URL ?? `http://127.0.0.1:${process.env.ZKTALK_WEB_PORT ?? '3000'}`;

test.describe('auth smoke', () => {
  test('email login follows the dev verify link and honors next redirect', async ({ page }) => {
    const email = `playwright-email-${Date.now()}@example.com`;

    await page.goto(`${webBaseUrl}/login?next=%2Fsettings`);
    await page.getByTestId('login-tab-email').click();
    await page.getByTestId('login-email-input').fill(email);
    await page.getByTestId('login-email-submit').click();

    const devLink = page.getByTestId('login-email-dev-link').getByRole('link');
    const href = await devLink.getAttribute('href');
    expect(href).toBeTruthy();
    const verifyUrl = new URL(href!, page.url());
    verifyUrl.searchParams.set('next', '/settings');

    await page.goto(verifyUrl.toString());

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('community-rail-profile-link')).toBeVisible();
  });

  test('phone login restores the session after reload and allows logout from settings', async ({ page }) => {
    const phoneNumber = `010${String(Date.now()).slice(-8)}`;

    await page.goto(`${webBaseUrl}/login`);
    await page.getByTestId('login-tab-phone').click();
    await page.getByTestId('login-phone-input').fill(phoneNumber);
    await page.getByTestId('login-phone-submit').click();

    const devCodeText = await page.getByTestId('login-otp-dev-code').locator('p.text-lg').textContent();
    const digits = (devCodeText ?? '').trim();

    for (const [index, digit] of digits.split('').entries()) {
      await page.getByTestId(`login-otp-digit-${index}`).fill(digit);
    }

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByTestId('community-rail-profile-link')).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('zktalk_session_token')))
      .not.toBeNull();

    await page.reload();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByTestId('community-rail-profile-link')).toBeVisible();

    await page.goto(`${webBaseUrl}/settings`);
    await expect(page.getByTestId('settings-signout-button')).toBeVisible();
    await page.getByTestId('settings-signout-button').click();

    await expect(page).toHaveURL(/\/login$/);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('zktalk_session_token')))
      .toBeNull();

    await page.goto(`${webBaseUrl}/home`);
    await expect(page).toHaveURL(/\/login\?next=%2Fhome$/);
  });
});
