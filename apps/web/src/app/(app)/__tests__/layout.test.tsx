import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '../layout';

const { mockClearOfflineQueue, mockClearCachedUserSettings } = vi.hoisted(() => ({
  mockClearOfflineQueue: vi.fn(async () => undefined),
  mockClearCachedUserSettings: vi.fn(),
}));

const mockReplace = vi.fn();
const mockFetchUser = vi.fn();
const mockSetUser = vi.fn();
const mockDesktopBridgeAutoConnect = vi.fn();
const mockClear = vi.fn();
const mockResetUnread = vi.fn();
const mockResetOfflineQueue = vi.fn();
const mockCloseSidebar = vi.fn();
const mockCloseChannelSidebar = vi.fn();
const mockSetDmShowList = vi.fn();
const mockSetActiveConversation = vi.fn();
const mockCloseThread = vi.fn();
const mockDisconnectVoice = vi.fn();
let profileUpdatedHandler: ((message: { data?: unknown }) => void) | null = null;
let currentUser: {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: null;
} | null = {
  id: 'user-1',
  displayName: 'Alice Example',
  username: 'alice',
  avatarUrl: null,
};

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    clear: mockClear,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQuery: ({ queryKey }: { queryKey?: unknown[] }) => {
    const key = queryKey?.[0];
    if (key === 'communities') {
      return {
        data: [
          {
            id: 'community-1',
            slug: 'alpha-team',
            name: 'Alpha Team',
          },
        ],
      };
    }
    if (key === 'dm-conversations') {
      return {
        data: [{ unreadCount: 5 }],
      };
    }
    if (key === 'friends-summary') {
      return {
        data: {
          friends: [
            { status: 'pending', isRequester: false },
            { status: 'accepted', isRequester: false },
          ],
        },
      };
    }
    return { data: undefined };
  },
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: {
    user: typeof currentUser;
    isLoading: boolean;
    fetchUser: typeof mockFetchUser;
    setUser: typeof mockSetUser;
  }) => unknown) =>
    selector({
      user: currentUser,
      isLoading: false,
      fetchUser: mockFetchUser,
      setUser: mockSetUser,
    }),
}));

vi.mock('@/stores/mobile-nav', () => ({
  useMobileNavStore: (selector: (state: {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: typeof mockCloseSidebar;
    closeChannelSidebar: typeof mockCloseChannelSidebar;
    setDmShowList: typeof mockSetDmShowList;
  }) => unknown) =>
    selector({
      sidebarOpen: false,
      toggleSidebar: vi.fn(),
      closeSidebar: mockCloseSidebar,
      closeChannelSidebar: mockCloseChannelSidebar,
      setDmShowList: mockSetDmShowList,
    }),
}));

vi.mock('@/stores/thread', () => ({
  useThreadStore: (selector: (state: {
    closeThread: typeof mockCloseThread;
  }) => unknown) =>
    selector({
      closeThread: mockCloseThread,
    }),
}));

vi.mock('@/stores/dm', () => ({
  useDmStore: (selector: (state: {
    setActiveConversation: typeof mockSetActiveConversation;
  }) => unknown) =>
    selector({
      setActiveConversation: mockSetActiveConversation,
    }),
}));

vi.mock('@/stores/unread', () => ({
  useUnreadStore: (selector: (state: {
    fetchUnread: (communityId: string) => Promise<void>;
    reset: typeof mockResetUnread;
  }) => unknown) =>
    selector({
      fetchUnread: vi.fn(async () => undefined),
      reset: mockResetUnread,
    }),
}));

vi.mock('@/stores/offline-queue', () => ({
  useOfflineQueueStore: (selector: (state: {
    reset: typeof mockResetOfflineQueue;
  }) => unknown) =>
    selector({
      reset: mockResetOfflineQueue,
    }),
}));

