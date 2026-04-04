import { create } from 'zustand';
import type { User } from '@zktalk/shared';
import { ApiError, api } from '@/lib/api';
import { clearSessionToken } from '@/lib/session-token';

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
      const res = await api<{ user: User }>('/api/me', { signal: controller.signal });
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
