import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage, openAuthenticatedPage } from '../utils/auth';
import { createDevAuthSession } from '../utils/dev-auth';
const apiPort = Number(process.env.ZKTALK_API_PORT ?? '4000');
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
function getId(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const record = payload;
    if (typeof record.id === 'string') {
        return record.id;
    }
    const nestedConversation = record.conversation;
    if (nestedConversation && typeof nestedConversation === 'object') {
        const nestedRecord = nestedConversation;
        if (typeof nestedRecord.id === 'string') {
            return nestedRecord.id;
        }
    }
    return null;
}
async function apiJson(request, session, path, options) {
    const response = await request.fetch(`${apiBaseUrl}${path}`, {
        method: options?.method ?? 'GET',
        headers: {
            Authorization: `Bearer ${session.sessionToken}`,
        },
        data: options?.data,
        failOnStatusCode: false,
    });
    if (!response.ok()) {
        throw new Error(`${options?.method ?? 'GET'} ${path} failed with ${response.status()}`);
    }
    return (await response.json());
}
test('group DM can be promoted to a community and routes back to its source history', async ({ browser, page, request, }) => {
    const owner = await createDevAuthSession(request, 'playwright-dm-promote-owner');
    const memberB = await createDevAuthSession(request, 'playwright-dm-promote-member-b');
    const memberC = await createDevAuthSession(request, 'playwright-dm-promote-member-c');
    const groupName = `playwright-group-${Date.now()}`;
    const communityName = `Playwright Promote ${Date.now()}`;
    const channelName = `general-${Date.now()}`;
    const seededHistory = `playwright-promoted-history-${Date.now()}`;
    const createdConversation = await apiJson(request, owner, '/api/dm/conversations/group', {
        method: 'POST',
        data: {
            participantUserIds: [memberB.user.id, memberC.user.id],
            name: groupName,
        },
    });
    const conversationId = getId(createdConversation);
    expect(conversationId).toBeTruthy();
    await apiJson(request, owner, `/api/dm/conversations/${conversationId}/messages`, {
        method: 'POST',
        data: {
            bodyMarkdown: seededHistory,
        },
    });
    await bootstrapAuthenticatedPage(page, owner.sessionToken, `/dm/${conversationId}`);
    await expect(page.locator(`[data-testid="dm-conversation"][data-conversation-id="${conversationId}"]`)).toBeVisible();
    await expect(page.getByTestId('dm-promote-button')).toBeVisible();
    await page.getByTestId('dm-promote-button').click();
    await expect(page.getByTestId('dm-promote-dialog')).toBeVisible();
    await page.getByTestId('dm-promote-community-name-input').fill(communityName);
    await page.getByTestId('dm-promote-channel-name-input').fill(channelName);
    await page.getByTestId('dm-promote-submit-button').click();
    await expect(page).toHaveURL(/\/communities\/.+\/channels\/.+$/);
    await expect(page.getByTestId('channel-source-dm-bar')).toHaveAttribute('data-source-dm-id', conversationId);
    await expect(page.getByText(seededHistory)).toBeVisible();
    const sourceDmBar = page.getByTestId('channel-source-dm-link');
    await expect(sourceDmBar).toBeVisible();
    await sourceDmBar.click();
    const promotedDm = page.locator(`[data-testid="dm-conversation"][data-conversation-id="${conversationId}"][data-promoted="true"]`);
    await expect(promotedDm).toBeVisible();
    await expect(page.getByTestId('dm-promoted-banner')).toBeVisible();
    await expect(page.getByTestId('dm-promoted-composer')).toBeVisible();
    await expect(page.getByText(seededHistory)).toBeVisible();
    await expect(page.getByTestId('dm-send-button')).toHaveCount(0);
    const { context: memberContext, page: memberPage } = await openAuthenticatedPage(browser, memberB.sessionToken, '/dm');
    try {
        await expect(memberPage.getByTestId('dm-list')).toBeVisible();
        const promotedRow = memberPage.locator(`[data-testid="dm-list-row"][data-conversation-id="${conversationId}"][data-promoted="true"]`);
        await expect(promotedRow).toBeVisible();
        await promotedRow.getByTestId('dm-list-row-main-button').click();
        await expect(memberPage).toHaveURL(/\/communities\/.+\/channels\/.+$/);
        await expect(memberPage.getByTestId('channel-source-dm-bar')).toHaveAttribute('data-source-dm-id', conversationId);
        await memberPage.goto('/dm');
        await expect(memberPage.getByTestId('dm-list')).toBeVisible();
        const refreshedPromotedRow = memberPage.locator(`[data-testid="dm-list-row"][data-conversation-id="${conversationId}"][data-promoted="true"]`);
        await expect(refreshedPromotedRow).toBeVisible();
        await refreshedPromotedRow.getByTestId('dm-list-view-history-button').click();
        await expect(memberPage).toHaveURL(new RegExp(`/dm/${conversationId}$`));
        await expect(memberPage.getByTestId('dm-promoted-composer')).toBeVisible();
        await expect(memberPage.getByText(seededHistory)).toBeVisible();
    }
    finally {
        await memberContext.close();
    }
});
