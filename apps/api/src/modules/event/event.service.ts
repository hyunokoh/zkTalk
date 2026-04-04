import { SystemRole } from '@zktalk/shared';
import * as eventRepo from './event.repository.js';
import * as communityRepo from '../community/community.repository.js';
import { AppError } from '../../lib/errors.js';

async function requireMember(communityId: string, userId: string) {
  const membership = await communityRepo.findMembership(communityId, userId);
  if (!membership) {
    throw AppError.forbidden('You are not a member of this community');
  }
  return membership;
}

async function requireAdminOrCreator(communityId: string, userId: string, creatorUserId: string) {
  if (userId === creatorUserId) return;
  const roles = await communityRepo.getUserRolesInCommunity(communityId, userId);
  const isAdmin = roles.some((r) => [SystemRole.OWNER, SystemRole.ADMIN].includes(r.name as typeof SystemRole.OWNER));
  if (!isAdmin) {
    throw AppError.forbidden('You do not have permission to perform this action');
  }
}

export async function createEvent(
  communityId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    startAt: string;
    endAt?: string;
  },
) {
  await requireMember(communityId, userId);

  return eventRepo.createEvent({
    communityId,
    title: data.title,
    description: data.description,
    location: data.location,
    startAt: new Date(data.startAt),
    endAt: data.endAt ? new Date(data.endAt) : undefined,
    createdByUserId: userId,
  });
}

export async function listEvents(
  communityId: string,
  userId: string,
  scope: 'upcoming' | 'past' = 'upcoming',
) {
  await requireMember(communityId, userId);

  const events = scope === 'past'
    ? await eventRepo.findPastByCommunity(communityId)
    : await eventRepo.findUpcomingByCommunity(communityId);

  // Attach RSVP counts to each event
  const result = await Promise.all(
    events.map(async (event) => {
      const rsvpCounts = await eventRepo.getRsvpCounts(event.id);
      const userRsvp = await eventRepo.getUserRsvp(event.id, userId);
      return { ...event, rsvpCounts, userRsvpStatus: userRsvp?.status ?? null };
    }),
  );

  return result;
}

export async function getEvent(eventId: string, userId: string) {
  const result = await eventRepo.findByIdWithCreator(eventId);
  if (!result) {
    throw AppError.notFound('Event not found');
  }

  await requireMember(result.event.communityId, userId);

  const rsvpCounts = await eventRepo.getRsvpCounts(eventId);
  const userRsvp = await eventRepo.getUserRsvp(eventId, userId);

  return {
    ...result.event,
    creator: result.creator,
    rsvpCounts,
    userRsvpStatus: userRsvp?.status ?? null,
  };
}

export async function listEventAttendees(eventId: string, userId: string) {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw AppError.notFound('Event not found');
  }

  await requireMember(event.communityId, userId);

  return eventRepo.listAttendees(eventId);
}

export async function updateEvent(
  eventId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    startAt?: string;
    endAt?: string;
  },
) {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw AppError.notFound('Event not found');
  }

  await requireAdminOrCreator(event.communityId, userId, event.createdByUserId);

  return eventRepo.updateEvent(eventId, {
    title: data.title,
    description: data.description,
    location: data.location,
    startAt: data.startAt ? new Date(data.startAt) : undefined,
    endAt: data.endAt ? new Date(data.endAt) : undefined,
  });
}

export async function deleteEvent(eventId: string, userId: string) {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw AppError.notFound('Event not found');
  }

  await requireAdminOrCreator(event.communityId, userId, event.createdByUserId);

  await eventRepo.deleteEvent(eventId);
}

export async function rsvpEvent(eventId: string, userId: string, status: 'interested' | 'going') {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw AppError.notFound('Event not found');
  }

  await requireMember(event.communityId, userId);

  return eventRepo.upsertRsvp(eventId, userId, status);
}

export async function removeRsvp(eventId: string, userId: string) {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw AppError.notFound('Event not found');
  }

  await requireMember(event.communityId, userId);

  await eventRepo.removeRsvp(eventId, userId);
}
