import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { NativeModules, Platform } from 'react-native';

const DEV_API_PORT = '4000';
const DEV_WEB_PORT = '3000';
const DEV_LIVEKIT_PORT = '7880';

function normalizeApiOrigin(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

function extractHostname(value?: string | null): string | null {
  if (!value) return null;

  try {
    if (/^[a-z]+:\/\//i.test(value)) {
      return new URL(value).hostname;
    }
  } catch {
    // Fall through to the string parser below.
  }

  const normalized = value.replace(/^[a-z]+:\/\//i, '');
  const host = normalized.split('/')[0]?.split(':')[0];
  return host || null;
}

function getDevHost(): string {
  if (!Device.isDevice) {
    return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  }

  const expoHost =
    extractHostname(Constants.expoConfig?.hostUri) ??
    extractHostname((Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra?.expoClient?.hostUri);

  const sourceHost = extractHostname(
    NativeModules.SourceCode?.scriptURL as string | undefined,
  );

  return (
    expoHost ??
    sourceHost ??
    (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1')
  );
}

const configuredApiOrigin = normalizeApiOrigin(
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    null,
);
const configuredWebOrigin = normalizeApiOrigin(
  (process.env.EXPO_PUBLIC_WEB_URL as string | undefined) ??
    (Constants.expoConfig?.extra?.webUrl as string | undefined) ??
    null,
);
const configuredLivekitUrl =
  (process.env.EXPO_PUBLIC_LIVEKIT_URL as string | undefined) ??
  (Constants.expoConfig?.extra?.livekitUrl as string | undefined) ??
  null;
const fallbackApiOrigin = `http://${getDevHost()}:${DEV_API_PORT}`;
const fallbackWebOrigin = `http://${getDevHost()}:${DEV_WEB_PORT}`;
const fallbackLivekitUrl = `ws://${getDevHost()}:${DEV_LIVEKIT_PORT}`;

export const API_ORIGIN = configuredApiOrigin ?? (!Device.isDevice ? fallbackApiOrigin : __DEV__ ? fallbackApiOrigin : '');
export const WEB_ORIGIN = configuredWebOrigin ?? (() => {
  if (API_ORIGIN) {
    try {
      const url = new URL(API_ORIGIN);
      if (url.port === DEV_API_PORT) {
        url.port = DEV_WEB_PORT;
      }
      return url.toString().replace(/\/+$/, '');
    } catch {
      return !Device.isDevice ? fallbackWebOrigin : __DEV__ ? fallbackWebOrigin : '';
    }
  }
  return !Device.isDevice ? fallbackWebOrigin : __DEV__ ? fallbackWebOrigin : '';
})();

export const WS_ORIGIN = API_ORIGIN ? API_ORIGIN.replace(/^http/i, 'ws') : '';
export const LIVEKIT_URL =
  configuredLivekitUrl?.trim() ||
  (!Device.isDevice ? fallbackLivekitUrl : __DEV__ ? fallbackLivekitUrl : '');
