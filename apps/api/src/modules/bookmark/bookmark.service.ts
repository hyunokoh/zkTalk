import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import * as repo from './bookmark.repository.js';

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

export async function addBookmark(userId: string, messageId: string) {
  const message = await repo.findMessageById(messageId);
  if (!message) {
    throw AppError.notFound('Message not found');
  }

  if (message.isDeleted) {
    throw AppError.notFound('Message not found');
  }

  const id = uuidv7();
  const bookmark = await repo.addBookmark(id, userId, messageId);

  // If ON CONFLICT returned null, the bookmark already existed
  if (!bookmark) {
    const existing = await repo.findBookmark(userId, messageId);
    return existing;
  }

  return bookmark;
}

export async function removeBookmark(userId: string, messageId: string) {
  const deleted = await repo.removeBookmark(userId, messageId);
  if (!deleted) {
    throw AppError.notFound('Bookmark not found');
  }
}

export async function getBookmarks(
  userId: string,
  cursor?: string,
  limit?: number,
) {
  return repo.findUserBookmarks(userId, cursor, limit);
}
