import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../lib/errors.js';

vi.mock('../../../lib/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  },
}));

vi.mock('../../channel/channel.service.js', () => ({
  checkPermission: vi.fn(),
}));

vi.mock('../../community/community.repository.js', () => ({
  getUserRolesInCommunity: vi.fn(),
}));

vi.mock('../../dm/dm.repository.js', () => ({
  isParticipant: vi.fn(),
}));

vi.mock('../../../lib/s3.js', () => ({
  createPresignedUploadUrl: vi.fn(async ({ objectKey }: { objectKey: string }) => `https://storage.test/${objectKey}`),
  createMultipartUpload: vi.fn(async () => 'multipart-upload-id'),
  createMultipartPartUploadUrl: vi.fn(async ({ objectKey, partNumber }: { objectKey: string; partNumber: number }) => `https://storage.test/${objectKey}?partNumber=${partNumber}`),
  completeMultipartUpload: vi.fn(),
  abortMultipartUpload: vi.fn(),
  getStorageBucket: vi.fn(() => 'zktalk-uploads'),
}));

import * as dmRepo from '../../dm/dm.repository.js';
import {
  MAX_FILE_SIZE,
  generateAssetUploadUrl,
  generateUploadUrl,
} from '../upload.service.js';

const mockedDmRepo = vi.mocked(dmRepo);

describe('upload.service generateUploadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows DM participants to presign uploads for their conversation', async () => {
    mockedDmRepo.isParticipant.mockResolvedValue(true);

    const result = await generateUploadUrl('user-1', {
      conversationId: 'conversation-1',
      fileName: 'photo.png',
      mimeType: 'image/png',
      fileSize: 1024,
    });

    expect(mockedDmRepo.isParticipant).toHaveBeenCalledWith('conversation-1', 'user-1');
    expect(result.uploadUrl).toContain('https://storage.test/uploads/dm/conversation-1/');
    expect(result.storageKey).toContain('uploads/dm/conversation-1/');
    expect(result.storageKey).toContain('photo.png');
    expect(result.sessionId).toBeTruthy();
    expect(result.uploadMode).toBe('single');
    expect(result.partCount).toBe(1);
  });

  it('allows generic application files for DM uploads', async () => {
    mockedDmRepo.isParticipant.mockResolvedValue(true);

    const result = await generateUploadUrl('user-1', {
      conversationId: 'conversation-1',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      fileSize: 12 * 1024 * 1024,
    });

    expect(result.uploadUrl).toContain('https://storage.test/uploads/dm/conversation-1/');
    expect(result.storageKey).toContain('report.pdf');
  });

  it('allows presigned attachment uploads up to 50MB', async () => {
    mockedDmRepo.isParticipant.mockResolvedValue(true);

    const result = await generateUploadUrl('user-1', {
      conversationId: 'conversation-1',
      fileName: 'large-report.pdf',
      mimeType: 'application/pdf',
      fileSize: MAX_FILE_SIZE,
    });

    expect(result.uploadMode).toBe('multipart');
    expect(result.uploadUrl).toBeNull();
    expect(result.partCount).toBeGreaterThan(1);
    expect(result.storageKey).toContain('large-report.pdf');
  });

  it('rejects attachment presign requests above 1GB', async () => {
    mockedDmRepo.isParticipant.mockResolvedValue(true);

    await expect(
      generateUploadUrl('user-1', {
        conversationId: 'conversation-1',
        fileName: 'too-large.pdf',
        mimeType: 'application/pdf',
        fileSize: MAX_FILE_SIZE + 1,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'File size exceeds maximum of 1024MB',
    } satisfies Partial<AppError>);
  });

  it('keeps avatar uploads capped at 10MB', async () => {
    await expect(
      generateAssetUploadUrl('user-1', {
        scope: 'user_avatar',
        fileName: 'avatar.png',
        mimeType: 'image/png',
        fileSize: (10 * 1024 * 1024) + 1,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'File size exceeds maximum of 10MB',
    } satisfies Partial<AppError>);
  });

  it('rejects DM presign when the user is not a participant', async () => {
    mockedDmRepo.isParticipant.mockResolvedValue(false);

    await expect(
      generateUploadUrl('user-9', {
        conversationId: 'conversation-1',
        fileName: 'secret.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    } satisfies Partial<AppError>);
  });
});
