import type { Community } from '@zktalk/shared';

export function mergeUpdatedCommunity(
  communities: Community[] | undefined,
  updatedCommunity: Community,
): Community[] {
  if (!Array.isArray(communities) || communities.length === 0) {
    return [updatedCommunity];
  }

  let replaced = false;
  const nextCommunities = communities.map((community) => {
    if (community.id !== updatedCommunity.id) {
      return community;
    }

    replaced = true;
    return updatedCommunity;
  });

  return replaced ? nextCommunities : [updatedCommunity, ...nextCommunities];
}
