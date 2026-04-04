import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { bootstrapAuthenticatedPage, openAuthenticatedPage } from '../utils/auth';
import { createDevAuthSession, type DevAuthSession } from '../utils/dev-auth';
import { getSeedData } from '../utils/seed';

const apiPort = Number(process.env.ZKTALK_API_PORT ?? '4000');
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

async function authedPost(
  request: APIRequestContext,
  path: string,
  token: string,
  data?: unknown,
) {
  const response = await request.post(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  });
  expect(response.ok(), `${path} should succeed`).toBeTruthy();
  return response;
}

async function joinPublicCommunity(
  request: APIRequestContext,
  communityId: string,
  token: string,
) {
  await authedPost(request, `/api/communities/${communityId}/join`, token);
}

async function waitForMemberRow(page: Page, userId: string) {
  const row = page.locator(`[data-testid="member-row"][data-user-id="${userId}"]`);
  await expect(row).toBeVisible();
  return row;
}

async function assignRole(page: Page, userId: string, role: 'moderator' | 'admin') {
  const row = await waitForMemberRow(page, userId);
  await row.getByTestId('member-role-select').selectOption(role);
  await expect(row).toHaveAttribute('data-member-role', role);
}

async function moderateMember(
  page: Page,
  userId: string,
  action: 'mute' | 'kick' | 'ban',
  reason: string,
) {
  const row = await waitForMemberRow(page, userId);
  await row.getByTestId('member-action-trigger').click();
  await expect(page.getByTestId('member-action-menu')).toBeVisible();
  await page.getByTestId(`member-action-${action}-button`).click();

  const dialog = page.locator(
    `[data-testid="member-action-confirm-dialog"][data-action-type="${action}"]`,
  );
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('member-action-reason-input').fill(reason);
  await dialog.getByTestId('member-action-confirm-button').click();

  await expect(row).toBeHidden();
}

async function createAndJoin(
  request: APIRequestContext,
  label: string,
  communityId: string,
): Promise<DevAuthSession> {
  const session = await createDevAuthSession(request, label);
  await joinPublicCommunity(request, communityId, session.sessionToken);
  return session;
}

test('member moderation keeps moderator/admin boundaries clear in UI', async ({
  browser,
  page,
  request,
}) => {
  const seed = await getSeedData();
  const timestamp = Date.now();

  const moderatorUser = await createAndJoin(
    request,
    `p2-moderator-${timestamp}`,
    seed.communityId,
  );
  const adminUser = await createAndJoin(
    request,
    `p2-admin-${timestamp}`,
    seed.communityId,
  );
  const mutedUser = await createAndJoin(
    request,
    `p2-muted-${timestamp}`,
    seed.communityId,
  );
  const kickedUser = await createAndJoin(
    request,
    `p2-kicked-${timestamp}`,
    seed.communityId,
  );
  const bannedUser = await createAndJoin(
    request,
    `p2-banned-${timestamp}`,
    seed.communityId,
  );

  await bootstrapAuthenticatedPage(
    page,
    seed.userA.sessionToken,
    `/communities/${seed.communitySlug}/settings/members`,
  );
  await expect(page.getByTestId('community-members-page')).toBeVisible();

  await assignRole(page, moderatorUser.user.id, 'moderator');
  await assignRole(page, adminUser.user.id, 'admin');

  const {
    context: moderatorContext,
    page: moderatorPage,
  } = await openAuthenticatedPage(
    browser,
    moderatorUser.sessionToken,
    `/communities/${seed.communitySlug}/moderation/reports`,
  );

  const {
    context: adminContext,
    page: adminPage,
  } = await openAuthenticatedPage(
    browser,
    adminUser.sessionToken,
    `/communities/${seed.communitySlug}/settings/members`,
  );

  try {
    await expect(moderatorPage.getByTestId('moderation-reports-page')).toBeVisible();
    await expect(moderatorPage.getByTestId('moderation-nav-audit-log')).toHaveCount(0);

    await moderatorPage.goto(`/communities/${seed.communitySlug}/settings/members`);
    await expect(moderatorPage.getByTestId('community-members-page')).toBeVisible();
    await expect(
      moderatorPage
        .locator(`[data-testid="member-row"][data-user-id="${bannedUser.user.id}"]`)
        .getByTestId('member-role-select'),
    ).toHaveCount(0);

    const muteReason = `playwright-member-muted-${timestamp}`;
    await moderateMember(moderatorPage, mutedUser.user.id, 'mute', muteReason);

    await moderatorPage.goto(`/communities/${seed.communitySlug}/moderation/audit-log`);
    await expect(moderatorPage.getByTestId('moderation-audit-log-access-denied')).toBeVisible();

    await expect(adminPage.getByTestId('community-members-page')).toBeVisible();
    await expect(
      adminPage
        .locator(`[data-testid="member-row"][data-user-id="${bannedUser.user.id}"]`)
        .getByTestId('member-role-select'),
    ).toBeVisible();

    const kickReason = `playwright-member-kicked-${timestamp}`;
    await moderateMember(adminPage, kickedUser.user.id, 'kick', kickReason);

    const banReason = `playwright-member-banned-${timestamp}`;
    await moderateMember(adminPage, bannedUser.user.id, 'ban', banReason);

    await adminPage.goto(`/communities/${seed.communitySlug}/moderation/audit-log`);
    await expect(adminPage.getByTestId('moderation-audit-log-page')).toBeVisible();
    await expect(
      adminPage
        .locator('[data-testid="audit-log-row"][data-action-type="member_muted"]')
        .filter({ hasText: muteReason }),
    ).toBeVisible();
    await expect(
      adminPage
        .locator('[data-testid="audit-log-row"][data-action-type="member_kicked"]')
        .filter({ hasText: kickReason }),
    ).toBeVisible();
    await expect(
      adminPage
        .locator('[data-testid="audit-log-row"][data-action-type="member_banned"]')
        .filter({ hasText: banReason }),
    ).toBeVisible();
  } finally {
    await moderatorContext.close();
    await adminContext.close();
  }
});
