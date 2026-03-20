'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Community } from '@zktalk/shared';

export default function CommunityOverviewPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api<Community>(`/api/communities/${slug}`),
  });

  if (!community) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-bold text-white">
          {community.iconUrl ? (
            <img
              src={community.iconUrl}
              alt={community.name}
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            community.name.charAt(0).toUpperCase()
          )}
        </div>
        <h1 className="text-2xl font-bold">{community.name}</h1>
        {community.description && (
          <p className="mt-2 text-gray-400">{community.description}</p>
        )}
        <p className="mt-4 text-sm text-gray-500">
          Select a channel from the sidebar to start chatting.
        </p>
      </div>
    </div>
  );
}
