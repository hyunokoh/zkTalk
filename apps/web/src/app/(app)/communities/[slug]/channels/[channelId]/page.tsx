'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageList } from '@/components/MessageList';
import { MessageComposer } from '@/components/MessageComposer';
import { ForumPostList } from '@/components/ForumPostList';
import { useAuthStore } from '@/stores/auth';
import type { Channel, Community } from '@zktalk/shared';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const slug = params.slug as string;
  const user = useAuthStore((s) => s.user);

  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => api<Channel>(`/api/channels/${channelId}`),
  });

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api<Community>(`/api/communities/${slug}`),
  });

  if (!channel) return null;

  // Forum channel
  if (channel.type === 'forum') {
    return <ForumPostList channelId={channelId} communitySlug={slug} />;
  }

  // Announcement channel: read-only for non-owners/admins
  const isOwner = community?.ownerUserId === user?.id;
  const isAnnouncementReadOnly = channel.type === 'announcement' && !isOwner;

  // Chat / Announcement channel
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList channelId={channelId} />
      <MessageComposer
        channelId={channelId}
        placeholder={
          isAnnouncementReadOnly
            ? 'Only admins can post in announcement channels'
            : `Message #${channel.name}`
        }
        disabled={isAnnouncementReadOnly}
      />
    </div>
  );
}
