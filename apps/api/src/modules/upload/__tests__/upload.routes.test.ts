import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../lib/errors.js';

vi.mock('../upload.service.js', () => ({
  MAX_FILE_SIZE: 1024 * 1024 * 1024,
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

describe('upload.routes auth behavior', () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zktalk-upload-routes-'));
    tmpFile = path.join(tmpDir, 'asset.png');
    fs.writeFileSync(tmpFile, Buffer.from('asset-test'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
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

  it('serves public assets without authentication', async () => {
    mockedUploadService.getAssetFile.mockResolvedValue({
      stream: fs.createReadStream(tmpFile),
      fileName: 'asset.png',
      mimeType: 'image/png',
    } as Awaited<ReturnType<typeof uploadService.getAssetFile>>);

    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/upload/assets/users/user-1/asset.png',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(mockedUploadService.getAssetFile).toHaveBeenCalledWith('users/user-1/asset.png');

    await app.close();
  });

  it('keeps private attachment downloads protected by auth', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/upload/attachments/attachment-1/file',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: 'UNAUTHORIZED',
    });
    expect(mockedUploadService.getAttachmentFileForUser).not.toHaveBeenCalled();

    await app.close();
  });
});
