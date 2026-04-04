import { eq, and, gte, lt, sql, asc, desc } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { communityEvents, eventRsvps, users } from '../../lib/db/schema.js';
import { uuidv7 } from 'uuidv7';

export interface CreateEventData {
  communityId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt?: Date;
  createdByUserId: string;
}

export async function createEvent(data: CreateEventData) {
  const id = uuidv7();
  const result = await db
    .insert(communityEvents)
    .values({
      id,
      communityId: data.communityId,
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      startAt: data.startAt,
      endAt: data.endAt ?? null,
      createdByUserId: data.createdByUserId,
    })
    .returning();
  return result[0]!;
}

export async function findById(id: string) {
  const result = await db
    .select()
    .from(communityEvents)
    .where(eq(communityEvents.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function findByIdWithCreator(id: string) {
  const result = await db
    .select({
      event: communityEvents,
      creator: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(communityEvents)
    .innerJoin(users, eq(users.id, communityEvents.createdByUserId))
    .where(eq(communityEvents.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function findUpcomingByCommunity(communityId: string) {
  const now = new Date();
  const result = await db
    .select()
    .from(communityEvents)
    .where(
      and(
        eq(communityEvents.communityId, communityId),
        gte(communityEvents.startAt, now),
      ),
    )
    .orderBy(communityEvents.startAt);
  return result;
}

export async function findPastByCommunity(communityId: string) {
  const now = new Date();
  const result = await db
    .select()
    .from(communityEvents)
    .where(
      and(
        eq(communityEvents.communityId, communityId),
        lt(communityEvents.startAt, now),
      ),
    )
    .orderBy(desc(communityEvents.startAt));
  return result;
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    startAt?: Date;
    endAt?: Date;
  },
) {
  const result = await db
    .update(communityEvents)
    .set(data)
    .where(eq(communityEvents.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteEvent(id: string) {
  // Delete RSVPs first
  await db.delete(eventRsvps).where(eq(eventRsvps.eventId, id));
  await db.delete(communityEvents).where(eq(communityEvents.id, id));
}

export async function upsertRsvp(eventId: string, userId: string, status: 'interested' | 'going') {
  const existing = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
    .limit(1);

  if (existing[0]) {
    const result = await db
      .update(eventRsvps)
      .set({ status })
      .where(eq(eventRsvps.id, existing[0].id))
      .returning();
    return result[0]!;
  }

  const id = uuidv7();
  const result = await db
    .insert(eventRsvps)
    .values({ id, eventId, userId, status })
    .returning();
  return result[0]!;
}

export async function removeRsvp(eventId: string, userId: string) {
  await db
    .delete(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
}

export async function getRsvpCounts(eventId: string) {
  const result = await db
    .select({
      status: eventRsvps.status,
      count: sql<number>`count(*)::int`,
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId))
    .groupBy(eventRsvps.status);

  const counts = { interested: 0, going: 0 };
  for (const row of result) {
    if (row.status === 'interested') counts.interested = row.count;
    if (row.status === 'going') counts.going = row.count;
  }
  return counts;
}

export async function getUserRsvp(eventId: string, userId: string) {
  const result = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function listAttendees(eventId: string) {
  return db
    .select({
      status: eventRsvps.status,
      user: {
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(eventRsvps)
    .innerJoin(users, eq(users.id, eventRsvps.userId))
    .where(eq(eventRsvps.eventId, eventId))
    .orderBy(asc(eventRsvps.status), asc(users.displayName));
}
