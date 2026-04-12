import { expect, test, type APIRequestContext } from '@playwright/test';
import { bootstrapAuthenticatedPage } from '../utils/auth';
import { getSeedData } from '../utils/seed';

const apiPort = Number(process.env.ZKTALK_API_PORT ?? '4000');
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

async function apiJson<T>(
  request: APIRequestContext,
  sessionToken: string,
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    data?: unknown;
  },
): Promise<T> {
  const response = await request.fetch(`${apiBaseUrl}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    data: options?.data,
    failOnStatusCode: false,
  });

  if (!response.ok()) {
    throw new Error(`${options?.method ?? 'GET'} ${path} failed with ${response.status()}`);
  }

  return (await response.json()) as T;
}

test('channel report can be created, resolved, dismissed, and logged in audit history', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);

  const seed = await getSeedData();
  const firstBody = `playwright-report-resolve-${Date.now()}`;
  const secondBody = `playwright-report-dismiss-${Date.now()}`;

  const createdFirst = await apiJson<{ message: { id: string } }>(
    request,
    seed.userA.sessionToken,
    `/api/channels/${seed.channelId}/messages`,
    {
      method: 'POST',
      data: {
        bodyMarkdown: firstBody,
      },
    },
  );

  const createdSecond = await apiJson<{ message: { id: string } }>(
    request,
    seed.userA.sessionToken,
    `/api/channels/${seed.channelId}/messages`,
    {
      method: 'POST',
      data: {
        bodyMarkdown: secondBody,
      },
    },
  );

  const firstMessageId = createdFirst.message.id;
  const secondMessageId = createdSecond.message.id;

  await apiJson(
    request,
    seed.userC.sessionToken,
    '/api/reports',
    {
      method: 'POST',
      data: {
        communityId: seed.communityId,
        messageId: firstMessageId,
        reasonCode: 'spam',
      },
    },
  );

  await apiJson(
    request,
    seed.userC.sessionToken,
    '/api/reports',
    {
      method: 'POST',
      data: {
        communityId: seed.communityId,
        messageId: secondMessageId,
        reasonCode: 'harassment',
      },
    },
  );

  await bootstrapAuthenticatedPage(
    page,
    seed.userA.sessionToken,
    `/communities/${seed.communitySlug}/moderation/reports`,
  );
  await expect(page.getByTestId('moderation-reports-page')).toBeVisible();

  const firstReportCard = page.locator(
    `[data-testid="report-card"][data-message-id="${firstMessageId}"][data-report-status="open"]`,
  );
  await expect(firstReportCard).toBeVisible();
  await firstReportCard.getByTestId('report-resolve-button').click();
  await expect(firstReportCard).toBeHidden();

  const secondReportCard = page.locator(
    `[data-testid="report-card"][data-message-id="${secondMessageId}"][data-report-status="open"]`,
  );
  await expect(secondReportCard).toBeVisible();
  await secondReportCard.getByTestId('report-dismiss-button').click();
  await expect(secondReportCard).toBeHidden();

  await page.getByTestId('moderation-reports-filter-all').click();
  await expect(
    page.locator(
      `[data-testid="report-card"][data-message-id="${firstMessageId}"][data-report-status="resolved"]`,
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      `[data-testid="report-card"][data-message-id="${secondMessageId}"][data-report-status="dismissed"]`,
    ),
  ).toBeVisible();

  await page.goto(`/communities/${seed.communitySlug}/moderation/audit-log`);
  await expect(page.getByTestId('moderation-audit-log-page')).toBeVisible();

  await expect(
    page.locator('[data-testid="audit-log-row"][data-action-type="report_created"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="audit-log-row"][data-action-type="report_resolved"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="audit-log-row"][data-action-type="report_dismissed"]').first(),
  ).toBeVisible();
});
