import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage, openAuthenticatedPage } from '../utils/auth';
import { getSeedData } from '../utils/seed';
async function reportChannelMessage(page, body, reasonCode) {
    const row = page.getByTestId('message-row').filter({ hasText: body }).first();
    await expect(row).toBeVisible();
    await row.hover();
    await row.getByTestId('message-report-button').click();
    const modal = page.getByTestId('report-modal');
    await expect(modal).toBeVisible();
    await modal
        .locator(`[data-testid="report-reason-option"][data-reason-code="${reasonCode}"]`)
        .click();
    await modal.getByTestId('report-submit-button').click();
    await expect(page.getByTestId('report-success-state')).toBeVisible();
    await expect(page.getByTestId('report-modal')).toBeHidden();
}
test('channel report can be created, resolved, dismissed, and logged in audit history', async ({ browser, page, }) => {
    const seed = await getSeedData();
    const firstBody = `playwright-report-resolve-${Date.now()}`;
    const secondBody = `playwright-report-dismiss-${Date.now()}`;
    await bootstrapAuthenticatedPage(page, seed.userA.sessionToken, `/communities/${seed.communitySlug}/channels/${seed.channelId}`);
    await page.getByTestId('channel-composer-input').fill(firstBody);
    await page.getByTestId('channel-composer-send-button').click();
    const firstRow = page.getByTestId('message-row').filter({ hasText: firstBody }).first();
    await expect(firstRow).toBeVisible();
    const firstMessageId = await firstRow.getAttribute('data-message-id');
    expect(firstMessageId).toBeTruthy();
    await page.getByTestId('channel-composer-input').fill(secondBody);
    await page.getByTestId('channel-composer-send-button').click();
    const secondRow = page.getByTestId('message-row').filter({ hasText: secondBody }).first();
    await expect(secondRow).toBeVisible();
    const secondMessageId = await secondRow.getAttribute('data-message-id');
    expect(secondMessageId).toBeTruthy();
    const { context: reporterContext, page: reporterPage } = await openAuthenticatedPage(browser, seed.userC.sessionToken, `/communities/${seed.communitySlug}/channels/${seed.channelId}`);
    try {
        await reportChannelMessage(reporterPage, firstBody, 'spam');
        await reportChannelMessage(reporterPage, secondBody, 'harassment');
    }
    finally {
        await reporterContext.close();
    }
    await page.goto(`/communities/${seed.communitySlug}/moderation/reports`);
    await expect(page.getByTestId('moderation-reports-page')).toBeVisible();
    const firstReportCard = page.locator(`[data-testid="report-card"][data-message-id="${firstMessageId}"][data-report-status="open"]`);
    await expect(firstReportCard).toBeVisible();
    await firstReportCard.getByTestId('report-resolve-button').click();
    await expect(firstReportCard).toBeHidden();
    const secondReportCard = page.locator(`[data-testid="report-card"][data-message-id="${secondMessageId}"][data-report-status="open"]`);
    await expect(secondReportCard).toBeVisible();
    await secondReportCard.getByTestId('report-dismiss-button').click();
    await expect(secondReportCard).toBeHidden();
    await page.getByTestId('moderation-reports-filter-all').click();
    await expect(page.locator(`[data-testid="report-card"][data-message-id="${firstMessageId}"][data-report-status="resolved"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="report-card"][data-message-id="${secondMessageId}"][data-report-status="dismissed"]`)).toBeVisible();
    await page.goto(`/communities/${seed.communitySlug}/moderation/audit-log`);
    await expect(page.getByTestId('moderation-audit-log-page')).toBeVisible();
    await expect(page.locator('[data-testid="audit-log-row"][data-action-type="report_created"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="audit-log-row"][data-action-type="report_resolved"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="audit-log-row"][data-action-type="report_dismissed"]').first()).toBeVisible();
});
