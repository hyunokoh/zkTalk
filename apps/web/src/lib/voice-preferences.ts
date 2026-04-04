'use client';

const LAST_VOICE_CHANNELS_KEY = 'zktalk_last_voice_channels';
export const VOICE_PREFERENCES_UPDATED_EVENT = 'zktalk:voice-preferences-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getLastVoiceChannelForCommunity(communityId: string): string | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LAST_VOICE_CHANNELS_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[communityId] ?? null;
  } catch {
    return null;
  }
}

export function setLastVoiceChannelForCommunity(communityId: string, channelId: string) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(LAST_VOICE_CHANNELS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[communityId] = channelId;
    window.localStorage.setItem(LAST_VOICE_CHANNELS_KEY, JSON.stringify(parsed));
    window.dispatchEvent(
      new CustomEvent(VOICE_PREFERENCES_UPDATED_EVENT, {
        detail: { communityId, channelId },
      }),
    );
  } catch {
    // Best effort only.
  }
}
