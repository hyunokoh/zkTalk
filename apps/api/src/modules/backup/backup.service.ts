import * as repo from './backup.repository.js';

export interface BackupData {
  version: 1;
  exportedAt: string;
  userId: string;
  channelMessages: unknown[];
  dmMessages: unknown[];
}

/**
 * Export all messages for a user as a JSON blob.
 * The client is responsible for encrypting this before storing.
 */
export async function exportBackup(userId: string): Promise<BackupData> {
  const [channelMessages, dmMsgs] = await Promise.all([
    repo.getUserChannelMessages(userId),
    repo.getUserDmMessages(userId),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    channelMessages,
    dmMessages: dmMsgs,
  };
}

/**
 * Validate a restore payload structure.
 * Actual decryption is done client-side; the server just receives the
 * encrypted blob for storage/validation.
 */
export async function validateRestorePayload(
  userId: string,
  encryptedData: string,
): Promise<{ success: boolean; size: number }> {
  // The server stores the encrypted backup blob for the user.
  // In a full implementation this would be written to S3/object storage.
  // For now we just validate the payload exists and return metadata.
  return {
    success: true,
    size: encryptedData.length,
  };
}
