import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchPage from '../page';

const { mockSearchFilters } = vi.hoisted(() => ({
  mockSearchFilters: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'alpha-team' }),
  useSearchParams: () =>
    new URLSearchParams('channelId=channel-7'),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'community') {
      return {
        data: {
          id: 'community-1',
          slug: 'alpha-team',
          name: 'Alpha Team',
        },
      };
    }

    if (queryKey[0] === 'channels') {
      return {
        data: {
          uncategorized: [{ id: 'channel-7', name: 'general' }],
          categories: [],
        },
      };
    }

    if (queryKey[0] === 'search') {
      return {
        data: [],
        isLoading: false,
      };
    }

    return { data: undefined, isLoading: false };
  },
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/SearchBar', () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock('@/components/SearchResults', () => ({
  SearchResults: () => <div data-testid="search-results" />,
}));

vi.mock('@/components/SearchFilters', () => ({
  SearchFilters: (props: unknown) => {
    mockSearchFilters(props);
    return <div data-testid="search-filters" />;
  },
}));

describe('SearchPage', () => {
  it('hydrates the channel filter from the chat header search link', () => {
    render(<SearchPage />);

    expect(screen.getByTestId('search-filters')).toBeTruthy();
    expect(mockSearchFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          channelId: 'channel-7',
        }),
      }),
    );
  });
});
