'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getLivekitUrl } from '@/lib/runtime-config';
import { useTranslation } from '@/lib/i18n';
import { PinnedMessages } from '@/components/PinnedMessages';
import { VoiceRoomButton, VoiceRoom } from '@/components/VoiceRoom';
import { useVoiceStore } from '@/stores/voice';
import { useMobileNavStore } from '@/stores/mobile-nav';
import type { Channel } from '@zktalk/shared';

interface CommunityChannelSummary {
  id: string;
  name: string;
  type: string;
}

export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const channelId = params.channelId as string;
  const [showPinned, setShowPinned] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const { isConnected, token, channelId: voiceChannelId, isVideoEnabled, disconnect } = useVoiceStore();
  const showVoiceRoom = isConnected && token && voiceChannelId === channelId;
  const toggleChannelSidebar = useMobileNavStore((s) => s.toggleChannelSidebar);
  const channelSidebarOpen = useMobileNavStore((s) => s.channelSidebarOpen);
  const livekitUrl = getLivekitUrl();

  const { data: channel, isLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const res = await api<{ channel: Channel }>(`/api/channels/${channelId}`);
      return res.channel;
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const res = await api<{ summary: string }>(
        `/api/channels/${channelId}/ai/summarize`,
        { method: 'POST', body: {} },
      );
      return res.summary;
    },
  });
  const { data: communityChannelData } = useQuery({
    queryKey: ['community-channels', channel?.communityId],
    enabled: !!channel?.communityId,
    queryFn: () =>
      api<{
        uncategorized: CommunityChannelSummary[];
        categories: Array<{ channels: CommunityChannelSummary[] }>;
      }>(`/api/communities/${channel!.communityId}/channels`),
  });

  const communityVoiceChannels = useMemo(() => {
    const channels = [
      ...(communityChannelData?.uncategorized ?? []),
      ...(communityChannelData?.categories ?? []).flatMap((category) => category.channels ?? []),
    ];
    return channels.filter((entry) => entry.type === 'voice');
  }, [communityChannelData?.categories, communityChannelData?.uncategorized]);

  const voiceParticipantQueries = useQueries({
    queries: communityVoiceChannels.map((entry) => ({
      queryKey: ['voice-participants', entry.id],
      queryFn: () =>
        api<{ participants: Array<{ userId: string }> }>(
          `/api/channels/${entry.id}/voice/participants`,
        ),
      enabled: true,
      refetchInterval: 15_000,
    })),
  });

  const voiceParticipantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    communityVoiceChannels.forEach((entry, index) => {
      counts[entry.id] = voiceParticipantQueries[index]?.data?.participants?.length ?? 0;
    });
    return counts;
  }, [communityVoiceChannels, voiceParticipantQueries]);

  const otherLiveVoiceChannels = useMemo(
    () =>
      communityVoiceChannels
        .filter((entry) => entry.id !== channelId && (voiceParticipantCounts[entry.id] ?? 0) > 0)
        .sort((left, right) => {
          const countDelta =
            (voiceParticipantCounts[right.id] ?? 0) - (voiceParticipantCounts[left.id] ?? 0);
          if (countDelta !== 0) {
            return countDelta;
          }
          return left.name.localeCompare(right.name, undefined, {
            sensitivity: 'base',
            numeric: true,
          });
        }),
    [channelId, communityVoiceChannels, voiceParticipantCounts],
  );

  const handleSummarize = () => {
    setShowSummary(true);
    summarizeMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-gray-400">{t('channel.loadingChannel')}</div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-gray-400">{t('channel.notFound')}</div>
      </div>
    );
  }

  const sourceDmName = channel.sourceDmConversation?.name?.trim() || null;
  const sourceDmTypeLabel = channel.sourceDmConversation
    ? channel.sourceDmConversation.type === 'direct'
      ? t('dm.oneToOne')
      : t('dm.group')
    : null;
  const sourceDmHeaderLabel = sourceDmTypeLabel
    ? `${sourceDmTypeLabel} ${t('dm.historyCompact')}`
    : t('dm.historyCompact');
  const sourceDmFullLabel = sourceDmName
    ? `${sourceDmHeaderLabel} · ${sourceDmName}`
    : sourceDmHeaderLabel;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Channel header — Discord-style simple bar */}
      <div className="relative flex h-12 shrink-0 items-center gap-3 border-b border-[#202225] bg-[#313338] px-4 pl-14 md:pl-4">
        {/* Mobile: channel sidebar toggle — positioned right of the app hamburger */}
        <button
          onClick={toggleChannelSidebar}
          className="absolute left-[50px] top-1 flex h-10 w-10 items-center justify-center rounded-md text-[#96989d] hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Toggle channels"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={channelSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h10M4 18h16'} />
          </svg>
        </button>

        {/* Channel icon + name */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-[#72767d]">
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
          <div className="truncate text-base font-semibold text-white">{channel.name}</div>
          {channel.sourceDmConversation && (
            <span
              className="hidden shrink-0 rounded-full bg-[#404249] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#dbdee1] sm:inline-flex"
              title={sourceDmFullLabel}
            >
              {sourceDmHeaderLabel}
            </span>
          )}
          {channel.description?.trim() && (
            <>
              <span className="shrink-0 text-[#4f545c]">|</span>
              <p className="truncate text-sm text-[#72767d]">{channel.description.trim()}</p>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1 border-l border-[#202225] pl-3">
          {channel.disappearingDuration && channel.disappearingDuration > 0 && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
              {t('disappearing.active')}
            </span>
          )}
          {(channel.type === 'chat' || channel.type === 'voice') && (
            <div className="flex items-center">
              <VoiceRoomButton channelId={channelId} communityId={channel.communityId} compact />
            </div>
          )}
          {channel.sourceDmConversation && (
            <Link
              href={`/dm/${channel.sourceDmConversation.id}`}
              className="rounded-md p-1.5 text-[#72767d] hover:bg-white/10 hover:text-[#dcddde]"
              title={sourceDmFullLabel}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5zm12 0v4a4 4 0 01-4 4h-.5l-.718.737A2 2 0 0012 15h2l3 3v-3h1a2 2 0 002-2V7a2 2 0 00-2-2h-4z" />
              </svg>
            </Link>
          )}
          <button
            onClick={handleSummarize}
            disabled={summarizeMutation.isPending}
            className="rounded-md p-1.5 text-[#72767d] hover:bg-white/10 hover:text-[#dcddde] disabled:opacity-50"
            title={t('ai.summarize')}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setShowPinned(!showPinned)}
            className={`rounded-md p-1.5 hover:bg-white/10 ${showPinned ? 'text-white' : 'text-[#72767d] hover:text-[#dcddde]'}`}
            title={t('pin.pinned')}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.293 1.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-7 7a1 1 0 01-1.414-1.414L7 11.586V9a1 1 0 00-1-1H3a1 1 0 010-2h4V4.414l-.293-.293a1 1 0 010-1.414z" />
            </svg>
          </button>
          <Link
            href={`/communities/${slug}/settings`}
            className="rounded-md p-1.5 text-[#72767d] hover:bg-white/10 hover:text-[#dcddde]"
            title={t('nav.settings')}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Live voice rooms bar */}
      {otherLiveVoiceChannels.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#202225] bg-[#2f3136] px-4 py-1.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#72767d]">
            {t('voice.liveRoomsTitle')}
          </span>
          {otherLiveVoiceChannels.map((entry) => (
            <Link
              key={entry.id}
              href={`/communities/${slug}/channels/${entry.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#40444b] px-2 py-1 text-xs font-medium text-[#dcddde] hover:bg-[#4f545c]"
            >
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span>#{entry.name}</span>
              <span className="rounded bg-green-500/20 px-1 text-[10px] text-green-300">
                {voiceParticipantCounts[entry.id] ?? 0}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* DM history bar */}
      {channel.sourceDmConversation && (
        <div
          className="border-b border-[#202225] bg-[#2f3136] px-4 py-2"
          data-testid="channel-source-dm-bar"
          data-source-dm-id={channel.sourceDmConversation.id}
        >
          <Link
            href={`/dm/${channel.sourceDmConversation.id}`}
            data-testid="channel-source-dm-link"
            className="flex items-center gap-3 text-sm text-[#96989d] hover:text-[#dcddde]"
          >
            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
              {t('dm.historyBadge')}
            </span>
            <span className="truncate">{sourceDmFullLabel}</span>
            <span className="ml-auto shrink-0 text-xs text-indigo-400">{t('dm.viewHistory')} →</span>
          </Link>
        </div>
      )}

      {/* AI Summary panel */}
      {showSummary && (
        <div className="border-b border-[#202225] bg-[#2f3136] px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{t('ai.summaryTitle')}</h3>
            <button
              onClick={() => setShowSummary(false)}
              className="rounded p-1 text-[#72767d] hover:bg-white/10 hover:text-[#dcddde]"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-[#96989d]">
            {summarizeMutation.isPending
              ? t('ai.summarizing')
              : summarizeMutation.isError
                ? t('ai.error')
                : summarizeMutation.data ?? ''}
          </div>
        </div>
      )}

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
