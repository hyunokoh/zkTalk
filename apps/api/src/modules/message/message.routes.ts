import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as messageService from './message.service.js';
import {
  ChannelIdParamsSchema,
  MessageIdParamsSchema,
  CreateMessageSchema,
  UpdateMessageSchema,
  CursorPaginationSchema,
} from './message.schema.js';

/**
 * Message routes plugin.
 *
 * Register in server.ts:
 *   await app.register(messageRoutes);
 */
export default async function messageRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // GET /api/channels/:channelId/messages
  // List messages in a channel with cursor-based pagination.
  // -------------------------------------------------------------------------
  app.get(
    '/api/channels/:channelId/messages',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Querystring: { cursor?: string; limit?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const { cursor, limit } = CursorPaginationSchema.parse(request.query);

      const result = await messageService.getMessages(
        request.user.id,
        channelId,
        cursor,
        limit,
      );

      return reply.send(result);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/channels/:channelId/messages
  // Create a new message in a channel.
  // -------------------------------------------------------------------------
  app.post(
    '/api/channels/:channelId/messages',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: { bodyMarkdown: string; parentMessageId?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const body = CreateMessageSchema.parse(request.body);
      const requestId = request.headers['x-request-id'] as string | undefined;

      const message = await messageService.createMessage(
        request.user.id,
        channelId,
        body,
        requestId,
      );

      return reply.status(201).send(message);
    },
  );

  // -------------------------------------------------------------------------
  // PATCH /api/messages/:messageId
  // Edit a message (author only).
  // -------------------------------------------------------------------------
  app.patch(
    '/api/messages/:messageId',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
        Body: { bodyMarkdown: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = MessageIdParamsSchema.parse(request.params);
      const body = UpdateMessageSchema.parse(request.body);

      const message = await messageService.editMessage(
        request.user.id,
        messageId,
        body,
      );

      return reply.send(message);
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /api/messages/:messageId
  // Soft-delete a message (author or moderator).
  // -------------------------------------------------------------------------
  app.delete(
    '/api/messages/:messageId',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = MessageIdParamsSchema.parse(request.params);

      await messageService.deleteMessage(request.user.id, messageId);

      return reply.status(204).send();
    },
  );
}
