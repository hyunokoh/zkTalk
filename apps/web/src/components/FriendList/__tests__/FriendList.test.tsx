import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FriendList } from '../FriendList';

type MockUseQueryArgs = {
  queryKey?: unknown[];
};

let mockSearchParams = new URLSearchParams();

const mockFriends = [
  {
    id: 'friendship-1',
    status: 'accepted',
    isRequester: false,
    createdAt: '2026-03-27T00:00:00.000Z',
    user: {
      id: 'user-2',
      displayName: 'Bob Example',
      username: 'bob',
      avatarUrl: null,
    },
  },
];

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => values?.name ?? values?.username ?? key,
  }),
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({ displayName }: { displayName: string }) => <div>{displayName}</div>,
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: MockUseQueryArgs) => {
    const key = queryKey?.[0];
    if (key === 'friends') {
      return {
        data: { friends: mockFriends },
      };
    }
    if (key === 'friend-search') {
      return {
        data: [],
        isLoading: false,
      };
    }
    if (key === 'friendship-check') {
      return {
        data: {
          status: 'accepted',
          friendshipId: 'friendship-2',
          isRequester: false,
        },
      };
    }
    return { data: undefined, isLoading: false };
  },
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

describe('FriendList', () => {
  it('shows message, voice, and video actions for accepted friends', () => {
    mockSearchParams = new URLSearchParams();

    render(<FriendList />);

    expect(screen.getAllByText('Bob Example').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'friend.message' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'voice.join' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'voice.videoCall' })).toBeTruthy();
  });

  it('shows message, voice, and video actions for an accepted shared profile', () => {
    mockSearchParams = new URLSearchParams(
      'profileUserId=user-3&displayName=Alice+Example&username=alice',
    );

    render(<FriendList />);

    expect(screen.getAllByRole('button', { name: 'friend.message' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'voice.join' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'voice.videoCall' }).length).toBeGreaterThan(0);
  });
});
