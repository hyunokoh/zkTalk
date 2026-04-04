import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  getSimulatorHarnessPath,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessFile,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import LoadingSpinner from '../components/LoadingSpinner';
import { borderRadius, colors, fontSize, spacing } from '../theme';
import type { MainTabParamList } from '../navigation/types';

type InboxTab = 'all' | 'mentions' | 'threads';

type InboxItem = {
  id: string;
  type: 'mention' | 'thread_reply';
  communityId: string;
  communitySlug: string;
  channelId: string;
  channelName: string;
  authorDisplayName: string;
  bodyPreview: string;
  messageId: string;
  threadId?: string | null;
  createdAt: string;
  isRead: boolean;
};

type InboxPage = {
  items: InboxItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

type InboxCommunity = {
  id: string;
  name: string;
};

type InboxSummary = {
  all: number;
  mentions: number;
  threads: number;
};

type InboxCommunitySummary = {
  communityId: string;
  all: number;
  mentions: number;
  threads: number;
};

const TABS: InboxTab[] = ['all', 'mentions', 'threads'];

function formatRelativeTime(dateString: string, locale: string) {
  const timestamp = new Date(dateString).getTime();
  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  const RelativeTimeFormatter = Intl.RelativeTimeFormat;
  if (typeof RelativeTimeFormatter !== 'function') {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  }

  const formatter = new RelativeTimeFormatter(locale, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, 'day');
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export default function InboxScreen() {
  const { t, locale } = useTranslation();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InboxTab>('all');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showEncryptedOnly, setShowEncryptedOnly] = useState(false);
  const [sortField, setSortField] = useState<'time' | 'author' | 'channel'>('time');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const devInboxActionAttemptedRef = useRef(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const inboxScope = selectedCommunityId ?? 'all';
  const inboxSearchScope = deferredSearchQuery || 'all';

  const communitiesQuery = useQuery({
    queryKey: ['communities'],
    queryFn: () => api<{ communities: InboxCommunity[] }>('/api/communities'),
  });
  const communitySummaryQuery = useQuery({
    queryKey: ['inbox-community-summary'],
    queryFn: () => api<{ items: InboxCommunitySummary[] }>('/api/inbox/community-summary'),
  });

  const inboxQuery = useInfiniteQuery({
    queryKey: ['inbox', inboxScope, inboxSearchScope],
    queryFn: ({ pageParam }: { pageParam?: string | null }) =>
      api<InboxPage>(
        `/api/inbox?${
          selectedCommunityId ? `communityId=${encodeURIComponent(selectedCommunityId)}&` : ''
        }${deferredSearchQuery ? `q=${encodeURIComponent(deferredSearchQuery)}&` : ''}${
          pageParam ? `cursor=${encodeURIComponent(pageParam)}` : ''
        }`.replace(/\?&/, '?'),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: (previousData) => previousData,
  });
  const summaryQuery = useQuery({
    queryKey: ['inbox-summary', inboxScope],
    queryFn: () =>
      api<InboxSummary>(
        `/api/inbox/summary${
          selectedCommunityId ? `?communityId=${encodeURIComponent(selectedCommunityId)}` : ''
        }`,
      ),
  });
  const threadFollowMutation = useMutation({
    mutationFn: ({ threadId, follow }: { threadId: string; follow: boolean }) =>
      api(`/api/threads/${threadId}/follow`, {
        method: follow ? 'POST' : 'DELETE',
      }),
    onMutate: async ({ threadId, follow }) => {
      await queryClient.cancelQueries({ queryKey: ['inbox', inboxScope, inboxSearchScope] });
      await queryClient.cancelQueries({ queryKey: ['inbox-summary', inboxScope] });
      await queryClient.cancelQueries({ queryKey: ['inbox-community-summary'] });
      const previous = queryClient.getQueryData<{
        pages: InboxPage[];
        pageParams: Array<string | null>;
      }>(['inbox', inboxScope, inboxSearchScope]);
      const previousSummary = queryClient.getQueryData<InboxSummary>(['inbox-summary', inboxScope]);
      const previousCommunitySummary = queryClient.getQueryData<{ items: InboxCommunitySummary[] }>([
        'inbox-community-summary',
      ]);

      if (!follow) {
        const removedItems = items.filter(
          (item) => item.type === 'thread_reply' && item.threadId === threadId,
        );
        const removedUnreadCount = removedItems.filter((item) => !item.isRead).length;
        const removedByCommunity = removedItems.reduce<Map<string, number>>((counts, item) => {
          if (!item.isRead) {
            counts.set(item.communityId, (counts.get(item.communityId) ?? 0) + 1);
          }
          return counts;
        }, new Map());

        queryClient.setQueryData<{
          pages: InboxPage[];
          pageParams: Array<string | null>;
        }>(['inbox', inboxScope, inboxSearchScope], (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.filter(
                    (item) => !(item.type === 'thread_reply' && item.threadId === threadId),
                  ),
                })),
              }
            : current,
        );

        if (removedUnreadCount > 0) {
          queryClient.setQueryData<InboxSummary>(['inbox-summary', inboxScope], (current) =>
            current
              ? {
                  all: Math.max(0, current.all - removedUnreadCount),
                  mentions: current.mentions,
                  threads: Math.max(0, current.threads - removedUnreadCount),
                }
              : current,
          );
          queryClient.setQueryData<{ items: InboxCommunitySummary[] }>(
            ['inbox-community-summary'],
            (current) =>
              current
                ? {
                    items: current.items.map((item) => {
                      const removedCount = removedByCommunity.get(item.communityId) ?? 0;
                      return removedCount > 0
                        ? {
                            ...item,
                            all: Math.max(0, item.all - removedCount),
                            threads: Math.max(0, item.threads - removedCount),
                          }
                        : item;
                    }),
                  }
                : current,
          );
        }
      }

      return { previous, previousSummary, previousCommunitySummary };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], context.previous);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(['inbox-summary', inboxScope], context.previousSummary);
      }
      if (context?.previousCommunitySummary) {
        queryClient.setQueryData(['inbox-community-summary'], context.previousCommunitySummary);
      }
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('thread.followFailed'),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-community-summary'] });
      queryClient.invalidateQueries({ queryKey: ['thread'] });
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId: string) => api(`/api/inbox/${messageId}/read`, { method: 'POST' }),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: ['inbox', inboxScope, inboxSearchScope] });
      await queryClient.cancelQueries({ queryKey: ['inbox-summary', inboxScope] });
      await queryClient.cancelQueries({ queryKey: ['inbox-community-summary'] });
      const previous = queryClient.getQueryData<{
        pages: InboxPage[];
        pageParams: Array<string | null>;
      }>(['inbox', inboxScope, inboxSearchScope]);
      const previousSummary = queryClient.getQueryData<InboxSummary>(['inbox-summary', inboxScope]);
      const previousCommunitySummary = queryClient.getQueryData<{ items: InboxCommunitySummary[] }>([
        'inbox-community-summary',
      ]);
      const targetItem = items.find((item) => item.messageId === messageId);
      queryClient.setQueryData<{
        pages: InboxPage[];
        pageParams: Array<string | null>;
      }>(['inbox', inboxScope, inboxSearchScope], (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.messageId === messageId ? { ...item, isRead: true } : item,
                ),
              })),
            }
          : current,
      );
      if (targetItem && !targetItem.isRead) {
        queryClient.setQueryData<InboxSummary>(['inbox-summary', inboxScope], (current) =>
          current
            ? {
                all: Math.max(0, current.all - 1),
                mentions:
                  targetItem.type === 'mention'
                    ? Math.max(0, current.mentions - 1)
                    : current.mentions,
                threads:
                  targetItem.type === 'thread_reply'
                    ? Math.max(0, current.threads - 1)
                    : current.threads,
              }
            : current,
        );
        queryClient.setQueryData<{ items: InboxCommunitySummary[] }>(
          ['inbox-community-summary'],
          (current) =>
            current
              ? {
                  items: current.items.map((item) =>
                    item.communityId === targetItem.communityId
                      ? {
                          ...item,
                          all: Math.max(0, item.all - 1),
                          mentions:
                            targetItem.type === 'mention'
                              ? Math.max(0, item.mentions - 1)
                              : item.mentions,
                          threads:
                            targetItem.type === 'thread_reply'
                              ? Math.max(0, item.threads - 1)
                              : item.threads,
                        }
                      : item,
                  ),
                }
              : current,
        );
      }
      return { previous, previousSummary, previousCommunitySummary };
    },
    onError: (error, _messageId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], context.previous);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(['inbox-summary', inboxScope], context.previousSummary);
      }
      if (context?.previousCommunitySummary) {
        queryClient.setQueryData(['inbox-community-summary'], context.previousCommunitySummary);
      }
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('inbox.markReadFailed'),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-community-summary'] });
    },
  });

  const items = useMemo(
    () => inboxQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [inboxQuery.data],
  );

  const filteredItems = useMemo(() => {
    const scopedItems =
      activeTab === 'all'
        ? items
        : activeTab === 'mentions'
          ? items.filter((item) => item.type === 'mention')
          : items.filter((item) => item.type === 'thread_reply');

    return scopedItems.filter((item) => {
      if (showUnreadOnly && item.isRead) {
        return false;
      }

      if (showEncryptedOnly && item.bodyPreview !== t('dm.encryptedMessagePlaceholder')) {
        return false;
      }

      return true;
    });
  }, [activeTab, items, showEncryptedOnly, showUnreadOnly, t]);
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (!showUnreadOnly && a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }

      if (sortField === 'author') {
        const left = (a.authorDisplayName || '').toLocaleLowerCase();
        const right = (b.authorDisplayName || '').toLocaleLowerCase();
        return sortOrder === 'oldest'
          ? right.localeCompare(left)
          : left.localeCompare(right);
      }

      if (sortField === 'channel') {
        const left = (a.channelName || '').toLocaleLowerCase();
        const right = (b.channelName || '').toLocaleLowerCase();
        return sortOrder === 'oldest'
          ? right.localeCompare(left)
          : left.localeCompare(right);
      }

      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'oldest' ? diff : -diff;
    });
  }, [filteredItems, showUnreadOnly, sortField, sortOrder]);
  const firstReadIndex = useMemo(
    () => sortedItems.findIndex((item) => item.isRead),
    [sortedItems],
  );
  const hasActiveFilters =
    !!deferredSearchQuery || selectedCommunityId !== null || showUnreadOnly || showEncryptedOnly;
  const selectedCommunityName = useMemo(() => {
    if (!selectedCommunityId) {
      return null;
    }

    return (
      communitiesQuery.data?.communities.find((community) => community.id === selectedCommunityId)?.name ??
      null
    );
  }, [communitiesQuery.data?.communities, selectedCommunityId]);

  const unreadCounts = summaryQuery.data ?? { all: 0, mentions: 0, threads: 0 };
  const isSearching =
    !!deferredSearchQuery &&
    inboxQuery.isFetching &&
    !inboxQuery.isFetchingNextPage &&
    !inboxQuery.isRefetching;
  const currentUnreadCount =
    activeTab === 'all'
      ? unreadCounts.all
      : activeTab === 'mentions'
        ? unreadCounts.mentions
        : unreadCounts.threads;
  const getCountForTab = useCallback(
    (summary: InboxSummary | InboxCommunitySummary | undefined) => {
      if (!summary) return 0;
      return activeTab === 'all'
        ? summary.all
        : activeTab === 'mentions'
          ? summary.mentions
          : summary.threads;
    },
    [activeTab],
  );

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      api('/api/inbox/read-all', {
        method: 'POST',
        body: {
          ...(selectedCommunityId ? { communityId: selectedCommunityId } : {}),
          type: activeTab,
        },
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['inbox', inboxScope, inboxSearchScope] });
      await queryClient.cancelQueries({ queryKey: ['inbox-summary', inboxScope] });
      await queryClient.cancelQueries({ queryKey: ['inbox-community-summary'] });
      const previous = queryClient.getQueryData<{
        pages: InboxPage[];
        pageParams: Array<string | null>;
      }>(['inbox', inboxScope, inboxSearchScope]);
      const previousSummary = queryClient.getQueryData<InboxSummary>(['inbox-summary', inboxScope]);
      const previousCommunitySummary = queryClient.getQueryData<{ items: InboxCommunitySummary[] }>([
        'inbox-community-summary',
      ]);
      queryClient.setQueryData<{
        pages: InboxPage[];
        pageParams: Array<string | null>;
      }>(['inbox', inboxScope, inboxSearchScope], (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  activeTab === 'all'
                    ? { ...item, isRead: true }
                    : activeTab === 'mentions'
                      ? item.type === 'mention'
                        ? { ...item, isRead: true }
                        : item
                      : item.type === 'thread_reply'
                        ? { ...item, isRead: true }
                        : item,
                ),
              })),
            }
          : current,
      );
      queryClient.setQueryData<InboxSummary>(['inbox-summary', inboxScope], (current) =>
        current
          ? activeTab === 'all'
            ? { all: 0, mentions: 0, threads: 0 }
            : activeTab === 'mentions'
              ? {
                  all: Math.max(0, current.all - current.mentions),
                  mentions: 0,
                  threads: current.threads,
                }
              : {
                  all: Math.max(0, current.all - current.threads),
                  mentions: current.mentions,
                  threads: 0,
                }
          : current,
      );
      if (selectedCommunityId) {
        queryClient.setQueryData<{ items: InboxCommunitySummary[] }>(
          ['inbox-community-summary'],
          (current) =>
            current
              ? {
                  items: current.items.map((item) =>
                    item.communityId === selectedCommunityId
                      ? activeTab === 'all'
                        ? { ...item, all: 0, mentions: 0, threads: 0 }
                        : activeTab === 'mentions'
                          ? {
                              ...item,
                              all: Math.max(0, item.all - item.mentions),
                              mentions: 0,
                            }
                          : {
                              ...item,
                              all: Math.max(0, item.all - item.threads),
                              threads: 0,
                            }
                      : item,
                  ),
                }
              : current,
        );
      }
      return { previous, previousSummary, previousCommunitySummary };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inbox', inboxScope, inboxSearchScope], context.previous);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(['inbox-summary', inboxScope], context.previousSummary);
      }
      if (context?.previousCommunitySummary) {
        queryClient.setQueryData(['inbox-community-summary'], context.previousCommunitySummary);
      }
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('inbox.markAllReadFailed'),
      );
    },
    onSuccess: () => {
      Alert.alert(t('inbox.markAllRead'), t('inbox.markAllReadDone'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-community-summary'] });
    },
  });

  const handleLoadMore = useCallback(() => {
    if (!inboxQuery.hasNextPage || inboxQuery.isFetchingNextPage) {
      return;
    }

    void inboxQuery.fetchNextPage();
  }, [inboxQuery]);

  const handleOpenItem = useCallback(
    (item: InboxItem) => {
      if (!item.isRead && !markReadMutation.isPending) {
        markReadMutation.mutate(item.messageId);
      }

      if (item.threadId) {
        navigation.navigate('HomeTab', {
          screen: 'ThreadScreen',
          params: {
            threadId: item.threadId,
            channelId: item.channelId,
            communityId: item.communityId,
            channelName: item.channelName,
            focusMessageId: item.messageId,
          },
        });
        return;
      }

      navigation.navigate('HomeTab', {
        screen: 'ChannelScreen',
        params: {
          communityId: item.communityId,
          channelId: item.channelId,
          channelName: item.channelName,
          focusMessageId: item.messageId,
        },
      });
    },
    [markReadMutation, navigation],
  );

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devInboxActionAttemptedRef.current) {
      return;
    }
    if (inboxQuery.isLoading || markReadMutation.isPending || sortedItems.length === 0) {
      return;
    }

    async function runDevInboxAction() {
      const parsed = await readSimulatorHarnessJson<
        | {
            action?: 'open';
            messageId?: string;
          }
        | undefined
      >('dev-inbox-action.json');
      if (!parsed) {
        return;
      }

      devInboxActionAttemptedRef.current = true;
      await deleteSimulatorHarnessFile('dev-inbox-action.json');

      const targetItem =
        (parsed?.messageId ? sortedItems.find((item) => item.messageId === parsed.messageId) : null) ??
        sortedItems[0];

      if (!targetItem) {
        return;
      }

      handleOpenItem(targetItem);
    }

    void runDevInboxAction();
  }, [handleOpenItem, inboxQuery.isLoading, markReadMutation.isPending, sortedItems]);

  const handleResetFilters = useCallback(() => {
    setSelectedCommunityId(null);
    setShowUnreadOnly(false);
    setShowEncryptedOnly(false);
    setSearchQuery('');
  }, []);

  const handleMarkAllRead = useCallback(() => {
    if (currentUnreadCount === 0 || markAllReadMutation.isPending) {
      return;
    }

    markAllReadMutation.mutate();
  }, [currentUnreadCount, markAllReadMutation]);

  const handleToggleThreadFollow = useCallback(
    (item: InboxItem) => {
      if (!item.threadId || threadFollowMutation.isPending) {
        return;
      }

      threadFollowMutation.mutate({ threadId: item.threadId, follow: false });
    },
    [threadFollowMutation],
  );

  if (inboxQuery.isLoading && !inboxQuery.data) {
    return <LoadingSpinner text={t('inbox.loading')} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerCard}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t('inbox.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('inbox.listSubtitle')}</Text>
        </View>
        {currentUnreadCount > 0 ? (
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.headerActionButtonText}>
              {markAllReadMutation.isPending ? t('inbox.markingAllRead') : t('inbox.markAllRead')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const count =
            tab === 'all'
              ? unreadCounts.all
              : tab === 'mentions'
                ? unreadCounts.mentions
                : unreadCounts.threads;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {t(`inbox.${tab}`)}
              </Text>
              {count > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={[
          { id: 'all', name: t('inbox.allCommunities') },
          ...((communitiesQuery.data?.communities ?? []).map((community) => ({
            id: community.id,
            name: community.name,
          }))),
        ]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.communityFilterRow}
        renderItem={({ item }) => {
          const selected =
            item.id === 'all' ? selectedCommunityId === null : selectedCommunityId === item.id;
          const count =
            item.id === 'all'
              ? getCountForTab(unreadCounts)
              : getCountForTab(
                  communitySummaryQuery.data?.items.find(
                    (summary) => summary.communityId === item.id,
                  ),
                );
          return (
            <TouchableOpacity
              style={[styles.communityFilterChip, selected && styles.communityFilterChipActive]}
              activeOpacity={0.85}
              onPress={() => setSelectedCommunityId(item.id === 'all' ? null : item.id)}
            >
              <Text
                style={[
                  styles.communityFilterLabel,
                  selected && styles.communityFilterLabelActive,
                ]}
              >
                {item.name}
              </Text>
              {count > 0 ? (
                <View
                  style={[
                    styles.communityFilterBadge,
                    selected && styles.communityFilterBadgeActive,
                  ]}
                >
                  <Text style={styles.communityFilterBadgeText}>{count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.searchWrap}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('inbox.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {isSearching ? (
          <View style={styles.searchStatusRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.searchStatusText}>{t('inbox.searching')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, sortField === 'time' && styles.filterChipActive]}
          activeOpacity={0.85}
          onPress={() => setSortField('time')}
        >
          <Text
            style={[styles.filterChipLabel, sortField === 'time' && styles.filterChipLabelActive]}
          >
            {t('inbox.sortTime')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortField === 'author' && styles.filterChipActive]}
          activeOpacity={0.85}
          onPress={() => setSortField('author')}
        >
          <Text
            style={[styles.filterChipLabel, sortField === 'author' && styles.filterChipLabelActive]}
          >
            {t('inbox.sortAuthor')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortField === 'channel' && styles.filterChipActive]}
          activeOpacity={0.85}
          onPress={() => setSortField('channel')}
        >
          <Text
            style={[styles.filterChipLabel, sortField === 'channel' && styles.filterChipLabelActive]}
          >
            {t('inbox.sortChannel')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, showUnreadOnly && styles.filterChipActive]}
          activeOpacity={0.85}
          onPress={() => setShowUnreadOnly((prev) => !prev)}
        >
          <Text
            style={[styles.filterChipLabel, showUnreadOnly && styles.filterChipLabelActive]}
          >
            {t('inbox.unreadOnly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, showEncryptedOnly && styles.filterChipActive]}
          activeOpacity={0.85}
          onPress={() => setShowEncryptedOnly((prev) => !prev)}
        >
          <Text
            style={[styles.filterChipLabel, showEncryptedOnly && styles.filterChipLabelActive]}
          >
            {t('inbox.encryptedOnly')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortOrder === 'newest' && styles.filterChipActive]}
          activeOpacity={0.85}
          onPress={() => setSortOrder('newest')}
        >
          <Text
            style={[styles.filterChipLabel, sortOrder === 'newest' && styles.filterChipLabelActive]}
          >
            {sortField === 'time' ? t('settings.sortNewest') : t('settings.sortAsc')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortOrder === 'oldest' && styles.filterChipActive]}
          activeOpacity={0.85}
          onPress={() => setSortOrder('oldest')}
        >
          <Text
            style={[styles.filterChipLabel, sortOrder === 'oldest' && styles.filterChipLabelActive]}
          >
            {sortField === 'time' ? t('settings.sortOldest') : t('settings.sortDesc')}
          </Text>
        </TouchableOpacity>
      </View>

      {hasActiveFilters ? (
        <View style={styles.activeFilterWrap}>
          {selectedCommunityName ? (
            <TouchableOpacity
              style={styles.activeFilterChip}
              activeOpacity={0.85}
              onPress={() => setSelectedCommunityId(null)}
            >
              <Text style={styles.activeFilterChipText}>
                {t('inbox.activeCommunityFilter', { name: selectedCommunityName })}
              </Text>
              <Text style={styles.activeFilterChipDismiss}>{t('common.close')}</Text>
            </TouchableOpacity>
          ) : null}
          {deferredSearchQuery ? (
            <TouchableOpacity
              style={styles.activeFilterChip}
              activeOpacity={0.85}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.activeFilterChipText}>
                {t('inbox.activeSearchFilter', { query: deferredSearchQuery })}
              </Text>
              <Text style={styles.activeFilterChipDismiss}>{t('common.close')}</Text>
            </TouchableOpacity>
          ) : null}
          {showUnreadOnly ? (
            <TouchableOpacity
              style={styles.activeFilterChip}
              activeOpacity={0.85}
              onPress={() => setShowUnreadOnly(false)}
            >
              <Text style={styles.activeFilterChipText}>{t('inbox.unreadOnly')}</Text>
              <Text style={styles.activeFilterChipDismiss}>{t('common.close')}</Text>
            </TouchableOpacity>
          ) : null}
          {showEncryptedOnly ? (
            <TouchableOpacity
              style={styles.activeFilterChip}
              activeOpacity={0.85}
              onPress={() => setShowEncryptedOnly(false)}
            >
              <Text style={styles.activeFilterChipText}>{t('inbox.encryptedOnly')}</Text>
              <Text style={styles.activeFilterChipDismiss}>{t('common.close')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.clearAllFiltersButton}
            activeOpacity={0.85}
            onPress={handleResetFilters}
          >
            <Text style={styles.clearAllFiltersText}>{t('inbox.clearFilters')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={inboxQuery.isRefetching}
            onRefresh={() => {
              void inboxQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          inboxQuery.isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\u{1F4E5}'}</Text>
            <Text style={styles.emptyTitle}>
              {showEncryptedOnly ? t('inbox.noEncryptedItems') : t('inbox.empty')}
            </Text>
            <Text style={styles.emptyBody}>
              {deferredSearchQuery
                ? t('inbox.noSearchResults')
                : showEncryptedOnly
                  ? t('inbox.noEncryptedItemsBody')
                : showUnreadOnly
                  ? t('inbox.noUnreadItems')
                : activeTab === 'mentions'
                  ? t('inbox.noMentions')
                  : activeTab === 'threads'
                    ? t('inbox.noThreadReplies')
                    : t('inbox.emptyHint')}
            </Text>
            {hasActiveFilters ? (
              <TouchableOpacity
                style={styles.emptyAction}
                activeOpacity={0.85}
                onPress={handleResetFilters}
              >
                <Text style={styles.emptyActionText}>{t('inbox.clearFilters')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        contentContainerStyle={sortedItems.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item, index }) => (
          <View>
            {!showUnreadOnly && index === 0 && !item.isRead ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{t('inbox.unreadSection')}</Text>
              </View>
            ) : null}
            {!showUnreadOnly && firstReadIndex > 0 && index === firstReadIndex ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{t('inbox.earlierSection')}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.cardUnread]}
              activeOpacity={0.9}
              onPress={() => handleOpenItem(item)}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>
                  {item.type === 'mention' ? '@' : '\u{1F4AC}'}
                </Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardAuthor} numberOfLines={1}>
                    {item.authorDisplayName || t('common.unknown')}
                  </Text>
                  <Text style={styles.cardMetaCopy} numberOfLines={1}>
                    {item.type === 'mention' ? t('inbox.mentionedYou') : t('inbox.repliedIn')}
                  </Text>
                  <Text style={styles.cardChannel} numberOfLines={1}>
                    # {item.channelName}
                  </Text>
                </View>

                <Text style={styles.cardPreview} numberOfLines={2}>
                  {item.bodyPreview || t('inbox.emptyMessage')}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt, locale)}</Text>
                  {item.type === 'thread_reply' && item.threadId ? (
                    <TouchableOpacity
                      style={styles.threadActionChip}
                      activeOpacity={0.85}
                      disabled={threadFollowMutation.isPending}
                      onPress={(event) => {
                        event.stopPropagation();
                        handleToggleThreadFollow(item);
                      }}
                    >
                      <Text style={styles.threadActionChipText}>
                        {threadFollowMutation.isPending
                          ? t('thread.following')
                          : t('thread.unfollow')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {markReadMutation.isPending ? (
        <View style={styles.pendingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.pendingText}>{t('inbox.markingRead')}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerCopy: {
    gap: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  headerActionButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  communityFilterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  communityFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  communityFilterChipActive: {
    backgroundColor: colors.primaryDark,
  },
  communityFilterLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  communityFilterLabelActive: {
    color: colors.white,
  },
  communityFilterBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
  },
  communityFilterBadgeActive: {
    backgroundColor: colors.primary,
  },
  communityFilterBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  searchStatusText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.text,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  activeFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  activeFilterChipText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  activeFilterChipDismiss: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  clearAllFiltersButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  clearAllFiltersText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primaryDark,
  },
  filterChipLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterChipLabelActive: {
    color: colors.white,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: colors.white,
  },
  tabBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHover,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    color: colors.primaryLight,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardAuthor: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  cardMetaCopy: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  cardChannel: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: '600',
    flexShrink: 1,
  },
  cardPreview: {
    color: colors.text,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardTime: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  threadActionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
  },
  threadActionChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  separator: {
    height: spacing.sm,
  },
  sectionHeader: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionHeaderText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryDark,
  },
  emptyActionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  pendingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});
