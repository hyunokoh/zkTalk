import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq, and } from 'drizzle-orm';
import { SystemRole } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { WebSocketEvent } from '@zktalk/shared';
import { AppError } from '../../lib/errors.js';
import { db } from '../../lib/db/index.js';
import { attachments, messages, channels, dmMessages, uploadSessions } from '../../lib/db/schema.js';
import {
  abortMultipartUpload as abortMultipartUploadInStorage,
  completeMultipartUpload as completeMultipartUploadInStorage,
  createMultipartPartUploadUrl,
  createMultipartUpload,
  createPresignedUploadUrl,
  getStorageBucket,
  getStoredObjectStream,
  headStoredObject,
} from '../../lib/s3.js';
import { checkPermission } from '../channel/channel.service.js';
import * as communityRepo from '../community/community.repository.js';
import * as messageRepo from '../message/message.repository.js';
import * as dmRepo from '../dm/dm.repository.js';
import { realtimeService } from '../realtime/realtime.service.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB attachments
export const MAX_ASSET_FILE_SIZE = 10 * 1024 * 1024; // 10 MB avatars/icons
export const SINGLE_PART_UPLOAD_MAX_BYTES = MAX_FILE_SIZE;
export const MULTIPART_CHUNK_SIZE = 10 * 1024 * 1024;
export const UPLOAD_SESSION_TTL_MS = 60 * 60 * 1000;

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'audio/',
  'video/',
  'application/',
  'text/',
];
const ASSET_ALLOWED_MIME_PREFIX = 'image/';

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

function isAllowedAssetMimeType(mimeType: string): boolean {
  return mimeType.startsWith(ASSET_ALLOWED_MIME_PREFIX);
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200);
}

function getTargetKind(data: {
  channelId?: string;
  conversationId?: string;
  targetKind?: 'channel_message' | 'thread_reply' | 'dm_message' | 'user_avatar' | 'community_icon';
}): 'channel_message' | 'thread_reply' | 'dm_message' | 'user_avatar' | 'community_icon' {
  if (data.targetKind) {
    return data.targetKind;
  }
  if (data.conversationId) {
    return 'dm_message';
  }
  return 'channel_message';
}

function getObjectKeyForSession(data: {
  targetKind: 'channel_message' | 'thread_reply' | 'dm_message' | 'user_avatar' | 'community_icon';
  communityId?: string | null;
  channelId?: string | null;
  conversationId?: string | null;
  fileName: string;
}): string {
  const sanitized = sanitizeFileName(data.fileName);
  switch (data.targetKind) {
    case 'dm_message':
      return `uploads/dm/${data.conversationId}/${uuidv7()}-${sanitized}`;
    case 'user_avatar':
      return `uploads/assets/users/${data.communityId ?? 'user'}/${uuidv7()}-${sanitized}`;
    case 'community_icon':
      return `uploads/assets/communities/${data.communityId}/${uuidv7()}-${sanitized}`;
    case 'thread_reply':
    case 'channel_message':
    default:
      return `uploads/${data.communityId}/${data.channelId}/${uuidv7()}-${sanitized}`;
  }
}

function formatLimit(limit: number): string {
  return `${limit / (1024 * 1024)}MB`;
}

function assertWithinFileSizeLimit(fileSize: number, limit: number): void {
  if (fileSize > limit) {
    throw AppError.badRequest(`File size exceeds maximum of ${formatLimit(limit)}`);
  }
}

function getFileSizeLimitForStorageKey(storageKey: string): number {
  const keyParts = path.posix.normalize(storageKey).split('/');
  return keyParts[1] === 'assets' ? MAX_ASSET_FILE_SIZE : MAX_FILE_SIZE;
}

// ---------------------------------------------------------------------------
// Upload sessions
// ---------------------------------------------------------------------------

