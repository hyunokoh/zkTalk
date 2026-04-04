'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { OnboardingModal } from '@/components/OnboardingModal';
import { VoiceRoomButton } from '@/components/VoiceRoom';
import {
  VOICE_PREFERENCES_UPDATED_EVENT,
  getLastVoiceChannelForCommunity,
} from '@/lib/voice-preferences';
import { resolveImageRenderProps } from '@/lib/image-optimization';
import type { Community } from '@zktalk/shared';

interface OnboardingData {
  id: string;
  communityId: string;
  welcomeMessage: string | null;
  rules: string | null;
  defaultChannelIds: string | null;
  isEnabled: boolean;
}

interface CommunityChannel {
  id: string;
  name: string;
  type?: string;
}

interface CommunityMember {
  id: string;
  userId: string;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export default function CommunityOverviewPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [pendingOnboarding, setPendingOnboarding] = useState<OnboardingData | null>(null);
  const [recentVoiceChannelId, setRecentVoiceChannelId] = useState<string | null>(null);

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { data: starterChannels = [] } = useQuery({
    queryKey: ['community-onboarding-starter-channels', community?.id, pendingOnboarding?.id],
    enabled: !!community?.id && !!pendingOnboarding,
    queryFn: async () => {
      const res = await api<{
        uncategorized: CommunityChannel[];
        categories: Array<{ channels: CommunityChannel[] }>;
      }>(`/api/communities/${community!.id}/channels`);

      const allChannels = [
        ...(res.uncategorized ?? []),
        ...(res.categories ?? []).flatMap((category) => category.channels ?? []),
      ];
      const defaultChannelIds = parseJsonArray(pendingOnboarding?.defaultChannelIds);
      const channelsById = new Map(allChannels.map((channel) => [channel.id, channel]));

      return defaultChannelIds
        .map((channelId) => channelsById.get(channelId))
        .filter((channel): channel is CommunityChannel => Boolean(channel));
    },
  });

  const { data: channelData } = useQuery({
    queryKey: ['community-overview-channels', community?.id],
    enabled: !!community?.id,
    queryFn: () =>
      api<{
        uncategorized: CommunityChannel[];
        categories: Array<{ channels: CommunityChannel[] }>;
      }>(`/api/communities/${community!.id}/channels`),
  });
  const { data: membersData } = useQuery({
    queryKey: ['community-overview-members', community?.id],
    enabled: !!community?.id,
    queryFn: () => api<{ members: CommunityMember[] }>(`/api/communities/${community!.id}/members`),
  });

  const voiceChannels = useMemo(() => {
    const allChannels = [
      ...(channelData?.uncategorized ?? []),
      ...(channelData?.categories ?? []).flatMap((category) => category.channels ?? []),
    ];
    return allChannels.filter((channel) => channel.type === 'voice');
  }, [channelData?.categories, channelData?.uncategorized]);

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
    if (!community || typeof window === 'undefined') return;

    const seenKey = `onboarding_seen_${community.id}`;
    const pendingKey = `pending_onboarding_${community.id}`;
    if (window.localStorage.getItem(seenKey) === 'true') {
      window.sessionStorage.removeItem(pendingKey);
      return;
    }

    const raw = window.sessionStorage.getItem(pendingKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as OnboardingData;
      if (parsed?.isEnabled) {
        setPendingOnboarding(parsed);
      } else {
        window.sessionStorage.removeItem(pendingKey);
      }
    } catch {
      window.sessionStorage.removeItem(pendingKey);
    }
  }, [community]);

  useEffect(() => {
    if (!community || typeof window === 'undefined') return;

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
  }, [community]);

  const handleCloseOnboarding = useMemo(
    () => (targetChannelId?: string) => {
      if (typeof window !== 'undefined' && community) {
        window.sessionStorage.removeItem(`pending_onboarding_${community.id}`);
      }
      setPendingOnboarding(null);
      if (targetChannelId) {
        router.push(`/communities/${slug}/channels/${targetChannelId}`);
      }
    },
    [community, router, slug],
  );

  if (!community) return null;
  const communityIcon = resolveImageRenderProps(
    community.iconUrl,
    community.updatedAt,
  );

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-3xl">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-bold text-white">
              {community.iconUrl ? (
                <Image
                  src={communityIcon.src ?? community.iconUrl}
                  alt={community.name}
                  width={80}
                  height={80}
                  unoptimized={communityIcon.unoptimized}
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
            <p className="mt-3 text-sm text-gray-500">
              {membersData?.members.length === 1
                ? t('discover.member', { count: String(membersData.members.length) })
                : t('discover.members', { count: String(membersData?.members.length ?? 0) })}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              {t('community.selectChannel')}
            </p>
          </div>
          {sortedVoiceChannels.length > 0 && (
            <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#d8e5ed] bg-white/85 p-5 shadow-sm">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f7384]">
                  {t('voice.quickJoinTitle')}
                </p>
                <p className="mt-1 text-sm text-[#607384]">
                  {t('voice.quickJoinBody')}
                </p>
              </div>
              <div className="space-y-3">
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
                      className="rounded-2xl border border-[#d8e5ed] bg-[#f8fbfd] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/communities/${slug}/channels/${channel.id}`}
                            className="inline-flex max-w-full items-center gap-2 text-base font-semibold text-[#203040] hover:text-[#132330]"
                          >
                            <span className="text-[#607384]">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                            </span>
                            <span className="truncate">{channel.name}</span>
                          </Link>
                          {voiceStatusLabel && (
                            <p className="mt-1 text-xs font-medium text-[#607384]">
                              {voiceStatusLabel}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          {isRecentVoiceChannel && (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                              {t('voice.recentChannel')}
                            </span>
                          )}
                          {isLiveVoiceChannel && (
                            <>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                                {t('voice.liveNow')}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-[#eef3f7] px-2 py-0.5 text-[11px] font-semibold text-[#556b7d]">
                                {voiceParticipantCount}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 rounded-full border border-[#d4e2eb] bg-white px-1 py-1">
                        <VoiceRoomButton
                          channelId={channel.id}
                          communityId={community.id}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {pendingOnboarding && (
        <OnboardingModal
          communityId={community.id}
          communityName={community.name}
          onboarding={pendingOnboarding}
          starterChannels={starterChannels}
          onClose={handleCloseOnboarding}
        />
      )}
    </>
  );
}
