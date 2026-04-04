import type { FastifyInstance } from 'fastify';
import {
  CreateEventSchema,
  UpdateEventSchema,
  RsvpSchema,
  ListEventsQuerySchema,
} from './event.schema.js';
import * as eventService from './event.service.js';
import { authenticate } from '../../middleware/auth.js';

export default async function eventRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/events',
    async (request, reply) => {
      const body = CreateEventSchema.parse(request.body);
      const event = await eventService.createEvent(
        request.params.communityId,
        request.user.id,
        body,
      );
      return reply.status(201).send({ event });
    },
  );

  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/events',
    async (request, reply) => {
      const query = ListEventsQuerySchema.parse(request.query ?? {});
      const events = await eventService.listEvents(
        request.params.communityId,
        request.user.id,
        query.scope ?? 'upcoming',
      );
      return reply.send({ events });
    },
  );

  app.get<{ Params: { eventId: string } }>(
    '/api/events/:eventId',
    async (request, reply) => {
      const event = await eventService.getEvent(
        request.params.eventId,
        request.user.id,
      );
      return reply.send({ event });
    },
  );

  app.get<{ Params: { eventId: string } }>(
    '/api/events/:eventId/attendees',
    async (request, reply) => {
      const attendees = await eventService.listEventAttendees(
        request.params.eventId,
        request.user.id,
      );
      return reply.send({ attendees });
    },
  );

  app.patch<{ Params: { eventId: string } }>(
    '/api/events/:eventId',
    async (request, reply) => {
      const body = UpdateEventSchema.parse(request.body);
      const event = await eventService.updateEvent(
        request.params.eventId,
        request.user.id,
        body,
      );
      return reply.send({ event });
    },
  );

  app.delete<{ Params: { eventId: string } }>(
    '/api/events/:eventId',
    async (request, reply) => {
      await eventService.deleteEvent(request.params.eventId, request.user.id);
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { eventId: string } }>(
    '/api/events/:eventId/rsvp',
    async (request, reply) => {
      const body = RsvpSchema.parse(request.body);
      const rsvp = await eventService.rsvpEvent(
        request.params.eventId,
        request.user.id,
        body.status,
      );
      return reply.send({ rsvp });
    },
  );

  app.delete<{ Params: { eventId: string } }>(
    '/api/events/:eventId/rsvp',
    async (request, reply) => {
      await eventService.removeRsvp(request.params.eventId, request.user.id);
      return reply.status(204).send();
    },
  );
}
