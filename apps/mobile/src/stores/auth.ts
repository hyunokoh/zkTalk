import { create } from 'zustand';
import { api } from '../lib/api';
import { clearCommunityOrderCache, getToken, removeToken, setToken } from '../lib/storage';

interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
  login: (phoneNumber: string, code: string) => Promise<void>;
  loginWithSessionToken: (sessionToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  fetchUser: async () => {
    set({ isLoading: true });
    const token = await getToken();
    if (!token) {
      set({ user: null, isLoading: false });
      return;
    }
    try {
      const data = await api<{ user: User }>('/api/me');
      set({ user: data.user, isLoading: false });
    } catch {
      await removeToken();
      await clearCommunityOrderCache();
      set({ user: null, isLoading: false });
    }
  },

  login: async (phoneNumber: string, code: string) => {
    const data = await api<{ sessionToken: string }>('/api/auth/phone/verify', {
      method: 'POST',
      body: { phoneNumber, code },
    });
    await useAuthStore.getState().loginWithSessionToken(data.sessionToken);
  },

  loginWithSessionToken: async (sessionToken: string) => {
    await setToken(sessionToken);

    try {
      const profile = await api<{ user: User }>('/api/me');
      set({ user: profile.user, isLoading: false });
    } catch (error) {
      await removeToken();
      await clearCommunityOrderCache();
      set({ user: null, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      await removeToken();
      await clearCommunityOrderCache();
      set({ user: null, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));
