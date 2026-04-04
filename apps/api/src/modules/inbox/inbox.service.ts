import * as inboxRepo from './inbox.repository.js';

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export async function getInbox(
  userId: string,
  username: string,
  displayName: string,
  communityId?: string,
  q?: string,
  cursor?: string,
  limit?: number,
) {
  return inboxRepo.getInboxItems(userId, username, displayName, communityId, q, cursor, limit);
}

export async function markInboxItemRead(userId: string, messageId: string) {
  return inboxRepo.markInboxItemRead(userId, messageId);
}

export async function getInboxSummary(
  userId: string,
  username: string,
  displayName: string,
  communityId?: string,
) {
  return inboxRepo.getInboxSummary(userId, username, displayName, communityId);
}

export async function getInboxCommunitySummaries(
  userId: string,
  username: string,
  displayName: string,
) {
  return inboxRepo.getInboxCommunitySummaries(userId, username, displayName);
}

export async function markAllInboxRead(
  userId: string,
  communityId?: string,
  type: 'all' | 'mentions' | 'threads' = 'all',
) {
  return inboxRepo.markAllInboxRead(userId, communityId, type);
}
