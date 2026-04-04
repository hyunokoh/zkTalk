import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import type { Community } from '@zktalk/shared';
import { ChannelSidebar } from '../ChannelSidebar';

vi.mock('next/navigation', () => ({
  useParams: () => ({ channelId: undefined, slug: 'test' }),
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
  it('renders without crashing', () => {
    renderWithQueryClient(
      <ChannelSidebar community={{ id: 'community-1', slug: 'test', name: 'Test Community' } as Community} />,
    );
  });
});
