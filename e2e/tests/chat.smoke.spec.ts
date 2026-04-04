import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage, openAuthenticatedPage } from '../utils/auth';
import { getSeedData } from '../utils/seed';
import type { APIRequestContext, APIResponse } from '@playwright/test';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sM1n8kAAAAASUVORK5CYII=',
  'base64',
);
const TINY_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAPEA8QDw8PEA8PDw8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OFw8QFS0dFR0rLS0tKy0rLSstLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tK//AABEIAAEAAgMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAB2gD/xAAVEAEBAAAAAAAAAAAAAAAAAAABAP/aAAgBAQABBQJX/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAwEBPwEf/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPwEf/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQAGPwJf/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQABPyFf/9k=',
  'base64',
);
const TINY_JSON = Buffer.from('{"desktop":"attachment","ok":true}\n', 'utf8');
const LARGE_ATTACHMENT_SIZE = 12 * 1024 * 1024;
const apiBaseUrl =
  process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${process.env.ZKTALK_API_PORT ?? '4000'}`;

async function openChannelComposerAction(page: Parameters<typeof bootstrapAuthenticatedPage>[0], testId: string) {
  await page.getByTestId('channel-composer-more-button').click();
  await expect(page.getByTestId('channel-composer-more-menu')).toBeVisible();
  await page.getByTestId(testId).click();
}

async function dispatchFileDrop(
  page: Parameters<typeof bootstrapAuthenticatedPage>[0],
  testId: string,
  files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
) {
  const dataTransfer = await page.evaluateHandle((payload) => {
    const transfer = new DataTransfer();
    payload.forEach((file) => {
      const bytes = Uint8Array.from(file.bytes);
      transfer.items.add(new File([bytes], file.name, { type: file.mimeType }));
    });
    return transfer;
  }, files.map((file) => ({
    name: file.name,
    mimeType: file.mimeType,
    bytes: Array.from(file.buffer),
  })));

  await page.getByTestId(testId).dispatchEvent('drop', {
    dataTransfer,
  });
}

function createPdfBuffer(size: number): Buffer {
  const header = Buffer.from('%PDF-1.4\n%zkTalk\n1 0 obj\n<< /Type /Catalog >>\nendobj\n', 'utf8');
  const footer = Buffer.from('\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'utf8');
  const fillerSize = Math.max(size - header.length - footer.length, 0);

  return Buffer.concat([header, Buffer.alloc(fillerSize, 0x20), footer], size);
}

async function apiRequestWithRetry(
  request: APIRequestContext,
  url: string,
  options: {
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    data?: unknown;
  },
  attempts = 4,
): Promise<APIResponse> {
  let response: APIResponse | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    response = await request.fetch(url, {
      failOnStatusCode: false,
      ...options,
    });

    if (response.status() !== 429 || attempt === attempts - 1) {
      return response;
    }

    const headers = response.headers();
    const resetSeconds = Number(headers['x-ratelimit-reset'] ?? '');
    const retryAfterSeconds = Number(headers['retry-after'] ?? '');
    const delayMs = Number.isFinite(resetSeconds) && resetSeconds > 0
      ? (resetSeconds + 1) * 1000
      : Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 1_500 * (attempt + 1);

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return response as APIResponse;
}

test.describe('channel smoke', () => {
  test('home navigation opens the seeded community channel', async ({ page }) => {
    const seed = await getSeedData();
    await bootstrapAuthenticatedPage(page, seed.userA.sessionToken);
    await page.getByTestId(`home-community-link-${seed.communitySlug}`).click();
    await page.getByTestId(`channel-sidebar-link-${seed.channelId}`).click();

    await expect(page).toHaveURL(
      new RegExp(`/communities/${seed.communitySlug}/channels/${seed.channelId}`),
    );
    await expect(page.getByRole('heading', { name: seed.channelName })).toBeVisible();
  });

  test('channel message can be sent, edited, threaded, and deleted', async ({ page, request }) => {
    const seed = await getSeedData();
    const messageText = `playwright-channel-${Date.now()}`;
    const editedMessageText = `${messageText} edited`;
    const threadReplyText = `playwright-thread-${Date.now()}`;

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/communities/${seed.communitySlug}/channels/${seed.channelId}`,
    );

    await page.getByTestId('channel-composer-input').fill(messageText);
    await page.getByTestId('channel-composer-send-button').click();

    const row = page.getByTestId('message-row').filter({ hasText: messageText }).first();
    await expect(row).toBeVisible();

    const messageId = await row.getAttribute('data-message-id');
    expect(messageId).toBeTruthy();

    await row.hover();
    await row.getByTestId('message-edit-button').click();
    await row.getByTestId('message-edit-input').fill(editedMessageText);
    await row.getByTestId('message-edit-save-button').click();
    await expect(row).toContainText(editedMessageText);

    await row.hover();
    await row.getByTestId('message-thread-button').click();
    await expect(page.getByTestId('thread-panel')).toBeVisible();
    await page.getByTestId('thread-composer-input').fill(threadReplyText);
    await page.getByTestId('thread-composer-send-button').click();
    await expect(page.getByTestId('thread-panel')).toContainText(threadReplyText);

    await row.hover();
    await row.getByTestId('message-delete-button').click();

    await expect.poll(async () => {
      const response = await request.get(`${apiBaseUrl}/api/messages/${messageId}`, {
        headers: {
          Authorization: `Bearer ${seed.userA.sessionToken}`,
        },
      });
      expect(response.ok()).toBeTruthy();
      const payload = await response.json();
      return payload.message?.isDeleted;
    }).toBe(true);
  });

  test('channel composer sends jpg attachments without showing the attachment placeholder text', async ({ page }) => {
    const seed = await getSeedData();
    const fileName = `channel-photo-${Date.now()}.jpg`;

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/communities/${seed.communitySlug}/channels/${seed.channelId}`,
    );

    await expect(page.getByTestId('channel-composer-input')).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      openChannelComposerAction(page, 'channel-composer-attachment-button'),
    ]);
    await fileChooser.setFiles({
      name: fileName,
      mimeType: 'image/jpeg',
      buffer: TINY_JPG,
    });

    await expect(page.getByTestId('channel-composer-pending-attachment').first()).toBeVisible();
    await expect(page.getByTestId('channel-composer-send-button')).toBeEnabled();
    await page.getByTestId('channel-composer-send-button').click();

    const row = page.getByTestId('message-row').filter({
      has: page.getByAltText(fileName),
    }).first();
    await expect(row).toBeVisible();
    await expect(row.getByTestId('attachment-image-button').first()).toHaveAttribute(
      'data-attachment-ready',
      'true',
    );
    await expect(row).not.toContainText('(첨부파일)');
  });

  test('channel composer uses the desktop file picker bridge when available', async ({ page }) => {
    const seed = await getSeedData();
    const fileName = `desktop-bridge-photo-${Date.now()}.jpg`;

    await page.addInitScript(
      ({ name, bytes }) => {
        Object.defineProperty(window, 'zkTalkDesktop', {
          configurable: true,
          value: {
            pickFiles: async () => [{
              name,
              type: 'image/jpeg',
              size: bytes.length,
              lastModified: Date.now(),
              bytes,
            }],
          },
        });
      },
      {
        name: fileName,
        bytes: Array.from(TINY_JPG),
      },
    );

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/communities/${seed.communitySlug}/channels/${seed.channelId}`,
    );

    await openChannelComposerAction(page, 'channel-composer-attachment-button');

    const pendingAttachment = page
      .getByTestId('channel-composer-pending-attachment')
      .filter({ hasText: fileName })
      .first();
    await expect(pendingAttachment).toBeVisible();
    await expect(page.getByTestId('channel-composer-pending-attachment-image').first()).toBeVisible();
  });

  test('channel composer sends a 12MB pdf attachment through the UI', async ({ page }) => {
    test.slow();

    const seed = await getSeedData();
    const fileName = `channel-large-${Date.now()}.pdf`;

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/communities/${seed.communitySlug}/channels/${seed.channelId}`,
    );

    await expect(page.getByTestId('channel-composer-input')).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      openChannelComposerAction(page, 'channel-composer-attachment-button'),
    ]);
    await fileChooser.setFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: createPdfBuffer(LARGE_ATTACHMENT_SIZE),
    });

    const pendingAttachment = page
      .getByTestId('channel-composer-pending-attachment')
      .filter({ hasText: fileName })
      .first();
    await expect(pendingAttachment).toBeVisible();
    await expect(page.getByTestId('channel-composer-send-button')).toBeEnabled();
    await page.getByTestId('channel-composer-send-button').click();

    const row = page.getByTestId('message-row').filter({ hasText: fileName }).first();
    await expect(row).toBeVisible();
    await expect(row.getByTestId('attachment-file-button').first()).toBeVisible();
    await expect(row).not.toContainText('(첨부파일)');
  });

  test('channel composer sends json document attachments through the UI', async ({ page }) => {
    const seed = await getSeedData();
    const fileName = `channel-config-${Date.now()}.json`;

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/communities/${seed.communitySlug}/channels/${seed.channelId}`,
    );

    await expect(page.getByTestId('channel-composer-input')).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      openChannelComposerAction(page, 'channel-composer-attachment-button'),
    ]);
    await fileChooser.setFiles({
      name: fileName,
      mimeType: 'application/json',
      buffer: TINY_JSON,
    });

    const pendingAttachment = page
      .getByTestId('channel-composer-pending-attachment')
      .filter({ hasText: fileName })
      .first();
    await expect(pendingAttachment).toBeVisible();
    await expect(page.getByTestId('channel-composer-send-button')).toBeEnabled();
    await page.getByTestId('channel-composer-send-button').click();

    const row = page.getByTestId('message-row').filter({ hasText: fileName }).first();
    await expect(row).toBeVisible();
    await expect(row.getByTestId('attachment-file-button').first()).toBeVisible();
    await expect(row).not.toContainText('(첨부파일)');
  });

  test('channel composer accepts drag and drop attachments', async ({ page }) => {
    const seed = await getSeedData();
    const fileName = `drag-drop-photo-${Date.now()}.jpg`;

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/communities/${seed.communitySlug}/channels/${seed.channelId}`,
    );

    await dispatchFileDrop(page, 'channel-composer-drop-zone', [
      {
        name: fileName,
        mimeType: 'image/jpeg',
        buffer: TINY_JPG,
      },
    ]);

    const pendingAttachment = page
      .getByTestId('channel-composer-pending-attachment')
      .filter({ hasText: fileName })
      .first();
    await expect(pendingAttachment).toBeVisible();
    await page.getByTestId('channel-composer-send-button').click();

    const row = page.getByTestId('message-row').filter({
      has: page.getByAltText(fileName),
    }).first();
    await expect(row).toBeVisible();
    await expect(row).not.toContainText('(첨부파일)');
  });

  test('dm composer sends jpg attachments even when desktop omits the mime type', async ({ page }) => {
    const seed = await getSeedData();

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/dm/${seed.harnessConversationId}`,
    );

    await expect(page.getByTestId('dm-composer-input')).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('dm-composer-attachment-button').click(),
    ]);
    await fileChooser.setFiles({
      name: `desktop-photo-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      buffer: TINY_JPG,
    });

    await expect(page.getByTestId('dm-pending-attachment-image').first()).toBeVisible();
    await expect(page.getByTestId('dm-send-button')).toBeEnabled();
    await page.getByTestId('dm-send-button').click();

    const row = page.getByTestId('dm-message-row').last();
    await expect(row).toBeVisible();
    await expect(row.getByTestId('attachment-image-button').first()).toHaveAttribute(
      'data-attachment-ready',
      'true',
    );
    await expect(row).not.toContainText('(첨부파일)');
  });

  test('dm composer sends a 12MB pdf attachment through the UI', async ({ page }) => {
    test.slow();

    const seed = await getSeedData();
    const fileName = `dm-large-${Date.now()}.pdf`;

    await bootstrapAuthenticatedPage(
      page,
      seed.userA.sessionToken,
      `/dm/${seed.harnessConversationId}`,
    );

    await expect(page.getByTestId('dm-composer-input')).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('dm-composer-attachment-button').click(),
    ]);
    await fileChooser.setFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: createPdfBuffer(LARGE_ATTACHMENT_SIZE),
    });

    const pendingAttachment = page
      .getByTestId('dm-pending-attachment')
      .filter({ hasText: fileName })
      .first();
    await expect(pendingAttachment).toBeVisible();
    await expect(page.getByTestId('dm-send-button')).toBeEnabled();
    await page.getByTestId('dm-send-button').click();

    const row = page.getByTestId('dm-message-row').filter({ hasText: fileName }).last();
    await expect(row).toBeVisible();
    await expect(row.getByTestId('attachment-file-button').first()).toBeVisible();
    await expect(row).not.toContainText('(첨부파일)');
  });

  test('a seeded external DM message is visible and a new DM message can be sent', async ({ browser, request }) => {
    const seed = await getSeedData();
    const incomingText = `playwright-dm-in-${Date.now()}`;
    const outgoingText = `playwright-dm-out-${Date.now()}`;
    const attachmentText = `playwright-dm-photo-${Date.now()}`;
    const attachmentFileName = `dm-photo-${Date.now()}.png`;

    const { context: receiverContext, page: receiverPage } = await openAuthenticatedPage(
      browser,
      seed.userA.sessionToken,
      `/dm/${seed.harnessConversationId}`,
    );
    const { context: senderContext, page: senderPage } = await openAuthenticatedPage(
      browser,
      seed.userC.sessionToken,
      `/dm/${seed.harnessConversationId}`,
    );

    await expect(receiverPage.getByTestId('dm-composer-input')).toBeVisible();
    await expect(senderPage.getByTestId('dm-composer-input')).toBeVisible();
    await expect(
      receiverPage.getByTestId('dm-message-row').filter({ hasText: seed.harnessMessageText }).first(),
    ).toBeVisible();
    await expect(
      senderPage.getByTestId('dm-message-row').filter({ hasText: seed.harnessMessageText }).first(),
    ).toBeVisible();
    const initialMessageCount = await senderPage.getByTestId('dm-message-row').count();
    await expect(receiverPage.getByTestId('dm-message-row')).toHaveCount(initialMessageCount);

    await senderPage.getByTestId('dm-composer-input').fill(incomingText);
    await expect(senderPage.getByTestId('dm-send-button')).toBeEnabled();
    await senderPage.getByTestId('dm-composer-input').press('Enter');
    await expect.poll(async () => {
      const response = await request.get(
        `${apiBaseUrl}/api/dm/conversations/${seed.harnessConversationId}/messages?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${seed.userC.sessionToken}`,
          },
        },
      );
      expect(response.ok()).toBeTruthy();
      const payload = await response.json();
      return payload.messages?.length ?? 0;
    }).toBe(initialMessageCount + 1);
    await expect(senderPage.getByTestId('dm-message-row')).toHaveCount(initialMessageCount + 1);
    await expect(receiverPage.getByTestId('dm-message-row')).toHaveCount(initialMessageCount + 1);

    await receiverPage.getByTestId('dm-composer-input').fill(outgoingText);
    await expect(receiverPage.getByTestId('dm-send-button')).toBeEnabled();
    await receiverPage.getByTestId('dm-composer-input').press('Enter');
    await expect.poll(async () => {
      const response = await request.get(
        `${apiBaseUrl}/api/dm/conversations/${seed.harnessConversationId}/messages?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${seed.userA.sessionToken}`,
          },
        },
      );
      expect(response.ok()).toBeTruthy();
      const payload = await response.json();
      return payload.messages?.length ?? 0;
    }).toBe(initialMessageCount + 2);
    await expect(receiverPage.getByTestId('dm-message-row')).toHaveCount(initialMessageCount + 2);
    await expect(senderPage.getByTestId('dm-message-row')).toHaveCount(initialMessageCount + 2);

    const outgoingRow = receiverPage
      .getByTestId('dm-message-row')
      .filter({ hasText: outgoingText })
      .first();
    await expect(outgoingRow.getByTestId('dm-own-avatar')).toBeVisible();

    const attachmentMessageResponse = await apiRequestWithRetry(
      request,
      `${apiBaseUrl}/api/dm/conversations/${seed.harnessConversationId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${seed.userC.sessionToken}`,
          'X-Request-Id': `dm-photo-${Date.now()}`,
        },
        data: {
          bodyMarkdown: attachmentText,
        },
      },
    );
    expect(attachmentMessageResponse.ok()).toBeTruthy();
    const attachmentMessagePayload = await attachmentMessageResponse.json();
    const attachmentMessageId = attachmentMessagePayload.message?.id;
    expect(attachmentMessageId).toBeTruthy();

    const presignResponse = await apiRequestWithRetry(request, `${apiBaseUrl}/api/upload/presign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seed.userC.sessionToken}`,
      },
      data: {
        conversationId: seed.harnessConversationId,
        fileName: attachmentFileName,
        mimeType: 'image/png',
        fileSize: TINY_PNG.length,
      },
    });
    expect(presignResponse.ok()).toBeTruthy();
    const presignPayload = await presignResponse.json();

    const uploadResponse = await apiRequestWithRetry(
      request,
      `${apiBaseUrl}${presignPayload.uploadUrl}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${seed.userC.sessionToken}`,
          'Content-Type': 'image/png',
        },
        data: TINY_PNG,
      },
    );
    expect(uploadResponse.ok()).toBeTruthy();

    const attachResponse = await apiRequestWithRetry(request, `${apiBaseUrl}/api/upload/attachments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seed.userC.sessionToken}`,
      },
      data: {
        dmMessageId: attachmentMessageId,
        storageKey: presignPayload.storageKey,
        fileName: attachmentFileName,
        mimeType: 'image/png',
        fileSize: TINY_PNG.length,
      },
    });
    expect(attachResponse.ok()).toBeTruthy();

    const attachmentRow = receiverPage
      .getByTestId('dm-message-row')
      .filter({ hasText: attachmentText })
      .first();
    await expect(attachmentRow).toBeVisible();
    await expect(
      attachmentRow.getByTestId('attachment-image-button').first(),
    ).toHaveAttribute('data-attachment-ready', 'true');
    await expect(attachmentRow).not.toContainText('(첨부파일)');

    await senderContext.close();
    await receiverContext.close();
  });
});
