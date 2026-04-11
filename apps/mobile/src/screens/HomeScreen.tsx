import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  TextInput,
  Image,
  type AlertButton,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getVersionedImageUrl } from '../lib/community-image';
import { getUserFacingErrorMessage } from '../lib/error-message';
import { useTranslation } from '../lib/i18n';
import { WEB_ORIGIN } from '../lib/network-config';
import {
  fetchUserSettings,
  getCommunityOrder as getStoredCommunityOrder,
  getLastVoiceChannelForCommunity,
  saveCommunityOrder as saveSharedCommunityOrder,
  saveLastVisited,
  syncCommunityOrder,
} from '../lib/storage';
import { isNativeVoiceCallingAvailable } from '../lib/voice-runtime';
import {
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { useAuthStore } from '../stores/auth';
import { colors, borderRadius, fontSize, spacing } from '../theme';
import {
  getChannelBrowsePresentation,
  getCommunityChannelAccessSummaryKeys,
  shouldRenderBrowseChannel,
} from '@zktalk/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeScreen'>;

interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  ownerUserId?: string;
  visibility?: 'public' | 'invite_only' | 'private';
  updatedAt?: string;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  canView?: boolean;
  lockedReason?: 'join_required' | 'invite_required';
  unreadCount?: number;
  sourceDmConversationId?: string | null;
  sourceDmConversation?: {
    id: string;
    name: string | null;
    type: 'direct' | 'group';
  } | null;
}

interface ChannelCategory {
  id: string;
  name: string;
  channels: Channel[];
}

interface CommunityMember {
  id: string;
  userId: string;
  role: string;
  displayName?: string;
  avatarUrl?: string | null;
}

interface VoiceParticipantsResponse {
  participants: Array<{
    userId: string;
    displayName: string;
    joinedAt: string;
  }>;
}

type ChannelListRow =
  | {
      type: 'section';
      id: string;
      title: string;
    }
  | {
      type: 'channel';
      id: string;
      channel: Channel;
    };

const COMMUNITY_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
];

function getCommunityColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COMMUNITY_COLORS[Math.abs(hash) % COMMUNITY_COLORS.length];
}

function getChannelIcon(type: string): string {
  switch (type) {
    case 'voice':
      return '\u{1F50A}';
    case 'forum':
      return '\u{1F4CB}';
    case 'announcement':
      return '\u{1F4E2}';
    default:
      return '#';
  }
}

function getLockedChannelDescription(
  t: (key: string) => string,
  channel: Pick<Channel, 'lockedReason'>,
): string {
  const { lockedCopyKey } = getChannelBrowsePresentation(channel);
  return t(lockedCopyKey ?? 'channel.lockedJoinRequired');
}

function getSourceDmSearchTerms(
  channel: Channel,
  directDmLabel: string,
  groupDmLabel: string,
): string[] {
  if (!channel.sourceDmConversation) {
    return [];
  }

  return [
    channel.sourceDmConversation.name ?? '',
    channel.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel,
  ];
}

