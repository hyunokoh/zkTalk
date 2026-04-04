/**
 * Offline Message Queue — stores unsent messages in IndexedDB
 * and automatically retries them when the connection is restored.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface QueuedMessage {
  id: string;
  channelId: string;
  threadId?: string | null;
  bodyMarkdown: string;
  parentMessageId?: string;
  topic?: string | null;
  isSealed?: boolean;
  encryptedPayload?: string;
  createdAt: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
}

// ── IndexedDB Setup ──────────────────────────────────────────────────

const DB_NAME = 'zktalk-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('channelId', 'channelId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Queue Operations ─────────────────────────────────────────────────

/**
 * Add a message to the offline queue.
 */
export async function enqueueMessage(msg: Omit<QueuedMessage, 'retryCount' | 'status'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ...msg, retryCount: 0, status: 'pending' });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all queued messages, ordered by creation time.
 */
export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result as QueuedMessage[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get queued messages for a specific channel.
 */
export async function getQueuedMessagesForChannel(channelId: string): Promise<QueuedMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('channelId');
    const request = index.getAll(channelId);
    request.onsuccess = () => resolve(request.result as QueuedMessage[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update the status of a queued message.
 */
export async function updateMessageStatus(
  id: string,
  status: QueuedMessage['status'],
  retryCount?: number,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const msg = getReq.result as QueuedMessage | undefined;
      if (msg) {
        msg.status = status;
        if (retryCount !== undefined) {
          msg.retryCount = retryCount;
        }
        store.put(msg);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove a message from the queue (after successful send).
 */
export async function dequeueMessage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear all queued messages.
 */
export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Auto-Retry on Reconnect ──────────────────────────────────────────

const MAX_RETRIES = 5;

type SendFunction = (msg: QueuedMessage) => Promise<boolean>;

let retryInProgress = false;

/**
 * Process the offline queue: attempt to send all pending messages in order.
 * @param sendFn A function that attempts to send a single message. Returns true on success.
 */
export async function processQueue(sendFn: SendFunction): Promise<void> {
  if (retryInProgress) return;
  retryInProgress = true;

  try {
    const messages = await getQueuedMessages();
    const pending = messages.filter(
      (m) => m.status === 'pending' || m.status === 'failed',
    );

    for (const msg of pending) {
      if (msg.retryCount >= MAX_RETRIES) {
        await updateMessageStatus(msg.id, 'failed', msg.retryCount);
        continue;
      }

      await updateMessageStatus(msg.id, 'sending', msg.retryCount);

      try {
        const success = await sendFn(msg);
        if (success) {
          await dequeueMessage(msg.id);
        } else {
          await updateMessageStatus(msg.id, 'failed', msg.retryCount + 1);
        }
      } catch {
        await updateMessageStatus(msg.id, 'failed', msg.retryCount + 1);
      }
    }
  } finally {
    retryInProgress = false;
  }
}

/**
 * Set up automatic retry on network reconnection.
 * Call this once at app startup.
 */
export function setupAutoRetry(sendFn: SendFunction): () => void {
  const handleOnline = () => {
    processQueue(sendFn);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
    }
  };
}
