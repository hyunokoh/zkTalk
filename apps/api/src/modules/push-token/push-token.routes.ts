import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { RegisterPushTokenSchema } from './push-token.schema.js';
import * as pushTokenService from './push-token.service.js';

export default async function pushTokenRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/me/push-token
   * Register a push notification token for the current user.
   */
  app.post(
    '/api/me/push-token',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = RegisterPushTokenSchema.parse(request.body);
      const result = await pushTokenService.registerToken(
        request.user.id,
        body.token,
        body.platform,
      );
      return reply.status(201).send(result);
    },
  );

  /**
   * DELETE /api/me/push-token
   * Remove all push tokens for the current user (call on logout).
   */
  app.delete(
    '/api/me/push-token',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await pushTokenService.unregisterAllTokens(request.user.id);
      return reply.status(204).send();
    },
  );
}