// Memoized list items to avoid unnecessary re-renders
const CommunityListItem = memo(function CommunityListItem({
  item,
  onPress,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  moveUpLabel,
  moveDownLabel,
}: {
  item: Community;
  onPress: (community: Community) => void;
  onMoveUp: (communityId: string) => void;
  onMoveDown: (communityId: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
}) {
  const iconUrl = getVersionedImageUrl(item.iconUrl, item.updatedAt);

  return (
    <View style={styles.communityItem}>
      <TouchableOpacity
        testID={`community-row-${item.id}`}
        style={styles.communityItemMain}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.communityIcon,
            { backgroundColor: getCommunityColor(item.name) },
          ]}
        >
          {iconUrl ? (
            <Image source={{ uri: iconUrl }} style={styles.communityIconImage} />
          ) : (
            <Text style={styles.communityInitial}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.communityInfo}>
          <Text style={styles.communityName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.communityDesc} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>{'\u{203A}'}</Text>
      </TouchableOpacity>
      <View style={styles.communityReorderActions}>
        <TouchableOpacity
          style={[
            styles.communityReorderButton,
            !canMoveUp && styles.communityReorderButtonDisabled,
          ]}
          onPress={() => onMoveUp(item.id)}
          disabled={!canMoveUp}
          accessibilityRole="button"
          accessibilityLabel={moveUpLabel}
        >
          <Text
            style={[
              styles.communityReorderButtonText,
              !canMoveUp && styles.communityReorderButtonTextDisabled,
            ]}
          >
            {'\u{2191}'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.communityReorderButton,
            !canMoveDown && styles.communityReorderButtonDisabled,
          ]}
          onPress={() => onMoveDown(item.id)}
          disabled={!canMoveDown}
          accessibilityRole="button"
          accessibilityLabel={moveDownLabel}
        >
          <Text
            style={[
              styles.communityReorderButtonText,
              !canMoveDown && styles.communityReorderButtonTextDisabled,
            ]}
          >
            {'\u{2193}'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const ChannelListItem = memo(function ChannelListItem({
  item,
  onPress,
  voiceLabel,
  sourceDmLabel,
  directDmLabel,
  groupDmLabel,
  sourceDmMatchLabel,
  voiceStatusLabel,
  isRecentVoiceChannel,
  isLiveVoiceChannel,
}: {
  item: Channel;
  onPress: (channel: Channel) => void;
  voiceLabel: string;
  sourceDmLabel: string;
  directDmLabel: string;
  groupDmLabel: string;
  sourceDmMatchLabel?: string;
  voiceStatusLabel?: string;
  isRecentVoiceChannel?: boolean;
  isLiveVoiceChannel?: boolean;
}) {
  const { t } = useTranslation();
  const browsePresentation = getChannelBrowsePresentation(item);
  const isLockedChannel = browsePresentation.isLocked;
  const lockedDescription = isLockedChannel ? getLockedChannelDescription(t, item) : null;

  return (
    <TouchableOpacity
      testID={`channel-row-${item.id}`}
      style={[styles.channelItem, isLockedChannel && styles.channelItemLocked]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={
        isLockedChannel
          ? `${item.name}, ${lockedDescription ?? t('channel.lockedBadge')}`
          : item.sourceDmConversation
          ? `${item.name}, ${
              item.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel
            }, ${item.sourceDmConversation.name ?? sourceDmLabel}`
          : item.name
      }
    >
      <Text style={[styles.channelIcon, isLockedChannel && styles.channelIconLocked]}>
        {isLockedChannel ? '\u{1F512}' : getChannelIcon(item.type)}
      </Text>
      <View style={styles.channelCopy}>
        <Text style={[styles.channelName, isLockedChannel && styles.channelNameLocked]}>{item.name}</Text>
        {sourceDmMatchLabel ? (
          <Text style={styles.channelSourceMatch} numberOfLines={1}>
            {sourceDmMatchLabel}
          </Text>
        ) : null}
        {isLockedChannel && lockedDescription ? (
          <Text style={styles.channelLockedHint} numberOfLines={2}>
            {lockedDescription}
          </Text>
        ) : null}
        {item.type === 'voice' && voiceStatusLabel ? (
          <Text style={styles.channelVoiceStatus} numberOfLines={1}>
            {voiceStatusLabel}
          </Text>
        ) : null}
      </View>
      {item.sourceDmConversation ? (
        <View style={styles.sourceDmBadge}>
          <Text style={styles.sourceDmBadgeText}>
            {item.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel}
          </Text>
        </View>
      ) : item.sourceDmConversationId ? (
        <View style={styles.sourceDmBadge}>
          <Text style={styles.sourceDmBadgeText}>{sourceDmLabel}</Text>
        </View>
      ) : null}
      {item.type === 'voice' && (
        <View style={styles.voiceBadge}>
          <Text style={styles.voiceBadgeText}>{voiceLabel}</Text>
        </View>
      )}
      {item.type === 'voice' && isRecentVoiceChannel ? (
        <View style={styles.voiceRecentListBadge}>
          <Text style={styles.voiceRecentListBadgeText}>{t('voice.recentChannel')}</Text>
        </View>
      ) : null}
      {item.type === 'voice' && isLiveVoiceChannel ? (
        <View style={styles.voiceLiveListBadge}>
          <Text style={styles.voiceLiveListBadgeText}>{t('voice.liveNow')}</Text>
        </View>
      ) : null}
      {isLockedChannel ? (
        <View style={styles.lockedBadge}>
          <Text style={styles.lockedBadgeText}>{t('channel.lockedBadge')}</Text>
        </View>
      ) : null}
      {(item.unreadCount ?? 0) > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const ChannelSectionHeader = memo(function ChannelSectionHeader({
  title,
}: {
  title: string;
}) {
  return (
    <View style={styles.channelSectionHeader}>
      <Text style={styles.channelSectionTitle}>{title}</Text>
    </View>
  );
});

// Approximate row height for getItemLayout (performance optimization)
const COMMUNITY_ROW_HEIGHT = 64;
const COMMUNITY_PRESS_GUARD_MS = 400;

function ChannelAccessSummaryCard({ labels }: { labels: string[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.channelAccessCard}>
      <Text style={styles.channelAccessTitle}>{t('community.selectChannel')}</Text>
      <Text style={styles.channelAccessBody}>{t('community.channelAccessHint')}</Text>
      <View style={styles.channelAccessChipRow}>
        {labels.map((label) => (
          <View key={label} style={styles.channelAccessChip}>
            <Text style={styles.channelAccessChipText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const communityGetItemLayout = (_data: unknown, index: number) => ({
  length: COMMUNITY_ROW_HEIGHT,
  offset: COMMUNITY_ROW_HEIGHT * index,
  index,
});

function applyCommunityOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order.length) {
    return items;
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const orderedItems = order.flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
  const unorderedItems = items.filter((item) => !order.includes(item.id));
  return [...orderedItems, ...unorderedItems];
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seenIds = new Set<string>();
  return items.filter((item) => {
    if (seenIds.has(item.id)) {
      return false;
    }
    seenIds.add(item.id);
    return true;
  });
}

export default function HomeScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const isFocused = useIsFocused();
  const [communityOrder, setCommunityOrder] = useState<string[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [inviteCodesByCommunity, setInviteCodesByCommunity] = useState<Record<string, string>>({});
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'unread'>('all');
  const [recentVoiceChannelId, setRecentVoiceChannelId] = useState<string | null>(null);
  const [devActionAttempted, setDevActionAttempted] = useState(false);
  const [isHomeInteractionBlocked, setIsHomeInteractionBlocked] = useState(false);
  const [isCommunityExitPending, setIsCommunityExitPending] = useState(false);
  const communityPressBlockedUntilRef = useRef(0);
  const communityBackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredLastVisitedRef = useRef(false);
  const suppressCommunityRestoreUntilRef = useRef(0);
  const selectedCommunityId = route.params?.selectedCommunityId;
  const restoreChannelId = route.params?.restoreChannelId;
  const queryClient = useQueryClient();

  const {
    data: communities,
    isLoading,
    refetch: refetchCommunities,
    isRefetching: communitiesRefetching,
  } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api<{ communities: Community[] }>('/api/communities'),
  });

  useEffect(() => {
    if (
      !selectedCommunityId ||
      !communities?.communities?.length ||
      Date.now() < suppressCommunityRestoreUntilRef.current
    ) {
      return;
    }

    const nextCommunity = communities.communities.find(
      (community) => community.id === selectedCommunityId,
    );

    if (!nextCommunity) return;

    setSelectedCommunity(nextCommunity);
    navigation.setParams({ selectedCommunityId: undefined });
  }, [communities?.communities, navigation, selectedCommunityId]);

  useEffect(() => {
    const communityList = communities?.communities ?? [];
    if (
      hasRestoredLastVisitedRef.current ||
      !communityList.length ||
      selectedCommunityId ||
      selectedCommunity ||
      restoreChannelId ||
      Date.now() < suppressCommunityRestoreUntilRef.current
    ) {
      return;
    }

    hasRestoredLastVisitedRef.current = true;
    let cancelled = false;

    async function restoreLastVisited() {
      try {
        const settings = await fetchUserSettings();
        if (cancelled || !settings.lastVisited) {
          return;
        }

        if (settings.lastVisited.kind === 'community' && settings.lastVisited.communityId) {
          const nextCommunity = communityList.find(
            (community) => community.id === settings.lastVisited?.communityId,
          );
          if (nextCommunity) {
            setSelectedCommunity(nextCommunity);
          }
          return;
        }

        if (
          settings.lastVisited.kind === 'channel' &&
          settings.lastVisited.communityId &&
          settings.lastVisited.channelId
        ) {
          const nextCommunity = communityList.find(
            (community) => community.id === settings.lastVisited?.communityId,
          );
          if (nextCommunity) {
            setSelectedCommunity(nextCommunity);
            navigation.setParams({ restoreChannelId: settings.lastVisited.channelId });
          }
        }
      } catch {
        // Best effort only.
      }
    }

    void restoreLastVisited();

    return () => {
      cancelled = true;
    };
  }, [communities?.communities, navigation, restoreChannelId, selectedCommunity, selectedCommunityId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCommunityOrder() {
      const storedOrder = await syncCommunityOrder().catch(() => getStoredCommunityOrder());
      if (!cancelled) {
        setCommunityOrder(Array.from(new Set(storedOrder)));
      }
    }

    void loadCommunityOrder();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCommunity || !communities?.communities?.length) return;

    const nextCommunity = communities.communities.find(
      (community) => community.id === selectedCommunity.id,
    );

    if (!nextCommunity) return;

    if (
      nextCommunity.name !== selectedCommunity.name ||
      nextCommunity.description !== selectedCommunity.description ||
      nextCommunity.visibility !== selectedCommunity.visibility ||
      nextCommunity.iconUrl !== selectedCommunity.iconUrl ||
      nextCommunity.updatedAt !== selectedCommunity.updatedAt
    ) {
      setSelectedCommunity(nextCommunity);
    }
  }, [communities?.communities, selectedCommunity]);

  const {
    data: channelsData,
    isLoading: channelsLoading,
    refetch: refetchChannels,
    isRefetching: channelsRefetching,
  } = useQuery({
    queryKey: ['channels', selectedCommunity?.id],
    queryFn: async () => {
      const res = await api<{ uncategorized: Channel[]; categories: ChannelCategory[] }>(
        `/api/communities/${selectedCommunity!.id}/channels`,
      );
      return {
        uncategorized: res.uncategorized ?? [],
        categories: res.categories ?? [],
      };
    },
    enabled: !!selectedCommunity,
  });

  useEffect(() => {
    setChannelSearchQuery('');
    setChannelFilter('all');
  }, [selectedCommunity?.id]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    void refetchCommunities();
    if (selectedCommunity) {
      void refetchChannels();
    }
  }, [isFocused, refetchChannels, refetchCommunities, selectedCommunity]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecentVoiceChannel() {
      if (!selectedCommunity?.id) {
        if (!cancelled) {
          setRecentVoiceChannelId(null);
        }
        return;
      }

      const channelId = await getLastVoiceChannelForCommunity(selectedCommunity.id);
      if (!cancelled) {
        setRecentVoiceChannelId(channelId);
      }
    }

    void loadRecentVoiceChannel();

    return () => {
      cancelled = true;
    };
  }, [selectedCommunity?.id]);

  const sortedCommunities = React.useMemo(() => {
    return dedupeById([...(communities?.communities ?? [])]).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: 'base',
        numeric: true,
      }),
    );
  }, [communities?.communities]);

  const orderedCommunities = React.useMemo(
    () => dedupeById(applyCommunityOrder(sortedCommunities, communityOrder)),
    [communityOrder, sortedCommunities],
  );

  const reorderCommunity = useCallback(
    (communityId: string, direction: -1 | 1) => {
      const orderedIds = applyCommunityOrder(sortedCommunities, communityOrder).map(
        (community) => community.id,
      );
      const currentIndex = orderedIds.indexOf(communityId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) {
        return;
      }

      const nextOrder = [...orderedIds];
      const [movedCommunityId] = nextOrder.splice(currentIndex, 1);
      nextOrder.splice(nextIndex, 0, movedCommunityId);
      setCommunityOrder(nextOrder);
      void saveSharedCommunityOrder(nextOrder);
    },
    [communityOrder, sortedCommunities],
  );

  const channelRows: ChannelListRow[] = React.useMemo(() => {
    const rows: ChannelListRow[] = [];
    const normalizedQuery = channelSearchQuery.trim().toLowerCase();
    const matchesUnreadFilter = (channel: Channel) =>
      channelFilter === 'all' || (channel.unreadCount ?? 0) > 0;
    const directDmSearchLabel = `${t('dm.filterDirect')} ${t('dm.historyCompact')}`;
    const groupDmSearchLabel = `${t('dm.filterGroup')} ${t('dm.historyCompact')}`;

    if ((channelsData?.uncategorized?.length ?? 0) > 0) {
      const uncategorizedChannels = (channelsData?.uncategorized ?? []).filter((channel) => {
        if (!shouldRenderBrowseChannel(channel)) {
          return false;
        }

        if (!matchesUnreadFilter(channel)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          channel.name,
          t('home.uncategorizedChannels'),
          ...getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel),
        ]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      });

      if (uncategorizedChannels.length > 0) {
        rows.push({
          type: 'section',
          id: 'uncategorized',
          title: t('home.uncategorizedChannels'),
        });

        for (const channel of uncategorizedChannels) {
          rows.push({
            type: 'channel',
            id: channel.id,
            channel,
          });
        }
      }
    }

    for (const category of channelsData?.categories ?? []) {
      const filteredChannels = (category.channels ?? []).filter((channel) => {
        if (!shouldRenderBrowseChannel(channel)) {
          return false;
        }

        if (!matchesUnreadFilter(channel)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          channel.name,
          category.name,
          ...getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel),
        ]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      });

      if (filteredChannels.length === 0) {
        continue;
      }

      rows.push({
        type: 'section',
        id: `category-${category.id}`,
        title: category.name,
      });

      for (const channel of filteredChannels) {
        rows.push({
          type: 'channel',
          id: channel.id,
          channel,
        });
      }
    }

    return dedupeById(rows);
  }, [channelFilter, channelSearchQuery, channelsData?.categories, channelsData?.uncategorized, t]);

  const { data: membersData } = useQuery({
    queryKey: ['community-members', selectedCommunity?.id],
    queryFn: () =>
      api<{ members: CommunityMember[] }>(`/api/communities/${selectedCommunity!.id}/members`),
    enabled: !!selectedCommunity,
  });

  const currentCommunityRole = membersData?.members.find(
    (member) => member.userId === currentUser?.id,
  )?.role;
  const activeMemberCount = membersData?.members.length ?? 0;
  const canReviewReports = ['owner', 'admin', 'moderator'].includes(currentCommunityRole ?? '');
  const canViewAuditLog = ['owner', 'admin'].includes(currentCommunityRole ?? '');
  const canManageOnboarding = ['owner', 'admin'].includes(currentCommunityRole ?? '');
  const canEditCommunity = ['owner', 'admin'].includes(currentCommunityRole ?? '');
  const canManageCategories = ['owner', 'admin'].includes(currentCommunityRole ?? '');
  const canManageChannels = ['owner', 'admin'].includes(currentCommunityRole ?? '');
  const canDeleteCommunity = selectedCommunity?.ownerUserId === currentUser?.id;
  const allCommunityChannels = React.useMemo(
    () =>
      dedupeById([
        ...(channelsData?.uncategorized ?? []),
        ...(channelsData?.categories ?? []).flatMap((category) => category.channels),
      ]).filter((channel) => shouldRenderBrowseChannel(channel)),
    [channelsData?.categories, channelsData?.uncategorized],
  );
  const voiceChannels = React.useMemo(
    () => allCommunityChannels.filter((channel) => channel.canView !== false && channel.type === 'voice'),
    [allCommunityChannels],
  );
  const voiceParticipantQueries = useQueries({
    queries: voiceChannels.map((channel) => ({
      queryKey: ['voice-participants', channel.id],
      queryFn: () =>
        api<VoiceParticipantsResponse>(`/api/channels/${channel.id}/voice/participants`),
      enabled: isNativeVoiceCallingAvailable,
      refetchInterval: 15_000,
    })),
  });
  const voiceParticipantCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};

    voiceChannels.forEach((channel, index) => {
      counts[channel.id] = voiceParticipantQueries[index]?.data?.participants?.length ?? 0;
    });

    return counts;
  }, [voiceChannels, voiceParticipantQueries]);
  const sortedVoiceChannels = React.useMemo(
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
  const singleVoiceChannel = sortedVoiceChannels.length === 1 ? sortedVoiceChannels[0] : null;
  const accessSummaryLabels = React.useMemo(() => {
    return getCommunityChannelAccessSummaryKeys(selectedCommunity?.visibility).map((key) => t(key));
  }, [selectedCommunity?.visibility, t]);
  const leaveCommunityMutation = useMutation({
    mutationFn: (communityId: string) =>
      api(`/api/communities/${communityId}/leave`, { method: 'POST' }),
    onSuccess: async () => {
      setSelectedCommunity(null);
      await queryClient.invalidateQueries({ queryKey: ['communities'] });
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      Alert.alert(t('community.leaveSuccessTitle'), t('community.leaveSuccessBody'));
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message.includes('owner cannot leave')
          ? t('community.leaveOwnerBlocked')
          : error instanceof Error
            ? error.message
            : t('community.leaveFailed');
      Alert.alert(
        t('common.error'),
        message,
      );
    },
  });

  const deleteCommunityMutation = useMutation({
    mutationFn: (communityId: string) =>
      api(`/api/communities/${communityId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setSelectedCommunity(null);
      await queryClient.invalidateQueries({ queryKey: ['communities'] });
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      Alert.alert(t('community.deleteSuccessTitle'), t('community.deleteSuccessBody'));
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('community.deleteFailed'),
      );
    },
  });

  const handleChannelPressAccessible = useCallback(
    async (item: Channel) => {
      if (!selectedCommunity) return;

      void saveLastVisited({
        kind: 'channel',
        communityId: selectedCommunity.id,
        channelId: item.id,
      });
      if (item.type === 'voice') {
        if (!isNativeVoiceCallingAvailable) {
          Alert.alert(t('voice.notAvailableTitle'), t('voice.notAvailableBody'));
          return;
        }
        navigation.navigate('VoiceCallScreen', {
          channelId: item.id,
          channelName: item.name,
          communityId: selectedCommunity.id,
        });
      } else if (item.type === 'forum') {
        navigation.navigate('ForumChannelScreen', {
          communityId: selectedCommunity.id,
          channelId: item.id,
          channelName: item.name,
        });
      } else {
        navigation.navigate('ChannelScreen', {
          communityId: selectedCommunity.id,
          channelId: item.id,
          channelName: item.name,
        });
      }
    },
    [navigation, selectedCommunity, t],
  );

  const handleLockedChannelPress = useCallback(
    (item: Channel) => {
      if (!selectedCommunity) return;
      const { lockedReason, lockedPromptBodyKey } = getChannelBrowsePresentation(item);
      const promptBodyKey = lockedPromptBodyKey ?? 'channel.lockedPromptJoinBody';
      if (lockedReason === 'invite_required') {
        Alert.alert(
          t('channel.lockedPromptTitle'),
          t(promptBodyKey),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('channel.lockedPromptInviteAction'),
              onPress: () => navigation.navigate('JoinInvite'),
            },
          ],
        );
        return;
      }

      Alert.alert(
        t('channel.lockedPromptTitle'),
        t(promptBodyKey),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('channel.lockedPromptJoinAction'),
            onPress: () => {
              void (async () => {
                try {
                  await api(`/api/communities/${selectedCommunity.id}/join`, { method: 'POST' });
                  await queryClient.invalidateQueries({ queryKey: ['communities'] });
                  await queryClient.invalidateQueries({ queryKey: ['channels', selectedCommunity.id] });
                  await handleChannelPressAccessible({
                    ...item,
                    canView: true,
                  });
                } catch (error) {
                  Alert.alert(
                    t('common.error'),
                    error instanceof Error ? error.message : t('channel.lockedPromptJoinFailed'),
                  );
                }
              })();
            },
          },
        ],
      );
    },
    [handleChannelPressAccessible, navigation, queryClient, selectedCommunity, t],
  );

  const handleChannelPress = useCallback(
    (item: Channel) => {
      if (Date.now() < communityPressBlockedUntilRef.current) return;
      if (getChannelBrowsePresentation(item).isLocked) {
        handleLockedChannelPress(item);
        return;
      }
      void handleChannelPressAccessible(item);
    },
    [handleChannelPressAccessible, handleLockedChannelPress],
  );

  const handleCommunityPress = useCallback((item: Community) => {
    if (Date.now() < communityPressBlockedUntilRef.current || isCommunityExitPending) {
      return;
    }
    setSelectedCommunity(item);
    void saveLastVisited({
      kind: 'community',
      communityId: item.id,
    });
  }, [isCommunityExitPending]);

  const handleCommunityBackPress = useCallback(() => {
    if (communityBackTimeoutRef.current) {
      clearTimeout(communityBackTimeoutRef.current);
    }
    suppressCommunityRestoreUntilRef.current = Date.now() + 2000;
    communityPressBlockedUntilRef.current = Date.now() + 1200;
    setIsHomeInteractionBlocked(true);
    setIsCommunityExitPending(true);
    void saveLastVisited(null);
    communityBackTimeoutRef.current = setTimeout(() => {
      navigation.setParams({ restoreChannelId: undefined, selectedCommunityId: undefined });
      setSelectedCommunity(null);
      setIsCommunityExitPending(false);
      communityBackTimeoutRef.current = null;
    }, 16);
  }, [navigation]);

  const handleCommunityBackPressStart = useCallback(() => {
    suppressCommunityRestoreUntilRef.current = Date.now() + 2000;
    communityPressBlockedUntilRef.current = Date.now() + 1200;
    setIsHomeInteractionBlocked(true);
    setIsCommunityExitPending(true);
    if (communityBackTimeoutRef.current) {
      clearTimeout(communityBackTimeoutRef.current);
      communityBackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isHomeInteractionBlocked) {
      return;
    }
    const timeout = setTimeout(() => {
      setIsHomeInteractionBlocked(false);
      if (!selectedCommunity) {
        setIsCommunityExitPending(false);
      }
    }, 1200);
    return () => clearTimeout(timeout);
  }, [isHomeInteractionBlocked, selectedCommunity]);

  useEffect(() => {
    return () => {
      if (communityBackTimeoutRef.current) {
        clearTimeout(communityBackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedCommunity || !restoreChannelId || !channelsData) {
      return;
    }

    const allChannels = [
      ...(channelsData.uncategorized ?? []),
      ...(channelsData.categories ?? []).flatMap((category) => category.channels ?? []),
    ];
    const targetChannel = allChannels.find(
      (channel) => channel.id === restoreChannelId && channel.canView !== false,
    );
    if (!targetChannel) {
      navigation.setParams({ restoreChannelId: undefined });
      return;
    }

    handleChannelPress(targetChannel);
    navigation.setParams({ restoreChannelId: undefined });
  }, [channelsData, handleChannelPress, navigation, restoreChannelId, selectedCommunity]);

  const handleCreateChannelPress = useCallback(() => {
    if (!selectedCommunity || !canManageChannels) return;
    navigation.navigate('CreateChannel', {
      communityId: selectedCommunity.id,
    });
  }, [canManageChannels, navigation, selectedCommunity]);

  const handleJoinInvitePress = useCallback(() => {
    navigation.navigate('JoinInvite');
  }, [navigation]);

  const handleShareProfilePress = useCallback(() => {
    navigation.getParent()?.navigate('FriendsTab');
  }, [navigation]);

  const handleShareInvitePress = useCallback(async () => {
    if (!selectedCommunity) return;

    try {
      let inviteCode = inviteCodesByCommunity[selectedCommunity.id];
      if (!inviteCode) {
        const result = await api<{ invite: { code: string } }>(
          `/api/communities/${selectedCommunity.id}/invites`,
          {
            method: 'POST',
            body: {},
          },
        );
        inviteCode = result.invite.code;
        setInviteCodesByCommunity((prev) => ({
          ...prev,
          [selectedCommunity.id]: inviteCode!,
        }));
      }
      await Share.share({
        title: selectedCommunity.name,
        message: t('community.inviteShareText', {
          community: selectedCommunity.name,
          code: inviteCode,
          link: `${WEB_ORIGIN}/invite/${inviteCode}`,
        }),
      });
    } catch (error) {
      Alert.alert(
        t('common.error'),
        getUserFacingErrorMessage(error, t, {
          fallbackKey: 'community.inviteShareFailed',
          rateLimitedKey: 'community.inviteRateLimited',
        }),
      );
    }
  }, [inviteCodesByCommunity, selectedCommunity, t]);

  const handleMembersPress = useCallback(() => {
    if (!selectedCommunity) return;

    navigation.navigate('CommunityMembers', {
      communityId: selectedCommunity.id,
      communityName: selectedCommunity.name,
    });
  }, [navigation, selectedCommunity]);

  const handleEventsPress = useCallback(() => {
    if (!selectedCommunity) return;

    navigation.navigate('CommunityEvents', {
      communityId: selectedCommunity.id,
      communityName: selectedCommunity.name,
    });
  }, [navigation, selectedCommunity]);

  const handleVoiceEntryPress = useCallback(
    (channel: Channel, startWithVideo: boolean) => {
      if (!selectedCommunity) return;
      if (!isNativeVoiceCallingAvailable) {
        Alert.alert(t('voice.notAvailableTitle'), t('voice.notAvailableBody'));
        return;
      }

      navigation.navigate('VoiceCallScreen', {
        communityId: selectedCommunity.id,
        channelId: channel.id,
        channelName: channel.name,
        startWithVideo,
      });
    },
    [navigation, selectedCommunity, t],
  );

  const handleCommunityMenuPress = useCallback(() => {
    if (!selectedCommunity) return;

    const actions: AlertButton[] = [
      { text: t('common.cancel'), style: 'cancel' as const },
    ];

    actions.push({
      text: t('community.eventsMenu'),
      onPress: () => {
        navigation.navigate('CommunityEvents', {
          communityId: selectedCommunity.id,
          communityName: selectedCommunity.name,
        });
      },
    });

    if (canReviewReports) {
      actions.push({
        text: t('community.reportsMenu'),
        onPress: () => {
          navigation.navigate('CommunityReports', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
          });
        },
      });
    }

    if (canViewAuditLog) {
      actions.push({
        text: t('community.auditLogMenu'),
        onPress: () => {
          navigation.navigate('CommunityAuditLog', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
          });
        },
      });
    }

    if (canManageOnboarding) {
      actions.push({
        text: t('community.onboardingMenu'),
        onPress: () => {
          navigation.navigate('CommunityOnboarding', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
          });
        },
      });
    }

    if (canEditCommunity) {
      actions.push({
        text: t('community.edit'),
        onPress: () => {
          navigation.navigate('EditCommunity', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
            iconUrl: selectedCommunity.iconUrl,
            description: selectedCommunity.description,
            visibility: selectedCommunity.visibility,
          });
        },
      });
    }

    if (canManageCategories) {
      actions.push({
        text: t('channel.categoriesMenu'),
        onPress: () => {
          navigation.navigate('ManageCategories', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
          });
        },
      });
    }

    if (canManageChannels) {
      actions.push({
        text: t('channel.create'),
        onPress: () => {
          navigation.navigate('CreateChannel', {
            communityId: selectedCommunity.id,
          });
        },
      });
      actions.push({
        text: t('channel.orderMenu'),
        onPress: () => {
          navigation.navigate('ManageChannels', {
            communityId: selectedCommunity.id,
            communityName: selectedCommunity.name,
          });
        },
      });
    }

    if (canDeleteCommunity) {
      actions.push({
        text: t('community.delete'),
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert(
            t('community.deleteConfirmTitle'),
            t('community.deleteConfirmBody'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('community.delete'),
                style: 'destructive',
                onPress: () => deleteCommunityMutation.mutate(selectedCommunity.id),
              },
            ],
          );
        },
      });
    }

    if (!canDeleteCommunity) {
      actions.push({
        text: t('community.leave'),
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert(
            t('community.leaveConfirmTitle'),
            t('community.leaveConfirmBody'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('community.leave'),
                style: 'destructive',
                onPress: () => leaveCommunityMutation.mutate(selectedCommunity.id),
              },
            ],
          );
        },
      });
    }

    Alert.alert(
      selectedCommunity.name,
      t('community.manageBody'),
      actions,
    );
  }, [
    canDeleteCommunity,
    canEditCommunity,
    canManageCategories,
    canManageChannels,
    canManageOnboarding,
    canReviewReports,
    canViewAuditLog,
    deleteCommunityMutation,
    leaveCommunityMutation,
    navigation,
    selectedCommunity,
    t,
  ]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttempted) {
      return;
    }

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{
        type: 'leave' | 'delete';
        communityId?: string;
      }>('dev-home-action.json');
      if (!action) return;

      try {
        if (action.type !== 'leave' && action.type !== 'delete') {
          throw new Error('Unsupported home dev action');
        }
        if (!action.communityId) {
          throw new Error('No selected community for home dev action');
        }

        const targetCommunity =
          selectedCommunity?.id === action.communityId
            ? selectedCommunity
            : (communities?.communities ?? []).find(
                (community) => community.id === action.communityId,
              );

        if (!targetCommunity) {
          if (action.type === 'delete') {
            setDevActionAttempted(true);
            await deleteCommunityMutation.mutateAsync(action.communityId);
            await writeSimulatorHarnessJson(
              'dev-home-result.json',
              {
                ok: true,
                action: action.type,
                communityId: action.communityId,
                status: 'deleted-without-local-selection',
              },
            );
            return;
          }

          await writeSimulatorHarnessJson(
            'dev-home-result.json',
            {
              ok: false,
              pending: true,
              action: action.type,
              communityId: action.communityId,
              availableCommunityIds: (communities?.communities ?? []).map(
                (community) => community.id,
              ),
            },
          );
          return;
        }

        if (selectedCommunity?.id !== targetCommunity.id) {
          setSelectedCommunity(targetCommunity);
          await writeSimulatorHarnessJson(
            'dev-home-result.json',
            {
              ok: false,
              pending: true,
              action: action.type,
              communityId: action.communityId,
              selectedCommunityId: targetCommunity.id,
              status: 'selected-target-community',
            },
          );
          return;
        }
        const communityId = targetCommunity.id;

        setDevActionAttempted(true);

        if (action.type === 'delete') {
          await deleteCommunityMutation.mutateAsync(communityId);
        } else {
          await leaveCommunityMutation.mutateAsync(communityId);
        }

        await writeSimulatorHarnessJson(
          'dev-home-result.json',
          {
            ok: true,
            action: action.type,
            communityId,
          },
        );
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-home-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    void runDevAction();
  }, [
    communities?.communities,
    deleteCommunityMutation,
    devActionAttempted,
    leaveCommunityMutation,
    selectedCommunity,
  ]);

  const selectedCommunityIconUrl = getVersionedImageUrl(
    selectedCommunity?.iconUrl,
    selectedCommunity?.updatedAt,
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Channel list view
  if (selectedCommunity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container} pointerEvents={isCommunityExitPending ? 'none' : 'auto'}>
          {isCommunityExitPending ? <View style={styles.communityInteractionBlocker} /> : null}
          <View style={styles.communityHeader}>
            <View style={styles.communityHeaderTop}>
              <View style={styles.communityHeaderLead}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPressIn={handleCommunityBackPressStart}
                  onPress={handleCommunityBackPress}
                  hitSlop={12}
                >
                  <Text style={styles.backArrow}>{'\u{2190}'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backToListButton}
                  onPressIn={handleCommunityBackPressStart}
                  onPress={handleCommunityBackPress}
                  activeOpacity={0.8}
                  hitSlop={8}
                >
                  <Text style={styles.backToListButtonText}>{t('home.backToCommunities')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.communityActionChip}
                  onPress={handleMembersPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.communityActionChipText}>{t('members.title')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={handleCommunityMenuPress}
                hitSlop={8}
                disabled={leaveCommunityMutation.isPending}
              >
                <Text style={styles.menuButtonText}>{'\u{22EF}'}</Text>
              </TouchableOpacity>
            </View>
            {sortedVoiceChannels.length > 1 ? (
                <View style={styles.voiceChannelChooser}>
                  <Text style={styles.communityVoiceHint}>{t('voice.chooseChannel')}</Text>
                  <View style={styles.voiceChannelList}>
                    {sortedVoiceChannels.map((channel) => (
                      <View key={channel.id} style={styles.voiceChannelRow}>
                        <View style={styles.voiceChannelInfo}>
                          <View style={styles.voiceChannelNameRow}>
                            <Text style={styles.voiceChannelName} numberOfLines={1}>
                              #{channel.name}
                            </Text>
                            {channel.id === recentVoiceChannelId ? (
                              <View style={styles.voiceChannelRecentBadge}>
                                <Text style={styles.voiceChannelRecentBadgeText}>
                                  {t('voice.recentChannel')}
                                </Text>
                              </View>
                            ) : null}
                            {(voiceParticipantCounts[channel.id] ?? 0) > 0 ? (
                              <View style={styles.voiceChannelLiveBadge}>
                                <Text style={styles.voiceChannelLiveBadgeText}>{t('voice.liveNow')}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.voiceChannelSecondary}>
                            {(voiceParticipantCounts[channel.id] ?? 0) > 0
                              ? t('voice.participants', {
                                  count: String(voiceParticipantCounts[channel.id] ?? 0),
                                })
                              : t('voice.waitingForOthers')}
                          </Text>
                        </View>
                        <View style={styles.voiceChannelActions}>
                          <TouchableOpacity
                            style={styles.voiceChannelChip}
                            onPress={() => handleVoiceEntryPress(channel, false)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.voiceChannelChipText}>{t('voice.join')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.voiceChannelChip}
                            onPress={() => handleVoiceEntryPress(channel, true)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.voiceChannelChipText}>{t('voice.videoCall')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : sortedVoiceChannels.length === 1 ? (
                <View style={styles.voiceChannelChooser}>
                  <Text style={styles.communityVoiceHint}>
                    {isNativeVoiceCallingAvailable
                      ? t('voice.supportReady')
                      : t('voice.supportRequiresBuild')}
                  </Text>
                  <View style={styles.voiceChannelRow}>
                      <View style={styles.voiceChannelInfo}>
                        <View style={styles.voiceChannelNameRow}>
                          <Text style={styles.voiceChannelName} numberOfLines={1}>
                            #{singleVoiceChannel!.name}
                          </Text>
                          {singleVoiceChannel!.id === recentVoiceChannelId ? (
                            <View style={styles.voiceChannelRecentBadge}>
                              <Text style={styles.voiceChannelRecentBadgeText}>
                                {t('voice.recentChannel')}
                              </Text>
                            </View>
                          ) : null}
                          {(voiceParticipantCounts[singleVoiceChannel!.id] ?? 0) > 0 ? (
                            <View style={styles.voiceChannelLiveBadge}>
                              <Text style={styles.voiceChannelLiveBadgeText}>{t('voice.liveNow')}</Text>
                            </View>
                          ) : null}
                      </View>
                    </View>
                    <View style={styles.voiceChannelMeta}>
                      <Text style={styles.voiceChannelMetaText}>
                        {(voiceParticipantCounts[singleVoiceChannel!.id] ?? 0) > 0
                          ? t('voice.participants', {
                              count: String(voiceParticipantCounts[singleVoiceChannel!.id] ?? 0),
                            })
                          : t('voice.waitingForOthers')}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={styles.communityVoiceHint}>{t('voice.noChannelsInCommunity')}</Text>
              )}
          </View>

          {/* Channel list */}
          {channelsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              testID="home-channel-list"
              data={channelRows}
              scrollEnabled={!isCommunityExitPending}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={isFocused && channelsRefetching}
                  onRefresh={refetchChannels}
                  tintColor={colors.primary}
                />
              }
              renderItem={({ item }) =>
                item.type === 'section' ? (
                  <ChannelSectionHeader title={item.title} />
                ) : (
                  (() => {
                    const sourceDmName = item.channel.sourceDmConversation?.name?.trim() ?? '';
                    const normalizedChannelQuery = channelSearchQuery.trim().toLowerCase();
                    const sourceDmMatchLabel =
                      normalizedChannelQuery.length > 0 &&
                      sourceDmName.length > 0 &&
                      sourceDmName.toLowerCase().includes(normalizedChannelQuery) &&
                      !item.channel.name.toLowerCase().includes(normalizedChannelQuery)
                        ? t('channel.sourceDmNameLabelWithName', { name: sourceDmName })
                        : undefined;
                    const voiceParticipantCount = voiceParticipantCounts[item.channel.id] ?? 0;
                    const voiceStatusLabel =
                      item.channel.type === 'voice'
                        ? voiceParticipantCount > 0
                          ? t('voice.participants', { count: String(voiceParticipantCount) })
                          : item.channel.id === recentVoiceChannelId
                            ? t('voice.recentChannel')
                            : undefined
                        : undefined;

                    return (
                      <ChannelListItem
                        item={item.channel}
                        onPress={handleChannelPress}
                        voiceLabel={t('home.voice')}
                        sourceDmLabel={t('dm.historyCompact')}
                        directDmLabel={`${t('dm.filterDirect')} ${t('dm.historyCompact')}`}
                        groupDmLabel={`${t('dm.filterGroup')} ${t('dm.historyCompact')}`}
                        sourceDmMatchLabel={sourceDmMatchLabel}
                        voiceStatusLabel={voiceStatusLabel}
                        isRecentVoiceChannel={item.channel.id === recentVoiceChannelId}
                        isLiveVoiceChannel={voiceParticipantCount > 0}
                      />
                    );
                  })()
                )
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>{'\u{1F4AD}'}</Text>
                  <Text style={styles.emptyText}>
                    {channelSearchQuery.trim()
                      ? t('home.noChannelSearchResults')
                      : channelFilter === 'unread'
                        ? t('home.noUnreadChannels')
                        : t('home.noChannels')}
                  </Text>
                  {channelSearchQuery.trim() || channelFilter === 'unread' ? (
                    <Text style={styles.emptyHint}>
                      {channelSearchQuery.trim()
                        ? t('home.noChannelSearchResultsBody')
                        : t('home.noUnreadChannelsBody')}
                    </Text>
                  ) : null}
                </View>
              }
              ListHeaderComponent={
                <View style={styles.listHeaderWrap}>
                  {(canManageChannels || canManageCategories) && (
                    <View style={styles.manageActionsRow}>
                      {canManageChannels ? (
                        <TouchableOpacity
                          style={styles.primaryManageAction}
                          onPress={handleCreateChannelPress}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.primaryManageActionIcon}>+</Text>
                          <Text style={styles.primaryManageActionText}>
                            {t('channel.create')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {canManageCategories ? (
                        <TouchableOpacity
                          style={styles.secondaryManageAction}
                          onPress={() =>
                            navigation.navigate('ManageCategories', {
                              communityId: selectedCommunity.id,
                              communityName: selectedCommunity.name,
                            })
                          }
                          activeOpacity={0.85}
                        >
                          <Text style={styles.secondaryManageActionText}>
                            {t('channel.categoriesMenu')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {canManageChannels ? (
                        <TouchableOpacity
                          style={styles.secondaryManageAction}
                          onPress={() =>
                            navigation.navigate('ManageChannels', {
                              communityId: selectedCommunity.id,
                              communityName: selectedCommunity.name,
                            })
                          }
                          activeOpacity={0.85}
                        >
                          <Text style={styles.secondaryManageActionText}>
                            {t('channel.orderMenu')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                  <TextInput
                    style={styles.searchInput}
                    value={channelSearchQuery}
                    onChangeText={setChannelSearchQuery}
                    placeholder={t('home.channelSearchPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {accessSummaryLabels.length > 0 ? (
                    <ChannelAccessSummaryCard labels={accessSummaryLabels} />
                  ) : null}
                  <View style={styles.filterRow}>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        channelFilter === 'all' && styles.filterChipActive,
                      ]}
                      onPress={() => setChannelFilter('all')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          channelFilter === 'all' && styles.filterChipTextActive,
                        ]}
                      >
                        {t('home.filterAll')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        channelFilter === 'unread' && styles.filterChipActive,
                      ]}
                      onPress={() => setChannelFilter('unread')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          channelFilter === 'unread' && styles.filterChipTextActive,
                        ]}
                      >
                        {t('home.filterUnread')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              }
              ListFooterComponent={
                canManageChannels ? (
                  <TouchableOpacity
                    style={styles.createChannelFooter}
                    onPress={handleCreateChannelPress}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.createChannelIcon}>+</Text>
                    <Text style={styles.createChannelFooterText}>{t('channel.create')}</Text>
                  </TouchableOpacity>
                ) : null
              }
              contentContainerStyle={[
                styles.channelList,
                channelRows.length === 0 && styles.emptyList,
              ]}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Community list view
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container} pointerEvents={isHomeInteractionBlocked ? 'none' : 'auto'}>
        {isHomeInteractionBlocked ? <View style={styles.homeInteractionBlocker} /> : null}
        {/* App header */}
        <View style={styles.appHeader}>
          <Text style={styles.appTitle}>{t('app.name')}</Text>
        </View>

        <FlatList
          testID="home-community-list"
          data={orderedCommunities}
          keyExtractor={(item) => item.id}
          getItemLayout={communityGetItemLayout}
          refreshControl={
            <RefreshControl
              refreshing={isFocused && communitiesRefetching}
              onRefresh={refetchCommunities}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item, index }) => (
            <CommunityListItem
              item={item}
              onPress={handleCommunityPress}
              onMoveUp={(communityId) => reorderCommunity(communityId, -1)}
              onMoveDown={(communityId) => reorderCommunity(communityId, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < orderedCommunities.length - 1}
              moveUpLabel={t('channel.orderMoveUp')}
              moveDownLabel={t('channel.orderMoveDown')}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHeaderWrap}>
              <View style={styles.quickStartCard}>
                <Text style={styles.quickStartTitle}>{t('home.quickStartTitle')}</Text>
                <Text style={styles.quickStartBody}>{t('home.quickStartBody')}</Text>
                <View style={styles.quickStartActions}>
                  <TouchableOpacity
                    style={styles.quickStartPrimaryAction}
                    onPress={handleJoinInvitePress}
                  >
                    <Text style={styles.quickStartPrimaryActionText}>
                      {t('community.joinInviteCta')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStartSecondaryAction}
                    onPress={() => navigation.navigate('CreateCommunity')}
                  >
                    <Text style={styles.quickStartSecondaryActionText}>
                      {t('home.createCommunity')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStartSecondaryAction}
                    onPress={handleShareProfilePress}
                  >
                    <Text style={styles.quickStartSecondaryActionText}>
                      {t('friends.shareProfile')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'\u{1F30D}'}</Text>
              <Text style={styles.emptyText}>{t('home.noCommunities')}</Text>
              <Text style={styles.emptyHint}>{t('home.noCommunityHint')}</Text>
              <TouchableOpacity
                style={styles.joinInviteCta}
                onPress={handleJoinInvitePress}
              >
                <Text style={styles.joinInviteCtaText}>{t('community.joinInviteCta')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createCommunityButton}
                onPress={() => navigation.navigate('CreateCommunity')}
              >
                <Text style={styles.createCommunityText}>{t('home.createCommunity')}</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={
            orderedCommunities.length === 0
              ? [styles.communityList, styles.emptyList]
              : styles.communityList
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  listHeaderWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  quickStartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  quickStartTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  quickStartBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  quickStartActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickStartPrimaryAction: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickStartPrimaryActionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  quickStartSecondaryAction: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickStartSecondaryActionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  manageActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  primaryManageAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryManageActionIcon: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  primaryManageActionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  secondaryManageAction: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryManageActionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.white,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  channelAccessCard: {
    backgroundColor: '#111827',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  channelAccessTitle: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  channelAccessBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  channelAccessChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  channelAccessChip: {
    backgroundColor: '#1f2937',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  channelAccessChipText: {
    color: '#dbeafe',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  appTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  communityHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  communityHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  communityHeaderLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  communityHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  communityHeroMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.sm,
  },
  backArrow: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '600',
  },
  backToListButton: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  backToListButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerIconText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  headerIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 3,
    lineHeight: 18,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  menuButtonText: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 18,
  },
  communityActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  communityVoiceHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  voiceChannelChooser: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  voiceChannelList: {
    gap: spacing.sm,
  },
  voiceChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceChannelInfo: {
    flex: 1,
    gap: 2,
  },
  voiceChannelNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  voiceChannelName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  voiceChannelSecondary: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  voiceChannelActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  voiceChannelMeta: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  voiceChannelMetaText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  voiceChannelLiveBadge: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  voiceChannelLiveBadgeText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  voiceChannelRecentBadge: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  voiceChannelRecentBadgeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  voiceChannelChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceChannelChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  communityActionChip: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  communityActionChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  communityActionChipPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  communityActionChipPrimaryText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  communityList: {
    paddingVertical: spacing.sm,
  },
  channelList: {
    flexGrow: 1,
    paddingVertical: spacing.sm,
  },
  channelSectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  channelSectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  communityItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.sm,
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  communityInitial: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  communityIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  communityReorderActions: {
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  communityReorderButton: {
    width: 30,
    height: 28,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityReorderButtonDisabled: {
    backgroundColor: colors.backgroundDark,
    borderColor: `${colors.border}66`,
  },
  communityReorderButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  communityReorderButtonTextDisabled: {
    color: colors.textMuted,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  communityDesc: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 24,
    marginLeft: spacing.sm,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  channelItemLocked: {
    backgroundColor: '#3b2b14',
    borderWidth: 1,
    borderColor: '#7c5b23',
  },
  channelIcon: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
    marginRight: spacing.sm,
  },
  channelIconLocked: {
    color: '#f7c66d',
  },
  channelName: {
    color: colors.text,
    fontSize: fontSize.body,
  },
  channelNameLocked: {
    color: '#f6e2b8',
  },
  channelCopy: {
    flex: 1,
  },
  channelSourceMatch: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  channelLockedHint: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: '#d7b67b',
  },
  channelVoiceStatus: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sourceDmBadge: {
    backgroundColor: '#e8f1f7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  sourceDmBadgeText: {
    color: '#577086',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  voiceBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  voiceBadgeText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  voiceRecentListBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  voiceRecentListBadgeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  voiceLiveListBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  voiceLiveListBadgeText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  unreadText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  lockedBadge: {
    borderRadius: 999,
    backgroundColor: '#5a431a',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  lockedBadgeText: {
    color: '#f6e2b8',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  createChannelIcon: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  createChannelFooter: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  createChannelFooterText: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  createCommunityButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  joinInviteCta: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  joinInviteCtaText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  homeInteractionBlocker: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  communityInteractionBlocker: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: 'transparent',
  },
  createCommunityText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
