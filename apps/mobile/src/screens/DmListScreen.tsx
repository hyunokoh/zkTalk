import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused, type NavigationProp } from '@react-navigation/native';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { useAuthStore } from '../stores/auth';
import { colors, borderRadius, fontSize, spacing } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DmStackParamList, MainTabParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DmStackParamList, 'DmListScreen'>;

interface DmParticipant {
  userId: string;
  user: {
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
  };
}

interface DmConversationRow {
  conversation: {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    updatedAt: string;
  };
  participants: DmParticipant[];
  latestMessage: {
    message: {
      bodyMarkdown: string;
      bodyPlaintext?: string;
      createdAt: string;
    };
  } | null;
  unreadCount: number;
  promotedCommunity?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  promotedChannel?: {
    id: string;
    name: string;
  } | null;
}

interface DmConversation {
  conversationId: string;
  conversationType: 'direct' | 'group';
  userId?: string;
  displayName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline?: boolean;
  promotedCommunity?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  promotedChannel?: {
    id: string;
    name: string;
  } | null;
}

function normalizePreviewText(
  message: DmConversationRow['latestMessage'],
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  const preview = message?.message.bodyPlaintext ?? message?.message.bodyMarkdown ?? null;
  if (!preview) return null;
  if (preview === '[encrypted]') {
    return t('dm.encryptedMessagePlaceholder');
  }
  return preview;
}

