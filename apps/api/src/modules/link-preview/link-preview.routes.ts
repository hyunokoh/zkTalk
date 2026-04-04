import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as linkPreviewService from './link-preview.service.js';

export default async function linkPreviewRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get(
    '/api/link-preview',
    async (
      request: FastifyRequest<{ Querystring: { url: string } }>,
      reply: FastifyReply,
    ) => {
      const { url } = request.query;
      if (!url) return reply.status(400).send({ error: 'URL required' });

      const preview = await linkPreviewService.getPreview(url);
      return reply.send(preview);
    },
  );
}
