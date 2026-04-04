/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Community } from '@zktalk/shared';
import { setCommunityOrder } from '@/lib/community-order';
import { CommunityRail } from '../CommunityRail';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { alt, src, unoptimized, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement> & {
      unoptimized?: boolean;
    };
    void unoptimized;
    return <img alt={alt} src={typeof src === 'string' ? src : ''} {...rest} />;
  },
}));

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
  useParams: () => ({ slug: 'alpha-team' }),
  usePathname: () => '/home',
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/unread', () => ({
  useUnreadStore: () => ({
    fetchUnread: vi.fn(),
    hasCommunityUnread: () => false,
  }),
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({
    displayName,
    avatarUrl,
  }: {
    displayName: string;
    avatarUrl?: string | null;
  }) => (
    <div data-testid="user-avatar" data-display-name={displayName} data-avatar-url={avatarUrl ?? ''} />
  ),
}));

function makeCommunity(overrides: Partial<Community>): Community {
  return {
    id: 'community-1',
    slug: 'alpha-team',
    name: 'Alpha Team',
    description: null,
    iconUrl: null,
    bannerUrl: null,
    visibility: 'public',
    ownerUserId: 'user-1',
    createdAt: '2026-03-27T00:00:00.000Z',
    updatedAt: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('CommunityRail', () => {
  it('updates the rail order immediately when the community order changes in the same window', () => {
    window.localStorage.clear();

    render(
      <CommunityRail
        communities={[
          makeCommunity({ id: 'community-1', slug: 'alpha-team', name: 'Alpha Team' }),
          makeCommunity({ id: 'community-2', slug: 'beta-team', name: 'Beta Team' }),
        ]}
      />,
    );

    const rail = screen.getByRole('navigation');
    expect(
      within(rail).getAllByTestId(/community-rail-community-/).map((node) => node.getAttribute('data-testid')),
    ).toEqual([
      'community-rail-community-alpha-team',
      'community-rail-community-beta-team',
    ]);

    act(() => {
      setCommunityOrder(['community-2', 'community-1']);
    });

    expect(
      within(rail).getAllByTestId(/community-rail-community-/).map((node) => node.getAttribute('data-testid')),
    ).toEqual([
      'community-rail-community-beta-team',
      'community-rail-community-alpha-team',
    ]);
  });

  it('shows Kakao-style icon tabs with unread badges inside the rail', () => {
    render(
      <CommunityRail
        communities={[makeCommunity({})]}
        dmCount={5}
        friendCount={1}
      />,
    );

    expect(screen.getByRole('link', { name: 'nav.home' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'nav.dms' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'nav.friends' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'nav.settings' })).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('shows the signed-in user avatar at the top of the rail and links to profile editing', () => {
    render(
      <CommunityRail
        communities={[makeCommunity({})]}
        currentUser={{
          displayName: 'Alice Example',
          avatarUrl: 'http://127.0.0.1:4000/api/upload/assets/users/user-1/avatar.png',
        }}
      />,
    );

    expect(screen.getByRole('link', { name: 'profile.edit' }).getAttribute('href')).toBe(
      '/settings#profile-edit',
    );
    expect(screen.getByTestId('user-avatar').getAttribute('data-avatar-url')).toBe(
      'http://127.0.0.1:4000/api/upload/assets/users/user-1/avatar.png',
    );
  });

  it('rewrites first-party community icon URLs to the same-origin proxy', () => {
    render(
      <CommunityRail
        communities={[
          makeCommunity({
            iconUrl: 'http://127.0.0.1:4000/api/upload/assets/communities/community-1/icon.png',
            updatedAt: '2026-04-01T00:00:00.000Z',
          }),
        ]}
      />,
    );

    const image = screen.getByAltText('Alpha Team');
    expect(image.getAttribute('src')).toBe('/api/public-assets/communities/community-1/icon.png?v=2026-04-01T00%3A00%3A00.000Z');
  });

  it('keeps external community icon URLs unchanged', () => {
    render(
      <CommunityRail
        communities={[
          makeCommunity({
            slug: 'beta-team',
            name: 'Beta Team',
            iconUrl: 'https://example.com/community-icon.png',
            updatedAt: '2026-04-01T00:00:00.000Z',
          }),
        ]}
      />,
    );

    const image = screen.getByAltText('Beta Team');
    expect(image.getAttribute('src')).toBe('https://example.com/community-icon.png?v=2026-04-01T00%3A00%3A00.000Z');
  });
});
