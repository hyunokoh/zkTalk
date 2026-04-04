import { expect, test } from '@playwright/test';

test.describe('auth smoke', () => {
  test('email login follows the dev verify link and honors next redirect', async ({ page }) => {
    const email = `playwright-email-${Date.now()}@example.com`;

    await page.goto('/login?next=%2Fsettings');
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

  test('phone login uses the dev OTP and opens the app', async ({ page }) => {
    const phoneNumber = `010${String(Date.now()).slice(-8)}`;

    await page.goto('/login');
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
  });
});
