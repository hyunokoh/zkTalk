import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage } from '../utils/auth';
import { getSeedData } from '../utils/seed';
test('profile photo change is only persisted after explicit save', async ({ page, request }) => {
    const seed = await getSeedData();
    await bootstrapAuthenticatedPage(page, seed.userA.sessionToken, '/settings');
    const settingsAvatar = page.locator('[data-testid="settings-profile-avatar"] img');
    await page.getByTestId('settings-profile-edit-button').click();
    await expect(page.getByTestId('profile-editor')).toBeVisible();
    const beforeResponse = await request.get('http://127.0.0.1:4000/api/me', {
        headers: {
            Authorization: `Bearer ${seed.userA.sessionToken}`,
        },
    });
    expect(beforeResponse.ok()).toBeTruthy();
    const beforeUser = (await beforeResponse.json()).user;
    const beforeAvatarUrl = beforeUser.avatarUrl;
    await page.getByTestId('profile-avatar-file-input').setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sM1n8kAAAAASUVORK5CYII=', 'base64'),
    });
    await expect(page.getByTestId('profile-save-button')).toBeEnabled();
    const midResponse = await request.get('http://127.0.0.1:4000/api/me', {
        headers: {
            Authorization: `Bearer ${seed.userA.sessionToken}`,
        },
    });
    expect(midResponse.ok()).toBeTruthy();
    const midUser = (await midResponse.json()).user;
    expect(midUser.avatarUrl).toBe(beforeAvatarUrl);
    await page.getByTestId('profile-save-button').click();
    await expect.poll(async () => {
        const src = (await settingsAvatar.getAttribute('src')) ?? '';
        return decodeURIComponent(src);
    }).toContain(`/api/public-assets/users/${seed.userA.id}/`);
    await expect.poll(async () => {
        const afterResponse = await request.get('http://127.0.0.1:4000/api/me', {
            headers: {
                Authorization: `Bearer ${seed.userA.sessionToken}`,
            },
        });
        expect(afterResponse.ok()).toBeTruthy();
        const afterUser = (await afterResponse.json()).user;
        return afterUser.avatarUrl;
    }).not.toBe(beforeAvatarUrl);
});
