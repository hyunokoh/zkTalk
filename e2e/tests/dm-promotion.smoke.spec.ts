import { chromium, expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { openAuthenticatedPage } from '../utils/auth';
import { createDevAuthSession, type DevAuthSession } from '../utils/dev-auth';

const apiPort = Number(process.env.ZKTALK_API_PORT ?? '4000');
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

function getId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.id === 'string') {
    return record.id;
  }

  const nestedConversation = record.conversation;
  if (nestedConversation && typeof nestedConversation === 'object') {
    const nestedRecord = nestedConversation as Record<string, unknown>;
    if (typeof nestedRecord.id === 'string') {
      return nestedRecord.id;
    }
  }

  return null;
}

async function apiJson<T>(
  request: APIRequestContext,
  session: DevAuthSession,
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    data?: unknown;
  },
): Promise<T> {
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

  return (await response.json()) as T;
}

async function waitForCondition(
  condition: () => Promise<boolean>,
  timeoutMs = 10_000,
  intervalMs = 250,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for expected condition');
}

async function waitForPromotedDmUi(
  page: Page,
  conversationId: string,
  apiBaseUrl: string,
  session: DevAuthSession,
) {
  let lastError: unknown;
  let lastSnapshot: unknown = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await expect
        .poll(
          async () => {
            const nodeResponse = await fetch(`${apiBaseUrl}/api/dm/conversations/${conversationId}`, {
              headers: {
                Authorization: `Bearer ${session.sessionToken}`,
                'x-zktalk-auth-mode': 'bearer',
              },
            });
            const nodeText = await nodeResponse.text();
            let nodePayload: Record<string, unknown> | null = null;
            try {
              nodePayload = nodeText ? JSON.parse(nodeText) as Record<string, unknown> : null;
            } catch {
              nodePayload = null;
            }

            const snapshot = await page.evaluate(async ({ targetConversationId, targetApiBaseUrl }) => {
              const sessionToken = window.sessionStorage.getItem('zktalk_session_token');
              const tokenPayload = (() => {
                if (!sessionToken) {
                  return null;
                }

                const parts = sessionToken.split('.');
                if (parts.length < 2) {
                  return null;
                }

                try {
                  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
                  const decoded = window.atob(normalized);
                  return JSON.parse(decoded) as Record<string, unknown>;
                } catch {
                  return null;
                }
              })();

              try {
                const meResponse = await fetch(`${targetApiBaseUrl}/api/me`, {
                  credentials: 'include',
                  headers: sessionToken
                    ? {
                        Authorization: `Bearer ${sessionToken}`,
                        'x-zktalk-auth-mode': 'bearer',
                      }
                    : undefined,
                });
                const meText = await meResponse.text();
                let mePayload: Record<string, unknown> | null = null;
                try {
                  mePayload = meText ? JSON.parse(meText) as Record<string, unknown> : null;
                } catch {
                  mePayload = null;
                }

                const dmListResponse = await fetch(`${targetApiBaseUrl}/api/dm/conversations`, {
                  credentials: 'include',
                  headers: sessionToken
                    ? {
                        Authorization: `Bearer ${sessionToken}`,
                        'x-zktalk-auth-mode': 'bearer',
                      }
                    : undefined,
                });
                const dmListText = await dmListResponse.text();
                let dmListPayload: Record<string, unknown> | null = null;
                try {
                  dmListPayload = dmListText ? JSON.parse(dmListText) as Record<string, unknown> : null;
                } catch {
                  dmListPayload = null;
                }
                const browserConversationVisible = Array.isArray(dmListPayload?.conversations)
                  ? dmListPayload.conversations.some((entry) => {
                    if (!entry || typeof entry !== 'object') {
                      return false;
                    }
                    const record = entry as Record<string, unknown>;
                    const conversation = record.conversation;
                    return conversation
                      && typeof conversation === 'object'
                      && (conversation as Record<string, unknown>).id === targetConversationId;
                  })
                  : false;

                const response = await fetch(
                  `${targetApiBaseUrl}/api/dm/conversations/${targetConversationId}`,
                  {
                    credentials: 'include',
                    headers: sessionToken
                      ? {
                          Authorization: `Bearer ${sessionToken}`,
                          'x-zktalk-auth-mode': 'bearer',
                        }
                      : undefined,
                  },
                );
                const rawText = await response.text();
                let payload: Record<string, unknown> | null = null;
                try {
                  payload = rawText ? JSON.parse(rawText) as Record<string, unknown> : null;
                } catch {
                  payload = null;
                }

                const promotedCommunityId =
                  payload?.promotedCommunity
                  && typeof payload.promotedCommunity === 'object'
                  && typeof (payload.promotedCommunity as Record<string, unknown>).id === 'string'
                    ? (payload.promotedCommunity as Record<string, unknown>).id as string
                    : null;
                const promotedChannelId =
                  payload?.promotedChannel
                  && typeof payload.promotedChannel === 'object'
                  && typeof (payload.promotedChannel as Record<string, unknown>).id === 'string'
                    ? (payload.promotedChannel as Record<string, unknown>).id as string
                    : null;

                return {
                  bodySnippet: rawText.slice(0, 240),
                  browserConversationVisible,
                  dmListBodySnippet: dmListText.slice(0, 200),
                  dmListStatus: dmListResponse.status,
                  hasSessionToken: !!sessionToken,
                  meBodySnippet: meText.slice(0, 160),
                  meStatus: meResponse.status,
                  promotedChannelId,
                  promotedCommunityId,
                  ready: !!(promotedCommunityId && promotedChannelId),
                  status: response.status,
                  tokenEmail:
                    tokenPayload && typeof tokenPayload.email === 'string' ? tokenPayload.email : null,
                  meUserId:
                    mePayload?.user
                    && typeof mePayload.user === 'object'
                    && typeof (mePayload.user as Record<string, unknown>).id === 'string'
                      ? (mePayload.user as Record<string, unknown>).id as string
                      : null,
                  tokenSubject:
                    tokenPayload && typeof tokenPayload.sub === 'string' ? tokenPayload.sub : null,
                };
              } catch (error) {
                return {
                  bodySnippet: error instanceof Error ? error.message : String(error),
                  browserConversationVisible: false,
                  dmListBodySnippet: null,
                  dmListStatus: -1,
                  hasSessionToken: !!sessionToken,
                  meBodySnippet: null,
                  meStatus: -1,
                  promotedChannelId: null,
                  promotedCommunityId: null,
                  ready: false,
                  status: -1,
                  tokenEmail: null,
                  meUserId: null,
                  tokenSubject:
                    tokenPayload && typeof tokenPayload.sub === 'string' ? tokenPayload.sub : null,
                };
              }
            }, {
              targetConversationId: conversationId,
              targetApiBaseUrl: apiBaseUrl,
            });

            lastSnapshot = {
              ...snapshot,
              nodeBodySnippet: nodeText.slice(0, 240),
              nodePromotedReady: !!(
                nodePayload?.promotedCommunity
                && nodePayload?.promotedChannel
              ),
              nodeStatus: nodeResponse.status,
            };
            return lastSnapshot;
          },
          { timeout: 5_000 },
        )
        .toMatchObject({ ready: true });
      await expect(page).toHaveURL(new RegExp(`/dm/${conversationId}$`));
      await expect(
        page.locator(`[data-testid="dm-conversation"][data-conversation-id="${conversationId}"][data-promoted="true"]`),
      ).toBeVisible({ timeout: 5_000 });
      await expect(page.getByTestId('dm-promoted-banner')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByTestId('dm-promoted-composer')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByTestId('dm-send-button')).toHaveCount(0, { timeout: 5_000 });
      return;
    } catch (error) {
      lastError = error;
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`${lastError.message}\nLast promoted snapshot: ${JSON.stringify(lastSnapshot)}`);
  }

  throw new Error(`Promoted DM UI did not become visible\nLast promoted snapshot: ${JSON.stringify(lastSnapshot)}`);
}

