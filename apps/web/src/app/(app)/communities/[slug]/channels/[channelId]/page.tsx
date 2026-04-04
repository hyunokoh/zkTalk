'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { saveLastVisited } from '@/lib/user-settings';
import { MessageList } from '@/components/MessageList';
import { MessageComposer } from '@/components/MessageComposer';
import { ForumPostList } from '@/components/ForumPostList';
import { VoiceRoomButton } from '@/components/VoiceRoom';
import { useUnreadStore } from '@/stores/unread';
import type { Channel, Community, Message, User } from '@zktalk/shared';

interface ChannelPermissions {
  canPostMessage: boolean;
}

function getChannelTypeLabel(channel: Channel, t: (key: string) => string): string {
  if (channel.type === 'announcement') {
    return t('channel.announcement');
  }
  if (channel.type === 'forum') {
    return t('channel.forum');
  }
  return t('channel.chat');
}

export default function ChannelPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const channelId = params.channelId as string;
  const slug = params.slug as string;
  const markRead = useUnreadStore((s) => s.markRead);
  const autoJoinMode = searchParams.get('joinVoice') === 'video'
    ? 'video'
    : searchParams.get('joinVoice') === 'voice'
      ? 'voice'
      : null;

  // Inline reply state
  const [replyTo, setReplyTo] = useState<{ message: Message; author?: User | null } | null>(null);

  // Mark channel as read when the page mounts or channelId changes
  useEffect(() => {
    if (channelId) {
      markRead(channelId);
    }
  }, [channelId, markRead]);

  // Clear reply when channel changes
  useEffect(() => {
    setReplyTo(null);
  }, [channelId]);

  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const res = await api<{ channel: Channel }>(`/api/channels/${channelId}`);
      return res.channel;
    },
  });

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { data: permissions } = useQuery({
    queryKey: ['channel-me-permissions', channelId],
    queryFn: async () => {
      const res = await api<{ permissions: ChannelPermissions }>(`/api/channels/${channelId}/me-permissions`);
      return res.permissions;
    },
    enabled: !!channelId,
  });

  useEffect(() => {
    if (channelId) {
      void saveLastVisited({
        kind: 'channel',
        communityId: channel?.communityId,
        channelId,
      });
    }
  }, [channel?.communityId, channelId]);

  const handleReply = useCallback((message: Message, author?: User | null) => {
    setReplyTo({ message, author });
  }, []);

  if (!channel) return null;

  // Forum channel
  if (channel.type === 'forum') {
    return <ForumPostList channelId={channelId} communitySlug={slug} />;
  }

  if (channel.type === 'voice') {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white/80 p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {channel.name}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {channel.description || t('voice.connected')}
          </p>
          <div className="mt-6 flex items-center justify-center">
            <VoiceRoomButton
              channelId={channelId}
              communityId={channel.communityId}
              autoJoinMode={autoJoinMode}
            />
          </div>
        </div>
      </div>
    );
  }

  const isReadOnly = permissions?.canPostMessage === false;
  const isAnnouncementReadOnly = channel.type === 'announcement' && isReadOnly;
  const channelTypeLabel = getChannelTypeLabel(channel, t);

  // Chat / Announcement channel
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_100%)] px-5 py-5 md:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              <span className="rounded-full border border-sky-300/18 bg-sky-300/10 px-2.5 py-1 text-sky-200">
                {channelTypeLabel}
              </span>
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-white/54">
                {community?.name ?? slug}
              </span>
              {isReadOnly ? (
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-200">
                  {t('channel.readOnly')}
                </span>
              ) : null}
            </div>
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-white">
              {channel.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
              {channel.description || t('channel.headerSubtitle')}
            </p>
          </div>
        </div>
      </div>
      <MessageList
        channelId={channelId}
        communityId={community?.id}
        onReplyToMessage={handleReply}
      />
      <MessageComposer
        channelId={channelId}
        communityId={community?.id}
        placeholder={
          isAnnouncementReadOnly
            ? t('channel.announcementOnly')
            : isReadOnly
              ? t('channel.readOnly')
            : t('message.placeholder', { channel: channel.name })
        }
        disabled={isReadOnly}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
