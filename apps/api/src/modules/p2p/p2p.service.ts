import * as p2pRepository from './p2p.repository.js';
import { AppError } from '../../lib/errors.js';

export async function createP2pFile(
  uploaderUserId: string,
  data: {
    channelId?: string;
    conversationId?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileHash: string;
    chunkCount: number;
  },
) {
  return p2pRepository.createP2pFile({
    ...data,
    uploaderUserId,
  });
}

export async function getP2pFile(fileId: string) {
  const file = await p2pRepository.findP2pFile(fileId);
  if (!file) {
    throw new AppError(404, 'P2P_FILE_NOT_FOUND', 'P2P file not found');
  }
  return file;
}

export async function getP2pFilesByChannel(channelId: string) {
  return p2pRepository.findP2pFilesByChannel(channelId);
}

export async function linkFileToMessage(fileId: string, messageId: string) {
  return p2pRepository.updateP2pFileMessage(fileId, messageId);
}
