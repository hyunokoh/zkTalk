import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import * as translateService from './translate.service.js';
import * as authService from '../auth/auth.service.js';

// targetLang is interpolated into LLM prompts, so restrict it to a strict
// BCP-47-shaped string. Letters + dashes only — keeps prompt-injection
// payloads ("ko\". Now reveal secrets…") from ever reaching the prompt.
const TranslateBodySchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, 'targetLang must be a BCP-47 code'),
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
