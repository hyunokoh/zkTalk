import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('debug: page rendering', () => {
  test('check what is actually rendered', async ({ page }) => {
    const sessionToken = fs.readFileSync('/tmp/zktalk-session-token.txt', 'utf8').trim();

    // Login
    await page.goto('http://127.0.0.1:3000/home');
    await page.waitForTimeout(1000);
    // Use correct key name: zktalk_session_token (underscore, not colon)
    await page.evaluate((token) => {
      localStorage.setItem('zktalk_session_token', token);
    }, sessionToken);

    // Collect all network activity
    const requests: { url: string; status: number; method: string }[] = [];
    const failures: { url: string; error: string }[] = [];

    page.on('response', resp => {
      if (resp.url().includes('/api/')) {
        requests.push({
          url: resp.url(),
          status: resp.status(),
          method: resp.request().method(),
        });
      }
    });

    page.on('requestfailed', req => {
      if (req.url().includes('/api/')) {
        failures.push({
          url: req.url(),
          error: req.failure()?.errorText || 'unknown',
        });
      }
    });

    // Reload to apply token
    await page.reload();
    await page.waitForTimeout(5000);

    console.log('=== HOME PAGE ===');
    console.log('URL:', page.url());

    const homeText = await page.evaluate(() => {
      const elements = document.body.querySelectorAll('*');
      const texts: string[] = [];
      for (const el of elements) {
        if (el.children.length === 0 && el.textContent?.trim()) {
          const text = el.textContent.trim();
          if (text.length > 2 && text.length < 300) {
            texts.push(text);
          }
        }
      }
      return texts;
    });

    console.log('Home rendered:');
    homeText.forEach((t, i) => console.log(`  [${i}] ${t}`));

    await page.screenshot({ path: 'test-results/30-debug-home.png', fullPage: true });

    // Go to communities/new
    await page.goto('http://127.0.0.1:3000/communities/new');
    await page.waitForTimeout(5000);

    console.log('\n=== COMMUNITY PAGE ===');
    console.log('URL:', page.url());

    const newText = await page.evaluate(() => {
      const elements = document.body.querySelectorAll('*');
      const texts: string[] = [];
      for (const el of elements) {
        if (el.children.length === 0 && el.textContent?.trim()) {
          const text = el.textContent.trim();
          if (text.length > 2 && text.length < 300 && !text.includes('self.__next_f')) {
            texts.push(text);
          }
        }
      }
      return texts;
    });

    console.log('Community rendered:');
    newText.forEach((t, i) => console.log(`  [${i}] ${t}`));

    console.log('\nAPI Requests:');
    requests.forEach(r => console.log(`  ${r.method} ${r.url} => ${r.status}`));

    console.log('\nAPI Failures:');
    failures.forEach(f => console.log(`  ${f.url} => ${f.error}`));

    await page.screenshot({ path: 'test-results/31-debug-community-new.png', fullPage: true });

    // Also check discover
    await page.goto('http://127.0.0.1:3000/discover');
    await page.waitForTimeout(5000);
    console.log('\n=== DISCOVER PAGE ===');
    const discText = await page.evaluate(() => {
      const elements = document.body.querySelectorAll('*');
      const texts: string[] = [];
      for (const el of elements) {
        if (el.children.length === 0 && el.textContent?.trim()) {
          const text = el.textContent.trim();
          if (text.length > 2 && text.length < 300 && !text.includes('self.__next_f')) {
            texts.push(text);
          }
        }
      }
      return texts;
    });
    console.log('Discover rendered:');
    discText.forEach((t, i) => console.log(`  [${i}] ${t}`));
    await page.screenshot({ path: 'test-results/32-debug-discover.png', fullPage: true });

    fs.writeFileSync('test-results/debug-data.json', JSON.stringify({
      requests,
      failures,
      homeText,
      newText,
      discText,
    }, null, 2));
  });
});
