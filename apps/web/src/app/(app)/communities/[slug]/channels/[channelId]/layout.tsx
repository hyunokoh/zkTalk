'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { getLivekitUrl } from '@/lib/runtime-config';
import { useTranslation } from '@/lib/i18n';
import { PinnedMessages } from '@/components/PinnedMessages';
import { VoiceRoomButton, VoiceRoom } from '@/components/VoiceRoom';
import { useVoiceStore } from '@/stores/voice';
import { useMobileNavStore } from '@/stores/mobile-nav';
import {
  getChannelBrowsePresentation,
  isLockedBrowseChannel,
  resolveChannelSurfaceActionOrder,
  shouldRenderBrowseChannel,
} from '@zktalk/shared';
import type { Channel, Community } from '@zktalk/shared';

export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const channelId = params.channelId as string;
  const [showPinned, setShowPinned] = useState(false);
  const [showHeaderOverflow, setShowHeaderOverflow] = useState(false);
  const { isConnected, token, channelId: voiceChannelId, isVideoEnabled, disconnect } = useVoiceStore();
  const showVoiceRoom = isConnected && token && voiceChannelId === channelId;
  const toggleChannelSidebar = useMobileNavStore((s) => s.toggleChannelSidebar);
  const channelSidebarOpen = useMobileNavStore((s) => s.channelSidebarOpen);
  const livekitUrl = getLivekitUrl();
  const headerOverflowRef = useRef<HTMLDivElement>(null);

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const {
    data: channel,
    isLoading,
    error: channelError,
  } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const res = await api<{ channel: Channel }>(`/api/channels/${channelId}`);
      return res.channel;
    },
  });

  const { data: browseChannels = [] } = useQuery({
    queryKey: ['community-channel-browse', community?.id],
    enabled: !!community?.id,
    queryFn: async () => {
      const res = await api<{
        uncategorized: Channel[];
        categories: Array<{ channels: Channel[] }>;
      }>(`/api/communities/${community!.id}/channels`);

      return [
        ...(res.uncategorized ?? []),
        ...(res.categories ?? []).flatMap((category) => category.channels ?? []),
      ];
    },
  });

  const lockedBrowseChannel = (() => {
    if (!(channelError instanceof ApiError) || channelError.status !== 403) {
      return null;
    }

    const browseChannel = browseChannels.find((entry) => entry.id === channelId);
    if (!browseChannel || !shouldRenderBrowseChannel(browseChannel) || !isLockedBrowseChannel(browseChannel)) {
      return null;
    }

    return browseChannel;
  })();
  const lockedBrowsePresentation = lockedBrowseChannel
    ? getChannelBrowsePresentation(lockedBrowseChannel)
    : null;
  const sourceDmName = channel?.sourceDmConversation?.name?.trim() ?? '';
  const sourceDmConversationId = channel?.sourceDmConversation?.id ?? channel?.sourceDmConversationId ?? null;
  const sourceDmFullLabel = sourceDmName
    ? t('channel.sourceDmNameLabelWithName', { name: sourceDmName })
    : t('dm.historyCompact');
  const channelSearchHref = `/communities/${slug}/search?channelId=${encodeURIComponent(channelId)}`;
  const channelActionOrder = resolveChannelSurfaceActionOrder({
    showSearch: true,
    showPins: true,
    showSourceDm: !!sourceDmConversationId,
    showCommunitySettings: true,
  });

  useEffect(() => {
    if (!showHeaderOverflow) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (headerOverflowRef.current && !headerOverflowRef.current.contains(event.target as Node)) {
        setShowHeaderOverflow(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowHeaderOverflow(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showHeaderOverflow]);

  const joinCommunityMutation = useMutation({
    mutationFn: async () => {
      if (!community?.id) {
        throw new Error('Community is not loaded');
      }

      await api(`/api/communities/${community.id}/join`, {
        method: 'POST',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channel', channelId] }),
        queryClient.invalidateQueries({ queryKey: ['community-channel-browse', community?.id] }),
      ]);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-fg-muted">{t('channel.loadingChannel')}</div>
      </div>
    );
  }

  if (lockedBrowseChannel) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div
          data-testid="channel-layout-locked-prompt"
          className="w-full max-w-lg rounded-[1.75rem] border border-warning/20 bg-warning/10 px-6 py-6 text-warning shadow-[0_24px_48px_rgba(2,8,23,0.28)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warning/70">
            {t('channel.lockedPromptTitle')}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-fg">{lockedBrowseChannel.name}</h2>
          <p className="mt-3 text-sm leading-6 text-warning/90">
            {t(lockedBrowsePresentation?.lockedPromptBodyKey ?? 'channel.lockedPromptJoinBody')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lockedBrowseChannel.lockedReason === 'invite_required' ? (
              <button
                type="button"
                data-testid="channel-layout-open-invite"
                onClick={() => router.push('/')}
                className="rounded-xl bg-warning px-3 py-2 text-sm font-semibold text-white transition hover:bg-warning/85"
              >
                {t('channel.lockedPromptInviteAction')}
              </button>
            ) : (
              <button
                type="button"
                data-testid="channel-layout-join-community"
                onClick={() => joinCommunityMutation.mutate()}
                disabled={joinCommunityMutation.isPending}
                className="rounded-xl bg-warning px-3 py-2 text-sm font-semibold text-warning transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {joinCommunityMutation.isPending
                  ? t('channel.lockedPromptJoining')
                  : t('channel.lockedPromptJoinAction')}
              </button>
            )}
            <Link
              href={`/communities/${slug}`}
              className="rounded-xl border border-warning/20 px-3 py-2 text-sm font-medium text-warning/85 transition hover:bg-bg-hover hover:text-fg"
            >
              {t('common.back')}
            </Link>
          </div>
          {joinCommunityMutation.isError && lockedBrowseChannel.lockedReason !== 'invite_required' && (
            <p className="mt-3 text-xs text-warning/90">{t('channel.lockedPromptJoinFailed')}</p>
          )}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-fg-muted">{t('channel.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Channel header — Discord-style simple bar */}
      <div className="relative flex h-12 shrink-0 items-center gap-3 border-b border-line bg-bg-subtle px-4 pl-14 md:pl-4">
        {/* Mobile: channel sidebar toggle — positioned right of the app hamburger */}
        <button
          onClick={toggleChannelSidebar}
          className="absolute left-[50px] top-1 flex h-10 w-10 items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg md:hidden"
          aria-label="Toggle channels"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={channelSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h10M4 18h16'} />
          </svg>
        </button>

        {/* Channel icon + name */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-fg-subtle">
            {channel.type === 'forum' ? (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            ) : channel.type === 'voice' ? (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            ) : channel.type === 'announcement' ? (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <span className="text-lg font-medium leading-none">#</span>
            )}
          </span>
          <h1
            data-testid="channel-header-title"
            className="truncate text-base font-semibold text-fg"
          >
            {channel.name}
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1 border-l border-line pl-3">
          {channel.disappearingDuration && channel.disappearingDuration > 0 && (
            <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
              {t('disappearing.active')}
            </span>
          )}
          {(channel.type === 'chat' || channel.type === 'voice') && (
            <div className="flex items-center">
              <VoiceRoomButton channelId={channelId} communityId={channel.communityId} compact />
            </div>
          )}
          {channelActionOrder.primary.includes('search') && (
            <Link
              href={channelSearchHref}
              data-testid="channel-header-search-link"
              className="rounded-md p-1.5 text-fg-subtle hover:bg-bg-hover hover:text-fg"
              title={t('search.title')}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.5 3a5.5 5.5 0 104.032 9.24l2.614 2.614a1 1 0 001.414-1.414l-2.614-2.614A5.5 5.5 0 008.5 3zm-3.5 5.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          )}
          {channelActionOrder.primary.includes('pins') && (
            <button
              data-testid="channel-header-pins-button"
              onClick={() => setShowPinned(!showPinned)}
              className={`rounded-md p-1.5 hover:bg-bg-hover ${showPinned ? 'text-white' : 'text-fg-subtle hover:text-fg'}`}
              title={t('pin.pinned')}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.293 1.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-7 7a1 1 0 01-1.414-1.414L7 11.586V9a1 1 0 00-1-1H3a1 1 0 010-2h4V4.414l-.293-.293a1 1 0 010-1.414z" />
              </svg>
            </button>
          )}
          {channelActionOrder.overflow.length > 0 && (
            <div className="relative" ref={headerOverflowRef}>
              <button
                type="button"
                data-testid="channel-header-overflow-button"
                onClick={() => setShowHeaderOverflow((prev) => !prev)}
                className={`rounded-md p-1.5 hover:bg-bg-hover ${showHeaderOverflow ? 'text-white' : 'text-fg-subtle hover:text-fg'}`}
                title={t('message.moreActions')}
                aria-expanded={showHeaderOverflow}
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8.5 14.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z" />
                </svg>
              </button>
              {showHeaderOverflow && (
                <div
                  data-testid="channel-header-overflow-menu"
                  className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-bg-subtle p-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
                >
                  {channelActionOrder.overflow.includes('source_dm') && sourceDmConversationId && (
                    <Link
                      href={`/dm/${sourceDmConversationId}`}
                      data-testid="channel-source-dm-link"
                      onClick={() => setShowHeaderOverflow(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition hover:bg-bg-hover"
                      title={sourceDmFullLabel}
                    >
                      <svg className="h-4 w-4 shrink-0 text-fg-subtle" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5zm12 0v4a4 4 0 01-4 4h-.5l-.718.737A2 2 0 0012 15h2l3 3v-3h1a2 2 0 002-2V7a2 2 0 00-2-2h-4z" />
                      </svg>
                      <span className="truncate">{sourceDmFullLabel}</span>
                    </Link>
                  )}
                  {channelActionOrder.overflow.includes('community_settings') && (
                    <Link
                      href={`/communities/${slug}/settings`}
                      data-testid="channel-header-settings-link"
                      onClick={() => setShowHeaderOverflow(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition hover:bg-bg-hover"
                      title={t('nav.settings')}
                    >
                      <svg className="h-4 w-4 shrink-0 text-fg-subtle" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      <span>{t('nav.settings')}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPinned && (
        <PinnedMessages channelId={channelId} onClose={() => setShowPinned(false)} />
      )}

      {showVoiceRoom && (
        <VoiceRoom
          token={token}
          serverUrl={livekitUrl}
          channelId={channelId}
          onDisconnected={disconnect}
          isVideoEnabled={isVideoEnabled}
        />
      )}

      {children}
    </div>
  );
}
