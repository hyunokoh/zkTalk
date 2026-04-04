import { describe, expect, it } from 'vitest';
import type { Community } from '@zktalk/shared';
import { mergeUpdatedCommunity } from '../community-cache';

function makeCommunity(overrides: Partial<Community> = {}): Community {
  return {
    id: 'community-1',
    slug: 'community-one',
    name: 'Community One',
    description: null,
    iconUrl: null,
    bannerUrl: null,
    visibility: 'public',
    ownerUserId: 'user-1',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeUpdatedCommunity', () => {
  it('replaces the matching community so updated icon data propagates immediately', () => {
    const original = makeCommunity();
    const other = makeCommunity({ id: 'community-2', slug: 'community-two', name: 'Community Two' });
    const updated = makeCommunity({
      iconUrl: 'http://127.0.0.1:4000/api/upload/assets/communities/community-1/icon.png',
      updatedAt: '2026-04-02T12:34:56.000Z',
    });

    const result = mergeUpdatedCommunity([original, other], updated);

    expect(result).toEqual([updated, other]);
  });

  it('adds the community when the list is empty', () => {
    const updated = makeCommunity({ id: 'community-3', slug: 'community-three' });

    expect(mergeUpdatedCommunity([], updated)).toEqual([updated]);
  });
});
