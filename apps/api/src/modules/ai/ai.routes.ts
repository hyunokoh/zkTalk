import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import * as aiService from './ai.service.js';

const SummarizeBodySchema = z.object({
  messageCount: z.number().int().min(3).max(200).optional(),
});

export default async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post(
    '/api/channels/:channelId/ai/summarize',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: { messageCount?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = request.params;
      const body = SummarizeBodySchema.parse(request.body);

      const result = await aiService.summarizeChannel(
        channelId,
        body.messageCount,
      );

      return reply.send(result);
    },
  );
}
