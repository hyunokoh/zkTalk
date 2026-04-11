import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Community } from '@zktalk/shared';
import { ChannelSidebar } from '../ChannelSidebar';
import { ApiError } from '@/lib/api';

const { mockApi, mockPush } = vi.hoisted(() => ({
  mockApi: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ channelId: undefined, slug: 'test' }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api', () => ({
  api: mockApi,
  ApiError: class MockApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({ users: {} }),
}));

vi.mock('@/stores/unread', () => ({
  useUnreadStore: () => ({
    unreadMap: {},
    fetchUnread: vi.fn(),
  }),
}));

vi.mock('@/lib/user-settings', () => ({
  COLLAPSED_SECTIONS_UPDATED_EVENT: 'collapsed-sections-updated',
  getCollapsedSectionState: () => false,
  setCollapsedSectionState: vi.fn(),
}));

vi.mock('@/lib/voice-preferences', () => ({
  VOICE_PREFERENCES_UPDATED_EVENT: 'voice-preferences-updated',
  getLastVoiceChannelForCommunity: () => null,
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('ChannelSidebar', () => {
  let lockedChannel: {
    id: string;
    communityId: string;
    categoryId: null;
    name: string;
    type: string;
    visibility: string;
    accessPolicy: string;
    slowModeSeconds: number;
    position: number;
    isArchived: boolean;
    isE2eeEnabled: boolean;
    disappearingDuration: null;
    requireTopic: boolean;
    createdAt: string;
    updatedAt: string;
    canView: boolean;
    lockedReason: 'join_required' | 'invite_required';
  };

  beforeEach(() => {
    mockApi.mockReset();
    mockPush.mockReset();
    lockedChannel = {
      id: 'locked-channel',
      communityId: 'community-1',
      categoryId: null,
      name: 'Members',
      type: 'chat',
      visibility: 'role_restricted',
      accessPolicy: 'members_only',
      slowModeSeconds: 0,
      position: 0,
      isArchived: false,
      isE2eeEnabled: false,
      disappearingDuration: null,
      requireTopic: false,
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
      canView: false,
      lockedReason: 'join_required',
    };
    mockApi.mockImplementation((path: string) => {
      if (path === '/api/communities/community-1/channels') {
        return Promise.resolve({
          uncategorized: [lockedChannel],
          categories: [],
        });
      }

      if (path === '/api/communities/community-1/members') {
        return Promise.resolve({ members: [] });
      }

      if (path === '/api/communities/community-1/join') {
        return Promise.resolve({});
      }

      return Promise.resolve({ participants: [] });
    });
  });

  it('renders without crashing', () => {
    renderWithQueryClient(
      <ChannelSidebar community={{ id: 'community-1', slug: 'test', name: 'Test Community' } as Community} />,
    );
  });

  it('renders a locked channel row without a navigation link', async () => {
    renderWithQueryClient(
      <ChannelSidebar community={{ id: 'community-1', slug: 'test', name: 'Test Community' } as Community} />,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('channel-sidebar-locked-locked-channel')).not.toBeNull();
    });

    expect(screen.queryByText('channel.lockedJoinRequired')).not.toBeNull();
    expect(screen.queryByTestId('channel-sidebar-link-locked-channel')).toBeNull();
  });

  it('opens a join prompt for a members-only channel and joins the community', async () => {
    let joined = false;
    mockApi.mockImplementation((path: string) => {
      if (path === '/api/communities/community-1/channels') {
        return Promise.resolve({
          uncategorized: [
            joined
              ? {
                  ...lockedChannel,
                  canView: true,
                  lockedReason: undefined,
                }
              : lockedChannel,
          ],
          categories: [],
        });
      }

      if (path === '/api/communities/community-1/members') {
        return Promise.resolve({ members: joined ? [{ id: 'member-1', userId: 'user-1' }] : [] });
      }

      if (path === '/api/communities/community-1/join') {
        joined = true;
        return Promise.resolve({});
      }

      return Promise.resolve({ participants: [] });
    });

    renderWithQueryClient(
      <ChannelSidebar community={{ id: 'community-1', slug: 'test', name: 'Test Community' } as Community} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('channel-sidebar-locked-locked-channel')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('channel-sidebar-locked-locked-channel'));

    expect(screen.getByTestId('channel-sidebar-locked-prompt')).toBeTruthy();
    expect(screen.getByText('channel.lockedPromptJoinBody')).toBeTruthy();

    fireEvent.click(screen.getByTestId('channel-sidebar-locked-prompt-join'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/communities/community-1/join', {
        method: 'POST',
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/communities/test/channels/locked-channel');
    });

    await waitFor(() => {
      expect(screen.getByTestId('channel-sidebar-link-locked-channel')).toBeTruthy();
    });
    expect(screen.queryByTestId('channel-sidebar-locked-locked-channel')).toBeNull();
  });

  it('opens an invite prompt for an invite-only channel', async () => {
    lockedChannel = {
      ...lockedChannel,
      accessPolicy: 'invite_only',
      lockedReason: 'invite_required',
    };

    renderWithQueryClient(
      <ChannelSidebar community={{ id: 'community-1', slug: 'test', name: 'Test Community' } as Community} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('channel-sidebar-locked-locked-channel')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('channel-sidebar-locked-locked-channel'));

    expect(screen.getByText('channel.lockedPromptInviteBody')).toBeTruthy();

    fireEvent.click(screen.getByTestId('channel-sidebar-locked-prompt-invite'));

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('keeps private channels out of the discoverable list', async () => {
    const hiddenPrivateChannel = {
      ...lockedChannel,
      id: 'private-channel',
      name: 'leadership',
      accessPolicy: 'private',
      lockedReason: 'invite_required' as const,
    };

    mockApi.mockImplementation((path: string) => {
      if (path === '/api/communities/community-1/channels') {
        return Promise.resolve({
          uncategorized: [lockedChannel, hiddenPrivateChannel],
          categories: [],
        });
      }

      if (path === '/api/communities/community-1/members') {
        return Promise.resolve({ members: [] });
      }

      return Promise.resolve({ participants: [] });
    });

    renderWithQueryClient(
      <ChannelSidebar community={{ id: 'community-1', slug: 'test', name: 'Test Community' } as Community} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('channel-sidebar-locked-locked-channel')).toBeTruthy();
    });
    expect(within(document.body).queryByText('leadership')).toBeNull();
  });

  it('keeps rendering when public browse member count lookup is forbidden', async () => {
    mockApi.mockImplementation((path: string) => {
      if (path === '/api/communities/community-1/channels') {
        return Promise.resolve({
          uncategorized: [lockedChannel],
          categories: [],
        });
      }

      if (path === '/api/communities/community-1/members') {
        return Promise.reject(new ApiError(403, 'Forbidden'));
      }

      return Promise.resolve({ participants: [] });
    });

    renderWithQueryClient(
      <ChannelSidebar community={{ id: 'community-1', slug: 'test', name: 'Test Community' } as Community} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('channel-sidebar-locked-locked-channel')).toBeTruthy();
    });
    expect(mockApi).toHaveBeenCalledWith('/api/communities/community-1/members');
    expect(screen.getByText('discover.members')).toBeTruthy();
  });
});
