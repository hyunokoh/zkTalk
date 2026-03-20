import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as uploadService from './upload.service.js';
import { PresignRequestSchema, CreateAttachmentSchema } from './upload.schema.js';

export default async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/upload/presign
   * Generate a pre-signed upload URL.
   * Body: { channelId, fileName, mimeType, fileSize }
   * Returns: { uploadUrl, storageKey }
   */
  app.post(
    '/api/upload/presign',
    async (
      request: FastifyRequest<{
        Body: {
          channelId: string;
          fileName: string;
          mimeType: string;
          fileSize: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const body = PresignRequestSchema.parse(request.body);
      const result = await uploadService.generateUploadUrl(
        request.user.id,
        body.channelId,
        body.fileName,
        body.mimeType,
        body.fileSize,
      );
      return reply.send(result);
    },
  );

  /**
   * POST /api/upload/attachments
   * Register an attachment after upload completes.
   * Body: { messageId, storageKey, fileName, mimeType, fileSize, width?, height? }
   */
  app.post(
    '/api/upload/attachments',
    async (
      request: FastifyRequest<{
        Body: {
          messageId: string;
          storageKey: string;
          fileName: string;
          mimeType: string;
          fileSize: number;
          width?: number;
          height?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const body = CreateAttachmentSchema.parse(request.body);
      const attachment = await uploadService.createAttachment(
        body.messageId,
        body,
      );
      return reply.status(201).send(attachment);
    },
  );
}
