import { uuidv7 } from 'uuidv7';
import * as repo from './push-token.repository.js';

// ---------------------------------------------------------------------------
// Push Token Service
// ---------------------------------------------------------------------------

export async function registerToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
) {
  const id = uuidv7();
  await repo.upsertPushToken(id, userId, token, platform);
  return { id };
}

export async function unregisterAllTokens(userId: string) {
  await repo.deletePushTokensForUser(userId);
}

// ---------------------------------------------------------------------------
// Send push notifications via Expo Push Service
// ---------------------------------------------------------------------------

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notifications to a list of user IDs.
 * Uses Expo's push notification service for simplicity.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
) {
  if (userIds.length === 0) return;

  const tokens = await repo.getPushTokensForUsers(userIds);
  if (tokens.length === 0) return;

  // Build Expo push messages
  const messages = tokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: 'default' as const,
    priority: 'high' as const,
  }));

  // Send in batches of 100 (Expo limit)
  const BATCH_SIZE = 100;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });
    } catch (error) {
      console.error('[Push] Failed to send batch:', error);
      // Don't throw — push failures shouldn't break message sending
    }
  }
}
