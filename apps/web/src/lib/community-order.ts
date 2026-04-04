import {
  COMMUNITY_ORDER_UPDATED_EVENT,
  applyCommunityOrder,
  cacheCommunityOrder,
  getCachedCommunityOrder,
} from '@/lib/user-settings';

export { COMMUNITY_ORDER_UPDATED_EVENT, applyCommunityOrder };

export function getCommunityOrder(): string[] {
  return getCachedCommunityOrder();
}

export function setCommunityOrder(ids: string[]): void {
  cacheCommunityOrder(ids);
}
