import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as inboxService from './inbox.service.js';
import {
  InboxMarkAllReadSchema,
  InboxMessageParamsSchema,
  InboxQuerySchema,
  InboxSummaryQuerySchema,
} from './inbox.schema.js';

export default async function inboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/inbox?communityId=&cursor=&limit=
  app.get('/api/inbox', async (request, reply) => {
    const { communityId, cursor, limit, q } = InboxQuerySchema.parse(request.query);

    const result = await inboxService.getInbox(
      request.user.id,
      request.user.username,
      request.user.displayName,
      communityId,
      q,
      cursor,
      limit,
    );

    return reply.send(result);
  });

  app.get('/api/inbox/summary', async (request, reply) => {
    const { communityId } = InboxSummaryQuerySchema.parse(request.query);
    const result = await inboxService.getInboxSummary(
      request.user.id,
      request.user.username,
      request.user.displayName,
      communityId,
    );
    return reply.send(result);
  });

  app.get('/api/inbox/community-summary', async (request, reply) => {
    const result = await inboxService.getInboxCommunitySummaries(
      request.user.id,
      request.user.username,
      request.user.displayName,
    );
    return reply.send(result);
  });

  app.post('/api/inbox/:messageId/read', async (request, reply) => {
    const { messageId } = InboxMessageParamsSchema.parse(request.params);
    const result = await inboxService.markInboxItemRead(request.user.id, messageId);
    return reply.send(result);
  });

  app.post('/api/inbox/read-all', async (request, reply) => {
    const { communityId, type } = InboxMarkAllReadSchema.parse(request.body ?? {});
    const result = await inboxService.markAllInboxRead(
      request.user.id,
      communityId,
      type,
    );
    return reply.send(result);
  });
}
