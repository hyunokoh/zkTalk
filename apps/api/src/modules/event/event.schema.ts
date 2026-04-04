import { z } from 'zod';

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
});

export const UpdateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

export const RsvpSchema = z.object({
  status: z.enum(['interested', 'going']),
});

export const ListEventsQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past']).optional(),
});
