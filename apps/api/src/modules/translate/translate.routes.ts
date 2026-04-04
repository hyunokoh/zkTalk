import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import * as translateService from './translate.service.js';

const TranslateBodySchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.string().min(2).max(10),
});

export default async function translateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post(
    '/api/translate',
    async (
      request: FastifyRequest<{
        Body: { text: string; targetLang: string };
      }>,
      reply: FastifyReply,
    ) => {
      const body = TranslateBodySchema.parse(request.body);
      const result = await translateService.translateText(body.text, body.targetLang);
      return reply.send(result);
    },
  );
}