test('group DM can be promoted to a community and becomes read-only for participants', async ({
  request,
}) => {
  const owner = await createDevAuthSession(request, 'playwright-dm-promote-owner');
  const memberB = await createDevAuthSession(request, 'playwright-dm-promote-member-b');
  const memberC = await createDevAuthSession(request, 'playwright-dm-promote-member-c');

  const groupName = `playwright-group-${Date.now()}`;
  const communityName = `Playwright Promote ${Date.now()}`;
  const channelName = `general-${Date.now()}`;

  const createdConversation = await apiJson<Record<string, unknown>>(
    request,
    owner,
    '/api/dm/conversations/group',
    {
      method: 'POST',
      data: {
        participantUserIds: [memberB.user.id, memberC.user.id],
        name: groupName,
      },
    },
  );
  const conversationId = getId(createdConversation);
  expect(conversationId).toBeTruthy();

  await waitForCondition(async () => {
    const list = await apiJson<{ conversations?: Array<{ conversation?: { id?: string } }> }>(
      request,
      owner,
      '/api/dm/conversations',
    );
    return (list.conversations ?? []).some((entry) => entry.conversation?.id === conversationId);
  });

  const promoted = await apiJson<{
    community: { id: string; slug: string; name: string };
    channel: { id: string; name: string };
  }>(
    request,
    owner,
    `/api/dm/conversations/${conversationId}/promote`,
    {
      method: 'POST',
      data: {
        communityName,
        channelName,
      },
    },
  );

  const ownerPromotedDetail = await apiJson<Record<string, unknown>>(
    request,
    owner,
    `/api/dm/conversations/${conversationId}`,
  );
  expect(
    typeof ownerPromotedDetail.promotedCommunity === 'object'
      && ownerPromotedDetail.promotedCommunity !== null
      && typeof (ownerPromotedDetail.promotedCommunity as Record<string, unknown>).id === 'string',
  ).toBe(true);
  expect(
    typeof ownerPromotedDetail.promotedChannel === 'object'
      && ownerPromotedDetail.promotedChannel !== null
      && typeof (ownerPromotedDetail.promotedChannel as Record<string, unknown>).id === 'string',
  ).toBe(true);

  const localBrowser = await chromium.launch();

  try {
    const { context: ownerContext, page: ownerPage } = await openAuthenticatedPage(
      localBrowser,
      owner.sessionToken,
      `/dm/${conversationId}`,
    );

    try {
      await ownerPage.waitForResponse(
        (response) =>
          response.url().includes(`/api/dm/conversations/${conversationId}/messages`)
          && response.request().method() === 'GET',
        { timeout: 10_000 },
      ).catch(() => {});
      await waitForPromotedDmUi(ownerPage, conversationId!, apiBaseUrl, owner);
    } finally {
      await ownerContext.close();
    }

    const { context: memberContext, page: memberPage } = await openAuthenticatedPage(
      localBrowser,
      memberB.sessionToken,
      `/dm/${conversationId}`,
    );

    try {
      await memberPage.waitForResponse(
        (response) =>
          response.url().includes('/api/dm/conversations') && response.request().method() === 'GET',
        { timeout: 10_000 },
      ).catch(() => {});
      await waitForPromotedDmUi(memberPage, conversationId!, apiBaseUrl, memberB);
    } finally {
      await memberContext.close();
    }
  } finally {
    await localBrowser.close();
  }
});
