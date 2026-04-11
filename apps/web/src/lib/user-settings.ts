import { api } from '@/lib/api';
import type {
  LastVisitedLocation,
  UpdateUserSettingsInput,
  UserSettings,
} from '@zktalk/shared';

const COMMUNITY_ORDER_STORAGE_KEY = 'zktalk-community-order';
const COLLAPSED_SECTIONS_STORAGE_KEY = 'zktalk-collapsed-sections';
export const COMMUNITY_ORDER_UPDATED_EVENT = 'zktalk-community-order-updated';
export const COLLAPSED_SECTIONS_UPDATED_EVENT = 'zktalk-collapsed-sections-updated';

export async function fetchUserSettings(): Promise<UserSettings> {
  const res = await api<{ settings: UserSettings }>('/api/me/settings');
  return res.settings;
}

export async function patchUserSettings(input: UpdateUserSettingsInput): Promise<UserSettings> {
  const res = await api<{ settings: UserSettings }>('/api/me/settings', {
    method: 'PATCH',
    body: input,
  });
  return res.settings;
}

export function getCachedCommunityOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(COMMUNITY_ORDER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function cacheCommunityOrder(ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMMUNITY_ORDER_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(
    new CustomEvent<{ ids: string[] }>(COMMUNITY_ORDER_UPDATED_EVENT, {
      detail: { ids },
    }),
  );
}

export function getCachedCollapsedSections(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function cacheCollapsedSections(value: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(
    new CustomEvent<{ collapsedSections: Record<string, boolean> }>(COLLAPSED_SECTIONS_UPDATED_EVENT, {
      detail: { collapsedSections: value },
    }),
  );
}

export function clearCachedUserSettings(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(COMMUNITY_ORDER_STORAGE_KEY);
  window.localStorage.removeItem(COLLAPSED_SECTIONS_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent<{ ids: string[] }>(COMMUNITY_ORDER_UPDATED_EVENT, {
      detail: { ids: [] },
    }),
  );
  window.dispatchEvent(
    new CustomEvent<{ collapsedSections: Record<string, boolean> }>(COLLAPSED_SECTIONS_UPDATED_EVENT, {
      detail: { collapsedSections: {} },
    }),
  );
}

export function applyCommunityOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items;
  const map = new Map(items.map((c) => [c.id, c]));
  const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  const unordered = items.filter((c) => !order.includes(c.id));
  return [...ordered, ...unordered];
}

export async function saveCommunityOrder(ids: string[]): Promise<UserSettings> {
  cacheCommunityOrder(ids);
  return patchUserSettings({ communityOrder: ids });
}

export async function saveLastVisited(lastVisited: LastVisitedLocation | null): Promise<UserSettings> {
  return patchUserSettings({ lastVisited });
}

export async function saveCollapsedSections(collapsedSections: Record<string, boolean>): Promise<UserSettings> {
  cacheCollapsedSections(collapsedSections);
  return patchUserSettings({ collapsedSections });
}

export async function saveTranslationDisplay(
  translationDisplay: UpdateUserSettingsInput['translationDisplay'],
): Promise<UserSettings> {
  return patchUserSettings({ translationDisplay });
}

export function getCollapsedSectionState(key: string): boolean {
  return Boolean(getCachedCollapsedSections()[key]);
}

export function setCollapsedSectionState(key: string, collapsed: boolean): Record<string, boolean> {
  const next = {
    ...getCachedCollapsedSections(),
    [key]: collapsed,
  };
  cacheCollapsedSections(next);
  void saveCollapsedSections(next);
  return next;
}
