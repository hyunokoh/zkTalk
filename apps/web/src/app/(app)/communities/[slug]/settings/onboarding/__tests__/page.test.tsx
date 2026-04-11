import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OnboardingSettingsPage from '../page';

const invalidateQueries = vi.fn();
const communityData = {
  id: 'community-1',
  slug: 'alpha-team',
  name: 'Alpha Team',
};
const onboardingData = {
  onboarding: {
    welcomeMessage: null,
    rules: null,
    defaultChannelIds: null,
    isEnabled: true,
  },
};
const communityChannels = [
  { id: 'channel-public', name: 'announcements', accessPolicy: 'public' },
  { id: 'channel-members', name: 'general', accessPolicy: 'members_only' },
  { id: 'channel-invite', name: 'projects', accessPolicy: 'invite_only' },
  { id: 'channel-private', name: 'leadership', accessPolicy: 'private' },
];

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'alpha-team' }),
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0];

    if (key === 'community') {
      return {
        data: communityData,
      };
    }

    if (key === 'onboarding') {
      return {
        data: onboardingData,
      };
    }

    if (key === 'community-channels') {
      return {
        data: communityChannels,
      };
    }

    return { data: undefined };
  },
  useMutation: () => ({
    isPending: false,
    isSuccess: false,
    mutate: vi.fn(),
  }),
  useQueryClient: () => ({
    invalidateQueries,
  }),
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useCommunityRole', () => ({
  useCommunityRole: () => ({
    canManageSettings: true,
    isLoading: false,
  }),
}));

describe('OnboardingSettingsPage', () => {
  it('shows only onboarding-eligible channels with access policy labels', () => {
    render(<OnboardingSettingsPage />);

    expect(screen.getByRole('button', { name: /announcements/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /general/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /projects/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /leadership/i })).toBeNull();

    expect(screen.getByText('community.channelAccessOpenLabel')).toBeTruthy();
    expect(screen.getByText('community.channelAccessJoinLabel')).toBeTruthy();
    expect(screen.getByText('community.channelAccessInviteLabel')).toBeTruthy();
  });
});
