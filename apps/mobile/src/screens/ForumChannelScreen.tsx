import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useChannelSubscription, useWebSocketStatus } from '../hooks/useWebSocket';
import { useAuthStore } from '../stores/auth';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'ForumChannelScreen'>;

interface ForumThreadAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}

interface ForumThreadRow {
  thread: {
    id: string;
    rootMessageId: string;
    title?: string | null;
    replyCount: number;
    isPinned: boolean;
    isLocked: boolean;
    lastActivityAt: string;
  };
  creator: ForumThreadAuthor;
  rootMessage: {
    id: string;
    bodyMarkdown: string;
    bodyPlaintext: string;
    createdAt: string;
  };
  unreadReplyCount: number;
  lastReadMessageId?: string | null;
  isFollowing: boolean;
}

interface ForumChannelDetail {
  id: string;
  name: string;
  description: string | null;
  type: 'chat' | 'announcement' | 'forum';
  isArchived: boolean;
}

interface ChannelPermissions {
  canCreateThread: boolean;
}

function formatRelativeTime(dateString: string, locale: string) {
  const timestamp = new Date(dateString).getTime();
  const diffMs = timestamp - Date.now();
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

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  return formatter.format(diffDays, 'day');
}

export default function ForumChannelScreen({ navigation, route }: Props) {
  const { t, locale } = useTranslation();
  const [sort, setSort] = useState<'latest' | 'top'>('latest');
  const [filter, setFilter] = useState<
    'all' | 'unread' | 'following' | 'mine' | 'unanswered' | 'pinned'
  >('all');
  const [sortField, setSortField] = useState<
    'activity' | 'title' | 'replies' | 'author' | 'unread'
  >('activity');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const queryClient = useQueryClient();
  const { queuedEventCount, consumeEvents } = useChannelSubscription(route.params.channelId);
  const wsStatus = useWebSocketStatus();
  const shouldPollThreads = wsStatus !== 'connected';
  const forumRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  const channelQuery = useQuery({
    queryKey: ['channel', route.params.channelId],
    queryFn: () =>
      api<{ channel: ForumChannelDetail }>(`/api/channels/${route.params.channelId}`),
  });

  const permissionsQuery = useQuery({
    queryKey: ['channel-me-permissions', route.params.channelId],
    queryFn: () =>
      api<{ permissions: ChannelPermissions }>(
        `/api/channels/${route.params.channelId}/me-permissions`,
      ),
  });

  const threadsQuery = useInfiniteQuery({
    queryKey: ['forum-threads', route.params.channelId, sort],
    queryFn: ({ pageParam }: { pageParam?: string | null }) =>
      api<{ items: ForumThreadRow[]; nextCursor: string | null }>(
        `/api/channels/${route.params.channelId}/threads?sort=${sort}${
          pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''
        }`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: shouldPollThreads ? 30_000 : false,
  });

  const canCreateThread = permissionsQuery.data?.permissions.canCreateThread ?? true;
  const channel = channelQuery.data?.channel;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `# ${channel?.name ?? route.params.channelName ?? t('channel.typeForum')}`,
      headerRight: () =>
        canCreateThread && !channel?.isArchived ? (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('CreateForumPost', {
                channelId: route.params.channelId,
                communityId: route.params.communityId,
                channelName: channel?.name ?? route.params.channelName,
              })
            }
            hitSlop={8}
          >
            <Text style={styles.headerAction}>+</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [
    canCreateThread,
    channel?.isArchived,
    channel?.name,
    navigation,
    route.params.channelId,
    route.params.channelName,
    route.params.communityId,
    t,
  ]);

  const threads = useMemo(
    () => threadsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [threadsQuery.data],
  );
  const filteredThreads = useMemo(() => {
    const base =
      filter === 'unread'
        ? threads.filter((item) => item.unreadReplyCount > 0)
        : filter === 'following'
          ? threads.filter((item) => item.isFollowing)
          : filter === 'mine'
            ? threads.filter((item) => item.creator.id === currentUser?.id)
            : filter === 'unanswered'
              ? threads.filter((item) => item.thread.replyCount === 0)
              : filter === 'pinned'
                ? threads.filter((item) => item.thread.isPinned)
              : threads;

    const searched = !deferredSearchQuery
      ? base
      : base.filter((item) => {
          const haystack = [
            item.thread.title ?? '',
            item.rootMessage.bodyPlaintext ?? '',
            item.creator.displayName ?? '',
            item.creator.username ?? '',
          ]
            .join(' ')
            .toLowerCase();

          return haystack.includes(deferredSearchQuery);
        });

    return [...searched].sort((left, right) => {
      if (sortField === 'title') {
        const leftTitle = (left.thread.title ?? '').toLocaleLowerCase();
        const rightTitle = (right.thread.title ?? '').toLocaleLowerCase();
        return sortOrder === 'newest'
          ? leftTitle.localeCompare(rightTitle)
          : rightTitle.localeCompare(leftTitle);
      }

      if (sortField === 'replies') {
        if (left.thread.replyCount !== right.thread.replyCount) {
          return sortOrder === 'newest'
            ? right.thread.replyCount - left.thread.replyCount
            : left.thread.replyCount - right.thread.replyCount;
        }
      }

      if (sortField === 'unread') {
        if (left.unreadReplyCount !== right.unreadReplyCount) {
          return sortOrder === 'newest'
            ? right.unreadReplyCount - left.unreadReplyCount
            : left.unreadReplyCount - right.unreadReplyCount;
        }
      }

      if (sortField === 'author') {
        const leftAuthor = (left.creator.displayName || left.creator.username || '').toLocaleLowerCase();
        const rightAuthor = (right.creator.displayName || right.creator.username || '').toLocaleLowerCase();
        return sortOrder === 'newest'
          ? leftAuthor.localeCompare(rightAuthor)
          : rightAuthor.localeCompare(leftAuthor);
      }

      const leftActivity = new Date(left.thread.lastActivityAt).getTime();
      const rightActivity = new Date(right.thread.lastActivityAt).getTime();
      return sortOrder === 'newest' ? rightActivity - leftActivity : leftActivity - rightActivity;
    });
  }, [currentUser?.id, deferredSearchQuery, filter, sortField, sortOrder, threads]);

  const subtitle = useMemo(() => {
    if (channel?.description) return channel.description;
    if (channel?.isArchived) return t('forum.archived');
    return t('forum.emptyBody');
  }, [channel?.description, channel?.isArchived, t]);

  const handleOpenThread = useCallback(
    (item: ForumThreadRow) => {
      navigation.navigate('ThreadScreen', {
        threadId: item.thread.id,
        channelId: route.params.channelId,
        communityId: route.params.communityId,
        channelName: channel?.name ?? route.params.channelName,
        rootMessageId: item.thread.rootMessageId,
      });
    },
    [channel?.name, navigation, route.params.channelId, route.params.channelName, route.params.communityId],
  );

  const followMutation = useMutation({
    mutationFn: ({ threadId, follow }: { threadId: string; follow: boolean }) =>
      api(`/api/threads/${threadId}/follow`, {
        method: follow ? 'POST' : 'DELETE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['forum-threads', route.params.channelId] });
      await queryClient.invalidateQueries({ queryKey: ['thread'] });
    },
  });

  const handleToggleFollow = useCallback(
    (item: ForumThreadRow) => {
      followMutation.mutate({
        threadId: item.thread.id,
        follow: !item.isFollowing,
      });
    },
    [followMutation],
  );

  const handleLoadMore = useCallback(() => {
    if (!threadsQuery.hasNextPage || threadsQuery.isFetchingNextPage) {
      return;
    }
    void threadsQuery.fetchNextPage();
  }, [threadsQuery]);

  const scheduleForumRefresh = useCallback(
    (delayMs = 1_200) => {
      if (forumRefreshTimeoutRef.current) {
        clearTimeout(forumRefreshTimeoutRef.current);
      }

      forumRefreshTimeoutRef.current = setTimeout(() => {
        forumRefreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({
          queryKey: ['forum-threads', route.params.channelId],
        });
      }, delayMs);
    },
    [queryClient, route.params.channelId],
  );

  useEffect(
    () => () => {
      if (forumRefreshTimeoutRef.current) {
        clearTimeout(forumRefreshTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (queuedEventCount === 0) return;

    const newEvents = consumeEvents();
    if (
      newEvents.some((event) =>
        event.type === 'message.created' ||
        event.type === 'message.updated' ||
        event.type === 'message.deleted' ||
        event.type === 'thread.created' ||
        event.type === 'thread.updated' ||
        event.type === 'thread.locked',
      )
    ) {
      scheduleForumRefresh();
    }
  }, [consumeEvents, queuedEventCount, scheduleForumRefresh]);

  if (channelQuery.isLoading || threadsQuery.isLoading) {
    return <LoadingSpinner text={t('forum.loadingPosts')} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.toolbar}>
        <View style={styles.sortRow}>
          {(['latest', 'top'] as const).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.sortChip, sort === value && styles.sortChipActive]}
              onPress={() => setSort(value)}
            >
              <Text style={[styles.sortText, sort === value && styles.sortTextActive]}>
                {t(`forum.${value}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortRow}>
          {(['all', 'unread', 'following', 'mine', 'unanswered', 'pinned'] as const).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.sortChip, filter === value && styles.sortChipActive]}
              onPress={() => setFilter(value)}
            >
              <Text style={[styles.sortText, filter === value && styles.sortTextActive]}>
                {t(value === 'pinned' ? 'forum.pinned' : `forum.${value}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortRow}>
          {([
            { key: 'activity' as const, label: t('forum.sortActivity') },
            { key: 'title' as const, label: t('forum.sortTitle') },
            { key: 'replies' as const, label: t('forum.sortReplies') },
            { key: 'author' as const, label: t('forum.sortAuthor') },
            { key: 'unread' as const, label: t('forum.sortUnread') },
          ]).map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortChip, sortField === option.key && styles.sortChipActive]}
              onPress={() => setSortField(option.key)}
            >
              <Text style={[styles.sortText, sortField === option.key && styles.sortTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortRow}>
          {([
            {
              key: 'newest' as const,
              label:
                sortField === 'activity'
                  ? t('settings.sortNewest')
                  : sortField === 'title' || sortField === 'author'
                    ? t('settings.sortAsc')
                    : sortField === 'unread'
                      ? t('forum.sortMostUnread')
                      : t('forum.sortMostReplies'),
            },
            {
              key: 'oldest' as const,
              label:
                sortField === 'activity'
                  ? t('settings.sortOldest')
                  : sortField === 'title' || sortField === 'author'
                    ? t('settings.sortDesc')
                    : sortField === 'unread'
                      ? t('forum.sortFewestUnread')
                      : t('forum.sortFewestReplies'),
            },
          ]).map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortChip, sortOrder === option.key && styles.sortChipActive]}
              onPress={() => setSortOrder(option.key)}
            >
              <Text style={[styles.sortText, sortOrder === option.key && styles.sortTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('forum.searchPlaceholder')}
          placeholderTextColor={colors.textDim}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.thread.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={threadsQuery.isRefetching}
            onRefresh={threadsQuery.refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={filteredThreads.length === 0 ? styles.emptyContent : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={'\u{1F4CB}'}
            title={
              deferredSearchQuery
                ? t('forum.noSearchResults')
                : filter === 'unread'
                  ? t('forum.noUnread')
                : filter === 'following'
                  ? t('forum.noFollowing')
                  : filter === 'mine'
                    ? t('forum.noMine')
                    : filter === 'unanswered'
                      ? t('forum.noUnanswered')
                      : filter === 'pinned'
                        ? t('forum.noPinned')
                      : t('forum.noPosts')
            }
            subtitle={
              deferredSearchQuery
                ? t('forum.noSearchResultsBody')
                : filter === 'unread'
                  ? t('forum.noUnreadBody')
                  : filter === 'following'
                  ? t('forum.noFollowingBody')
                  : filter === 'mine'
                    ? t('forum.noMineBody')
                    : filter === 'unanswered'
                      ? t('forum.noUnansweredBody')
                      : filter === 'pinned'
                        ? t('forum.noPinnedBody')
                      : t('forum.emptyBody')
            }
          />
        }
        ListFooterComponent={
          threadsQuery.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => handleOpenThread(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.thread.title || t('message.thread')}
              </Text>
              {item.unreadReplyCount > 0 ? (
                <View style={[styles.badge, styles.badgeUnread]}>
                  <Text style={[styles.badgeText, styles.badgeUnreadText]}>
                    {t('forum.newReplies', { count: item.unreadReplyCount })}
                  </Text>
                </View>
              ) : null}
              {item.creator.id === currentUser?.id ? (
                <View style={[styles.badge, styles.badgeMine]}>
                  <Text style={[styles.badgeText, styles.badgeMineText]}>
                    {t('forum.mine')}
                  </Text>
                </View>
              ) : null}
              {item.thread.isPinned ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('forum.pinned')}</Text>
                </View>
              ) : null}
              {item.thread.isLocked ? (
                <View style={[styles.badge, styles.badgeMuted]}>
                  <Text style={[styles.badgeText, styles.badgeMutedText]}>{t('thread.locked')}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.preview} numberOfLines={2}>
              {item.rootMessage.bodyPlaintext || t('forum.noPreview')}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                {item.creator.displayName || item.creator.username}
              </Text>
              <Text style={styles.metaDot}>{'\u2022'}</Text>
              <Text style={styles.metaText}>{t('thread.replyCount', { count: item.thread.replyCount })}</Text>
              <Text style={styles.metaDot}>{'\u2022'}</Text>
              <Text style={styles.metaText}>
                {t('forum.lastActivity')} {formatRelativeTime(item.thread.lastActivityAt, locale)}
              </Text>
              <TouchableOpacity
                style={[
                  styles.followChip,
                  item.isFollowing && styles.followChipActive,
                ]}
                activeOpacity={0.8}
                onPress={(event) => {
                  event.stopPropagation();
                  handleToggleFollow(item);
                }}
                disabled={followMutation.isPending}
              >
                <Text
                  style={[
                    styles.followChipText,
                    item.isFollowing && styles.followChipTextActive,
                  ]}
                >
                  {item.isFollowing ? t('thread.unfollow') : t('thread.follow')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerAction: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 28,
  },
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  sortChipActive: {
    backgroundColor: colors.primaryDark,
  },
  sortText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  sortTextActive: {
    color: colors.white,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 18,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fs.base,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cardTitle: {
    flexShrink: 1,
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '33',
  },
  badgeUnread: {
    backgroundColor: colors.primary + '22',
  },
  badgeMine: {
    backgroundColor: colors.success + '22',
  },
  badgeMuted: {
    backgroundColor: colors.backgroundDark,
  },
  badgeText: {
    color: colors.warning,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  badgeUnreadText: {
    color: colors.primaryLight,
  },
  badgeMineText: {
    color: colors.success,
  },
  badgeMutedText: {
    color: colors.textMuted,
  },
  preview: {
    color: colors.text,
    fontSize: fs.base,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: fs.xs,
  },
  metaDot: {
    color: colors.textDim,
    fontSize: fs.xs,
  },
  followChip: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
  },
  followChipActive: {
    backgroundColor: colors.primary + '22',
  },
  followChipText: {
    color: colors.textSecondary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  followChipTextActive: {
    color: colors.primaryLight,
  },
  separator: {
    height: spacing.md,
  },
  footerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
