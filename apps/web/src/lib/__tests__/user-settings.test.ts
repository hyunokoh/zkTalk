import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  COMMUNITY_ORDER_UPDATED_EVENT,
  COLLAPSED_SECTIONS_UPDATED_EVENT,
  applyCommunityOrder,
  cacheCollapsedSections,
  cacheCommunityOrder,
  clearCachedUserSettings,
  fetchUserSettings,
  getCachedCollapsedSections,
  getCachedCommunityOrder,
  getCollapsedSectionState,
  saveCommunityOrder,
  saveLastVisited,
  saveTranslationDisplay,
  setCollapsedSectionState,
} from '../user-settings';

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

import { api } from '@/lib/api';

const mockApi = vi.mocked(api);

describe('user-settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('reads cached community order from localStorage', () => {
    window.localStorage.setItem('zktalk-community-order', JSON.stringify(['community-2', 'community-1']));

    expect(getCachedCommunityOrder()).toEqual(['community-2', 'community-1']);
  });

  it('caches community order and dispatches an update event', () => {
    const listener = vi.fn();
    window.addEventListener(COMMUNITY_ORDER_UPDATED_EVENT, listener);

    cacheCommunityOrder(['community-3', 'community-1']);

    expect(getCachedCommunityOrder()).toEqual(['community-3', 'community-1']);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(COMMUNITY_ORDER_UPDATED_EVENT, listener);
  });

  it('applies cached order before unordered communities', () => {
    const ordered = applyCommunityOrder(
      [
        { id: 'community-1', name: 'Alpha' },
        { id: 'community-2', name: 'Beta' },
        { id: 'community-3', name: 'Gamma' },
      ],
      ['community-3', 'community-1'],
    );

    expect(ordered.map((item) => item.id)).toEqual(['community-3', 'community-1', 'community-2']);
  });

  it('fetches user settings from the API', async () => {
    mockApi.mockResolvedValue({
      settings: {
        communityOrder: ['community-2', 'community-1'],
        updatedAt: '2026-04-03T00:00:00.000Z',
      },
    } as never);

    await expect(fetchUserSettings()).resolves.toEqual({
      communityOrder: ['community-2', 'community-1'],
      updatedAt: '2026-04-03T00:00:00.000Z',
    });
  });

  it('saves community order through the API after caching locally', async () => {
    mockApi.mockResolvedValue({
      settings: {
        communityOrder: ['community-4', 'community-1'],
        lastVisited: null,
        updatedAt: '2026-04-03T01:00:00.000Z',
      },
    } as never);

    await expect(saveCommunityOrder(['community-4', 'community-1'])).resolves.toEqual({
      communityOrder: ['community-4', 'community-1'],
      lastVisited: null,
      updatedAt: '2026-04-03T01:00:00.000Z',
    });

    expect(getCachedCommunityOrder()).toEqual(['community-4', 'community-1']);
    expect(mockApi).toHaveBeenCalledWith('/api/me/settings', {
      method: 'PATCH',
      body: { communityOrder: ['community-4', 'community-1'] },
    });
  });

  it('saves last visited through the API', async () => {
    mockApi.mockResolvedValue({
      settings: {
        communityOrder: ['community-1'],
        collapsedSections: {},
        lastVisited: {
          kind: 'dm',
          conversationId: 'dm-42',
        },
        updatedAt: '2026-04-03T02:00:00.000Z',
      },
    } as never);

    await expect(
      saveLastVisited({
        kind: 'dm',
        conversationId: 'dm-42',
      }),
    ).resolves.toEqual({
      communityOrder: ['community-1'],
      collapsedSections: {},
      lastVisited: {
        kind: 'dm',
        conversationId: 'dm-42',
      },
      updatedAt: '2026-04-03T02:00:00.000Z',
    });

    expect(mockApi).toHaveBeenCalledWith('/api/me/settings', {
      method: 'PATCH',
      body: {
        lastVisited: {
          kind: 'dm',
          conversationId: 'dm-42',
        },
      },
    });
  });

  it('saves translation display preferences through the API', async () => {
    mockApi.mockResolvedValue({
      settings: {
        communityOrder: ['community-1'],
        collapsedSections: {},
        lastVisited: null,
        translationDisplay: {
          uiLocale: 'ko',
          mode: 'target_language_except_readable',
          targetLanguage: 'ko',
          readableLanguages: ['ko', 'en'],
        },
        updatedAt: '2026-04-10T00:00:00.000Z',
      },
    } as never);

    await expect(
      saveTranslationDisplay({
        uiLocale: 'ko',
        mode: 'target_language_except_readable',
        targetLanguage: 'ko',
        readableLanguages: ['ko', 'en'],
      }),
    ).resolves.toEqual({
      communityOrder: ['community-1'],
      collapsedSections: {},
      lastVisited: null,
      translationDisplay: {
        uiLocale: 'ko',
        mode: 'target_language_except_readable',
        targetLanguage: 'ko',
        readableLanguages: ['ko', 'en'],
      },
      updatedAt: '2026-04-10T00:00:00.000Z',
    });

    expect(mockApi).toHaveBeenCalledWith('/api/me/settings', {
      method: 'PATCH',
      body: {
        translationDisplay: {
          uiLocale: 'ko',
          mode: 'target_language_except_readable',
          targetLanguage: 'ko',
          readableLanguages: ['ko', 'en'],
        },
      },
    });
  });

  it('caches collapsed sections and dispatches an update event', () => {
    const listener = vi.fn();
    window.addEventListener(COLLAPSED_SECTIONS_UPDATED_EVENT, listener);

    cacheCollapsedSections({ 'section:a': true });

    expect(getCachedCollapsedSections()).toEqual({ 'section:a': true });
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(COLLAPSED_SECTIONS_UPDATED_EVENT, listener);
  });

  it('updates one collapsed section key and keeps the rest', () => {
    cacheCollapsedSections({ 'section:a': true, 'section:b': false });

    expect(setCollapsedSectionState('section:b', true)).toEqual({
      'section:a': true,
      'section:b': true,
    });
    expect(getCollapsedSectionState('section:a')).toBe(true);
    expect(getCollapsedSectionState('section:b')).toBe(true);
  });

  it('clears cached auth-bound user setting state and emits reset events', () => {
    const communityOrderListener = vi.fn();
    const collapsedSectionsListener = vi.fn();
    window.addEventListener(COMMUNITY_ORDER_UPDATED_EVENT, communityOrderListener);
    window.addEventListener(COLLAPSED_SECTIONS_UPDATED_EVENT, collapsedSectionsListener);
    cacheCommunityOrder(['community-9']);
    cacheCollapsedSections({ 'section:z': true });

    clearCachedUserSettings();

    expect(getCachedCommunityOrder()).toEqual([]);
    expect(getCachedCollapsedSections()).toEqual({});
    expect(communityOrderListener).toHaveBeenCalledTimes(2);
    expect(collapsedSectionsListener).toHaveBeenCalledTimes(2);

    window.removeEventListener(COMMUNITY_ORDER_UPDATED_EVENT, communityOrderListener);
    window.removeEventListener(COLLAPSED_SECTIONS_UPDATED_EVENT, collapsedSectionsListener);
  });
});
