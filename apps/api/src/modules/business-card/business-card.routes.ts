import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import {
  CreateBusinessCardSchema,
  UpdateBusinessCardSchema,
} from '@zktalk/shared';
import * as service from './business-card.service.js';

export default async function businessCardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/business-cards', async (request, reply) => {
    const q = request.query as { search?: string; limit?: string };
    const limit = q.limit ? Number(q.limit) : undefined;
    const cards = await service.listCards(request.user.id, {
      search: q.search,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return reply.send({ cards });
  });

  app.post('/api/business-cards', async (request, reply) => {
    const body = CreateBusinessCardSchema.parse(request.body);
    const card = await service.createCard(request.user.id, body);
    return reply.status(201).send({ card });
  });

  app.get<{ Params: { cardId: string } }>(
    '/api/business-cards/:cardId',
    async (request, reply) => {
      const card = await service.getCard(request.user.id, request.params.cardId);
      return reply.send({ card });
    },
  );

  app.patch<{ Params: { cardId: string } }>(
    '/api/business-cards/:cardId',
    async (request, reply) => {
      const body = UpdateBusinessCardSchema.parse(request.body);
      const card = await service.updateCard(
        request.user.id,
        request.params.cardId,
        body,
      );
      return reply.send({ card });
    },
  );

  app.delete<{ Params: { cardId: string } }>(
    '/api/business-cards/:cardId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await service.deleteCard(
        request.user.id,
        (request.params as { cardId: string }).cardId,
      );
      return reply.status(204).send();
    },
  );
}
