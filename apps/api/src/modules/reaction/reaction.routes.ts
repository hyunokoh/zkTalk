import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as reactionService from './reaction.service.js';
import {
  MessageIdParamsSchema,
  ReactionParamsSchema,
  AddReactionSchema,
  BatchReactionsQuerySchema,
} from './reaction.schema.js';

export default async function reactionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get(
    '/api/reactions',
    async (
      request: FastifyRequest<{
        Querystring: { messageIds: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageIds } = BatchReactionsQuerySchema.parse(request.query);
      const reactionsByMessageId = await reactionService.getReactionsForMessages(
        messageIds
          .split(',')
          .map((messageId) => messageId.trim())
          .filter(Boolean),
      );
      return reply.send({ reactionsByMessageId });
    },
  );

  /**
   * POST /api/messages/:messageId/reactions
   * Add a reaction to a message.
   */
  app.post(
    '/api/messages/:messageId/reactions',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
        Body: { emoji: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = MessageIdParamsSchema.parse(request.params);
      const { emoji } = AddReactionSchema.parse(request.body);
      const reaction = await reactionService.addReaction(
        request.user.id,
        messageId,
        emoji,
      );
      return reply.status(201).send(reaction);
    },
  );

  /**
   * DELETE /api/messages/:messageId/reactions/:emoji
   * Remove own reaction from a message.
   */
  app.delete(
    '/api/messages/:messageId/reactions/:emoji',
    async (
      request: FastifyRequest<{
        Params: { messageId: string; emoji: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId, emoji } = ReactionParamsSchema.parse(request.params);
      const result = await reactionService.removeReaction(
        request.user.id,
        messageId,
        emoji,
      );
      return reply.send(result);
    },
  );

  /**
   * GET /api/messages/:messageId/reactions
   * Get all reactions for a message.
   */
  app.get(
    '/api/messages/:messageId/reactions',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = MessageIdParamsSchema.parse(request.params);
      const reactions = await reactionService.getReactions(messageId);
      return reply.send(reactions);
    },
  );
}
