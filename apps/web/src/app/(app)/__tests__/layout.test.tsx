import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from '../layout';

const mockReplace = vi.fn();
const mockFetchUser = vi.fn();
const mockSetUser = vi.fn();
let profileUpdatedHandler: ((message: { data?: unknown }) => void) | null = null;

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
    user: { displayName: string; username: string; avatarUrl: null } | null;
    isLoading: boolean;
    fetchUser: typeof mockFetchUser;
    setUser: typeof mockSetUser;
  }) => unknown) =>
    selector({
      user: {
        displayName: 'Alice Example',
        username: 'alice',
        avatarUrl: null,
      },
      isLoading: false,
      fetchUser: mockFetchUser,
      setUser: mockSetUser,
    }),
}));

vi.mock('@/stores/mobile-nav', () => ({
  useMobileNavStore: (selector: (state: {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
  }) => unknown) =>
    selector({
      sidebarOpen: false,
      toggleSidebar: vi.fn(),
      closeSidebar: vi.fn(),
    }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => undefined,
}));

describe('AppLayout', () => {
  it('passes summary badges into the sidebar rail and keeps the layout shell visible', () => {
    render(
      <AppLayout>
        <div>ChildContent</div>
      </AppLayout>,
    );

    expect(screen.getByText('CommunityRailMock:5:1:Alice Example')).toBeTruthy();
    expect(screen.getByText('ChildContent')).toBeTruthy();
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
});
