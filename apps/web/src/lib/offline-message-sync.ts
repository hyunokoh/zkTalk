import { api } from '@/lib/api';
import {
  type QueuedMessage,
  dequeueMessage,
  getQueuedMessages,
  getQueuedMessagesForChannel,
  processQueue,
  setupAutoRetry,
  updateMessageStatus,
} from '@/lib/offline-queue';
import { useOfflineQueueStore } from '@/stores/offline-queue';

export const OFFLINE_QUEUED_MESSAGE_ID_PREFIX = 'offline-queued-';

function buildMessagePath(message: QueuedMessage): string {
  return message.threadId
    ? `/api/channels/${message.channelId}/threads/${message.threadId}/messages`
    : `/api/channels/${message.channelId}/messages`;
}

function buildMessageBody(message: QueuedMessage) {
  return {
    bodyMarkdown: message.bodyMarkdown,
    ...(message.parentMessageId ? { parentMessageId: message.parentMessageId } : {}),
    ...(message.topic ? { topic: message.topic } : {}),
  };
}

async function sendQueuedMessage(message: QueuedMessage): Promise<boolean> {
  await api(buildMessagePath(message), {
    method: 'POST',
    body: buildMessageBody(message),
    headers: {
      'X-Request-Id': message.id,
    },
  });
  return true;
}

function applyChannelSnapshot(channelId: string, messages: QueuedMessage[]): void {
  const pending = messages.filter((message) => message.status === 'pending' || message.status === 'sending').length;
  const failed = messages.filter((message) => message.status === 'failed').length;

  useOfflineQueueStore.getState().setChannelCounts(channelId, { pending, failed });
  useOfflineQueueStore.getState().setQueuedMessages(
    channelId,
    messages.map((message) => ({
      id: message.id,
      bodyMarkdown: message.bodyMarkdown,
      createdAt: message.createdAt,
      threadId: message.threadId ?? null,
      parentMessageId: message.parentMessageId ?? null,
      topic: message.topic ?? null,
      status: message.status,
    })),
  );
}

export async function refreshOfflineChannelCounts(channelId: string): Promise<void> {
  const messages = await getQueuedMessagesForChannel(channelId);
  applyChannelSnapshot(channelId, messages);
}

export async function refreshAllOfflineChannelCounts(): Promise<void> {
  const messages = await getQueuedMessages();
  const grouped = new Map<string, QueuedMessage[]>();

  for (const message of messages) {
    const existing = grouped.get(message.channelId) ?? [];
    existing.push(message);
    grouped.set(message.channelId, existing);
  }

  for (const [channelId, channelMessages] of grouped.entries()) {
    applyChannelSnapshot(channelId, channelMessages);
  }
}

let cleanupAutoRetry: (() => void) | null = null;

export function ensureOfflineQueueAutoRetry(): void {
  if (cleanupAutoRetry) {
    return;
  }

  cleanupAutoRetry = setupAutoRetry(async (message) => {
    const success = await sendQueuedMessage(message);
    await refreshOfflineChannelCounts(message.channelId);
    return success;
  });
}

export async function flushOfflineQueueForChannel(channelId: string): Promise<void> {
  ensureOfflineQueueAutoRetry();
  await processQueue(async (message) => {
    const success = await sendQueuedMessage(message);
    await refreshOfflineChannelCounts(message.channelId);
    return success;
  });
  await refreshOfflineChannelCounts(channelId);
}

export async function clearOfflineQueuedMessage(messageId: string, channelId: string): Promise<void> {
  await dequeueMessage(messageId);
  await refreshOfflineChannelCounts(channelId);
}

export function getRenderedOfflineMessageId(messageId: string): string {
  return `${OFFLINE_QUEUED_MESSAGE_ID_PREFIX}${messageId}`;
}

export function getOriginalOfflineMessageId(renderedId: string): string {
  return renderedId.startsWith(OFFLINE_QUEUED_MESSAGE_ID_PREFIX)
    ? renderedId.slice(OFFLINE_QUEUED_MESSAGE_ID_PREFIX.length)
    : renderedId;
}

export function isRenderedOfflineMessageId(messageId: string): boolean {
  return messageId.startsWith(OFFLINE_QUEUED_MESSAGE_ID_PREFIX);
}

export async function retryOfflineQueuedMessage(renderedId: string, channelId: string): Promise<void> {
  const originalId = getOriginalOfflineMessageId(renderedId);
  await updateMessageStatus(originalId, 'pending');
  await refreshOfflineChannelCounts(channelId);
  await flushOfflineQueueForChannel(channelId);
}

export async function removeOfflineQueuedMessage(renderedId: string, channelId: string): Promise<void> {
  const originalId = getOriginalOfflineMessageId(renderedId);
  await dequeueMessage(originalId);
  await refreshOfflineChannelCounts(channelId);
}