export async function createUploadSession(
  userId: string,
  data: {
    channelId?: string;
    conversationId?: string;
    threadId?: string;
    targetKind?: 'channel_message' | 'thread_reply' | 'dm_message' | 'user_avatar' | 'community_icon';
    fileName: string;
    mimeType: string;
    fileSize: number;
  },
) {
  assertWithinFileSizeLimit(data.fileSize, MAX_FILE_SIZE);

  if (!isAllowedMimeType(data.mimeType)) {
    throw AppError.badRequest(
      'File type not allowed. Allowed: images, audio, video, application, and text files.',
    );
  }

  const targetKind = getTargetKind(data);
  const sanitizedFileName = sanitizeFileName(data.fileName);
  let communityId: string | null = null;
  let channelId: string | null = null;
  const conversationId: string | null = data.conversationId ?? null;

  if (data.channelId) {
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, data.channelId))
      .limit(1);

    if (!channel) {
      throw AppError.notFound('Channel not found');
    }

    await checkPermission(userId, channel.communityId, data.channelId, 'upload_attachment');
    communityId = channel.communityId;
    channelId = channel.id;
  } else if (data.conversationId) {
    const isParticipant = await dmRepo.isParticipant(data.conversationId, userId);
    if (!isParticipant) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }
  }

  const objectKey = getObjectKeyForSession({
    targetKind,
    communityId,
    channelId,
    conversationId,
    fileName: data.fileName,
  });
  const sessionId = uuidv7();
  const uploadMode = data.fileSize > SINGLE_PART_UPLOAD_MAX_BYTES ? 'multipart' : 'single';
  const partCount = uploadMode === 'multipart'
    ? Math.ceil(data.fileSize / MULTIPART_CHUNK_SIZE)
    : 1;
  const expiresAt = new Date(Date.now() + UPLOAD_SESSION_TTL_MS);

  const bucket = getStorageBucket();
  const multipartUploadId = uploadMode === 'multipart'
    ? await createMultipartUpload({ bucket, objectKey, contentType: data.mimeType })
    : null;
  const uploadUrl = uploadMode === 'single'
    ? await createPresignedUploadUrl({ bucket, objectKey, contentType: data.mimeType })
    : null;

  await db.insert(uploadSessions).values({
    id: sessionId,
    uploaderUserId: userId,
    targetKind,
    communityId,
    channelId,
    threadId: data.threadId ?? null,
    conversationId,
    fileName: data.fileName,
    sanitizedFileName,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    bucket,
    objectKey,
    multipartUploadId,
    partSize: uploadMode === 'multipart' ? MULTIPART_CHUNK_SIZE : null,
    partCount,
    status: uploadMode === 'multipart' ? 'multipart_ready' : 'single_ready',
    expiresAt,
  });

  return {
    sessionId,
    uploadMode,
    uploadUrl,
    storageKey: objectKey,
    partSize: uploadMode === 'multipart' ? MULTIPART_CHUNK_SIZE : null,
    partCount,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getUploadSessionPartUrls(
  userId: string,
  sessionId: string,
  partNumbers: number[],
) {
  const session = await getOwnedUploadSession(userId, sessionId);
  if (session.status !== 'multipart_ready' && session.status !== 'uploading') {
    throw AppError.badRequest('Upload session is not ready for multipart upload');
  }

  return {
    sessionId,
    parts: await Promise.all(partNumbers.map(async (partNumber) => ({
      partNumber,
      uploadUrl: await createMultipartPartUploadUrl({
        bucket: session.bucket,
        objectKey: session.objectKey,
        uploadId: session.multipartUploadId!,
        partNumber,
      }),
    }))),
  };
}

export async function completeUploadSession(
  userId: string,
  sessionId: string,
  parts: Array<{ partNumber: number; etag: string }>,
) {
  const session = await getOwnedUploadSession(userId, sessionId);
  if (session.status !== 'multipart_ready' && session.status !== 'uploading' && session.status !== 'single_ready') {
    throw AppError.badRequest('Upload session cannot be completed');
  }

  if (session.multipartUploadId) {
    await completeMultipartUploadInStorage({
      bucket: session.bucket,
      objectKey: session.objectKey,
      uploadId: session.multipartUploadId,
      parts,
    });
  }

  await db
    .update(uploadSessions)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(uploadSessions.id, sessionId));

  return {
    sessionId,
    completed: true,
    storageKey: session.objectKey,
    parts,
  };
}

export async function abortUploadSession(userId: string, sessionId: string) {
  const session = await getOwnedUploadSession(userId, sessionId);
  if (session.multipartUploadId) {
    await abortMultipartUploadInStorage({
      bucket: session.bucket,
      objectKey: session.objectKey,
      uploadId: session.multipartUploadId,
    });
  }
  await db
    .update(uploadSessions)
    .set({
      status: 'aborted',
      abortedAt: new Date(),
    })
    .where(eq(uploadSessions.id, sessionId));
}

async function getOwnedUploadSession(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(and(eq(uploadSessions.id, sessionId), eq(uploadSessions.uploaderUserId, userId)))
    .limit(1);

  if (!session) {
    throw AppError.notFound('Upload session not found');
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest('Upload session expired');
  }

  return session;
}

export async function generateUploadUrl(
  userId: string,
  data: {
    channelId?: string;
    conversationId?: string;
    threadId?: string;
    targetKind?: 'channel_message' | 'thread_reply' | 'dm_message' | 'user_avatar' | 'community_icon';
    fileName: string;
    mimeType: string;
    fileSize: number;
  },
) {
  return createUploadSession(userId, data);
}