function formatTimeAgo(
  dateStr: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return t('dm.timeNow');
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function mapConversationRow(
  row: DmConversationRow,
  currentUserId: string | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): DmConversation {
  const isGroup = row.conversation.type === 'group';
  const otherParticipants = row.participants.filter((participant) =>
    currentUserId ? participant.userId !== currentUserId : true,
  );
  const primaryParticipant = otherParticipants[0] ?? row.participants[0];
  const participantNames = otherParticipants.map((participant) => participant.user.displayName);
  const displayName = isGroup
    ? row.conversation.name?.trim() || participantNames.join(', ') || t('dm.groupConversation')
    : primaryParticipant?.user.displayName ||
      primaryParticipant?.user.username ||
      t('common.unknown');

  return {
    conversationId: row.conversation.id,
    conversationType: row.conversation.type,
    userId: isGroup ? undefined : primaryParticipant?.userId,
    displayName,
    lastMessage: normalizePreviewText(row.latestMessage, t),
    lastMessageAt:
      row.latestMessage?.message.createdAt ?? row.conversation.updatedAt ?? null,
    unreadCount: row.unreadCount ?? 0,
    isOnline: isGroup ? false : primaryParticipant?.user.isOnline ?? false,
    promotedCommunity: row.promotedCommunity ?? null,
    promotedChannel: row.promotedChannel ?? null,
  };
}

function navigateToConversationTarget(
  navigation: Props['navigation'],
  tabNavigation: NavigationProp<MainTabParamList> | undefined,
  item: DmConversation,
) {
  if (item.promotedCommunity && item.promotedChannel) {
    tabNavigation?.navigate('HomeTab', {
      screen: 'ChannelScreen',
      params: {
        channelId: item.promotedChannel.id,
        channelName: item.promotedChannel.name,
        communityId: item.promotedCommunity.id,
      },
    });
    return;
  }

  navigation.navigate('DmScreen', {
    conversationId: item.conversationId,
    userId: item.userId,
    displayName: item.displayName,
  });
}

function navigateToConversationHistory(
  navigation: Props['navigation'],
  item: DmConversation,
) {
  navigation.navigate('DmScreen', {
    conversationId: item.conversationId,
    userId: item.userId,
    displayName: item.displayName,
  });
}

export default function DmListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
  const isFocused = useIsFocused();
  const [searchQuery, setSearchQuery] = useState('');
  const [devActionAttempted, setDevActionAttempted] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'encrypted' | 'online'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [sortField, setSortField] = useState<'activity' | 'name' | 'unread'>('activity');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const result = await api<DmConversationRow[] | { conversations: DmConversationRow[] }>(
        '/api/dm/conversations',
      );
      return Array.isArray(result) ? result : result.conversations ?? [];
    },
  });
  const conversations = useMemo(() => {
    const rows = (data ?? []).filter(
      (item): item is DmConversationRow =>
        typeof item === 'object' &&
        item !== null &&
        'conversation' in item &&
        typeof item.conversation?.id === 'string',
    );
    const items = rows.map((row) => mapConversationRow(row, currentUserId, t));
    const filtered = items.filter((item) => {
      if (typeFilter !== 'all' && item.conversationType !== typeFilter) {
        return false;
      }

      if (filterMode === 'unread' && (item.unreadCount ?? 0) === 0) {
        return false;
      }

      if (filterMode === 'encrypted' && item.lastMessage !== t('dm.encryptedMessagePlaceholder')) {
        return false;
      }

      if (filterMode === 'online' && !(item.conversationType === 'direct' && item.isOnline)) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [item.displayName, item.lastMessage ?? ''].join(' ').toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'unread') {
        if (a.unreadCount !== b.unreadCount) {
          return sortOrder === 'newest'
            ? b.unreadCount - a.unreadCount
            : a.unreadCount - b.unreadCount;
        }
      }

      if (sortField === 'name') {
        const left = (a.displayName || '').toLowerCase();
        const right = (b.displayName || '').toLowerCase();
        if (left === right) {
          return 0;
        }
        const comparison = left > right ? 1 : -1;
        return sortOrder === 'newest' ? comparison : -comparison;
      }

      const left = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const right = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return sortOrder === 'newest' ? right - left : left - right;
    });

    const seenConversationIds = new Set<string>();
    return sorted.filter((item) => {
      if (seenConversationIds.has(item.conversationId)) {
        return false;
      }
      seenConversationIds.add(item.conversationId);
      return true;
    });
  }, [currentUserId, data, deferredSearchQuery, filterMode, sortField, sortOrder, t, typeFilter]);

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttempted) return;
    if (!conversations.length) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{ type: 'openFirst' }>(
        'dev-dm-list-action.json',
      );
      if (!action) return;

      try {
        if (action.type !== 'openFirst') {
          throw new Error('Unsupported DM list dev action');
        }

        const first = conversations[0];
        if (!first) {
          throw new Error('No DM conversations available');
        }

        setDevActionAttempted(true);
        navigateToConversationTarget(navigation, tabNavigation, first);
        await writeSimulatorHarnessJson(
          'dev-dm-list-result.json',
          {
            ok: true,
            action: 'openFirst',
            conversationId: first.conversationId,
            displayName: first.displayName,
          },
        );
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-dm-list-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    void runDevAction();
  }, [conversations, devActionAttempted, navigation, tabNavigation]);

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

  return (
    <SafeAreaView style={styles.safeArea} testID="dm-list-screen">
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} testID="dm-list-title">{t('dm.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('dm.listSubtitle')}</Text>
          </View>
          <TouchableOpacity
            style={styles.newDmButton}
            onPress={() => tabNavigation?.navigate('FriendsTab')}
            activeOpacity={0.7}
          >
            <Text style={styles.newDmLabel}>{t('dm.newMessage')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          testID="dm-conversation-list"
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          ListHeaderComponent={
            <View style={styles.searchWrap}>
              <View style={styles.filterRow}>
                {[
                  { key: 'all' as const, label: t('dm.filterAll') },
                  { key: 'unread' as const, label: t('dm.filterUnread') },
                  { key: 'encrypted' as const, label: t('dm.filterEncrypted') },
                  { key: 'online' as const, label: t('dm.filterOnline') },
                ].map((option) => {
                  const active = filterMode === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setFilterMode(option.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.filterRow}>
                {[
                  { key: 'all' as const, label: t('dm.filterAll') },
                  { key: 'direct' as const, label: t('dm.filterDirect') },
                  { key: 'group' as const, label: t('dm.filterGroup') },
                ].map((option) => {
                  const active = typeFilter === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setTypeFilter(option.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.filterRow}>
                {[
                  { key: 'activity' as const, label: t('dm.sortActivity') },
                  { key: 'name' as const, label: t('dm.sortName') },
                  { key: 'unread' as const, label: t('dm.sortUnread') },
                ].map((option) => {
                  const active = sortField === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setSortField(option.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.filterRow}>
                {[
                {
                  key: 'newest' as const,
                  label:
                    sortField === 'name'
                      ? t('settings.sortAsc')
                      : sortField === 'unread'
                        ? t('dm.sortMostUnread')
                        : t('settings.sortNewest'),
                },
                {
                  key: 'oldest' as const,
                  label:
                    sortField === 'name'
                      ? t('settings.sortDesc')
                      : sortField === 'unread'
                        ? t('dm.sortFewestUnread')
                        : t('settings.sortOldest'),
                },
              ].map((option) => {
                  const active = sortOrder === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setSortOrder(option.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('dm.searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isFocused && isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const hasUnread = (item.unreadCount ?? 0) > 0;
            const hasHistory = Boolean(item.lastMessage) || hasUnread;
            const safeDisplayName = item.displayName?.trim() || t('common.unknown');
            const promotedTarget =
              item.promotedCommunity && item.promotedChannel
                ? {
                    community: item.promotedCommunity,
                    channel: item.promotedChannel,
                  }
                : null;
            return (
              <View style={styles.conversationItem}>
                <TouchableOpacity
                  testID={`dm-conversation-row-${item.conversationId}`}
                  style={styles.conversationMainTap}
                  onPress={() => navigateToConversationTarget(navigation, tabNavigation, item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {safeDisplayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    {item.isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={styles.conversationInfo}>
                    <View style={styles.conversationTop}>
                      <View style={styles.displayNameRow}>
                        <Text
                          style={[
                            styles.displayName,
                            hasUnread && !promotedTarget && styles.displayNameUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {safeDisplayName}
                        </Text>
                        {promotedTarget && (
                          <View style={styles.promotedChip}>
                            <Text style={styles.promotedChipText}>{t('dm.promotedListBadge')}</Text>
                          </View>
                        )}
                      </View>
                      {item.lastMessageAt && (
                        <Text
                          style={[
                            styles.time,
                            hasUnread && !promotedTarget && styles.timeUnread,
                          ]}
                        >
                          {formatTimeAgo(item.lastMessageAt, t)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.conversationBottom}>
                      {item.lastMessage ? (
                        <Text
                          style={[
                            styles.lastMessage,
                            hasUnread && !promotedTarget && styles.lastMessageUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {promotedTarget
                            ? `${t('dm.historyBadge')} · ${item.lastMessage}`
                            : item.lastMessage}
                        </Text>
                      ) : (
                        <Text style={styles.lastMessage}>
                          {promotedTarget ? t('dm.promotedNoHistoryPreview') : t('dm.noMessages')}
                        </Text>
                      )}
                      {hasUnread && !promotedTarget && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{item.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                {promotedTarget && (
                  <View style={styles.promotedRowWrap}>
                    <View style={styles.promotedRow}>
                      <Text style={styles.promotedChannelText} numberOfLines={1}>
                        {promotedTarget.community.name} · #{promotedTarget.channel.name}
                      </Text>
                      <View style={styles.promotedActions}>
                        {hasHistory && (
                          <TouchableOpacity
                            style={styles.promotedHistoryButton}
                            onPress={() => navigateToConversationHistory(navigation, item)}
                          >
                            <View style={styles.promotedHistoryButtonContent}>
                              <Text style={styles.promotedHistoryButtonText}>
                                {t('dm.viewHistoryShort')}
                              </Text>
                              {hasUnread && (
                                <View style={styles.promotedHistoryUnreadBadge}>
                                  <Text style={styles.promotedHistoryUnreadText}>{item.unreadCount}</Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.promotedOpenButton}
                          onPress={() => navigateToConversationTarget(navigation, tabNavigation, item)}
                        >
                          <Text style={styles.promotedOpenButtonText}>
                            {t('dm.openCommunityShort')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'\u{2709}\u{FE0F}'}</Text>
              <Text style={styles.emptyText}>
                {deferredSearchQuery
                  ? t('dm.noSearchResults')
                  : typeFilter === 'direct'
                    ? t('dm.noDirectConversations')
                  : typeFilter === 'group'
                      ? t('dm.noGroupConversations')
                  : filterMode === 'unread'
                    ? t('dm.noUnreadConversations')
                    : filterMode === 'encrypted'
                      ? t('dm.noEncryptedConversations')
                      : filterMode === 'online'
                        ? t('dm.noOnlineConversations')
                      : t('dm.noConversations')}
              </Text>
              <Text style={styles.emptyHint}>
                {deferredSearchQuery
                  ? t('dm.noSearchResultsBody')
                  : typeFilter === 'direct'
                    ? t('dm.noDirectConversationsBody')
                  : typeFilter === 'group'
                      ? t('dm.noGroupConversationsBody')
                  : filterMode === 'unread'
                    ? t('dm.noUnreadConversationsBody')
                    : filterMode === 'encrypted'
                      ? t('dm.noEncryptedConversationsBody')
                      : filterMode === 'online'
                        ? t('dm.noOnlineConversationsBody')
                      : t('dm.startConversation')}
              </Text>
            </View>
          }
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyList : undefined
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 4,
    lineHeight: 18,
  },
  newDmButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newDmLabel: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.text,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conversationItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  conversationMainTap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2.5,
    borderColor: colors.bg,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTop: {
    marginBottom: 4,
    gap: 3,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  displayName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  displayNameUnread: {
    fontWeight: '700',
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'right',
  },
  timeUnread: {
    color: colors.primary,
  },
  conversationBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotedChip: {
    borderRadius: 999,
    backgroundColor: '#fff1bf',
    borderWidth: 1,
    borderColor: '#f2d56b',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  promotedChipText: {
    color: '#7a5600',
    fontSize: fontSize.xs - 1,
    fontWeight: '700',
  },
  lastMessage: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    flex: 1,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '500',
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
  promotedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  promotedRowWrap: {
    marginTop: spacing.xs,
    marginLeft: 68,
  },
  promotedChannelText: {
    flex: 1,
    color: '#7a5600',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  promotedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  promotedHistoryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  promotedHistoryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  promotedHistoryButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  promotedHistoryUnreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  promotedHistoryUnreadText: {
    color: colors.white,
    fontSize: fontSize.xs - 1,
    fontWeight: '700',
  },
  promotedOpenButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f2d56b',
    backgroundColor: '#fff7d8',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  promotedOpenButtonText: {
    color: '#7a5600',
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
    marginTop: spacing.sm,
  },
});
