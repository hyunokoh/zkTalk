/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CommunityOverviewPage from '../page';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { alt, src, unoptimized, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement> & {
      unoptimized?: boolean;
    };
    void unoptimized;
    return <img alt={alt} src={typeof src === 'string' ? src : ''} {...rest} />;
  },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'alpha-team' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0];

    if (key === 'community') {
      return {
        data: {
          id: 'community-1',
          slug: 'alpha-team',
          name: 'Alpha Team',
          description: 'Operator-ready public community',
          iconUrl: null,
          visibility: 'public',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
      };
    }

    if (key === 'community-overview-channels') {
      return {
        data: {
          uncategorized: [],
          categories: [],
        },
      };
    }

    if (key === 'community-overview-members') {
      return {
        data: {
          members: [{ id: 'member-1', userId: 'user-1' }],
        },
      };
    }

    return { data: [] };
  },
  useQueries: () => [],
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  ApiError: class MockApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => values?.count ?? key,
  }),
}));

vi.mock('@/lib/voice-preferences', () => ({
  VOICE_PREFERENCES_UPDATED_EVENT: 'voice-preferences-updated',
  getLastVoiceChannelForCommunity: () => null,
}));

vi.mock('@/lib/image-optimization', () => ({
  resolveImageRenderProps: () => ({
    src: null,
    unoptimized: false,
  }),
}));

vi.mock('@/components/OnboardingModal', () => ({
  OnboardingModal: () => null,
}));

vi.mock('@/components/VoiceRoom', () => ({
  VoiceRoomButton: () => null,
}));

describe('CommunityOverviewPage', () => {
  it('shows the access model hint under the community home intro copy', () => {
    render(<CommunityOverviewPage />);

    expect(screen.getByText('community.selectChannel')).toBeTruthy();
    expect(screen.getByText('community.channelAccessHint')).toBeTruthy();
    expect(screen.getByText('community.channelAccessOpenLabel')).toBeTruthy();
    expect(screen.getByText('community.channelAccessJoinLabel')).toBeTruthy();
    expect(screen.getByText('community.channelAccessInviteLabel')).toBeTruthy();
  });
});
