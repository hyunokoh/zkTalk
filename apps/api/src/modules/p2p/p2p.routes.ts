import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as p2pService from './p2p.service.js';
import { CreateP2pFileSchema, FileIdParamsSchema } from './p2p.schema.js';

export default async function p2pRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // POST /api/p2p/files
  // Register a new P2P file (metadata only, no file data touches the server).
  // -------------------------------------------------------------------------
  app.post(
    '/api/p2p/files',
    async (
      request: FastifyRequest<{
        Body: {
          channelId?: string;
          conversationId?: string;
          fileName: string;
          fileSize: number;
          mimeType: string;
          fileHash: string;
          chunkCount: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const body = CreateP2pFileSchema.parse(request.body);
      const file = await p2pService.createP2pFile(request.user.id, body);
      return reply.status(201).send({ file });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/p2p/files/:fileId
  // Get P2P file metadata.
  // -------------------------------------------------------------------------
  app.get(
    '/api/p2p/files/:fileId',
    async (
      request: FastifyRequest<{ Params: { fileId: string } }>,
      reply: FastifyReply,
    ) => {
      const { fileId } = FileIdParamsSchema.parse(request.params);
      const file = await p2pService.getP2pFile(fileId);
      return reply.send({ file });
    },
  );
}
