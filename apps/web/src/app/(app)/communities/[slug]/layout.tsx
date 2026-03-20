'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useThreadStore } from '@/stores/thread';
import { ChannelSidebar } from '@/components/ChannelSidebar';
import { ThreadPanel } from '@/components/ThreadPanel';
import { CreateChannelModal } from '@/components/CreateChannelModal';
import type { Community } from '@zktalk/shared';
import Link from 'next/link';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.slug as string;
  const channelId = params.channelId as string | undefined;
  const user = useAuthStore((s) => s.user);
  const activeThreadId = useThreadStore((s) => s.activeThreadId);

  const [createChannelModal, setCreateChannelModal] = useState<{
    open: boolean;
    categoryId: string | null;
  }>({ open: false, categoryId: null });

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api<Community>(`/api/communities/${slug}`),
  });

  const isAdmin = community?.ownerUserId === user?.id;

  const handleAddChannel = useCallback((categoryId: string | null) => {
    setCreateChannelModal({ open: true, categoryId });
  }, []);

  if (communityLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-gray-400">Loading community...</div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-300">Community not found</h2>
          <Link href="/home" className="mt-2 text-sm text-indigo-400 hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Channel sidebar */}
      <ChannelSidebar
        community={community}
        isAdmin={isAdmin}
        onAddChannel={handleAddChannel}
      />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>

      {/* Thread panel (conditionally shown) */}
      {activeThreadId && channelId && (
        <ThreadPanel channelId={channelId} />
      )}

      {/* Create channel modal */}
      {createChannelModal.open && (
        <CreateChannelModal
          communityId={community.id}
          categoryId={createChannelModal.categoryId}
          onClose={() => setCreateChannelModal({ open: false, categoryId: null })}
        />
      )}
    </div>
  );
}
