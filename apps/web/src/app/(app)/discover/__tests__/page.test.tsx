/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DiscoverPage from '../page';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { alt, src, unoptimized, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement> & {
      unoptimized?: boolean;
    };
    void unoptimized;
    return <img alt={alt} src={typeof src === 'string' ? src : ''} {...rest} />;
  },
}));

const mockPush = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockMutate = vi.fn();

const mockCommunities = [
  {
    id: 'community-1',
    slug: 'alpha-team',
    name: 'Alpha Team',
    description: 'Alpha description',
    iconUrl: 'http://127.0.0.1:4000/api/upload/assets/communities/community-1/icon.png',
    visibility: 'public',
    createdAt: '2026-03-27T00:00:00.000Z',
    memberCount: 12,
  },
];

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: mockCommunities,
    isLoading: false,
  }),
  useMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => values?.count ?? key,
  }),
}));

describe('DiscoverPage', () => {
  it('renders public-community entry actions for anonymous discovery', () => {
    mockCommunities.splice(
      0,
      mockCommunities.length,
      {
        id: 'community-1',
        slug: 'alpha-team',
        name: 'Alpha Team',
        description: 'Alpha description',
        iconUrl: null,
        visibility: 'public',
        createdAt: '2026-03-27T00:00:00.000Z',
        memberCount: 12,
      },
    );

    render(<DiscoverPage />);

    expect(screen.getByRole('button', { name: 'discover.join' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'community.open' }).getAttribute('href')).toBe(
      '/communities/alpha-team',
    );
  });

  it('sends the selected public community into the join mutation', () => {
    mockCommunities.splice(
      0,
      mockCommunities.length,
      {
        id: 'community-1',
        slug: 'alpha-team',
        name: 'Alpha Team',
        description: 'Alpha description',
        iconUrl: null,
        visibility: 'public',
        createdAt: '2026-03-27T00:00:00.000Z',
        memberCount: 12,
      },
    );

    render(<DiscoverPage />);
    fireEvent.click(screen.getByRole('button', { name: 'discover.join' }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'alpha-team',
        visibility: 'public',
      }),
    );
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
        visibility: 'public',
        createdAt: '2026-03-27T00:00:00.000Z',
        memberCount: 12,
      },
    );

    render(<DiscoverPage />);

    const image = screen.getByAltText('Alpha Team');
    expect(image.getAttribute('src')).toBe('/api/public-assets/communities/community-1/icon.png?v=2026-03-27T00%3A00%3A00.000Z');
  });

  it('keeps external community icons unchanged in discover cards', () => {
    mockCommunities.splice(
      0,
      mockCommunities.length,
      {
        id: 'community-2',
        slug: 'beta-team',
        name: 'Beta Team',
        description: 'Beta description',
        iconUrl: 'https://example.com/community-icon.png',
        visibility: 'public',
        createdAt: '2026-03-27T00:00:00.000Z',
        memberCount: 8,
      },
    );

    render(<DiscoverPage />);

    const image = screen.getByAltText('Beta Team');
    expect(image.getAttribute('src')).toBe('https://example.com/community-icon.png?v=2026-03-27T00%3A00%3A00.000Z');
  });
});
