import Constants from 'expo-constants';
import { Platform } from 'react-native';

type AuthExtra = {
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  googleWebClientId?: string;
};

function normalizeConfigValue(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AuthExtra;

export const GOOGLE_AUTH_CONFIG = {
  iosClientId: normalizeConfigValue(extra.googleIosClientId),
  androidClientId: normalizeConfigValue(extra.googleAndroidClientId),
  webClientId: normalizeConfigValue(extra.googleWebClientId),
};

// expo-auth-session requires a platform client ID at hook creation time.
// Keep the real config separate so the UI can still disable Google login
// without crashing when env values are intentionally unset in development.
export const GOOGLE_AUTH_REQUEST_CONFIG = {
  iosClientId: GOOGLE_AUTH_CONFIG.iosClientId ?? 'disabled-ios-client-id',
  androidClientId: GOOGLE_AUTH_CONFIG.androidClientId ?? 'disabled-android-client-id',
  webClientId: GOOGLE_AUTH_CONFIG.webClientId ?? 'disabled-web-client-id',
};

export function hasGoogleAuthConfig(): boolean {
  if (Platform.OS === 'ios') {
    return Boolean(GOOGLE_AUTH_CONFIG.iosClientId);
  }

  if (Platform.OS === 'android') {
    return Boolean(GOOGLE_AUTH_CONFIG.androidClientId);
  }

  return Boolean(GOOGLE_AUTH_CONFIG.webClientId);
}
