/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Community, User } from '@zktalk/shared';
import HomePage from '../page';

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
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockCommunities: Community[] = [];

const mockUser: User = {
  id: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice Example',
  username: 'alice',
  avatarUrl: null,
  bio: null,
  createdAt: '2026-03-27T00:00:00.000Z',
  updatedAt: '2026-03-27T00:00:00.000Z',
};

const mockLogout = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: mockCommunities,
    isLoading: false,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: { user: User | null; logout: typeof mockLogout }) => unknown) =>
    selector({
      user: mockUser,
      logout: mockLogout,
    }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => values?.count ?? key,
  }),
}));

describe('HomePage', () => {
  it('shows desktop quick-start actions for invite paste and community creation', () => {
    mockCommunities.splice(0, mockCommunities.length);

    render(<HomePage />);

    expect(screen.getAllByText('app.desktopPasteInvite').length).toBeGreaterThan(0);
    expect(screen.getAllByText('community.createCommunity').length).toBeGreaterThan(0);
  });

  it('renders first-party community icons through the same-origin proxy', () => {
    mockCommunities.splice(
      0,
      mockCommunities.length,
      {
        id: 'community-1',
        slug: 'alpha-team',
        name: 'Alpha Team',
        description: 'Alpha description',
        iconUrl: 'http://127.0.0.1:4000/api/upload/assets/communities/community-1/icon.png',
        bannerUrl: null,
        visibility: 'public',
        ownerUserId: 'user-1',
        createdAt: '2026-03-27T00:00:00.000Z',
        updatedAt: '2026-03-27T00:00:00.000Z',
      },
    );

    render(<HomePage />);

    const image = screen.getByAltText('Alpha Team');
    expect(image.getAttribute('src')).toBe('/api/public-assets/communities/community-1/icon.png?v=2026-03-27T00%3A00%3A00.000Z');
  });

  it('keeps external community icons unchanged in the home list', () => {
    mockCommunities.splice(
      0,
      mockCommunities.length,
      {
        id: 'community-2',
        slug: 'beta-team',
        name: 'Beta Team',
        description: 'Beta description',
        iconUrl: 'https://example.com/community-icon.png',
        bannerUrl: null,
        visibility: 'public',
        ownerUserId: 'user-1',
        createdAt: '2026-03-27T00:00:00.000Z',
        updatedAt: '2026-03-27T00:00:00.000Z',
      },
    );

    render(<HomePage />);

    const image = screen.getByAltText('Beta Team');
    expect(image.getAttribute('src')).toBe('https://example.com/community-icon.png?v=2026-03-27T00%3A00%3A00.000Z');
  });
});
