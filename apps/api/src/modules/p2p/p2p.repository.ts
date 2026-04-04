import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import { p2pFiles } from '../../lib/db/schema.js';

export interface CreateP2pFileInput {
  channelId?: string;
  conversationId?: string;
  uploaderUserId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  chunkCount: number;
  messageId?: string;
}

export async function createP2pFile(data: CreateP2pFileInput) {
  const id = uuidv7();
  const [file] = await db
    .insert(p2pFiles)
    .values({
      id,
      messageId: data.messageId ?? null,
      channelId: data.channelId ?? null,
      conversationId: data.conversationId ?? null,
      uploaderUserId: data.uploaderUserId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      fileHash: data.fileHash,
      chunkCount: data.chunkCount,
    })
    .returning();

  return file;
}

export async function findP2pFile(fileId: string) {
  const [file] = await db
    .select()
    .from(p2pFiles)
    .where(eq(p2pFiles.id, fileId))
    .limit(1);

  return file ?? null;
}

export async function findP2pFilesByChannel(channelId: string) {
  return db
    .select()
    .from(p2pFiles)
    .where(eq(p2pFiles.channelId, channelId))
    .orderBy(p2pFiles.createdAt);
}

export async function updateP2pFileMessage(fileId: string, messageId: string) {
  const [file] = await db
    .update(p2pFiles)
    .set({ messageId })
    .where(eq(p2pFiles.id, fileId))
    .returning();

  return file ?? null;
}
