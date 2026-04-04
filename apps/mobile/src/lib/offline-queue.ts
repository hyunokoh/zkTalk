import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { api } from './api';

const QUEUE_KEY = 'zktalk_offline_queue';
const DEDUPE_WINDOW_MS = 30_000;

export interface QueuedMessage {
  id: string;
  endpoint: string;
  body: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

let isProcessing = false;
let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Load queued messages from AsyncStorage.
 */
async function loadQueue(): Promise<QueuedMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMessage[];
  } catch {
    return [];
  }
}

/**
 * Save queued messages to AsyncStorage.
 */
async function saveQueue(queue: QueuedMessage[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Enqueue a failed message for later retry.
 */
export async function enqueueMessage(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<QueuedMessage> {
  const queue = await loadQueue();
  const serializedBody = JSON.stringify(body);
  const existing = queue.find(
    (entry) =>
      entry.endpoint === endpoint
      && JSON.stringify(entry.body) === serializedBody
      && Date.now() - entry.createdAt < DEDUPE_WINDOW_MS,
  );

  if (existing) {
    return existing;
  }

  const msg: QueuedMessage = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    endpoint,
    body,
    createdAt: Date.now(),
    retryCount: 0,
  };

  queue.push(msg);
  await saveQueue(queue);

  return msg;
}

/**
 * Remove a specific message from the queue.
 */
export async function dequeueMessage(id: string): Promise<void> {
  const queue = await loadQueue();
  const filtered = queue.filter((m) => m.id !== id);
  await saveQueue(filtered);
}

/**
 * Remove queued messages that target a specific endpoint.
 */
export async function dequeueMessagesByEndpoint(endpoint: string): Promise<void> {
  const queue = await loadQueue();
  const filtered = queue.filter((m) => m.endpoint !== endpoint);
  await saveQueue(filtered);
}

/**
 * Get current pending messages.
 */
export async function getPendingMessages(): Promise<QueuedMessage[]> {
  return loadQueue();
}

/**
 * Process all queued messages in order.
 * Returns the number of successfully sent messages.
 */
export async function processQueue(): Promise<number> {
  if (isProcessing) return 0;
  isProcessing = true;

  let sentCount = 0;

  try {
    const queue = await loadQueue();
    if (queue.length === 0) return 0;

    const remaining: QueuedMessage[] = [];

    for (const msg of queue) {
      try {
        await api(msg.endpoint, {
          method: 'POST',
          body: msg.body,
        });
        sentCount++;
      } catch {
        // If still failing, keep in queue (up to 10 retries)
        if (msg.retryCount < 10) {
          remaining.push({ ...msg, retryCount: msg.retryCount + 1 });
        }
        // If over 10 retries, silently drop the message
      }
    }

    await saveQueue(remaining);
  } finally {
    isProcessing = false;
  }

  return sentCount;
}

/**
 * Start listening for network changes. When connectivity is restored,
 * automatically process the queue.
 */
export function startNetworkListener(
  onQueueProcessed?: (count: number) => void,
): void {
  if (unsubscribeNetInfo) return;

  let wasDisconnected = false;

  unsubscribeNetInfo = NetInfo.addEventListener(
    async (state: NetInfoState) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      if (!isConnected) {
        wasDisconnected = true;
        return;
      }

      // Only process queue when transitioning from disconnected to connected
      if (wasDisconnected && isConnected) {
        wasDisconnected = false;
        const count = await processQueue();
        if (count > 0 && onQueueProcessed) {
          onQueueProcessed(count);
        }
      }
    },
  );
}

/**
 * Stop listening for network changes.
 */
export function stopNetworkListener(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}

/**
 * Check current network connectivity.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}
