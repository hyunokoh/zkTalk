import { AppError } from '../../lib/errors.js';
import * as searchRepo from './search.repository.js';
import { getAccessibleChannelIdsForCommunity } from '../channel/channel-access.service.js';

export async function searchMessages(
  userId: string,
  query: string,
  filters: {
    communityId: string;
    channelId?: string;
    authorId?: string;
    author?: string;
    hasAttachment?: boolean;
    dateFrom?: string;
    dateTo?: string;
  },
  cursor?: string,
  limit?: number,
) {
  if (!query || query.trim().length === 0) {
    throw AppError.badRequest('Search query must not be empty');
  }

  const accessibleChannelIds = await getAccessibleChannelIdsForCommunity(userId, filters.communityId);
  if (accessibleChannelIds.length === 0) {
    return { messages: [], hasMore: false };
  }

  if (filters.channelId && !accessibleChannelIds.includes(filters.channelId)) {
    throw AppError.forbidden('You do not have access to this channel');
  }

  return searchRepo.searchMessages(
    query.trim(),
    filters,
    filters.channelId ? [filters.channelId] : accessibleChannelIds,
    cursor,
    limit,
  );
}
