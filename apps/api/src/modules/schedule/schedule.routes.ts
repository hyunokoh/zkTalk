import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';
import { eq, and, isNull, lte } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../lib/db/index.js';
import { scheduledMessages } from '../../lib/db/schema.js';
import { AppError } from '../../lib/errors.js';

const ScheduleBodySchema = z.object({
  bodyMarkdown: z.string().min(1).max(4000),
  scheduledAt: z.string().datetime(),
});

export default async function scheduleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // Schedule a message
  app.post(
    '/api/channels/:channelId/messages/schedule',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: { bodyMarkdown: string; scheduledAt: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = request.params;
      const body = ScheduleBodySchema.parse(request.body);
      const scheduledAt = new Date(body.scheduledAt);

      if (scheduledAt <= new Date()) {
        throw AppError.badRequest('Scheduled time must be in the future');
      }

      const id = uuidv7();
      const [row] = await db
        .insert(scheduledMessages)
        .values({
          id,
          channelId,
          authorUserId: request.user.id,
          bodyMarkdown: body.bodyMarkdown,
          scheduledAt,
        })
        .returning();

      return reply.status(201).send(row);
    },
  );

  // List my scheduled messages
  app.get(
    '/api/me/scheduled-messages',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rows = await db
        .select()
        .from(scheduledMessages)
        .where(
          and(
            eq(scheduledMessages.authorUserId, request.user.id),
            eq(scheduledMessages.isCancelled, false),
            isNull(scheduledMessages.sentAt),
          ),
        );

      return reply.send({ scheduledMessages: rows });
    },
  );

  // Cancel a scheduled message
  app.delete(
    '/api/scheduled-messages/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      const [existing] = await db
        .select()
        .from(scheduledMessages)
        .where(eq(scheduledMessages.id, id))
        .limit(1);

      if (!existing) {
        throw AppError.notFound('Scheduled message not found');
      }

      if (existing.authorUserId !== request.user.id) {
        throw AppError.forbidden('You can only cancel your own scheduled messages');
      }

      if (existing.sentAt) {
        throw AppError.badRequest('Message already sent');
      }

      await db
        .update(scheduledMessages)
        .set({ isCancelled: true })
        .where(eq(scheduledMessages.id, id));

      return reply.status(204).send();
    },
  );

  // Process due scheduled messages (called internally or via cron)
  app.post(
    '/api/scheduled-messages/process',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const now = new Date();
      const dueMessages = await db
        .select()
        .from(scheduledMessages)
        .where(
          and(
            lte(scheduledMessages.scheduledAt, now),
            isNull(scheduledMessages.sentAt),
            eq(scheduledMessages.isCancelled, false),
          ),
        );

      // Mark as sent (actual message creation would trigger via message service)
      for (const msg of dueMessages) {
        await db
          .update(scheduledMessages)
          .set({ sentAt: now })
          .where(eq(scheduledMessages.id, msg.id));
      }

      return reply.send({ processed: dueMessages.length });
    },
  );
}
