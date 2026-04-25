/**
 * Renderer-side helpers around the desktop "Agent Mode" toggle.
 *
 * The desktop main process gates the agent-device bridge on
 * `agentDeviceBridgeEnabled` in `desktop.config.json` (or the
 * `ZKTALK_AGENT_BRIDGE=1` env override). The IPC handler at
 * `desktop-config:save` is what flips it at runtime — saving the config
 * starts/stops the bridge in-place, so the renderer just has to read +
 * patch + save.
 *
 * In a non-desktop runtime (browser tab pointed at the web URL) none of
 * the IPC bridges are present; `isAgentBridgeAvailable()` returns false
 * and the UI hides the toggle so we don't promise something we can't do.
 */

interface DesktopConfigSnapshot {
  apiUrl?: string;
  wsUrl?: string;
  livekitUrl?: string;
  webUrl?: string;
  appLocale?: string;
  localAgentLanguagePreset?: string;
  agentDeviceBridgeEnabled?: boolean;
}

interface DesktopApi {
  getConfig?: () => Promise<DesktopConfigSnapshot>;
  saveConfig?: (
    next: DesktopConfigSnapshot,
  ) => Promise<DesktopConfigSnapshot>;
  getAgentBridgeState?: () => Promise<{
    enabled: boolean;
    running: boolean;
    state?: { deviceId: string | null; running: boolean; agents: unknown[] };
  }>;
  setAgentBridgeToken?: (token: string) => Promise<unknown>;
}

function getDesktopApi(): DesktopApi | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { zkTalkDesktop?: DesktopApi }).zkTalkDesktop;
  return api ?? null;
}

export function isAgentBridgeAvailable(): boolean {
  const api = getDesktopApi();
  return Boolean(api?.getConfig && api?.saveConfig);
}

export async function readAgentBridgeEnabled(): Promise<boolean> {
  const api = getDesktopApi();
  if (!api?.getConfig) return false;
  try {
    const config = await api.getConfig();
    return config?.agentDeviceBridgeEnabled === true;
  } catch {
    return false;
  }
}

export async function readAgentBridgeStatus(): Promise<{
  enabled: boolean;
  running: boolean;
  deviceId: string | null;
  agentCount: number;
}> {
  const api = getDesktopApi();
  if (!api?.getAgentBridgeState) {
    const enabled = await readAgentBridgeEnabled();
    return { enabled, running: false, deviceId: null, agentCount: 0 };
  }
  try {
    const status = await api.getAgentBridgeState();
    return {
      enabled: status?.enabled === true,
      running: status?.running === true,
      deviceId: status?.state?.deviceId ?? null,
      agentCount: Array.isArray(status?.state?.agents) ? status.state.agents.length : 0,
    };
  } catch {
    return { enabled: false, running: false, deviceId: null, agentCount: 0 };
  }
}

export async function setAgentBridgeEnabled(
  next: boolean,
): Promise<{ enabled: boolean }> {
  const api = getDesktopApi();
  if (!api?.getConfig || !api?.saveConfig) {
    throw new Error('agent_bridge_unavailable');
  }
  const current = (await api.getConfig()) ?? {};
  const saved = await api.saveConfig({ ...current, agentDeviceBridgeEnabled: next });
  return { enabled: saved?.agentDeviceBridgeEnabled === true };
}
