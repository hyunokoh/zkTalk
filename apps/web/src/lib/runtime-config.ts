import type { TranslationDisplayPresetId } from '@zktalk/shared';

declare global {
  interface Window {
    zkTalkDesktopConfig?: {
      apiUrl?: string;
      wsUrl?: string;
      livekitUrl?: string;
      localAgentLanguagePreset?: TranslationDisplayPresetId;
    };
    zkTalkDesktop?: {
      config?: {
        apiUrl?: string;
        wsUrl?: string;
        livekitUrl?: string;
        localAgentLanguagePreset?: TranslationDisplayPresetId;
      };
      getConfig?: () => Promise<unknown>;
      saveConfig?: (nextConfig: unknown) => Promise<unknown>;
      getLocalMachineBridgeState?: () => Promise<unknown>;
      registerLocalMachine?: (payload: unknown) => Promise<unknown>;
      sendLocalMachineHeartbeat?: (payload: unknown) => Promise<unknown>;
      ensureLocalMachineOnline?: (payload: unknown) => Promise<unknown>;
      disconnectLocalMachineBridge?: (payload?: unknown) => Promise<unknown>;
      dispatchLocalMachineCommand?: (payload: unknown) => Promise<unknown>;
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
      pickFiles?: (options?: { multiple?: boolean }) => Promise<
        Array<{
          path?: string;
          name: string;
          type?: string;
          size: number;
          lastModified?: number;
          bytes: Uint8Array | number[] | ArrayBuffer;
        }>
      >;
      readFileChunk?: (payload: {
        path: string;
        start: number;
        end: number;
      }) => Promise<Uint8Array | number[] | ArrayBuffer>;
    };
  }
}

function getConfiguredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isProductionBuild(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getBrowserHostname(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const hostname = window.location.hostname?.trim();
  return hostname || undefined;
}

function getDevelopmentHttpProtocol(): 'http' | 'https' {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https';
  }

  return 'http';
}

function getDevelopmentWsProtocol(): 'ws' | 'wss' {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'wss';
  }

  return 'ws';
}

function getDevelopmentHost(defaultHost: string): string {
  return getBrowserHostname() ?? defaultHost;
}

function getRuntimeDefault(
  configuredValue: string | undefined,
  developmentFallback: () => string,
): string {
  if (configuredValue) {
    return configuredValue;
  }

  return isProductionBuild() ? '' : developmentFallback();
}

function getDefaultApiUrl(): string {
  return getRuntimeDefault(
    getConfiguredValue(process.env.NEXT_PUBLIC_API_URL),
    () => `${getDevelopmentHttpProtocol()}://${getDevelopmentHost('localhost')}:4000`,
  );
}

function getDefaultWsUrl(): string {
  return getRuntimeDefault(
    getConfiguredValue(process.env.NEXT_PUBLIC_WS_URL),
    () => `${getDevelopmentWsProtocol()}://${getDevelopmentHost('localhost')}:4000/api/ws`,
  );
}

function getDefaultLivekitUrl(): string {
  return getRuntimeDefault(
    getConfiguredValue(process.env.NEXT_PUBLIC_LIVEKIT_URL),
    () => `${getDevelopmentWsProtocol()}://${getDevelopmentHost('localhost')}:7880`,
  );
}

function getDesktopConfigValue(key: 'apiUrl' | 'wsUrl' | 'livekitUrl'): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const value = window.zkTalkDesktopConfig?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isTranslationDisplayPresetId(value: unknown): value is TranslationDisplayPresetId {
  return (
    value === 'english_only' ||
    value === 'korean_preferred_english_readable' ||
    value === 'manual_only'
  );
}

export function isDesktopRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(
    getDesktopConfigValue('apiUrl') ||
    getDesktopConfigValue('wsUrl') ||
    getDesktopConfigValue('livekitUrl') ||
    window.zkTalkDesktop ||
    window.zkTalkDesktopConfig,
  );
}

export function getApiBaseUrl(): string {
  return getDesktopConfigValue('apiUrl') ?? getDefaultApiUrl();
}

export function getWebSocketUrl(): string {
  return getDesktopConfigValue('wsUrl') ?? getDefaultWsUrl();
}

export function getLivekitUrl(): string {
  return getDesktopConfigValue('livekitUrl') ?? getDefaultLivekitUrl();
}

export function getDesktopLocalAgentLanguagePreset(): TranslationDisplayPresetId | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const desktopConfigValue = window.zkTalkDesktopConfig?.localAgentLanguagePreset;
  if (isTranslationDisplayPresetId(desktopConfigValue)) {
    return desktopConfigValue;
  }

  const desktopBridgeValue = window.zkTalkDesktop?.config?.localAgentLanguagePreset;
  return isTranslationDisplayPresetId(desktopBridgeValue) ? desktopBridgeValue : undefined;
}
