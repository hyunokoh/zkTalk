import { eq, and, or, ilike, ne, asc } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { friendships, users } from '../../lib/db/schema.js';
import { uuidv7 } from 'uuidv7';

export async function findFriendship(userId1: string, userId2: string) {
  const result = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
        and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1)),
      ),
    )
    .limit(1);
  return result[0] ?? null;
}

export async function findById(id: string) {
  const result = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createFriendRequest(requesterId: string, addresseeId: string) {
  const id = uuidv7();
  const now = new Date();
  const result = await db
    .insert(friendships)
    .values({
      id,
      requesterId,
      addresseeId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return result[0]!;
}

export async function updateFriendshipStatus(id: string, status: 'pending' | 'accepted' | 'blocked') {
  const result = await db
    .update(friendships)
    .set({ status, updatedAt: new Date() })
    .where(eq(friendships.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteFriendship(id: string) {
  await db.delete(friendships).where(eq(friendships.id, id));
}

export async function listFriends(userId: string, status?: 'pending' | 'accepted' | 'blocked') {
  const query = db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      status: friendships.status,
      createdAt: friendships.createdAt,
      updatedAt: friendships.updatedAt,
    })
    .from(friendships)
    .where(
      or(
        eq(friendships.requesterId, userId),
        eq(friendships.addresseeId, userId),
      ),
    );

  const results = await query;

  // Filter by status if specified
  const filtered = status ? results.filter((f) => f.status === status) : results;

  // For each friendship, get the other user's info
  const friendList = await Promise.all(
    filtered.map(async (f) => {
      const otherUserId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      const userResult = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, otherUserId))
        .limit(1);

      return {
        id: f.id,
        status: f.status,
        isRequester: f.requesterId === userId,
        createdAt: f.createdAt,
        user: userResult[0] ?? null,
      };
    }),
  );

  return friendList;
}

export async function checkFriendshipStatus(userId: string, otherUserId: string) {
  const friendship = await findFriendship(userId, otherUserId);
  if (!friendship) {
    return {
      status: 'none' as const,
      friendshipId: null,
      isRequester: false,
    };
  }

  return {
    status: friendship.status,
    friendshipId: friendship.id,
    isRequester: friendship.requesterId === userId,
  };
}

export async function searchUsers(query: string, excludeUserId: string, limit = 8) {
  const searchPattern = `%${query}%`;

  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(
      and(
        ne(users.id, excludeUserId),
        or(
          ilike(users.username, searchPattern),
          ilike(users.displayName, searchPattern),
        ),
      ),
    )
    .orderBy(asc(users.displayName), asc(users.username))
    .limit(limit);
}
