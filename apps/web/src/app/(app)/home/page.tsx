'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { UserAvatar } from '@/components/UserAvatar';
import type { Community } from '@zktalk/shared';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api<Community[]>('/api/communities'),
    enabled: !!user,
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
        <h1 className="text-lg font-bold">Your Communities</h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <UserAvatar
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                size="sm"
              />
              <span className="text-sm text-gray-300">{user.displayName}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-400">
              {communities.length === 0 && !isLoading
                ? 'You haven\'t joined any communities yet.'
                : `${communities.length} communit${communities.length === 1 ? 'y' : 'ies'}`}
            </p>
            <Link
              href="/communities/new"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Create community
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-400">Loading communities...</div>
          ) : (
            <div className="space-y-3">
              {communities.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.slug}`}
                  className="flex items-center gap-4 rounded-lg bg-gray-800 p-4 transition-colors hover:bg-gray-750"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
                    {community.iconUrl ? (
                      <img
                        src={community.iconUrl}
                        alt={community.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      community.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{community.name}</h3>
                    {community.description && (
                      <p className="truncate text-sm text-gray-400">
                        {community.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{community.visibility}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
