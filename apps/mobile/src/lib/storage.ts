import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import type { LastVisitedLocation, UserSettings } from '@zktalk/shared';

const TOKEN_KEY = 'zktalk_session_token';
const LAST_VOICE_CHANNELS_KEY = 'zktalk_last_voice_channels';
const COMMUNITY_ORDER_KEY = 'zktalk_community_order';

export async function fetchUserSettings(): Promise<UserSettings> {
  const res = await api<{ settings: UserSettings }>('/api/me/settings');
  return res.settings;
}

export async function patchUserSettings(input: {
  communityOrder?: string[];
  lastVisited?: LastVisitedLocation | null;
}): Promise<UserSettings> {
  const res = await api<{ settings: UserSettings }>('/api/me/settings', {
    method: 'PATCH',
    body: input,
  });
  return res.settings;
}

export async function cacheCommunityOrder(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(COMMUNITY_ORDER_KEY, JSON.stringify(ids));
  } catch {
    // Best effort only.
  }
}

export async function saveCommunityOrder(ids: string[]): Promise<UserSettings> {
  await cacheCommunityOrder(ids);
  return patchUserSettings({ communityOrder: ids });
}

export async function syncCommunityOrder(): Promise<string[]> {
  const settings = await fetchUserSettings();
  await cacheCommunityOrder(settings.communityOrder);
  return settings.communityOrder;
}

export async function getCachedCommunityOrder(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(COMMUNITY_ORDER_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const getCommunityOrderFromStorage = getCachedCommunityOrder;
const setCommunityOrderInStorage = cacheCommunityOrder;

export { getCommunityOrderFromStorage as getCommunityOrder, setCommunityOrderInStorage as setCommunityOrder };

export async function clearCommunityOrderCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(COMMUNITY_ORDER_KEY);
  } catch {
    // Best effort only.
  }
}

export async function saveLastVisited(lastVisited: LastVisitedLocation | null): Promise<UserSettings> {
  return patchUserSettings({ lastVisited });
}


export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getLastVoiceChannelForCommunity(
  communityId: string,
): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_VOICE_CHANNELS_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[communityId] ?? null;
  } catch {
    return null;
  }
}

export async function setLastVoiceChannelForCommunity(
  communityId: string,
  channelId: string,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LAST_VOICE_CHANNELS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[communityId] = channelId;
    await AsyncStorage.setItem(LAST_VOICE_CHANNELS_KEY, JSON.stringify(parsed));
  } catch {
    // Best effort only.
  }
}

