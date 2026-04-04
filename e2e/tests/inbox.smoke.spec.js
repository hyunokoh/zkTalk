import { expect, test } from '@playwright/test';
import { setSessionToken } from '../utils/auth';
import { getSeedData } from '../utils/seed';
test('mention inbox item opens the seeded channel target', async ({ page }) => {
    const seed = await getSeedData();
    await setSessionToken(page, seed.userB.sessionToken);
    await page.goto('/inbox');
    await expect(page.getByTestId('inbox-page')).toBeVisible();
    const mentionItem = page.locator('[data-testid="inbox-item"][data-inbox-type="mention"]').first();
    await expect(mentionItem).toBeVisible();
    await mentionItem.click();
    await expect(page).toHaveURL(new RegExp(`/communities/${seed.communitySlug}/channels/${seed.channelId}`));
});
