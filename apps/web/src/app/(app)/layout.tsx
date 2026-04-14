'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';
import { useMobileNavStore } from '@/stores/mobile-nav';
import { useThreadStore } from '@/stores/thread';
import { useDmStore } from '@/stores/dm';
import { CommunityRail } from '@/components/CommunityRail';
import { ConnectionStatusBar } from '@/components/ConnectionStatusBar';
import { DesktopLocalMachineBridgeAutoConnect } from '@/components/DesktopLocalMachineBridgeAutoConnect';
import { ToastViewport } from '@/components/ToastViewport';
import { AIAssistant } from '@/components/AIAssistant/AIAssistant';
import { AI_SETTINGS_UPDATED_EVENT, isAiAssistantEnabled } from '@/lib/ai-settings';
import { api } from '@/lib/api';
import { clearQueue } from '@/lib/offline-queue';
import { clearCachedUserSettings } from '@/lib/user-settings';
import { subscribe } from '@/hooks/useWebSocket';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotifications } from '@/hooks/useNotifications';
import { AUTH_SESSION_LOST_EVENT } from '@/lib/session-token';
import { useOfflineQueueStore } from '@/stores/offline-queue';
import { useUnreadStore } from '@/stores/unread';
import { useVoiceStore } from '@/stores/voice';
import { WebSocketEvent } from '@zktalk/shared';
import type { Community, User, WSOutgoing } from '@zktalk/shared';

type DmConversationSummaryRow = {
  unreadCount: number;
};

type FriendSummaryRow = {
  status: 'accepted' | 'pending' | 'blocked';
  isRequester: boolean;
};

type InboxSummaryRow = {
  all: number;
};

