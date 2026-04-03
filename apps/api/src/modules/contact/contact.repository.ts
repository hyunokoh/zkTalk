import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import { contactHashes, userAuthMethods, users } from '../../lib/db/schema.js';

/**
 * Delete all existing contact hashes for a user.
 */
export async function deleteContactHashesByUserId(userId: string) {
  await db.delete(contactHashes).where(eq(contactHashes.userId, userId));
}

/**
 * Insert multiple contact hashes for a user.
 */
export async function insertContactHashes(userId: string, hashes: string[]) {
  if (hashes.length === 0) return;

  const values = hashes.map((phoneHash) => ({
    id: uuidv7(),
    userId,
    phoneHash,
    createdAt: new Date(),
  }));

  await db.insert(contactHashes).values(values);
}

/**
 * Find all phone-type auth methods whose SHA-256 hashes match the given list.
 * Returns userId, displayName, username, avatarUrl for matched users.
 */
export async function findUsersByPhoneHashes(hashes: string[]) {
  if (hashes.length === 0) return [];

  // Get all phone auth methods
  const phoneAuthMethods = await db
    .select({
      userId: userAuthMethods.userId,
      identifier: userAuthMethods.identifier,
    })
    .from(userAuthMethods)
    .where(eq(userAuthMethods.type, 'phone'));

  return phoneAuthMethods;
}

/**
 * Find users whose contact hashes contain the requesting user's phone hash.
 * This enables mutual discovery: if user A has user B's phone AND user B has user A's phone,
 * they should be suggested to each other.
 */
export async function findUsersWhoHaveMyPhoneHash(phoneHash: string, excludeUserId: string) {
  const rows = await db
    .select({
      userId: contactHashes.userId,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(contactHashes)
    .innerJoin(users, eq(contactHashes.userId, users.id))
    .where(eq(contactHashes.phoneHash, phoneHash));

  return rows.filter((r) => r.userId !== excludeUserId);
}

/**
 * Get all contact hashes uploaded by a specific user.
 */
export async function getContactHashesByUserId(userId: string) {
  return db
    .select({ phoneHash: contactHashes.phoneHash })
    .from(contactHashes)
    .where(eq(contactHashes.userId, userId));
}

/**
 * Find a user by id (basic info).
 */
export async function findUserBasicInfo(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}
