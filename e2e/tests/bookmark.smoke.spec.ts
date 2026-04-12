import { expect, test } from '@playwright/test';
import { setSessionToken } from '../utils/auth';
import { getSeedData } from '../utils/seed';

test('bookmarked message can be reopened from the bookmarks page', async ({ page }) => {
  const seed = await getSeedData();
  const body = `playwright-bookmark-body-${Date.now()}`;

  await setSessionToken(page, seed.userA.sessionToken);
  await page.goto(`/communities/${seed.communitySlug}/channels/${seed.channelId}`);
  await expect(page.getByTestId('channel-header-title')).toBeVisible();
  await expect(page.getByTestId('channel-composer-input')).toBeVisible();

  await page.getByTestId('channel-composer-input').fill(body);
  await page.getByTestId('channel-composer-send-button').click();

  const row = page.getByTestId('message-row').filter({ hasText: body }).first();
  await expect(row).toBeVisible();
  const messageId = await row.getAttribute('data-message-id');
  expect(messageId).toBeTruthy();

  await row.hover();
  await row.getByTestId('message-bookmark-button').click();

  await page.goto('/bookmarks');
  await expect(page.getByTestId('bookmarks-page')).toBeVisible();

  const bookmarkItem = page.getByTestId('bookmark-item').filter({ hasText: body }).first();
  await expect(bookmarkItem).toBeVisible();
  await bookmarkItem.click();

  await expect(page).toHaveURL(
    new RegExp(`/communities/${seed.communitySlug}/channels/${seed.channelId}#${messageId}`),
  );
  await expect(page.getByTestId('message-row').filter({ hasText: body }).first()).toBeVisible();
});
