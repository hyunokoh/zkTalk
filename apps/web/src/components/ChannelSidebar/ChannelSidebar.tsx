'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  VOICE_PREFERENCES_UPDATED_EVENT,
  getLastVoiceChannelForCommunity,
} from '@/lib/voice-preferences';
import {
  COLLAPSED_SECTIONS_UPDATED_EVENT,
  getCollapsedSectionState,
  setCollapsedSectionState,
} from '@/lib/user-settings';
import { VoiceRoomButton } from '@/components/VoiceRoom';
import { usePresence } from '@/hooks/usePresence';
import { useUnreadStore } from '@/stores/unread';
import {
  getChannelBrowsePresentation,
  shouldRenderBrowseChannel,
} from '@zktalk/shared';
import type { Channel, Category, Community } from '@zktalk/shared';

function ChannelIcon({ type }: { type: string }) {
  if (type === 'announcement') {
    return (
      <svg className="h-4 w-4 shrink-0 text-[#72767d]" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
    );
  }
  if (type === 'forum') {
    return (
      <svg className="h-4 w-4 shrink-0 text-[#72767d]" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  if (type === 'voice') {
    return (
      <svg className="h-4 w-4 shrink-0 text-[#72767d]" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    );
  }
  // chat (default)
  return <span className="shrink-0 text-base leading-none text-[#72767d]">#</span>;
}

function SourceDmBadge({ label, title }: { label: string; title?: string }) {
  return (
    <span
      className="rounded bg-[#4f545c] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#dcddde]"
      title={title}
      aria-label={title}
    >
      {label}
    </span>
  );
}

function getLockedChannelCopy(
  t: (key: string) => string,
  channel: Pick<Channel, 'lockedReason'>,
) {
  const { lockedCopyKey } = getChannelBrowsePresentation(channel);
  return lockedCopyKey ? t(lockedCopyKey) : null;
}

interface CategoryGroupProps {
  category: Category | null;
  channels: Channel[];
  communitySlug: string;
  activeChannelId: string | undefined;
  isAdmin: boolean;
  draggedChannelId?: string | null;
  dragTargetKey?: string | null;
  onAddChannel?: (categoryId: string | null) => void;
  onChannelClick?: () => void;
  onDragStart?: (channelId: string, sourceCategoryId: string | null) => void;
  onDragEnd?: () => void;
  onDragTargetChange?: (key: string | null) => void;
  onDropChannel?: (targetCategoryId: string | null, targetIndex: number) => void;
  unreadMap: Record<string, { unread: number; mentions: number }>;
  sourceDmLabel: string;
  directDmLabel: string;
  groupDmLabel: string;
  normalizedSearchQuery: string;
  sourceDmMatchLabel: (name: string) => string;
  recentVoiceChannelId: string | null;
  voiceParticipantCounts: Record<string, number>;
  onLockedChannelClick?: (
    channel: Pick<Channel, 'id' | 'name' | 'lockedReason'>,
  ) => void;
}

function CategoryGroup({
  category,
  channels,
  communitySlug,
  activeChannelId,
  isAdmin,
  draggedChannelId,
  dragTargetKey,
  onAddChannel,
  onChannelClick,
  onDragStart,
  onDragEnd,
  onDragTargetChange,
  onDropChannel,
  unreadMap,
  sourceDmLabel,
  directDmLabel,
  groupDmLabel,
  normalizedSearchQuery,
  sourceDmMatchLabel,
  recentVoiceChannelId,
  voiceParticipantCounts,
  onLockedChannelClick,
}: CategoryGroupProps) {
  const { t } = useTranslation();
  const categoryKey = category?.id ?? 'uncategorized';
  const collapseKey = `channel-sidebar:${communitySlug}:${categoryKey}`;
  const [collapsed, setCollapsed] = useState(() => getCollapsedSectionState(collapseKey));

  useEffect(() => {
    setCollapsed(getCollapsedSectionState(collapseKey));

    const syncCollapsed = () => {
      setCollapsed(getCollapsedSectionState(collapseKey));
    };

    window.addEventListener(COLLAPSED_SECTIONS_UPDATED_EVENT, syncCollapsed);
    window.addEventListener('storage', syncCollapsed);
    return () => {
      window.removeEventListener(COLLAPSED_SECTIONS_UPDATED_EVENT, syncCollapsed);
      window.removeEventListener('storage', syncCollapsed);
    };
  }, [collapseKey]);

  return (
    <div className="mb-1">
      {category && (
        <button
          onClick={() => {
            const nextCollapsed = !collapsed;
            setCollapsed(nextCollapsed);
            setCollapsedSectionState(collapseKey, nextCollapsed);
          }}
          className="group flex w-full items-center gap-1 px-2 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/42 transition hover:text-white/82"
        >
          <svg
              className={`h-3 w-3 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="truncate">{category.name}</span>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChannel?.(category.id);
              }}
              className="ml-auto text-[#8e9297] opacity-0 transition group-hover:opacity-100 hover:text-[#dcddde]"
              title="Create channel"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </button>
      )}

      {!collapsed && (
        <div
          className={`space-y-1 rounded-[1.25rem] transition-colors ${
            dragTargetKey === `${categoryKey}:end` ? 'bg-white/[0.06] p-1.5' : ''
          }`}
          onDragOver={(e) => {
            if (!isAdmin || !draggedChannelId) return;
            e.preventDefault();
            onDragTargetChange?.(`${categoryKey}:end`);
          }}
          onDragLeave={() => {
            if (!isAdmin) return;
            onDragTargetChange?.(null);
          }}
          onDrop={(e) => {
            if (!isAdmin || !draggedChannelId) return;
            e.preventDefault();
            onDropChannel?.(category?.id ?? null, channels.length);
          }}
        >
          {channels.map((channel) => {
            const canViewChannel = channel.canView !== false;
            const browsePresentation = getChannelBrowsePresentation(channel);
            const isLockedChannel = browsePresentation.isLocked;
            const isActive = canViewChannel && channel.id === activeChannelId;
            const unread = unreadMap[channel.id];
            const hasUnread = canViewChannel && !isActive && unread && unread.unread > 0;
            const hasMentions = canViewChannel && !isActive && unread && unread.mentions > 0;
            const itemTargetKey = `${categoryKey}:${channel.id}`;
            const sourceDmName = channel.sourceDmConversation?.name?.trim() ?? '';
            const showSourceDmMatch =
              canViewChannel &&
              normalizedSearchQuery.length > 0 &&
              sourceDmName.length > 0 &&
              sourceDmName.toLowerCase().includes(normalizedSearchQuery) &&
              !channel.name.toLowerCase().includes(normalizedSearchQuery);
            const voiceParticipantCount = canViewChannel ? voiceParticipantCounts[channel.id] ?? 0 : 0;
            const isRecentVoiceChannel =
              canViewChannel && channel.type === 'voice' && channel.id === recentVoiceChannelId;
            const isLiveVoiceChannel =
              canViewChannel && channel.type === 'voice' && voiceParticipantCount > 0;
            const isHighlightedVoiceChannel =
              canViewChannel && channel.type === 'voice' && (isRecentVoiceChannel || isLiveVoiceChannel);
            const voiceStatusLabel = isLiveVoiceChannel
              ? t('voice.participantCount', { count: String(voiceParticipantCount) })
              : isRecentVoiceChannel
                ? t('voice.recentChannel')
                : null;
            const linkLabelParts = [channel.name];
            const lockedCopy = isLockedChannel ? getLockedChannelCopy(t, channel) : null;
            if (lockedCopy) {
              linkLabelParts.push(lockedCopy);
            }
            if (isLiveVoiceChannel) {
              linkLabelParts.push(t('voice.participantCount', { count: String(voiceParticipantCount) }));
            }
            if (isRecentVoiceChannel) {
              linkLabelParts.push(t('voice.recentChannel'));
            }

            const className = `rounded px-2 py-1.5 text-sm transition-colors ${
              isLockedChannel
                ? 'border border-amber-400/20 bg-amber-400/5 text-amber-100/90'
                : isActive
                  ? 'border border-sky-300/30 bg-[linear-gradient(180deg,rgba(67,99,201,0.28),rgba(22,37,72,0.34))] text-white shadow-[0_14px_30px_rgba(7,14,28,0.28)]'
                  : isHighlightedVoiceChannel
                    ? 'border border-white/6 bg-white/[0.04] text-[#f2f3f5] hover:bg-white/[0.07]'
                    : hasUnread
                      ? 'border border-white/6 font-semibold text-[#e5edf8] hover:bg-white/[0.06]'
                      : 'border border-transparent text-white/56 hover:bg-white/[0.05] hover:text-[#e5edf8]'
            } ${draggedChannelId === channel.id ? 'opacity-50' : ''} ${
              dragTargetKey === itemTargetKey ? 'ring-1 ring-inset ring-sky-300/60' : ''
            }`;

            const content = (
              <>
                <div className="flex items-center gap-1.5">
                  {isAdmin && canViewChannel && (
                    <span className="shrink-0 cursor-grab text-xs tracking-tight text-gray-500">⋮⋮</span>
                  )}
                  {isLiveVoiceChannel ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.12)]" />
                  ) : isRecentVoiceChannel ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-300 shadow-[0_0_0_3px_rgba(165,180,252,0.12)]" />
                  ) : null}
                  {isLockedChannel ? (
                    <svg className="h-4 w-4 shrink-0 text-amber-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M6 8V6a4 4 0 118 0v2a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5a2 2 0 012-2zm6-2a2 2 0 10-4 0v2h4V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <ChannelIcon type={channel.type} />
                  )}
                  <span className="truncate">{channel.name}</span>
                  {channel.sourceDmConversation ? (
                    <SourceDmBadge
                      label={
                        channel.sourceDmConversation.type === 'direct'
                          ? directDmLabel
                          : groupDmLabel
                      }
                      title={
                        channel.sourceDmConversation.name
                          ? `${channel.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel} · ${channel.sourceDmConversation.name}`
                          : channel.sourceDmConversation.type === 'direct'
                            ? directDmLabel
                            : groupDmLabel
                      }
                    />
                  ) : channel.sourceDmConversationId ? (
                    <SourceDmBadge label={sourceDmLabel} title={sourceDmLabel} />
                  ) : null}
                  {isLockedChannel && (
                    <span className="ml-auto rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-100">
                      {t('channel.lockedBadge')}
                    </span>
                  )}
                  {isRecentVoiceChannel && (
                    <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-300">
                      {t('voice.recentChannel')}
                    </span>
                  )}
                  {isLiveVoiceChannel && (
                    <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-green-300">
                      {t('voice.liveNow')}
                    </span>
                  )}
                  {isLiveVoiceChannel && (
                    <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold text-gray-200">
                      {voiceParticipantCount}
                    </span>
                  )}
                  {hasMentions && (
                    <span className="ml-auto flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unread.mentions}
                    </span>
                  )}
                  {hasUnread && !hasMentions && (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-white" />
                  )}
                </div>
                {showSourceDmMatch && (
                  <div className="pl-[2.1rem] pt-1 text-[11px] font-medium text-[#7f96a8]">
                    {sourceDmMatchLabel(sourceDmName)}
                  </div>
                )}
                {voiceStatusLabel && (
                  <div
                    className={`pl-[2.1rem] pt-1 text-[11px] font-medium ${
                      isLiveVoiceChannel ? 'text-green-300' : 'text-indigo-300'
                    }`}
                  >
                    {voiceStatusLabel}
                  </div>
                )}
                {isLockedChannel && lockedCopy && (
                  <div className="pl-[2.1rem] pt-1 text-[11px] font-medium text-amber-100/80">
                    {lockedCopy}
                  </div>
                )}
              </>
            );

            if (isLockedChannel) {
              return (
                <button
                  type="button"
                  key={channel.id}
                  data-testid={`channel-sidebar-locked-${channel.id}`}
                  className={className}
                  title={linkLabelParts.join(' · ')}
                  aria-label={linkLabelParts.join(', ')}
                  onClick={() =>
                    onLockedChannelClick?.({
                      id: channel.id,
                      name: channel.name,
                      lockedReason: channel.lockedReason,
                    })
                  }
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={channel.id}
                href={`/communities/${communitySlug}/channels/${channel.id}`}
                onClick={onChannelClick}
                data-testid={`channel-sidebar-link-${channel.id}`}
                draggable={isAdmin}
                onDragStart={(e) => {
                  if (!isAdmin) return;
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart?.(channel.id, category?.id ?? null);
                }}
                onDragEnd={() => {
                  if (!isAdmin) return;
                  onDragEnd?.();
                }}
                onDragOver={(e) => {
                  if (!isAdmin || !draggedChannelId) return;
                  e.preventDefault();
                  onDragTargetChange?.(itemTargetKey);
                }}
                onDragLeave={() => {
                  if (!isAdmin) return;
                  onDragTargetChange?.(null);
                }}
                onDrop={(e) => {
                  if (!isAdmin || !draggedChannelId) return;
                  e.preventDefault();
                  onDropChannel?.(category?.id ?? null, channels.findIndex((entry) => entry.id === channel.id));
                }}
                className={className}
                title={linkLabelParts.join(' · ')}
                aria-label={linkLabelParts.join(', ')}
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ChannelSidebarProps {
  community: Community;
  isAdmin?: boolean;
  onAddChannel?: (categoryId: string | null) => void;
  onChannelClick?: () => void;
}

interface CommunityMemberSummary {
  id: string;
  userId: string;
}

interface LockedChannelPromptState {
  channelId: string;
  channelName: string;
  lockedReason: 'join_required' | 'invite_required';
}

export function ChannelSidebar({ community, isAdmin = false, onAddChannel, onChannelClick }: ChannelSidebarProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const params = useParams();
  const router = useRouter();
  const activeChannelId = params.channelId as string | undefined;
  const { onlineCount } = usePresence(community.id);
  const { unreadMap, fetchUnread } = useUnreadStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dragState, setDragState] = useState<{ channelId: string; sourceCategoryId: string | null } | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const [recentVoiceChannelId, setRecentVoiceChannelId] = useState<string | null>(null);
  const [lockedChannelPrompt, setLockedChannelPrompt] = useState<LockedChannelPromptState | null>(null);
  const { data: membersData } = useQuery({
    queryKey: ['community-members-count', community.id],
    queryFn: async () => {
      try {
        return await api<{ members: CommunityMemberSummary[] }>(`/api/communities/${community.id}/members`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          return { members: [] };
        }
        throw error;
      }
    },
  });
  const memberCount = membersData?.members.length ?? 0;
  const lockedChannelPromptPresentation = lockedChannelPrompt
    ? getChannelBrowsePresentation(lockedChannelPrompt)
    : null;

  // Fetch unread counts for this community
  useEffect(() => {
    fetchUnread(community.id);
  }, [community.id, fetchUnread]);

  const { data: channelData } = useQuery({
    queryKey: ['channels', community.id],
    queryFn: () => api<{ uncategorized: Channel[]; categories: { category: Category; channels: Channel[] }[] }>(`/api/communities/${community.id}/channels`),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      channelId,
      sourceCategoryId,
      targetCategoryId,
      targetIndex,
    }: {
      channelId: string;
      sourceCategoryId: string | null;
      targetCategoryId: string | null;
      targetIndex: number;
    }) => {
      if (!channelData) return;

      const sections = new Map<string | null, Channel[]>();
      sections.set(null, [...(channelData.uncategorized ?? [])].filter((channel) => !channel.isArchived));
      for (const entry of channelData.categories ?? []) {
        sections.set(entry.category.id, [...entry.channels].filter((channel) => !channel.isArchived));
      }

      const sourceChannels = [...(sections.get(sourceCategoryId) ?? [])];
      const sourceIndex = sourceChannels.findIndex((channel) => channel.id === channelId);
      if (sourceIndex < 0) return;

      const [movedChannel] = sourceChannels.splice(sourceIndex, 1);
      const sameSection = sourceCategoryId === targetCategoryId;
      const targetChannels = sameSection
        ? sourceChannels
        : [...(sections.get(targetCategoryId) ?? [])];
      const normalizedIndex = Math.max(
        0,
        Math.min(
          sameSection && sourceIndex < targetIndex ? targetIndex - 1 : targetIndex,
          targetChannels.length,
        ),
      );

      targetChannels.splice(normalizedIndex, 0, {
        ...movedChannel,
        categoryId: targetCategoryId,
      });

      const updates = sameSection
        ? targetChannels.map((channel, index) =>
            api(`/api/channels/${channel.id}`, {
              method: 'PATCH',
              body: {
                categoryId: targetCategoryId,
                position: index,
              },
            }),
          )
        : [
            ...sourceChannels.map((channel, index) =>
              api(`/api/channels/${channel.id}`, {
                method: 'PATCH',
                body: {
                  categoryId: sourceCategoryId,
                  position: index,
                },
              }),
            ),
            ...targetChannels.map((channel, index) =>
              api(`/api/channels/${channel.id}`, {
                method: 'PATCH',
                body: {
                  categoryId: targetCategoryId,
                  position: index,
                },
              }),
            ),
          ];

      await Promise.all(updates);
    },
    onSuccess: () => {
      setDragState(null);
      setDragTargetKey(null);
      queryClient.invalidateQueries({ queryKey: ['channels', community.id] });
    },
    onError: () => {
      setDragState(null);
      setDragTargetKey(null);
    },
  });

  const joinCommunityMutation = useMutation({
    mutationFn: async (_prompt: LockedChannelPromptState) =>
      api(`/api/communities/${community.id}/join`, {
        method: 'POST',
      }),
    onSuccess: async (_data, prompt) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channels', community.id] }),
        queryClient.invalidateQueries({ queryKey: ['community-members-count', community.id] }),
        queryClient.invalidateQueries({ queryKey: ['communities'] }),
      ]);
      setLockedChannelPrompt(null);
      onChannelClick?.();
      router.push(`/communities/${community.slug}/channels/${prompt.channelId}`);
    },
  });

  const channels = useMemo(
    () =>
      [
        ...(channelData?.uncategorized ?? []),
        ...(channelData?.categories?.flatMap((c: { channels: Channel[] }) => c.channels) ?? []),
      ].filter((channel) => shouldRenderBrowseChannel(channel)),
    [channelData?.uncategorized, channelData?.categories],
  );
  const voiceChannels = useMemo(
    () => channels.filter((channel) => channel.canView !== false && channel.type === 'voice' && !channel.isArchived),
    [channels],
  );
  const voiceParticipantQueries = useQueries({
    queries: voiceChannels.map((channel) => ({
      queryKey: ['voice-participants', channel.id],
      queryFn: () =>
        api<{ participants: Array<{ userId: string }> }>(
          `/api/channels/${channel.id}/voice/participants`,
        ),
      enabled: true,
      refetchInterval: 15_000,
    })),
  });
  const voiceParticipantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    voiceChannels.forEach((channel, index) => {
      counts[channel.id] = voiceParticipantQueries[index]?.data?.participants?.length ?? 0;
    });
    return counts;
  }, [voiceChannels, voiceParticipantQueries]);

  const categories = useMemo(
    () => channelData?.categories?.map((c: { category: Category }) => c.category) ?? [],
    [channelData?.categories],
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const directDmSearchLabel = `${t('dm.oneToOne')} ${t('dm.historyCompact')}`.toLowerCase();
  const groupDmSearchLabel = `${t('dm.group')} ${t('dm.historyCompact')}`.toLowerCase();

  const grouped = useMemo(() => {
    const catMap = new Map<string | null, Channel[]>();
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name.toLowerCase()]));

    // Initialize with known categories
    for (const cat of categories) {
      catMap.set(cat.id, []);
    }
    // Uncategorized bucket
    catMap.set(null, []);

    for (const ch of channels) {
      if (ch.isArchived) continue;
      if (normalizedSearchQuery) {
        const searchTerms = [
          ch.name.toLowerCase(),
          ch.categoryId ? categoryNameById.get(ch.categoryId) ?? '' : t('home.uncategorizedChannels').toLowerCase(),
          ch.sourceDmConversation?.name?.toLowerCase() ?? '',
          ch.sourceDmConversation?.type === 'direct'
            ? directDmSearchLabel
            : ch.sourceDmConversation?.type === 'group'
              ? groupDmSearchLabel
              : '',
        ];

        if (!searchTerms.some((value) => value.includes(normalizedSearchQuery))) {
          continue;
        }
      }

      const key = ch.categoryId;
      const arr = catMap.get(key);
      if (arr) {
        arr.push(ch);
      } else {
        // Category not fetched or unknown; put in uncategorized
        catMap.get(null)!.push(ch);
      }
    }

    // Sort channels within each category by position
    for (const arr of catMap.values()) {
      arr.sort((a, b) => a.position - b.position);
    }

    return catMap;
  }, [
    categories,
    channels,
    directDmSearchLabel,
    groupDmSearchLabel,
    normalizedSearchQuery,
    t,
  ]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.position - b.position),
    [categories],
  );
  const sortedVoiceChannels = useMemo(
    () =>
      [...voiceChannels].sort((left, right) => {
        const leftIsRecent = left.id === recentVoiceChannelId ? 1 : 0;
        const rightIsRecent = right.id === recentVoiceChannelId ? 1 : 0;
        if (leftIsRecent !== rightIsRecent) {
          return rightIsRecent - leftIsRecent;
        }
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
    [recentVoiceChannelId, voiceChannels, voiceParticipantCounts],
  );

  useEffect(() => {
    const updateRecentVoiceChannel = () => {
      setRecentVoiceChannelId(getLastVoiceChannelForCommunity(community.id));
    };

    const handlePreferencesUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ communityId?: string; channelId?: string }>).detail;
      if (!detail || detail.communityId !== community.id) return;
      setRecentVoiceChannelId(detail.channelId ?? null);
    };

    updateRecentVoiceChannel();
    window.addEventListener('storage', updateRecentVoiceChannel);
    window.addEventListener(VOICE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);

    return () => {
      window.removeEventListener('storage', updateRecentVoiceChannel);
      window.removeEventListener(VOICE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdated);
    };
  }, [community.id]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/6 bg-[linear-gradient(180deg,rgba(13,22,35,0.96),rgba(10,17,28,0.98))] text-white shadow-[12px_0_42px_rgba(2,8,23,0.28)]">
      {/* Community header */}
      <div className="shrink-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_85%)] px-4 pb-4 pt-5">
        <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-4 py-4 shadow-[0_22px_48px_rgba(2,8,23,0.22)] backdrop-blur-sm">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="truncate text-[1rem] font-semibold tracking-[-0.01em] text-white">{community.name}</div>
                <svg className="h-4 w-4 shrink-0 text-white/38" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="mt-1 text-xs leading-5 text-white/52">{t('channel.sidebarSubtitle')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/72">
                  {memberCount === 1
                    ? t('discover.member', { count: String(memberCount) })
                    : t('discover.members', { count: String(memberCount) })}
                </span>
                {onlineCount > 0 ? (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {onlineCount}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`/communities/${community.slug}/settings`}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/60 transition hover:bg-white/[0.09] hover:text-white"
                title={t('settings.communitySettings')}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </Link>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onAddChannel?.(null)}
                  className="rounded-xl border border-sky-300/20 bg-sky-400/10 p-2 text-sky-200 transition hover:bg-sky-400/18 hover:text-white"
                  title={t('channel.create')}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="px-1 pb-4">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('channel.sidebarSearchPlaceholder')}
              className="w-full rounded-2xl border border-white/8 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-[#dbdee1] placeholder:text-white/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition focus:border-sky-300/40 focus:bg-white/[0.07]"
              aria-label={t('channel.sidebarSearchPlaceholder')}
            />
          </div>
        </div>
        {lockedChannelPrompt && (
          <div
            data-testid="channel-sidebar-locked-prompt"
            className="mb-4 rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 px-4 py-4 text-amber-50 shadow-[0_18px_40px_rgba(2,8,23,0.18)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100/70">
                  {t('channel.lockedPromptTitle')}
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-50">
                  {lockedChannelPrompt.channelName}
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-100/85">
                  {t(
                    lockedChannelPromptPresentation?.lockedPromptBodyKey ??
                      'channel.lockedPromptJoinBody',
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLockedChannelPrompt(null);
                  joinCommunityMutation.reset();
                }}
                className="rounded-full border border-amber-100/20 px-2 py-1 text-[11px] font-medium text-amber-100/75 transition hover:bg-white/10 hover:text-white"
              >
                {t('common.close')}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lockedChannelPrompt.lockedReason === 'invite_required' ? (
                <button
                  type="button"
                  data-testid="channel-sidebar-locked-prompt-invite"
                  onClick={() => {
                    setLockedChannelPrompt(null);
                    onChannelClick?.();
                    router.push('/');
                  }}
                  className="rounded-xl bg-amber-200 px-3 py-2 text-sm font-semibold text-amber-950 transition hover:bg-white"
                >
                  {t('channel.lockedPromptInviteAction')}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="channel-sidebar-locked-prompt-join"
                  onClick={() => joinCommunityMutation.mutate(lockedChannelPrompt)}
                  disabled={joinCommunityMutation.isPending}
                  className="rounded-xl bg-amber-200 px-3 py-2 text-sm font-semibold text-amber-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {joinCommunityMutation.isPending
                    ? t('channel.lockedPromptJoining')
                    : t('channel.lockedPromptJoinAction')}
                </button>
              )}
            </div>
            {joinCommunityMutation.isError && lockedChannelPrompt.lockedReason === 'join_required' && (
              <p className="mt-2 text-xs text-amber-100/90">
                {t('channel.lockedPromptJoinFailed')}
              </p>
            )}
          </div>
        )}
        {sortedVoiceChannels.length > 0 && (
          <div className="mb-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-3 py-3 shadow-[0_18px_40px_rgba(2,8,23,0.18)]">
            <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/42">
              {t('voice.quickJoinTitle')}
            </div>
            <p className="px-1 pb-3 text-xs leading-5 text-white/48">{t('voice.quickJoinBody')}</p>
            <div className="space-y-0.5">
                {sortedVoiceChannels.map((channel) => {
                  const voiceParticipantCount = voiceParticipantCounts[channel.id] ?? 0;
                  const isRecentVoiceChannel = channel.id === recentVoiceChannelId;
                  const isLiveVoiceChannel = voiceParticipantCount > 0;
                  const voiceStatusLabel = isLiveVoiceChannel
                    ? t('voice.participantCount', { count: String(voiceParticipantCount) })
                    : isRecentVoiceChannel
                      ? t('voice.recentChannel')
                      : null;

                  return (
                    <div
                      key={channel.id}
                      className="rounded-2xl border border-white/6 px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/communities/${community.slug}/channels/${channel.id}`}
                            onClick={onChannelClick}
                            className="flex items-center gap-1.5 text-sm font-medium text-[#e6edf8] hover:text-white"
                          >
                            <ChannelIcon type={channel.type} />
                            <span className="truncate">{channel.name}</span>
                          </Link>
                          {voiceStatusLabel && (
                            <p className={`mt-0.5 text-[11px] ${isLiveVoiceChannel ? 'text-green-400' : 'text-indigo-300'}`}>
                              {voiceStatusLabel}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {isLiveVoiceChannel ? (
                            <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-green-300">
                              {voiceParticipantCount}
                            </span>
                          ) : null}
                          <VoiceRoomButton
                            channelId={channel.id}
                            communityId={community.id}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        {isAdmin && (
          <p className="px-2 pb-3 text-[11px] leading-5 text-white/34">
            {t('channel.dragHint')}
          </p>
        )}
        {/* Uncategorized channels */}
        {(grouped.get(null)?.length ?? 0) > 0 && (
          <CategoryGroup
            category={null}
            channels={grouped.get(null)!}
            communitySlug={community.slug}
            activeChannelId={activeChannelId}
            isAdmin={isAdmin}
            draggedChannelId={dragState?.channelId ?? null}
            dragTargetKey={dragTargetKey}
            onAddChannel={onAddChannel}
            onChannelClick={onChannelClick}
            onDragStart={(channelId, sourceCategoryId) => {
              setDragState({ channelId, sourceCategoryId });
              setDragTargetKey(null);
            }}
            onDragEnd={() => {
              setDragState(null);
              setDragTargetKey(null);
            }}
            onDragTargetChange={setDragTargetKey}
            onDropChannel={(targetCategoryId, targetIndex) => {
              if (!dragState) return;
              reorderMutation.mutate({
                channelId: dragState.channelId,
                sourceCategoryId: dragState.sourceCategoryId,
                targetCategoryId,
                targetIndex,
              });
            }}
            unreadMap={unreadMap}
            sourceDmLabel={t('dm.historyCompact')}
            directDmLabel={`${t('dm.oneToOne')} ${t('dm.historyCompact')}`}
            groupDmLabel={`${t('dm.group')} ${t('dm.historyCompact')}`}
            normalizedSearchQuery={normalizedSearchQuery}
            sourceDmMatchLabel={(name) => t('channel.sourceDmNameLabelWithName', { name })}
            recentVoiceChannelId={recentVoiceChannelId}
            voiceParticipantCounts={voiceParticipantCounts}
            onLockedChannelClick={(channel) => {
              joinCommunityMutation.reset();
              setLockedChannelPrompt({
                channelId: channel.id,
                channelName: channel.name,
                lockedReason:
                  channel.lockedReason === 'invite_required' ? 'invite_required' : 'join_required',
              });
            }}
          />
        )}

        {/* Categorized channels */}
        {sortedCategories.map((cat) => {
          const catChannels = grouped.get(cat.id) ?? [];
          return (
            <CategoryGroup
              key={cat.id}
              category={cat}
              channels={catChannels}
              communitySlug={community.slug}
              activeChannelId={activeChannelId}
              isAdmin={isAdmin}
              draggedChannelId={dragState?.channelId ?? null}
              dragTargetKey={dragTargetKey}
              onAddChannel={onAddChannel}
              onChannelClick={onChannelClick}
              onDragStart={(channelId, sourceCategoryId) => {
                setDragState({ channelId, sourceCategoryId });
                setDragTargetKey(null);
              }}
              onDragEnd={() => {
                setDragState(null);
                setDragTargetKey(null);
              }}
              onDragTargetChange={setDragTargetKey}
              onDropChannel={(targetCategoryId, targetIndex) => {
                if (!dragState) return;
                reorderMutation.mutate({
                  channelId: dragState.channelId,
                  sourceCategoryId: dragState.sourceCategoryId,
                  targetCategoryId,
                  targetIndex,
                });
              }}
              unreadMap={unreadMap}
              sourceDmLabel={t('dm.historyCompact')}
              directDmLabel={`${t('dm.oneToOne')} ${t('dm.historyCompact')}`}
              groupDmLabel={`${t('dm.group')} ${t('dm.historyCompact')}`}
              normalizedSearchQuery={normalizedSearchQuery}
              sourceDmMatchLabel={(name) => t('channel.sourceDmNameLabelWithName', { name })}
              recentVoiceChannelId={recentVoiceChannelId}
              voiceParticipantCounts={voiceParticipantCounts}
              onLockedChannelClick={(channel) => {
                joinCommunityMutation.reset();
                setLockedChannelPrompt({
                  channelId: channel.id,
                  channelName: channel.name,
                  lockedReason:
                    channel.lockedReason === 'invite_required' ? 'invite_required' : 'join_required',
                });
              }}
            />
          );
        })}

        {channels.length === 0 && !normalizedSearchQuery && (
          <p className="px-2 py-6 text-center text-xs text-white/34">{t('channel.noChannels')}</p>
        )}
        {channels.length > 0 && normalizedSearchQuery && Array.from(grouped.values()).every((entries) => entries.length === 0) && (
          <p className="px-2 py-6 text-center text-xs text-white/34">{t('channel.searchEmpty')}</p>
        )}

        {/* Events link */}
        <div className="mt-4 border-t border-white/8 pt-3">
          <Link
            href={`/communities/${community.slug}/events`}
            className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/64 transition hover:bg-white/[0.06] hover:text-[#e6edf8]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('event.title')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
