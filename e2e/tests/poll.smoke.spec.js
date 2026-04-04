import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage } from '../utils/auth';
import { getSeedData } from '../utils/seed';
test('channel poll can be created and toggled by voting', async ({ page }) => {
    const seed = await getSeedData();
    const question = `playwright-poll-question-${Date.now()}`;
    const optionA = `playwright-poll-option-a-${Date.now()}`;
    const optionB = `playwright-poll-option-b-${Date.now()}`;
    await bootstrapAuthenticatedPage(page, seed.userA.sessionToken, `/communities/${seed.communitySlug}/channels/${seed.channelId}`);
    await page.getByTestId('channel-composer-more-button').click();
    await expect(page.getByTestId('channel-composer-more-menu')).toBeVisible();
    await expect(page.getByTestId('channel-composer-poll-button')).toBeVisible();
    await page.getByTestId('channel-composer-poll-button').click();
    await expect(page.getByTestId('poll-creator-modal')).toBeVisible();
    await page.getByTestId('poll-creator-question-input').fill(question);
    await page.getByTestId('poll-creator-option-input-0').fill(optionA);
    await page.getByTestId('poll-creator-option-input-1').fill(optionB);
    await page.getByTestId('poll-creator-submit-button').click();
    const pollCard = page.getByTestId('poll-card').filter({ hasText: question }).first();
    await expect(pollCard).toBeVisible();
    await expect
        .poll(async () => pollCard.getByTestId('poll-total-votes').getAttribute('data-total-votes'))
        .toBe('0');
    const optionButton = pollCard
        .getByTestId('poll-option-button')
        .filter({ hasText: optionA })
        .first();
    await optionButton.click();
    await expect
        .poll(async () => optionButton.getAttribute('data-voted'))
        .toBe('true');
    await expect
        .poll(async () => pollCard.getByTestId('poll-total-votes').getAttribute('data-total-votes'))
        .toBe('1');
    await optionButton.click();
    await expect
        .poll(async () => optionButton.getAttribute('data-voted'))
        .toBe('false');
    await expect
        .poll(async () => pollCard.getByTestId('poll-total-votes').getAttribute('data-total-votes'))
        .toBe('0');
});
