'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { fetchAiRuntime } from '@/lib/ai-runtime';
import { useTranslation } from '@/lib/i18n';
import { buildComposerSelectedMessageAiState } from '@/lib/selected-message-ai';
import { fetchUserSettings, saveLastVisited } from '@/lib/user-settings';
import { MessageList } from '@/components/MessageList';
import { MessageComposer, type ComposerAiActionRequest } from '@/components/MessageComposer';
import { ForumPostList } from '@/components/ForumPostList';
import { VoiceRoomButton } from '@/components/VoiceRoom';
import { useUnreadStore } from '@/stores/unread';
import type { MessageAiActionKind } from '@/components/MessageItem';
import type { Channel, Community, Message, TranslationDisplayPreference, User } from '@zktalk/shared';

interface ChannelPermissions {
  canPostMessage: boolean;
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
  const [aiActionRequest, setAiActionRequest] = useState<ComposerAiActionRequest | null>(null);

  // Mark channel as read when the page mounts or channelId changes
  useEffect(() => {
    if (channelId) {
      markRead(channelId);
    }
  }, [channelId, markRead]);

  // Clear reply when channel changes
  useEffect(() => {
    setReplyTo(null);
    setAiActionRequest(null);
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
      try {
        const res = await api<{ permissions: ChannelPermissions }>(`/api/channels/${channelId}/me-permissions`);
        return res.permissions;
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          return {
            canPostMessage: false,
          };
        }
        throw error;
      }
    },
    enabled: !!channelId,
  });

  const { data: aiRuntime } = useQuery({
    queryKey: ['ai-runtime'],
    queryFn: fetchAiRuntime,
    staleTime: 60_000,
  });
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 60_000,
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

  const handleAiAction = useCallback((message: Message, author: User | null | undefined, action: MessageAiActionKind) => {
    const composerState = buildComposerSelectedMessageAiState({
      action,
      surface: 'channel',
      message,
      author,
    });

    if (!composerState) {
      setReplyTo(null);
      setAiActionRequest(null);
      return;
    }

    setReplyTo(composerState.replyTo);
    setAiActionRequest(composerState.aiActionRequest);
  }, []);

  if (!channel) return null;

  // Forum channel
  if (channel.type === 'forum') {
    return <ForumPostList channelId={channelId} communitySlug={slug} />;
  }

  if (channel.type === 'voice') {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-line bg-bg-hover p-8 text-center shadow-sm dark:border-line dark:bg-bg-subtle/80">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success text-success dark:bg-success/30 dark:text-success">
            <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-fg dark:text-fg-muted">
            {channel.name}
          </h3>
          <p className="mt-2 text-sm text-fg-muted dark:text-fg-muted">
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
  // Chat / Announcement channel
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList
        channelId={channelId}
        communityId={community?.id}
        onReplyToMessage={handleReply}
        onRequestAiAction={handleAiAction}
        aiRuntime={aiRuntime}
        translationDisplayPreference={
          (userSettings?.translationDisplay as TranslationDisplayPreference | undefined) ?? undefined
        }
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
        aiActionRequest={aiActionRequest}
        onAiActionRequestHandled={() => setAiActionRequest(null)}
        aiRuntime={aiRuntime}
      />
    </div>
  );
}
