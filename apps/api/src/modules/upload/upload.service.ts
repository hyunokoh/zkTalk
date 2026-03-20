import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import { db } from '../../lib/db/index.js';
import { attachments, messages, channels } from '../../lib/db/schema.js';
import { checkPermission } from '../channel/channel.service.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'text/'];

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200);
}

// ---------------------------------------------------------------------------
// Generate a pre-signed upload URL
// ---------------------------------------------------------------------------

/**
 * For MVP, this generates a storageKey and returns a mock upload URL.
 * Real S3/MinIO integration replaces the URL generation.
 */
export async function generateUploadUrl(
  userId: string,
  channelId: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
) {
  if (fileSize > MAX_FILE_SIZE) {
    throw AppError.badRequest(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  if (!isAllowedMimeType(mimeType)) {
    throw AppError.badRequest(
      'File type not allowed. Allowed: images, PDFs, and text files.',
    );
  }

  // Resolve community from channel for permission check
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel) {
    throw AppError.notFound('Channel not found');
  }

  await checkPermission(userId, channel.communityId, channelId, 'upload_attachment');

  const sanitized = sanitizeFileName(fileName);
  const storageKey = `uploads/${channel.communityId}/${uuidv7()}-${sanitized}`;

  // MVP: mock presigned URL pointing to local API endpoint
  const uploadUrl = `/api/upload/files/${storageKey}`;

  return { uploadUrl, storageKey };
}

// ---------------------------------------------------------------------------
// Create an attachment record after upload completes
// ---------------------------------------------------------------------------

export async function createAttachment(
  messageId: string,
  data: {
    storageKey: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
  },
) {
  // Verify message exists
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message) {
    throw AppError.notFound('Message not found');
  }

  const id = uuidv7();
  const [attachment] = await db
    .insert(attachments)
    .values({
      id,
      messageId,
      storageKey: data.storageKey,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      width: data.width ?? null,
      height: data.height ?? null,
    })
    .returning();

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
