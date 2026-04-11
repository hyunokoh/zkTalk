import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChannelLayout from '../layout';
import { ApiError } from '@/lib/api';

const { mockApi, mockPush } = vi.hoisted(() => ({
  mockApi: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'alpha-team', channelId: 'channel-1' }),
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

vi.mock('@/lib/runtime-config', () => ({
  getLivekitUrl: () => 'wss://livekit.test',
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/PinnedMessages', () => ({
  PinnedMessages: () => <div>PinnedMessagesMock</div>,
}));

vi.mock('@/components/VoiceRoom', () => ({
  VoiceRoomButton: () => <div>VoiceRoomButtonMock</div>,
  VoiceRoom: () => <div>VoiceRoomMock</div>,
}));

vi.mock('@/stores/voice', () => ({
  useVoiceStore: () => ({
    isConnected: false,
    token: null,
    channelId: null,
    isVideoEnabled: false,
    disconnect: vi.fn(),
  }),
}));

vi.mock('@/stores/mobile-nav', () => ({
  useMobileNavStore: (selector: (state: { toggleChannelSidebar: () => void; channelSidebarOpen: boolean }) => unknown) =>
    selector({
      toggleChannelSidebar: vi.fn(),
      channelSidebarOpen: false,
    }),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ChannelLayout locked channel deep link handling', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockPush.mockReset();
  });

  it('shows a join prompt when a discoverable members-only channel is deep-linked', async () => {
    let joined = false;

    mockApi.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/api/communities/alpha-team') {
        return Promise.resolve({
          community: {
            id: 'community-1',
            slug: 'alpha-team',
            name: 'Alpha Team',
          },
        });
      }

      if (path === '/api/channels/channel-1') {
        if (!joined) {
          return Promise.reject(new ApiError(403, 'Forbidden'));
        }

        return Promise.resolve({
          channel: {
            id: 'channel-1',
            communityId: 'community-1',
            name: 'members',
            type: 'chat',
          },
        });
      }

      if (path === '/api/communities/community-1/channels') {
        return Promise.resolve({
          uncategorized: [
            {
              id: 'channel-1',
              communityId: 'community-1',
              name: 'members',
              type: 'chat',
              accessPolicy: joined ? 'public' : 'members_only',
              canView: joined,
              lockedReason: 'join_required',
            },
          ],
          categories: [],
        });
      }

      if (path === '/api/communities/community-1/join' && options?.method === 'POST') {
        joined = true;
        return Promise.resolve({});
      }

      return Promise.resolve({});
    });

    renderWithQueryClient(
      <ChannelLayout>
        <div data-testid="channel-layout-children">children</div>
      </ChannelLayout>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('channel-layout-locked-prompt')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('channel-layout-join-community'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/communities/community-1/join', {
        method: 'POST',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('channel-layout-children')).toBeTruthy();
    });
  });

  it('shows an invite action when an invite-only channel is deep-linked', async () => {
    mockApi.mockImplementation((path: string) => {
      if (path === '/api/communities/alpha-team') {
        return Promise.resolve({
          community: {
            id: 'community-1',
            slug: 'alpha-team',
            name: 'Alpha Team',
          },
        });
      }

      if (path === '/api/channels/channel-1') {
        return Promise.reject(new ApiError(403, 'Forbidden'));
      }

      if (path === '/api/communities/community-1/channels') {
        return Promise.resolve({
          uncategorized: [
            {
              id: 'channel-1',
              communityId: 'community-1',
              name: 'ops',
              type: 'chat',
              accessPolicy: 'invite_only',
              canView: false,
              lockedReason: 'invite_required',
            },
          ],
          categories: [],
        });
      }

      return Promise.resolve({});
    });

    renderWithQueryClient(
      <ChannelLayout>
        <div>children</div>
      </ChannelLayout>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('channel-layout-open-invite')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('channel-layout-open-invite'));

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('does not show a locked prompt when a private channel stays hidden from browse results', async () => {
    mockApi.mockImplementation((path: string) => {
      if (path === '/api/communities/alpha-team') {
        return Promise.resolve({
          community: {
            id: 'community-1',
            slug: 'alpha-team',
            name: 'Alpha Team',
          },
        });
      }

      if (path === '/api/channels/channel-1') {
        return Promise.reject(new ApiError(403, 'Forbidden'));
      }

      if (path === '/api/communities/community-1/channels') {
        return Promise.resolve({
          uncategorized: [
            {
              id: 'channel-2',
              communityId: 'community-1',
              name: 'members',
              type: 'chat',
              accessPolicy: 'members_only',
              canView: false,
              lockedReason: 'join_required',
            },
          ],
          categories: [],
        });
      }

      return Promise.resolve({});
    });

    renderWithQueryClient(
      <ChannelLayout>
        <div>children</div>
      </ChannelLayout>,
    );

    await waitFor(() => {
      expect(screen.getByText('channel.notFound')).toBeTruthy();
    });

    expect(screen.queryByTestId('channel-layout-locked-prompt')).toBeNull();
    expect(screen.queryByTestId('channel-layout-open-invite')).toBeNull();
    expect(screen.queryByTestId('channel-layout-join-community')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
