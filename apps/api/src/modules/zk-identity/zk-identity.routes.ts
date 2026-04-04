import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as zkIdentityService from './zk-identity.service.js';
import {
  UserIdParamsSchema,
  CreateZkCredentialSchema,
} from './zk-identity.schema.js';

export default async function zkIdentityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // POST /api/me/zk-credentials
  // Add a ZK credential for the current user.
  // -------------------------------------------------------------------------
  app.post(
    '/api/me/zk-credentials',
    async (
      request: FastifyRequest<{
        Body: {
          credentialType: string;
          credentialHash: string;
          metadata?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const body = CreateZkCredentialSchema.parse(request.body);

      const credential = await zkIdentityService.addCredential(
        request.user.id,
        body,
      );

      return reply.status(201).send(credential);
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/users/:userId/zk-credentials
  // Get public credential badges for a user.
  // -------------------------------------------------------------------------
  app.get(
    '/api/users/:userId/zk-credentials',
    async (
      request: FastifyRequest<{
        Params: { userId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { userId } = UserIdParamsSchema.parse(request.params);

      const credentials = await zkIdentityService.getUserCredentials(userId);

      return reply.send({ credentials });
    },
  );
}
