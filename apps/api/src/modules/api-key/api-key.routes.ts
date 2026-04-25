import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import * as service from './api-key.service.js';
import { API_KEY_SCOPES } from './api-key.scopes.js';

const CreateBodySchema = z.object({
  name: z.string().min(1).max(64),
  scopes: z.array(z.string()).min(1).max(32),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * Manage your own API keys via the regular session-cookie auth. Keys
 * created here are then used by external programs to call /v1/* routes.
 */
export default async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/api-keys', async (request, reply) => {
    const keys = await service.listKeys(request.user.id);
    return reply.send({ keys, availableScopes: API_KEY_SCOPES });
  });

  app.post('/api/api-keys', async (request, reply) => {
    const body = CreateBodySchema.parse(request.body);
    const issued = await service.createKey(request.user.id, {
      name: body.name,
      scopes: body.scopes,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    // The plaintextKey is returned ONCE — caller must store it.
    return reply.status(201).send({ key: issued });
  });

  app.delete<{ Params: { keyId: string } }>(
    '/api/api-keys/:keyId',
    async (request, reply) => {
      await service.revokeKey(request.user.id, request.params.keyId);
      return reply.status(204).send();
    },
  );
}