const DESKTOP_RAIL_WIDTH_STORAGE_KEY = 'zktalk-desktop-rail-width';
const DEFAULT_DESKTOP_RAIL_WIDTH = 80;
const MIN_DESKTOP_RAIL_WIDTH = 72;
const MAX_DESKTOP_RAIL_WIDTH = 152;
const AVATAR_VERSION_EVENT = 'zktalk-avatar-version-updated';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const setUser = useAuthStore((s) => s.setUser);
  const sidebarOpen = useMobileNavStore((s) => s.sidebarOpen);
  const toggleSidebar = useMobileNavStore((s) => s.toggleSidebar);
  const closeSidebar = useMobileNavStore((s) => s.closeSidebar);
  const closeChannelSidebar = useMobileNavStore((s) => s.closeChannelSidebar);
  const setDmShowList = useMobileNavStore((s) => s.setDmShowList);
  const setActiveConversation = useDmStore((s) => s.setActiveConversation);
  const closeThread = useThreadStore((s) => s.closeThread);
  const disconnectVoice = useVoiceStore((s) => s.disconnect);
  const resetUnread = useUnreadStore((s) => s.reset);
  const resetOfflineQueue = useOfflineQueueStore((s) => s.reset);
  const [desktopRailWidth, setDesktopRailWidth] = useState(DEFAULT_DESKTOP_RAIL_WIDTH);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);
  const unreadRefreshTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastUserRefreshAtRef = useRef(0);
  const hadAuthenticatedUserRef = useRef(false);

  const resetProtectedUi = useCallback(() => {
    closeSidebar();
    closeChannelSidebar();
    setDmShowList(true);
    setActiveConversation(null);
    closeThread();
    disconnectVoice();
  }, [closeChannelSidebar, closeSidebar, closeThread, disconnectVoice, setActiveConversation, setDmShowList]);

  useWebSocket();
  useNotifications();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedWidth = Number(window.localStorage.getItem(DESKTOP_RAIL_WIDTH_STORAGE_KEY));
    if (Number.isFinite(savedWidth)) {
      setDesktopRailWidth(
        Math.min(MAX_DESKTOP_RAIL_WIDTH, Math.max(MIN_DESKTOP_RAIL_WIDTH, savedWidth)),
      );
    }

    const syncAiSettings = () => {
      setAiAssistantEnabled(isAiAssistantEnabled());
    };

    syncAiSettings();
    window.addEventListener('storage', syncAiSettings);
    window.addEventListener(AI_SETTINGS_UPDATED_EVENT, syncAiSettings);

    return () => {
      window.removeEventListener('storage', syncAiSettings);
      window.removeEventListener(AI_SETTINGS_UPDATED_EVENT, syncAiSettings);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      DESKTOP_RAIL_WIDTH_STORAGE_KEY,
      String(desktopRailWidth),
    );
  }, [desktopRailWidth]);

  useEffect(() => {
    const refreshUser = () => {
      const now = Date.now();
      if (now - lastUserRefreshAtRef.current < 10_000) {
        return;
      }
      lastUserRefreshAtRef.current = now;
      void fetchUser();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    const handleAvatarUpdated = () => {
      lastUserRefreshAtRef.current = 0;
      refreshUser();
    };

    window.addEventListener('focus', refreshUser);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener(AVATAR_VERSION_EVENT, handleAvatarUpdated);

    return () => {
      window.removeEventListener('focus', refreshUser);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(AVATAR_VERSION_EVENT, handleAvatarUpdated);
    };
  }, [fetchUser]);

  useEffect(() => {
    const hadAuthenticatedUser = hadAuthenticatedUserRef.current;
    hadAuthenticatedUserRef.current = !!user;

    if (isLoading || user || !hadAuthenticatedUser) {
      return;
    }

    Object.values(unreadRefreshTimersRef.current).forEach((timer) => clearTimeout(timer));
    unreadRefreshTimersRef.current = {};
    queryClient.clear();
    resetUnread();
    resetOfflineQueue();
    clearCachedUserSettings();
    void clearQueue().catch(() => undefined);
    lastUserRefreshAtRef.current = 0;
    resetProtectedUi();
  }, [isLoading, queryClient, resetOfflineQueue, resetProtectedUi, resetUnread, user]);

  useEffect(() => {
    const handleAuthSessionLost = () => {
      Object.values(unreadRefreshTimersRef.current).forEach((timer) => clearTimeout(timer));
      unreadRefreshTimersRef.current = {};
      queryClient.clear();
      resetUnread();
      resetOfflineQueue();
      clearCachedUserSettings();
      void clearQueue().catch(() => undefined);
      lastUserRefreshAtRef.current = 0;
      resetProtectedUi();
      setUser(null);
    };

    window.addEventListener(AUTH_SESSION_LOST_EVENT, handleAuthSessionLost);

    return () => {
      window.removeEventListener(AUTH_SESSION_LOST_EVENT, handleAuthSessionLost);
    };
  }, [queryClient, resetOfflineQueue, resetProtectedUi, resetUnread, setUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      const query = typeof window !== 'undefined' ? window.location.search : '';
      const nextPath = `${pathname}${query ? `?${query}` : ''}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
  }, [isLoading, pathname, router, user]);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const res = await api<{ communities: Community[] }>('/api/communities');
      return res.communities;
    },
    enabled: !!user,
  });

  const dmSummaryQuery = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const result = await api<
        DmConversationSummaryRow[] | { conversations: DmConversationSummaryRow[] }
      >('/api/dm/conversations');
      return Array.isArray(result) ? result : result.conversations ?? [];
    },
    enabled: !!user,
  });
  const friendsSummaryQuery = useQuery({
    queryKey: ['friends-summary'],
    queryFn: () => api<{ friends: FriendSummaryRow[] }>('/api/friends'),
    enabled: !!user,
  });
  const inboxSummaryQuery = useQuery({
    queryKey: ['inbox-summary'],
    queryFn: () => api<InboxSummaryRow>('/api/inbox/summary'),
    enabled: !!user,
  });

  const dmCount = (dmSummaryQuery.data ?? []).reduce(
    (sum, conversation) => sum + (conversation.unreadCount ?? 0),
    0,
  );
  const inboxCount = inboxSummaryQuery.data?.all ?? 0;
  const friendCount = (friendsSummaryQuery.data?.friends ?? []).filter(
    (friend) => friend.status === 'pending' && !friend.isRequester,
  ).length;

  const refreshCommunityUnread = useCallback((communityId: string) => {
    const { fetchUnread } = useUnreadStore.getState();

    const existingTimer = unreadRefreshTimersRef.current[communityId];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    unreadRefreshTimersRef.current[communityId] = setTimeout(() => {
      delete unreadRefreshTimersRef.current[communityId];
      void fetchUnread(communityId);
    }, 250);
  }, []);

  useEffect(
    () => () => {
      Object.values(unreadRefreshTimersRef.current).forEach((timer) => clearTimeout(timer));
      unreadRefreshTimersRef.current = {};
    },
    [],
  );

  useEffect(() => {
    const invalidateInbox = () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
    };
    const invalidateDm = () => {
      void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    };
    const invalidateFriends = () => {
      void queryClient.invalidateQueries({ queryKey: ['friends-summary'] });
    };
    const handleProfileUpdated = (event: WSOutgoing) => {
      const payload = event.data as { user?: User } | undefined;
      if (payload?.user) {
        setUser(payload.user);
      } else {
        void fetchUser();
      }
    };
    const refreshCommunityFromEvent = (event: WSOutgoing) => {
      const payload = (event.data ?? {}) as Record<string, unknown>;
      const nestedMessage = payload.message as Record<string, unknown> | undefined;
      const nestedChannel = payload.channel as Record<string, unknown> | undefined;
      const communityId =
        (nestedMessage?.communityId as string | undefined) ??
        (nestedChannel?.communityId as string | undefined) ??
        (event.communityId as string | undefined) ??
        (payload.communityId as string | undefined);

      if (communityId) {
        refreshCommunityUnread(communityId);
      }
    };

    const unsubscribers = [
      subscribe('message.created', (event) => {
        invalidateInbox();
        refreshCommunityFromEvent(event);
      }),
      subscribe('message.updated', refreshCommunityFromEvent),
      subscribe('channel.updated', refreshCommunityFromEvent),
      subscribe('dm.message_created', invalidateDm),
      subscribe('dm.message_updated', invalidateDm),
      subscribe('dm.message_deleted', invalidateDm),
      subscribe('dm.conversation_created', invalidateDm),
      subscribe('dm.conversation_updated', invalidateDm),
      subscribe('presence.updated', invalidateDm),
      subscribe('presence.updated', invalidateFriends),
      subscribe(WebSocketEvent.PROFILE_UPDATED, handleProfileUpdated),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [communities, fetchUser, queryClient, refreshCommunityUnread, setUser]);

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111d]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(74,144,226,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(88,101,242,0.18),transparent_28%),linear-gradient(180deg,#07111d_0%,#0b1727_100%)]" />
        <div className="relative z-10 rounded-[2rem] border border-white/10 bg-white/[0.05] px-6 py-4 text-sm font-medium text-white/72 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const startRailResize = (startClientX: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    const startWidth = desktopRailWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: MouseEvent) => {
      const nextWidth = startWidth + (event.clientX - startClientX);
      setDesktopRailWidth(
        Math.min(MAX_DESKTOP_RAIL_WIDTH, Math.max(MIN_DESKTOP_RAIL_WIDTH, nextWidth)),
      );
    };

    const handlePointerUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#07111d] text-white">
      <DesktopLocalMachineBridgeAutoConnect ownerUserId={user?.id} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(58,94,190,0.24),transparent_26%),radial-gradient(circle_at_80%_0%,rgba(67,193,255,0.14),transparent_22%),linear-gradient(180deg,#07111d_0%,#09121f_32%,#0c1626_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[24rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_40%)] opacity-70" />
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1a2b]/92 text-white/78 shadow-[0_16px_38px_rgba(2,8,23,0.44)] backdrop-blur-xl transition hover:bg-[#152235] hover:text-white md:hidden"
        aria-label="Toggle navigation"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#020617]/70 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* CommunityRail: hidden on mobile by default, shown as overlay when open */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:relative md:inset-auto md:translate-x-0 md:transition-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: `${desktopRailWidth}px` }}
      >
        <CommunityRail
          communities={communities}
          inboxCount={inboxCount}
          dmCount={dmCount}
          friendCount={friendCount}
          currentUser={{
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }}
          onOpenAI={aiAssistantEnabled ? () => setAiAssistantOpen(true) : undefined}
        />
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            startRailResize(event.clientX);
          }}
          className="absolute right-0 top-0 hidden h-full w-2 -translate-x-1/2 cursor-col-resize bg-transparent md:block"
          aria-label="Resize navigation rail"
          title="Resize navigation rail"
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/8 transition hover:bg-white/30" />
        </button>
      </div>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <ConnectionStatusBar />
        <ToastViewport />
        <div className="flex min-h-0 flex-1">{children}</div>
      </main>

      <AIAssistant open={aiAssistantEnabled && aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} />
    </div>
  );
}
