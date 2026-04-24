import { create } from 'zustand';
import type { User } from '@zktalk/shared';
import { ApiError, api } from '@/lib/api';
import { clearSessionToken, getSessionToken } from '@/lib/session-token';

function forwardTokenToDesktopBridge(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const desktop = (window as unknown as {
      zkTalkDesktop?: {
        setAgentBridgeToken?: (token: string) => Promise<unknown>;
        clearAgentBridgeToken?: () => Promise<unknown>;
      };
    }).zkTalkDesktop;
    if (!desktop) return;
    if (typeof token === 'string' && token.length > 0) {
      desktop.setAgentBridgeToken?.(token)?.catch(() => {});
    } else {
      desktop.clearAgentBridgeToken?.()?.catch(() => {});
    }
  } catch {
    // Ignore — the desktop bridge is optional.
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  fetchUser: async () => {
    set({ isLoading: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await api<{ user: User }>('/api/me', {
        signal: controller.signal,
        authMode: 'bearer',
      });
      // Forward the current session token to the desktop agent-device-bridge
      // (no-op outside Electron). Covers the case where the user is already
      // logged in when the desktop app boots and fetchUser runs before any
      // setSessionToken call has fired.
      forwardTokenToDesktopBridge(getSessionToken());
      set({ user: res.user, isLoading: false });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSessionToken();
        set({ user: null, isLoading: false });
        return;
      }

      set((state) => ({ user: state.user, isLoading: false }));
    } finally {
      clearTimeout(timeout);
    }
  },

  logout: async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      clearSessionToken();
      set({ user: null });
    }
  },

  setUser: (user) => set({ user }),
}));
