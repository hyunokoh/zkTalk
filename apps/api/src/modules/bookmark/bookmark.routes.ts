import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as bookmarkService from './bookmark.service.js';
import { MessageIdParamsSchema, CursorPaginationSchema } from './bookmark.schema.js';

export default async function bookmarkRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // POST /api/bookmarks/:messageId
  // Bookmark a message.
  // -------------------------------------------------------------------------
  app.post(
    '/api/bookmarks/:messageId',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = MessageIdParamsSchema.parse(request.params);

      const bookmark = await bookmarkService.addBookmark(
        request.user.id,
        messageId,
      );

      return reply.status(201).send(bookmark);
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /api/bookmarks/:messageId
  // Remove a bookmark.
  // -------------------------------------------------------------------------
  app.delete(
    '/api/bookmarks/:messageId',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = MessageIdParamsSchema.parse(request.params);

      await bookmarkService.removeBookmark(request.user.id, messageId);

      return reply.status(204).send();
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/bookmarks
  // List bookmarks (paginated).
  // -------------------------------------------------------------------------
  app.get(
    '/api/bookmarks',
    async (
      request: FastifyRequest<{
        Querystring: { cursor?: string; limit?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { cursor, limit } = CursorPaginationSchema.parse(request.query);

      const result = await bookmarkService.getBookmarks(
        request.user.id,
        cursor,
        limit,
      );

      return reply.send(result);
    },
  );
}
