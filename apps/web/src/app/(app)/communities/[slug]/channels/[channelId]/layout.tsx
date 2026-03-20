'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Channel } from '@zktalk/shared';

export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const channelId = params.channelId as string;

  const { data: channel, isLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => api<Channel>(`/api/channels/${channelId}`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-gray-400">Loading channel...</div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-gray-400">Channel not found</div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Channel header */}
      <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
        <span className="text-gray-500">
          {channel.type === 'forum' ? (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          ) : channel.type === 'announcement' ? (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            '#'
          )}
        </span>
        <h2 className="text-base font-semibold text-gray-100">{channel.name}</h2>
        {channel.description && (
          <>
            <div className="mx-2 h-5 w-px bg-gray-700" />
            <p className="truncate text-sm text-gray-400">{channel.description}</p>
          </>
        )}
      </div>

      {/* Channel content */}
      {children}
    </div>
  );
}
