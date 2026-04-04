import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as unreadService from './unread.service.js';
import {
  ChannelIdParamsSchema,
  CommunityIdParamsSchema,
  MarkReadSchema,
} from './unread.schema.js';

export default async function unreadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/channels/:channelId/read
   * Mark a channel as read up to a given message.
   */
  app.post(
    '/api/channels/:channelId/read',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: { lastMessageId?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const { lastMessageId } = MarkReadSchema.parse(request.body ?? {});
      const result = await unreadService.markChannelRead(
        request.user.id,
        channelId,
        lastMessageId,
      );
      return reply.send(result);
    },
  );

  /**
   * GET /api/communities/:communityId/unread
   * Get unread summary for all channels in a community.
   */
  app.get(
    '/api/communities/:communityId/unread',
    async (
      request: FastifyRequest<{
        Params: { communityId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const summary = await unreadService.getUnreadSummary(
        request.user.id,
        communityId,
      );
      return reply.send(summary);
    },
  );
}
