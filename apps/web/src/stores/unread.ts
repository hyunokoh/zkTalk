import { create } from 'zustand';
import { api } from '@/lib/api';

interface UnreadEntry {
  unread: number;
  mentions: number;
}

interface UnreadSummaryRow {
  channelId: string;
  channelName: string;
  lastReadMessageId: string | null;
  unreadCount: number;
  mentionCount: number;
}

interface UnreadState {
  unreadMap: Record<string, UnreadEntry>;
  /** Maps communityId -> set of channelIds that belong to it */
  communityChannelIds: Record<string, string[]>;
  fetchUnread: (communityId: string) => Promise<void>;
  markRead: (channelId: string, lastMessageId?: string | null) => Promise<void>;
  decrementUnread: (channelId: string) => void;
  incrementUnread: (channelId: string, isMention?: boolean) => void;
  /** Returns true if any channel in the given community has unread messages */
  hasCommunityUnread: (communityId: string) => boolean;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  unreadMap: {},
  communityChannelIds: {},

  fetchUnread: async (communityId: string) => {
    try {
      const rows = await api<UnreadSummaryRow[]>(
        `/api/communities/${communityId}/unread`,
      );
      const data = rows.reduce<Record<string, UnreadEntry>>((acc, row) => {
        acc[row.channelId] = {
          unread: row.unreadCount,
          mentions: row.mentionCount,
        };
        return acc;
      }, {});
      const channelIds = rows.map((row) => row.channelId);
      set((state) => ({
        unreadMap: { ...state.unreadMap, ...data },
        communityChannelIds: {
          ...state.communityChannelIds,
          [communityId]: channelIds,
        },
      }));
    } catch {
      // silently fail – unread counts are non-critical
    }
  },

  markRead: async (channelId: string, lastMessageId?: string | null) => {
    try {
      await api(`/api/channels/${channelId}/read`, {
        method: 'POST',
        body: lastMessageId ? { lastMessageId } : {},
      });
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

  hasCommunityUnread: (communityId: string) => {
    const state = get();
    const channelIds = state.communityChannelIds[communityId];
    if (!channelIds) return false;
    return channelIds.some((id) => {
      const entry = state.unreadMap[id];
      return entry && entry.unread > 0;
    });
  },
}));
