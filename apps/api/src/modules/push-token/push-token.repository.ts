import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { pushTokens } from '../../lib/db/schema.js';

export async function upsertPushToken(
  id: string,
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
) {
  // Delete existing token for this user+token combo (upsert)
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));

  return db.insert(pushTokens).values({
    id,
    userId,
    token,
    platform,
  });
}

export async function deletePushTokensForUser(userId: string) {
  return db.delete(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function deletePushToken(userId: string, token: string) {
  return db
    .delete(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

export async function getPushTokensForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];

  // Use drizzle's inArray for batch lookup
  const { inArray } = await import('drizzle-orm');
  return db
    .select({
      userId: pushTokens.userId,
      token: pushTokens.token,
      platform: pushTokens.platform,
    })
    .from(pushTokens)
    .where(inArray(pushTokens.userId, userIds));
}
