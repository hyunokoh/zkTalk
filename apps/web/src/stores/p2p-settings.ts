import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NetworkInfo {
  type?: string;
  effectiveType?: string;
}

interface P2PSettings {
  wifiOnly: boolean;
  autoSeed: boolean;
  setWifiOnly: (v: boolean) => void;
  setAutoSeed: (v: boolean) => void;
  isOnWifi: () => boolean;
  canSeed: () => boolean;
}

export const useP2PSettingsStore = create<P2PSettings>()(
  persist(
    (set, get) => ({
      wifiOnly: false,
      autoSeed: true,

      setWifiOnly: (wifiOnly: boolean) => set({ wifiOnly }),
      setAutoSeed: (autoSeed: boolean) => set({ autoSeed }),

      isOnWifi: (): boolean => {
        if (typeof navigator === 'undefined') return true;
        const connection = (navigator as unknown as { connection?: NetworkInfo }).connection;
        if (!connection) return true; // Assume WiFi if API not available
        return connection.type === 'wifi' || connection.effectiveType === '4g';
      },

      canSeed: (): boolean => {
        const state = get();
        if (!state.wifiOnly) return true;
        return state.isOnWifi();
      },
    }),
    { name: 'zktalk-p2p-settings' },
  ),
);