async function assertCommunityManager(userId: string, communityId: string) {
  const roles = await communityRepo.getUserRolesInCommunity(communityId, userId);
  const canManage = roles.some(
    (role) => role.name === SystemRole.OWNER || role.name === SystemRole.ADMIN,
  );

  if (!canManage) {
    throw AppError.forbidden('You do not have permission to manage this community asset');
  }
}

export async function generateAssetUploadUrl(
  userId: string,
  data: {
    scope: 'user_avatar' | 'community_icon';
    communityId?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  },
) {
  assertWithinFileSizeLimit(data.fileSize, MAX_ASSET_FILE_SIZE);

  if (!isAllowedAssetMimeType(data.mimeType)) {
    throw AppError.badRequest('Only image files can be uploaded for avatars and community icons.');
  }

  const sanitized = sanitizeFileName(data.fileName);
  let storageKey = '';

  if (data.scope === 'user_avatar') {
    storageKey = `uploads/assets/users/${userId}/${uuidv7()}-${sanitized}`;
  } else {
    if (!data.communityId) {
      throw AppError.badRequest('communityId is required for community icons');
    }

    await assertCommunityManager(userId, data.communityId);
    storageKey = `uploads/assets/communities/${data.communityId}/${uuidv7()}-${sanitized}`;
  }

  return {
    uploadUrl: `/api/upload/files/${storageKey}`,
    storageKey,
    assetUrl: `/api/upload/assets/${storageKey.replace(/^uploads\/assets\//, '')}`,
  };
}

function resolveStoragePath(storageKey: string): string {
  const normalizedKey = path.posix.normalize(storageKey);
  if (!normalizedKey.startsWith('uploads/')) {
    throw AppError.badRequest('Invalid storage key');
  }

  const filePath = path.resolve(process.cwd(), normalizedKey);
  if (filePath !== UPLOADS_ROOT && !filePath.startsWith(`${UPLOADS_ROOT}${path.sep}`)) {
    throw AppError.badRequest('Invalid storage key');
  }

  return filePath;
}

export async function saveUploadedFile(
  userId: string,
  storageKey: string,
  fileBuffer: Buffer,
) {
  if (fileBuffer.length === 0) {
    throw AppError.badRequest('Uploaded file is empty');
  }
  const fileSizeLimit = getFileSizeLimitForStorageKey(storageKey);
  assertWithinFileSizeLimit(fileBuffer.length, fileSizeLimit);

  const keyParts = path.posix.normalize(storageKey).split('/');
  if (keyParts.length < 4) {
    throw AppError.badRequest('Invalid storage key');
  }

  if (keyParts[1] === 'assets') {
    const [, , assetScope, ownerId] = keyParts;

    if (assetScope === 'users') {
      if (ownerId !== userId) {
        throw AppError.forbidden('You can only upload your own avatar');
      }
    } else if (assetScope === 'communities') {
      await assertCommunityManager(userId, ownerId);
    } else {
      throw AppError.badRequest('Invalid asset storage key');
    }
  } else if (keyParts[1] === 'dm') {
    const conversationId = keyParts[2];
    if (!conversationId) {
      throw AppError.badRequest('Invalid DM storage key');
    }
    const isParticipant = await dmRepo.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw AppError.forbidden('You are not a participant in this conversation');
    }
  } else {
    const [, communityId, channelId] = keyParts;
    await checkPermission(userId, communityId, channelId, 'upload_attachment');
  }

  const filePath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, fileBuffer);
}

// ---------------------------------------------------------------------------
// Create an attachment record after upload completes
// ---------------------------------------------------------------------------

