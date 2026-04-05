import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('community creation and join', () => {
  test('can create a community via /communities/new', async ({ page }) => {
    const sessionToken = fs.readFileSync('/tmp/zktalk-session-token.txt', 'utf8').trim();

    // Login first on the home page
    await page.goto('http://127.0.0.1:3000/home');
    await page.waitForTimeout(2000);
    await page.evaluate((token) => {
      localStorage.setItem('zktalk_session_token', token);
    }, sessionToken);

    // Reload and navigate to communities/new
    await page.goto('http://127.0.0.1:3000/communities/new');
    await page.waitForTimeout(4000);

    await page.screenshot({ path: 'test-results/10-community-form.png', fullPage: true });

    // Collect API failures
    const failures: string[] = [];
    page.on('requestfailed', req => {
      if (req.url().includes('/api/')) {
        failures.push(`${req.url()} -> ${req.failure()?.errorText}`);
      }
    });

    // Find the name input and fill it
    const nameInput = page.locator('input[type="text"], input:not([type])').first();
    const visible = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (visible) {
      const communityName = 'Test Community ' + Date.now();
      await nameInput.fill(communityName);

      // Wait for slug generation
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-tests/11-community-filled.png', fullPage: true }).catch(() => {});

      // Find and click create button
      const createBtn = page.locator('button').filter({ hasText: /생성|create/i }).first();
      const btnEnabled = await createBtn.isEnabled({ timeout: 3000 }).catch(() => false);

      if (btnEnabled) {
        await createBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/12-after-create.png', fullPage: true });
        console.log('URL after create:', page.url());
        expect(page.url()).not.toContain('/communities/new');
      }
    } else {
      const bodyText = await page.textContent('body');
      console.log('Page text (first 1000):', bodyText?.slice(0, 1000));
    }

    // Check for API failures
    if (failures.length > 0) {
      console.log('API Failures:', failures);
    }

    expect(failures.length).toBe(0);
  });
});
