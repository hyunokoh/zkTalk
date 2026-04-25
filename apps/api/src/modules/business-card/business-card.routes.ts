import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import {
  CreateBusinessCardSchema,
  UpdateBusinessCardSchema,
} from '@zktalk/shared';
import * as service from './business-card.service.js';

const ExtractBodySchema = z.object({
  imageUrl: z.string().url().max(2048),
});

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

  // Read the fields off a card image with vision-capable AI. Returns null
  // for any field the model can't see; the client merges those into the
  // form so the user can correct or fill in by hand.
  app.post('/api/business-cards/extract', async (request, reply) => {
    const body = ExtractBodySchema.parse(request.body);
    const fields = await service.extractBusinessCardFromImage(body.imageUrl);
    return reply.send({ fields });
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
