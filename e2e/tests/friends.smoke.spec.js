import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage, openAuthenticatedPage } from '../utils/auth';
import { createDevAuthSession } from '../utils/dev-auth';
test('shared profile flow can send and accept a friend request', async ({ browser, page, request, }) => {
    const requester = await createDevAuthSession(request, 'playwright-friend-requester');
    const addressee = await createDevAuthSession(request, 'playwright-friend-addressee');
    const sharedProfileLink = `zktalk://user/${encodeURIComponent(addressee.user.id)}?displayName=${encodeURIComponent(addressee.user.displayName)}&username=${encodeURIComponent(addressee.user.username)}`;
    await bootstrapAuthenticatedPage(page, requester.sessionToken, '/friends');
    await expect(page.getByTestId('friends-page')).toBeVisible();
    await page.getByTestId('friend-shared-profile-input').fill(sharedProfileLink);
    await page.getByTestId('friend-shared-profile-open-button').click();
    await expect(page).toHaveURL(/\/friends\?profileUserId=/);
    const sharedProfileCard = page.locator(`[data-testid="friend-shared-profile-card"][data-profile-user-id="${addressee.user.id}"]`);
    await expect(sharedProfileCard).toBeVisible();
    await expect
        .poll(async () => sharedProfileCard.getAttribute('data-friendship-status'))
        .toBe('none');
    await sharedProfileCard.getByTestId('friend-shared-profile-add-button').click();
    await expect
        .poll(async () => sharedProfileCard.getAttribute('data-friendship-status'))
        .toBe('pending');
    const { context: addresseeContext, page: addresseePage } = await openAuthenticatedPage(browser, addressee.sessionToken, '/friends');
    try {
        await expect(addresseePage.getByTestId('friends-page')).toBeVisible();
        await addresseePage.getByTestId('friend-tab-pending').click();
        const pendingRow = addresseePage.locator(`[data-testid="friend-row"][data-user-id="${requester.user.id}"][data-status="pending"][data-is-requester="false"]`);
        await expect(pendingRow).toBeVisible();
        await pendingRow.getByTestId('friend-row-accept-button').click();
        await expect(pendingRow).toBeHidden();
        await addresseePage.getByTestId('friend-tab-accepted').click();
        const acceptedRow = addresseePage.locator(`[data-testid="friend-row"][data-user-id="${requester.user.id}"][data-status="accepted"]`);
        await expect(acceptedRow).toBeVisible();
        await expect(acceptedRow.getByTestId('friend-row-message-button')).toBeVisible();
    }
    finally {
        await addresseeContext.close();
    }
    await page.reload();
    await page.getByTestId('community-rail-profile-link').waitFor({ state: 'visible' });
    const refreshedSharedProfileCard = page.locator(`[data-testid="friend-shared-profile-card"][data-profile-user-id="${addressee.user.id}"]`);
    await expect(refreshedSharedProfileCard).toBeVisible();
    await expect
        .poll(async () => refreshedSharedProfileCard.getAttribute('data-friendship-status'))
        .toBe('accepted');
    await expect(refreshedSharedProfileCard.getByTestId('friend-shared-profile-message-button')).toBeVisible();
});
