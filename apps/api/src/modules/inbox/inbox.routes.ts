import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as inboxService from './inbox.service.js';
import { InboxQuerySchema } from './inbox.schema.js';

export default async function inboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/inbox?communityId=&cursor=&limit=
  app.get('/api/inbox', async (request, reply) => {
    const { communityId, cursor, limit } = InboxQuerySchema.parse(request.query);

    const result = await inboxService.getInbox(
      request.user.id,
      request.user.username,
      communityId,
      cursor,
      limit,
    );

    return reply.send(result);
  });
}
