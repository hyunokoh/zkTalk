import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import * as aiService from './ai.service.js';

const SummarizeBodySchema = z.object({
  messageCount: z.number().int().min(3).max(200).optional(),
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

const ChatBodySchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
});

export default async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/ai/runtime', async (_request, reply) => {
    return reply.send(aiService.getAIRuntimeSummary());
  });

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

  // ── AI Chat ──────────────────────────────────────────────────────

  app.post(
    '/api/ai/chat',
    async (
      request: FastifyRequest<{ Body: { messages: Array<{ role: string; content: string }> } }>,
      reply: FastifyReply,
    ) => {
      const body = ChatBodySchema.parse(request.body);
      const result = await aiService.chatWithAI(body.messages);
      return reply.send(result);
    },
  );
}
