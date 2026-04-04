import { eq, and, desc } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import { channelKeys, channels, userKeys } from '../../lib/db/schema.js';

/**
 * Insert encrypted group keys for multiple members.
 */
export async function insertChannelKeys(
  channelId: string,
  memberKeys: Record<string, string>,
  keyVersion: number,
) {
  const values = Object.entries(memberKeys).map(([userId, encryptedGroupKey]) => ({
    id: uuidv7(),
    channelId,
    userId,
    encryptedGroupKey,
    keyVersion,
    createdAt: new Date(),
  }));

  if (values.length > 0) {
    await db.insert(channelKeys).values(values);
  }
}

/**
 * Get the encrypted group key for a specific user and channel (latest version).
 */
export async function getChannelKeyForUser(channelId: string, userId: string) {
  const [row] = await db
    .select()
    .from(channelKeys)
    .where(and(eq(channelKeys.channelId, channelId), eq(channelKeys.userId, userId)))
    .orderBy(desc(channelKeys.keyVersion))
    .limit(1);
  return row ?? null;
}

/**
 * Get all channel keys for a channel (latest version).
 */
export async function getChannelKeysByVersion(channelId: string, keyVersion: number) {
  return db
    .select()
    .from(channelKeys)
    .where(
      and(
        eq(channelKeys.channelId, channelId),
        eq(channelKeys.keyVersion, keyVersion),
      ),
    );
}

/**
 * Get the latest key version for a channel.
 */
export async function getLatestKeyVersion(channelId: string): Promise<number> {
  const [row] = await db
    .select({ keyVersion: channelKeys.keyVersion })
    .from(channelKeys)
    .where(eq(channelKeys.channelId, channelId))
    .orderBy(desc(channelKeys.keyVersion))
    .limit(1);
  return row?.keyVersion ?? 0;
}

/**
 * Enable or disable E2EE on a channel.
 */
export async function setChannelE2ee(channelId: string, enabled: boolean) {
  const [channel] = await db
    .update(channels)
    .set({ isE2eeEnabled: enabled, updatedAt: new Date() })
    .where(eq(channels.id, channelId))
    .returning();
  return channel ?? null;
}

/**
 * Get channel by id.
 */
export async function findChannelById(channelId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);
  return channel ?? null;
}

/**
 * Get all public keys for a list of user IDs.
 */
export async function getPublicKeysForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db.select().from(userKeys);
}

/**
 * Insert a single channel key for a new member.
 */
export async function insertChannelKey(
  channelId: string,
  userId: string,
  encryptedGroupKey: string,
  keyVersion: number,
) {
  const id = uuidv7();
  const [row] = await db
    .insert(channelKeys)
    .values({
      id,
      channelId,
      userId,
      encryptedGroupKey,
      keyVersion,
      createdAt: new Date(),
    })
    .returning();
  return row!;
}
