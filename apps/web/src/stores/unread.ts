import { create } from 'zustand';
import { api } from '@/lib/api';

interface UnreadEntry {
  unread: number;
  mentions: number;
}

interface UnreadState {
  unreadMap: Record<string, UnreadEntry>;
  fetchUnread: (communityId: string) => Promise<void>;
  markRead: (channelId: string) => Promise<void>;
  decrementUnread: (channelId: string) => void;
  incrementUnread: (channelId: string, isMention?: boolean) => void;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  unreadMap: {},

  fetchUnread: async (communityId: string) => {
    try {
      const data = await api<Record<string, UnreadEntry>>(
        `/api/communities/${communityId}/unread`,
      );
      set((state) => ({
        unreadMap: { ...state.unreadMap, ...data },
      }));
    } catch {
      // silently fail – unread counts are non-critical
    }
  },

  markRead: async (channelId: string) => {
    try {
      await api(`/api/channels/${channelId}/read`, { method: 'POST' });
      set((state) => ({
        unreadMap: {
          ...state.unreadMap,
          [channelId]: { unread: 0, mentions: 0 },
        },
      }));
    } catch {
      // silently fail
    }
  },

  decrementUnread: (channelId: string) => {
    set((state) => {
      const current = state.unreadMap[channelId];
      if (!current || current.unread <= 0) return state;
      return {
        unreadMap: {
          ...state.unreadMap,
          [channelId]: {
            unread: Math.max(0, current.unread - 1),
            mentions: current.mentions,
          },
        },
      };
    });
  },

  incrementUnread: (channelId: string, isMention = false) => {
    set((state) => {
      const current = state.unreadMap[channelId] ?? { unread: 0, mentions: 0 };
      return {
        unreadMap: {
          ...state.unreadMap,
          [channelId]: {
            unread: current.unread + 1,
            mentions: isMention ? current.mentions + 1 : current.mentions,
          },
        },
      };
    });
  },
}));
