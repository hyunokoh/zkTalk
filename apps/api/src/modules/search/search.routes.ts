import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as searchService from './search.service.js';
import { SearchQuerySchema } from './search.schema.js';

export default async function searchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/search/messages?q=&communityId=&channelId=&authorId=&hasAttachment=&dateFrom=&dateTo=&cursor=&limit=
  app.get('/api/search/messages', async (request, reply) => {
    const params = SearchQuerySchema.parse(request.query);
    const { q, communityId, channelId, authorId, hasAttachment, dateFrom, dateTo, cursor, limit } = params;

    const result = await searchService.searchMessages(
      request.user.id,
      q,
      { communityId, channelId, authorId, hasAttachment, dateFrom, dateTo },
      cursor,
      limit,
    );

    return reply.send(result);
  });
}
