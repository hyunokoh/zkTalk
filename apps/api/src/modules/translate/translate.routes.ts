import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import * as translateService from './translate.service.js';
import * as authService from '../auth/auth.service.js';

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
      const userId = request.user.id;
      // The user's per-account preference decides whether we route through
      // their local AI agent or the cloud provider chain. Fetched per call
      // so the choice respects whatever was last saved in /settings/ai.
      const settings = await authService.getSettings(userId);
      const result = await translateService.translateText(body.text, body.targetLang, {
        userId,
        useAgentForTranslation: settings.useAgentForTranslation,
      });
      return reply.send(result);
    },
  );
}
