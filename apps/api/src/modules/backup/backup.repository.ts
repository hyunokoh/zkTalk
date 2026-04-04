import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { messages, dmMessages, users } from '../../lib/db/schema.js';

/**
 * Fetch all channel messages authored by a specific user.
 */
export async function getUserChannelMessages(userId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.authorUserId, userId))
    .orderBy(messages.createdAt);
}

/**
 * Fetch all DM messages authored by a specific user.
 */
export async function getUserDmMessages(userId: string) {
  return db
    .select()
    .from(dmMessages)
    .where(eq(dmMessages.authorUserId, userId))
    .orderBy(dmMessages.createdAt);
}

/**
 * Get user record for backup metadata.
 */
export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}
