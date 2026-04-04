import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as pinService from './pin.service.js';
import { PinParamsSchema, ChannelIdParamsSchema } from './pin.schema.js';

export default async function pinRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // POST /api/channels/:channelId/pins/:messageId
  // Pin a message in a channel.
  // -------------------------------------------------------------------------
  app.post(
    '/api/channels/:channelId/pins/:messageId',
    async (
      request: FastifyRequest<{
        Params: { channelId: string; messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId, messageId } = PinParamsSchema.parse(request.params);

      const pin = await pinService.pinMessage(
        request.user.id,
        channelId,
        messageId,
      );

      return reply.status(201).send(pin);
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /api/channels/:channelId/pins/:messageId
  // Unpin a message from a channel.
  // -------------------------------------------------------------------------
  app.delete(
    '/api/channels/:channelId/pins/:messageId',
    async (
      request: FastifyRequest<{
        Params: { channelId: string; messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId, messageId } = PinParamsSchema.parse(request.params);

      await pinService.unpinMessage(
        request.user.id,
        channelId,
        messageId,
      );

      return reply.status(204).send();
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/channels/:channelId/pins
  // List pinned messages in a channel.
  // -------------------------------------------------------------------------
  app.get(
    '/api/channels/:channelId/pins',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);

      const pins = await pinService.getPinnedMessages(
        request.user.id,
        channelId,
      );

      return reply.send({ pins });
    },
  );
}
