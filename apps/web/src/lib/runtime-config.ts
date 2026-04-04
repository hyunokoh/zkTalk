declare global {
  interface Window {
    zkTalkDesktopConfig?: {
      apiUrl?: string;
      wsUrl?: string;
      livekitUrl?: string;
    };
    zkTalkDesktop?: {
      config?: {
        apiUrl?: string;
        wsUrl?: string;
        livekitUrl?: string;
      };
      getConfig?: () => Promise<unknown>;
      saveConfig?: (nextConfig: unknown) => Promise<unknown>;
      openConfig?: () => Promise<unknown>;
      openLogs?: () => Promise<unknown>;
      openFile?: (payload: {
        name: string;
        type?: string;
        bytes: Uint8Array | number[] | ArrayBuffer;
      }) => Promise<{
        path?: string;
      }>;
      saveFile?: (payload: {
        name: string;
        type?: string;
        bytes: Uint8Array | number[] | ArrayBuffer;
      }) => Promise<{
        path?: string;
        canceled?: boolean;
      }>;
      retryLoad?: () => Promise<unknown>;
      pickFiles?: (options?: { multiple?: boolean }) => Promise<Array<{
        name: string;
        type?: string;
        size: number;
        lastModified?: number;
        bytes: Uint8Array | number[] | ArrayBuffer;
      }>>;
    };
  }
}

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/api/ws';
const DEFAULT_LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'ws://localhost:7880';

function getDesktopConfigValue(key: 'apiUrl' | 'wsUrl' | 'livekitUrl'): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const value = window.zkTalkDesktopConfig?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getApiBaseUrl(): string {
  return getDesktopConfigValue('apiUrl') ?? DEFAULT_API_URL;
}

export function getWebSocketUrl(): string {
  return getDesktopConfigValue('wsUrl') ?? DEFAULT_WS_URL;
}

export function getLivekitUrl(): string {
  return getDesktopConfigValue('livekitUrl') ?? DEFAULT_LIVEKIT_URL;
}
