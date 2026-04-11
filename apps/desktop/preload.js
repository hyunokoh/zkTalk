const { contextBridge, ipcRenderer } = require('electron');

function getInitialDesktopConfig() {
  try {
    const config = ipcRenderer.sendSync('desktop-config:sync');
    if (config && typeof config === 'object') {
      return {
        apiUrl: typeof config.apiUrl === 'string' ? config.apiUrl : '',
        wsUrl: typeof config.wsUrl === 'string' ? config.wsUrl : '',
        livekitUrl: typeof config.livekitUrl === 'string' ? config.livekitUrl : '',
        localAgentLanguagePreset:
          typeof config.localAgentLanguagePreset === 'string'
            ? config.localAgentLanguagePreset
            : 'manual_only',
      };
    }
  } catch (_) {
    // Fall through to env-based defaults.
  }

  return {
    apiUrl: process.env.ZKTALK_API_URL || process.env.NEXT_PUBLIC_API_URL || '',
    wsUrl: process.env.ZKTALK_WS_URL || process.env.NEXT_PUBLIC_WS_URL || '',
    livekitUrl: process.env.ZKTALK_LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '',
    localAgentLanguagePreset: process.env.ZKTALK_LOCAL_AGENT_LANGUAGE_PRESET || 'manual_only',
  };
}

const desktopConfig = getInitialDesktopConfig();

contextBridge.exposeInMainWorld('zkTalkDesktopConfig', desktopConfig);
contextBridge.exposeInMainWorld('zkTalkDesktop', {
  config: desktopConfig,
  getConfig: () => ipcRenderer.invoke('desktop-config:get'),
  saveConfig: (nextConfig) => ipcRenderer.invoke('desktop-config:save', nextConfig),
  openConfig: () => ipcRenderer.invoke('desktop-config:open'),
  openLogs: () => ipcRenderer.invoke('desktop-logs:open'),
  pickFiles: (options) => ipcRenderer.invoke('desktop-files:pick', options),
  readFileChunk: (payload) => ipcRenderer.invoke('desktop-files:read-chunk', payload),
  openFile: (payload) => ipcRenderer.invoke('desktop-files:open', payload),
  saveFile: (payload) => ipcRenderer.invoke('desktop-files:save', payload),
  retryLoad: () => ipcRenderer.invoke('desktop:retry-load'),
});