export async function createAttachment(
  userId: string,
  data: {
    messageId?: string;
    dmMessageId?: string;
    uploadSessionId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
  },
) {
  const session = await getOwnedUploadSession(userId, data.uploadSessionId);
  if (session.status !== 'completed') {
    throw AppError.badRequest('Upload session is not completed');
  }

  const fileSizeLimit = getFileSizeLimitForStorageKey(session.objectKey);
  assertWithinFileSizeLimit(data.fileSize, fileSizeLimit);

  try {
    await headStoredObject({
      bucket: session.bucket,
      objectKey: session.objectKey,
    });
  } catch {
    throw AppError.badRequest('Uploaded file was not found');
  }

  const existingAttachment = await db
    .select({ id: attachments.id })
    .from(attachments)
    .where(eq(attachments.uploadSessionId, session.id))
    .limit(1);
  if (existingAttachment.length > 0) {
    throw AppError.conflict('Upload session already attached');
  }

  const id = uuidv7();

  if (data.messageId) {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, data.messageId))
      .limit(1);

    if (!message) {
      throw AppError.notFound('Message not found');
    }

    if (message.authorUserId !== userId) {
      throw AppError.forbidden('You can only attach files to your own messages');
    }

    if (session.channelId !== message.channelId || session.communityId !== message.communityId) {
      throw AppError.badRequest('Upload session does not belong to this message channel');
    }

    const [attachment] = await db
      .insert(attachments)
      .values({
        id,
        messageId: data.messageId,
        dmMessageId: null,
        uploadSessionId: session.id,
        storageKey: session.objectKey,
        bucket: session.bucket,
        objectKey: session.objectKey,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        width: data.width ?? null,
        height: data.height ?? null,
      })
      .returning();

    const updatedMessage = await messageRepo.findMessageById(data.messageId);
    if (updatedMessage) {
      realtimeService.broadcastToChannel(
        message.channelId,
        WebSocketEvent.MESSAGE_UPDATED,
        updatedMessage,
      );
    }

    return attachment;
  }

  if (!data.dmMessageId) {
    throw AppError.badRequest('Message target is required');
  }

  const [dmMessage] = await db
    .select()
    .from(dmMessages)
    .where(eq(dmMessages.id, data.dmMessageId))
    .limit(1);

  if (!dmMessage) {
    throw AppError.notFound('DM message not found');
  }

  if (dmMessage.authorUserId !== userId) {
    throw AppError.forbidden('You can only attach files to your own messages');
  }

  if (session.conversationId !== dmMessage.conversationId) {
    throw AppError.badRequest('Upload session does not belong to this DM conversation');
  }

  const [attachment] = await db
    .insert(attachments)
    .values({
      id,
      messageId: null,
      dmMessageId: data.dmMessageId,
      uploadSessionId: session.id,
      storageKey: session.objectKey,
      bucket: session.bucket,
      objectKey: session.objectKey,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      width: data.width ?? null,
      height: data.height ?? null,
    })
    .returning();

  const updatedDmMessage = await dmRepo.findDmMessageById(data.dmMessageId);
  if (updatedDmMessage) {
    const participantUserIds = await dmRepo.getParticipantUserIds(dmMessage.conversationId);
    for (const participantUserId of participantUserIds) {
      realtimeService.sendToUser(
        participantUserId,
        WebSocketEvent.DM_MESSAGE_UPDATED,
        updatedDmMessage,
        { conversationId: dmMessage.conversationId },
      );
    }
  }

  return attachment;
}

// ---------------------------------------------------------------------------
// Get attachments for a message
// ---------------------------------------------------------------------------

export async function getAttachments(messageId: string) {
  return db
    .select()
    .from(attachments)
    .where(eq(attachments.messageId, messageId));
}

export async function getAttachmentFileForUser(userId: string, attachmentId: string) {
  const [row] = await db
    .select({
      attachment: attachments,
      message: {
        communityId: messages.communityId,
        channelId: messages.channelId,
      },
    })
    .from(attachments)
    .innerJoin(messages, eq(attachments.messageId, messages.id))
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (row) {
    await checkPermission(
      userId,
      row.message.communityId,
      row.message.channelId,
      'view_channel',
    );

    try {
      const stream = await getStoredObjectStream({
        bucket: row.attachment.bucket,
        objectKey: row.attachment.objectKey || row.attachment.storageKey,
      });
      return {
        stream,
        mimeType: row.attachment.mimeType,
        fileName: row.attachment.fileName,
      };
    } catch {
      throw AppError.notFound('Attachment file not found');
    }
  }

  const [dmRow] = await db
    .select({
      attachment: attachments,
      dmMessage: {
        conversationId: dmMessages.conversationId,
      },
    })
    .from(attachments)
    .innerJoin(dmMessages, eq(attachments.dmMessageId, dmMessages.id))
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (!dmRow) {
    throw AppError.notFound('Attachment not found');
  }

  const isParticipant = await dmRepo.isParticipant(dmRow.dmMessage.conversationId, userId);
  if (!isParticipant) {
    throw AppError.forbidden('You do not have access to this attachment');
  }

  try {
    const stream = await getStoredObjectStream({
      bucket: dmRow.attachment.bucket,
      objectKey: dmRow.attachment.objectKey || dmRow.attachment.storageKey,
    });
    return {
      stream,
      mimeType: dmRow.attachment.mimeType,
      fileName: dmRow.attachment.fileName,
    };
  } catch {
    throw AppError.notFound('Attachment file not found');
  }
}

function inferAssetMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/png';
  }
}

export async function getAssetFile(assetPath: string) {
  const storageKey = `uploads/assets/${assetPath}`;

  try {
    const stream = await getStoredObjectStream({
      bucket: getStorageBucket(),
      objectKey: storageKey,
    });
    return {
      stream,
      fileName: path.posix.basename(storageKey),
      mimeType: inferAssetMimeType(storageKey),
    };
  } catch {
    throw AppError.notFound('Asset file not found');
  }
}
