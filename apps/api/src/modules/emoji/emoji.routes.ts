import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as emojiService from './emoji.service.js';
import {
  CommunityIdParamsSchema,
  EmojiIdParamsSchema,
  CreateEmojiSchema,
} from './emoji.schema.js';

export default async function emojiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/communities/:communityId/emojis
  app.get(
    '/api/communities/:communityId/emojis',
    async (
      request: FastifyRequest<{ Params: { communityId: string } }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const emojis = await emojiService.getEmojis(communityId);
      return reply.send({ emojis });
    },
  );

  // POST /api/communities/:communityId/emojis
  app.post(
    '/api/communities/:communityId/emojis',
    async (
      request: FastifyRequest<{
        Params: { communityId: string };
        Body: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const body = CreateEmojiSchema.parse(request.body);
      const emoji = await emojiService.createEmoji(communityId, request.user.id, body);
      return reply.status(201).send({ emoji });
    },
  );

  // DELETE /api/emojis/:emojiId
  app.delete(
    '/api/emojis/:emojiId',
    async (
      request: FastifyRequest<{ Params: { emojiId: string } }>,
      reply: FastifyReply,
    ) => {
      const { emojiId } = EmojiIdParamsSchema.parse(request.params);
      await emojiService.deleteEmoji(emojiId, request.user.id);
      return reply.status(204).send();
    },
  );
}