vi.mock('@/stores/voice', () => ({
  useVoiceStore: (selector: (state: {
    disconnect: typeof mockDisconnectVoice;
  }) => unknown) =>
    selector({
      disconnect: mockDisconnectVoice,
    }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/offline-queue', () => ({
  clearQueue: mockClearOfflineQueue,
}));

vi.mock('@/lib/user-settings', () => ({
  clearCachedUserSettings: mockClearCachedUserSettings,
}));

vi.mock('@/lib/session-token', () => ({
  AUTH_SESSION_LOST_EVENT: 'zktalk-auth-session-lost',
}));

vi.mock('@/components/CommunityRail', () => ({
  CommunityRail: ({
    dmCount,
    friendCount,
    currentUser,
  }: {
    dmCount?: number;
    friendCount?: number;
    currentUser?: { displayName: string } | null;
  }) => (
    <div>
      CommunityRailMock:{dmCount ?? 0}:{friendCount ?? 0}:{currentUser?.displayName ?? 'none'}
    </div>
  ),
}));

vi.mock('@/components/DesktopLocalMachineBridgeAutoConnect', () => ({
  DesktopLocalMachineBridgeAutoConnect: ({
    ownerUserId,
  }: {
    ownerUserId: string | null | undefined;
  }) => {
    mockDesktopBridgeAutoConnect(ownerUserId);
    return <div>DesktopLocalMachineBridgeAutoConnectMock:{ownerUserId ?? 'none'}</div>;
  },
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div>UserAvatarMock</div>,
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  subscribe: (event: string, handler: (message: { data?: unknown }) => void) => {
    if (event === 'profile.updated') {
      profileUpdatedHandler = handler;
    }
    return () => undefined;
  },
  useWebSocket: () => undefined,
  useWebSocketStatus: () => 'connected',
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => undefined,
}));

describe('AppLayout', () => {
  beforeEach(() => {
    currentUser = {
      id: 'user-1',
      displayName: 'Alice Example',
      username: 'alice',
      avatarUrl: null,
    };
    mockClear.mockReset();
    mockResetUnread.mockReset();
    mockResetOfflineQueue.mockReset();
    mockCloseSidebar.mockReset();
    mockCloseChannelSidebar.mockReset();
    mockDesktopBridgeAutoConnect.mockReset();
    mockSetDmShowList.mockReset();
    mockSetActiveConversation.mockReset();
    mockCloseThread.mockReset();
    mockDisconnectVoice.mockReset();
    mockClearCachedUserSettings.mockReset();
    mockClearOfflineQueue.mockClear();
    mockReplace.mockReset();
    mockFetchUser.mockReset();
    mockSetUser.mockReset();
    profileUpdatedHandler = null;
  });

  it('passes summary badges into the sidebar rail and keeps the layout shell visible', () => {
    render(
      <AppLayout>
        <div>ChildContent</div>
      </AppLayout>,
    );

    expect(screen.getByText('CommunityRailMock:5:1:Alice Example')).toBeTruthy();
    expect(screen.getByText('ChildContent')).toBeTruthy();
  });

  it('keeps desktop local machine auto-connect mounted with the authenticated owner id', () => {
    render(
      <AppLayout>
        <div>ChildContent</div>
      </AppLayout>,
    );

    expect(mockDesktopBridgeAutoConnect).toHaveBeenCalledWith('user-1');
    expect(screen.getByText('DesktopLocalMachineBridgeAutoConnectMock:user-1')).toBeTruthy();
  });

  it('updates the auth store when a profile update event arrives over websocket', () => {
    render(
      <AppLayout>
        <div>ChildContent</div>
      </AppLayout>,
    );

    expect(profileUpdatedHandler).toBeTruthy();

    act(() => {
      profileUpdatedHandler?.({
        data: {
          user: {
            id: 'user-1',
            email: 'alice@example.com',
            displayName: 'Alice Updated',
            username: 'alice',
            avatarUrl: 'http://127.0.0.1:4000/api/upload/assets/users/user-1/avatar.png',
            bio: null,
          },
        },
      });
    });

    expect(mockSetUser).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice Updated',
      username: 'alice',
      avatarUrl: 'http://127.0.0.1:4000/api/upload/assets/users/user-1/avatar.png',
      bio: null,
    });
  });

  it('clears cached authenticated state when the user session disappears', () => {
    const view = render(
      <AppLayout>
        <div>ChildContent</div>
      </AppLayout>,
    );

    currentUser = null;
    view.rerender(
      <AppLayout>
        <div>ChildContent</div>
      </AppLayout>,
    );

    expect(mockClear).toHaveBeenCalled();
    expect(mockResetUnread).toHaveBeenCalled();
    expect(mockResetOfflineQueue).toHaveBeenCalled();
    expect(mockClearCachedUserSettings).toHaveBeenCalled();
    expect(mockCloseSidebar).toHaveBeenCalled();
    expect(mockCloseChannelSidebar).toHaveBeenCalled();
    expect(mockSetDmShowList).toHaveBeenCalledWith(true);
    expect(mockSetActiveConversation).toHaveBeenCalledWith(null);
    expect(mockCloseThread).toHaveBeenCalled();
    expect(mockDisconnectVoice).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login?next=%2Fhome');
  });

  it('handles a global auth loss event by clearing cached state and dropping the user', () => {
    render(
      <AppLayout>
        <div>ChildContent</div>
      </AppLayout>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('zktalk-auth-session-lost'));
    });

    expect(mockClear).toHaveBeenCalled();
    expect(mockResetUnread).toHaveBeenCalled();
    expect(mockResetOfflineQueue).toHaveBeenCalled();
    expect(mockClearCachedUserSettings).toHaveBeenCalled();
    expect(mockClearOfflineQueue).toHaveBeenCalled();
    expect(mockCloseSidebar).toHaveBeenCalled();
    expect(mockCloseChannelSidebar).toHaveBeenCalled();
    expect(mockSetDmShowList).toHaveBeenCalledWith(true);
    expect(mockSetActiveConversation).toHaveBeenCalledWith(null);
    expect(mockCloseThread).toHaveBeenCalled();
    expect(mockDisconnectVoice).toHaveBeenCalled();
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });
});
