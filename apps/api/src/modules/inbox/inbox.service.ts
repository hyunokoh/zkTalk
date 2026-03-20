import * as inboxRepo from './inbox.repository.js';

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export async function getInbox(
  userId: string,
  username: string,
  communityId?: string,
  cursor?: string,
  limit?: number,
) {
  return inboxRepo.getInboxItems(userId, username, communityId, cursor, limit);
}
