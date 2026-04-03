import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../lib/errors.js';

vi.mock('../../../middleware/auth.js', () => ({
  authenticate: vi.fn(async (request: { user?: unknown }) => {
    request.user = {
      id: 'user-1',
      email: 'user-1@example.com',
      displayName: 'User One',
      username: 'userone',
    };
  }),
}));

vi.mock('../upload.service.js', () => ({
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  getAssetFile: vi.fn(),
  getAttachmentFileForUser: vi.fn(),
  createUploadSession: vi.fn(),
  generateUploadUrl: vi.fn(),
  getUploadSessionPartUrls: vi.fn(),
  completeUploadSession: vi.fn(),
  abortUploadSession: vi.fn(),
  generateAssetUploadUrl: vi.fn(),
  saveUploadedFile: vi.fn(),
  createAttachment: vi.fn(),
}));

import uploadRoutes from '../upload.routes.js';
import * as uploadService from '../upload.service.js';

const mockedUploadService = vi.mocked(uploadService);

describe('upload.routes presign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function buildApp() {
    const app = Fastify();
    await app.register(cookie, {
      secret: 'test-cookie-secret',
    });

    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    });

    await app.register(uploadRoutes);
    return app;
  }

  it('accepts DM conversation presign requests', async () => {
    mockedUploadService.createUploadSession.mockResolvedValue({
      sessionId: 'upload-session-1',
      uploadMode: 'single',
      uploadUrl: '/api/upload/files/uploads/dm/conversation-1/test.png',
      storageKey: 'uploads/dm/conversation-1/test.png',
      partSize: null,
      partCount: 1,
      expiresAt: new Date().toISOString(),
    });

    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/upload/presign',
      payload: {
        conversationId: 'conversation-1',
        fileName: 'test.png',
        mimeType: 'image/png',
        fileSize: 1234,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockedUploadService.createUploadSession).toHaveBeenCalledWith('user-1', {
      conversationId: 'conversation-1',
      fileName: 'test.png',
      mimeType: 'image/png',
      fileSize: 1234,
    });

    await app.close();
  });

  it('accepts direct uploads larger than 10MB for attachments', async () => {
    const app = await buildApp();
    const payload = Buffer.alloc(12 * 1024 * 1024, 1);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/upload/files/uploads/dm/conversation-1/large.pdf',
      headers: {
        'content-type': 'application/pdf',
      },
      payload,
    });

    expect(response.statusCode).toBe(204);
    expect(mockedUploadService.saveUploadedFile).toHaveBeenCalledWith(
      'user-1',
      'uploads/dm/conversation-1/large.pdf',
      expect.any(Buffer),
    );

    await app.close();
  });
});
