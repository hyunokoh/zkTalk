import { createReadStream } from 'node:fs';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as uploadService from './upload.service.js';
import {
  UploadSessionRequestSchema,
  UploadSessionPartRequestSchema,
  CompleteUploadSessionSchema,
  SessionIdParamsSchema,
  AssetPresignRequestSchema,
  CreateAttachmentSchema,
} from './upload.schema.js';

function toSafeAsciiFileName(fileName: string): string {
  const normalized = fileName.normalize('NFKD');
  const asciiOnly = normalized.replace(/[^\x20-\x7E]/g, '_');
  const escaped = asciiOnly.replace(/["\\]/g, '_').replace(/[;\r\n]/g, '_');
  const compact = escaped.replace(/_{2,}/g, '_').trim();
  return compact || 'file';
}

function encodeDispositionFileName(fileName: string): string {
  return encodeURIComponent(fileName).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildInlineContentDisposition(fileName: string): string {
  return `inline; filename="${toSafeAsciiFileName(fileName)}"; filename*=UTF-8''${encodeDispositionFileName(fileName)}`;
}

export default async function uploadRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    /^(image\/.*|audio\/.*|video\/.*|text\/.*|application\/.*)$/,
    { parseAs: 'buffer' },
    (_request, body, done) => done(null, body),
  );

  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'GET' && request.url.startsWith('/api/upload/assets/')) {
      return;
    }

    await authenticate(request, reply);
  });

  app.post(
    '/api/upload/sessions',
    async (
      request: FastifyRequest<{
        Body: {
          channelId?: string;
          conversationId?: string;
          threadId?: string;
          targetKind?: 'channel_message' | 'thread_reply' | 'dm_message' | 'user_avatar' | 'community_icon';
          fileName: string;
          mimeType: string;
          fileSize: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const body = UploadSessionRequestSchema.parse(request.body);
      const result = await uploadService.createUploadSession(request.user.id, body);
      return reply.send(result);
    },
  );

  app.post(
    '/api/upload/sessions/:sessionId/parts',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: { partNumbers: number[] };
      }>,
      reply: FastifyReply,
    ) => {
      const { sessionId } = SessionIdParamsSchema.parse(request.params);
      const body = UploadSessionPartRequestSchema.parse(request.body);
      const result = await uploadService.getUploadSessionPartUrls(request.user.id, sessionId, body.partNumbers);
      return reply.send(result);
    },
  );

  app.post(
    '/api/upload/sessions/:sessionId/complete',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: { parts: Array<{ partNumber: number; etag: string }> };
      }>,
      reply: FastifyReply,
    ) => {
      const { sessionId } = SessionIdParamsSchema.parse(request.params);
      const body = CompleteUploadSessionSchema.parse(request.body);
      const result = await uploadService.completeUploadSession(request.user.id, sessionId, body.parts);
      return reply.send(result);
    },
  );

  app.post(
    '/api/upload/sessions/:sessionId/abort',
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { sessionId } = SessionIdParamsSchema.parse(request.params);
      await uploadService.abortUploadSession(request.user.id, sessionId);
      return reply.status(204).send();
    },
  );

  app.post(
    '/api/upload/presign',
    async (
      request: FastifyRequest<{
        Body: {
          channelId?: string;
          conversationId?: string;
          threadId?: string;
          targetKind?: 'channel_message' | 'thread_reply' | 'dm_message' | 'user_avatar' | 'community_icon';
          fileName: string;
          mimeType: string;
          fileSize: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const body = UploadSessionRequestSchema.parse(request.body);
      const result = await uploadService.createUploadSession(request.user.id, body);
      return reply.send({
        uploadSessionId: result.sessionId,
        uploadUrl: result.uploadUrl,
        storageKey: result.storageKey,
        uploadMode: result.uploadMode,
        partSize: result.partSize,
        partCount: result.partCount,
      });
    },
  );
  app.post(
    '/api/upload/assets/presign',
    async (
      request: FastifyRequest<{
        Body: {
          scope: 'user_avatar' | 'community_icon';
          communityId?: string;
          fileName: string;
          mimeType: string;
          fileSize: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const body = AssetPresignRequestSchema.parse(request.body);
      const result = await uploadService.generateAssetUploadUrl(request.user.id, body);
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
          uploadSessionId: string;
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
        request.user.id,
        body,
      );
      return reply.status(201).send(attachment);
    },
  );

  app.put(
    '/api/upload/files/*',
    {
      bodyLimit: uploadService.MAX_FILE_SIZE,
    },
    async (
      request: FastifyRequest<{
        Params: { '*': string };
        Body: Buffer;
      }>,
      reply: FastifyReply,
    ) => {
      const storageKey = request.params['*'];
      await uploadService.saveUploadedFile(request.user.id, storageKey, request.body);
      return reply.status(204).send();
    },
  );

  app.get(
    '/api/upload/attachments/:attachmentId/file',
    async (
      request: FastifyRequest<{
        Params: {
          attachmentId: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const file = await uploadService.getAttachmentFileForUser(
        request.user.id,
        request.params.attachmentId,
      );

      reply.header('Cache-Control', 'private, max-age=300');
      reply.header('Content-Disposition', buildInlineContentDisposition(file.fileName));
      return reply.type(file.mimeType).send(createReadStream(file.filePath));
    },
  );

  app.get(
    '/api/upload/assets/*',
    async (
      request: FastifyRequest<{
        Params: { '*': string };
      }>,
      reply: FastifyReply,
    ) => {
      const asset = await uploadService.getAssetFile(request.params['*']);
      reply.header('Cache-Control', 'public, max-age=300');
      reply.header('Content-Disposition', buildInlineContentDisposition(asset.fileName));
      return reply.type(asset.mimeType).send(createReadStream(asset.filePath));
    },
  );
}
