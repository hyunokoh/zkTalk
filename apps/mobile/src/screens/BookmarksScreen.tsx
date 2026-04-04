import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import type { MainTabParamList } from '../navigation/types';

interface BookmarkRow {
  bookmark: {
    id: string;
    messageId: string;
    createdAt: string;
  };
  message: {
    id: string;
    communityId: string | null;
    channelId: string | null;
    bodyPlaintext: string;
    bodyMarkdown?: string;
    createdAt: string;
  };
  author: {
    displayName: string;
    username: string;
  };
}

function normalizeBookmarkPreview(
  row: BookmarkRow,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const preview = row.message.bodyPlaintext || row.message.bodyMarkdown || '';
  if (preview === '[encrypted]') {
    return t('dm.encryptedMessagePlaceholder');
  }
  return preview;
}

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'encrypted'>('all');
  const [sortField, setSortField] = useState<'savedAt' | 'author'>('savedAt');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const devBookmarkActionAttemptedRef = useRef(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => api<{ bookmarks: BookmarkRow[] }>('/api/bookmarks'),
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (messageId: string) => api(`/api/bookmarks/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.bookmarksRemoveFailed'),
      );
    },
  });

  const handleOpenBookmark = useCallback(
    (row: BookmarkRow) => {
      if (!row.message.channelId) {
        Alert.alert(t('common.error'), t('settings.bookmarksOpenFailed'));
        return;
      }

      navigation.navigate('HomeTab', {
        screen: 'ChannelScreen',
        params: {
          communityId: row.message.communityId ?? undefined,
          channelId: row.message.channelId,
          focusMessageId: row.message.id,
        },
      });
    },
    [navigation, t],
  );

  const bookmarks = data?.bookmarks ?? [];
  const availableAuthorFilters = useMemo(
    () =>
      Array.from(
        new Set(
          bookmarks.map((item) => item.author.displayName || item.author.username).filter(Boolean),
        ),
      ) as string[],
    [bookmarks],
  );
  const filteredBookmarks = useMemo(() => {
    const filtered = bookmarks.filter((item) => {
      const authorLabel = item.author.displayName || item.author.username;
      const preview = normalizeBookmarkPreview(item, t);

      if (selectedAuthorFilter && authorLabel !== selectedAuthorFilter) {
        return false;
      }

      if (messageFilter === 'encrypted' && preview !== t('dm.encryptedMessagePlaceholder')) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [
        item.author.displayName,
        item.author.username,
        preview,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortField === 'author') {
        const left = (a.author.displayName || a.author.username || '').toLocaleLowerCase();
        const right = (b.author.displayName || b.author.username || '').toLocaleLowerCase();
        return sortOrder === 'newest'
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }

      const left = new Date(a.bookmark.createdAt).getTime();
      const right = new Date(b.bookmark.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [bookmarks, deferredSearchQuery, messageFilter, selectedAuthorFilter, sortField, sortOrder, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devBookmarkActionAttemptedRef.current) {
      return;
    }
    if (filteredBookmarks.length === 0) {
      return;
    }

    async function runDevBookmarkAction() {
      const parsed = await readSimulatorHarnessJson<{
        action?: 'open';
        messageId?: string;
      }>('dev-bookmark-action.json');
      if (!parsed) {
        return;
      }

      devBookmarkActionAttemptedRef.current = true;

      await deleteSimulatorHarnessFile('dev-bookmark-action.json');

      const targetRow =
        (parsed?.messageId
          ? filteredBookmarks.find((item) => item.message.id === parsed.messageId)
          : null) ?? filteredBookmarks[0];

      if (!targetRow) {
        return;
      }

      handleOpenBookmark(targetRow);
    }

    void runDevBookmarkAction();
  }, [filteredBookmarks, handleOpenBookmark]);

  if (isLoading) {
    return <LoadingSpinner text={t('settings.bookmarksLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredBookmarks}
        keyExtractor={(item) => item.bookmark.id}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <View style={styles.filterRow}>
              {[
                { key: 'all' as const, label: t('settings.bookmarksFilterAll') },
                { key: 'encrypted' as const, label: t('settings.bookmarksFilterEncrypted') },
              ].map((option) => {
                const active = messageFilter === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setMessageFilter(option.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedAuthorFilter === null && styles.filterChipActive,
                ]}
                onPress={() => setSelectedAuthorFilter(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedAuthorFilter === null && styles.filterChipTextActive,
                  ]}
                >
                  {t('settings.bookmarksFilterAll')}
                </Text>
              </TouchableOpacity>
              {availableAuthorFilters.map((authorName) => {
                const active = selectedAuthorFilter === authorName;

                return (
                  <TouchableOpacity
                    key={authorName}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setSelectedAuthorFilter(authorName)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {authorName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('settings.bookmarksSearchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.filterRow}>
              {[
                { key: 'savedAt' as const, label: t('settings.sortSavedTime') },
                { key: 'author' as const, label: t('settings.sortAuthor') },
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
                  label: sortField === 'author' ? t('settings.sortAsc') : t('settings.sortNewest'),
                },
                {
                  key: 'oldest' as const,
                  label: sortField === 'author' ? t('settings.sortDesc') : t('settings.sortOldest'),
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
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const preview = normalizeBookmarkPreview(item, t);
          const isRemoving =
            removeBookmarkMutation.isPending && removeBookmarkMutation.variables === item.message.id;

          return (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text style={styles.author}>{item.author.displayName}</Text>
                  <Text style={styles.meta}>@{item.author.username}</Text>
                </View>
                <Text style={styles.timestamp}>
                  {new Date(item.bookmark.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={3}>
                {preview || t('message.deleted')}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => handleOpenBookmark(item)}
                >
                  <Text style={styles.openButtonText}>{t('settings.bookmarksOpen')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBookmarkMutation.mutate(item.message.id)}
                  disabled={isRemoving}
                >
                  <Text style={styles.removeButtonText}>
                    {isRemoving ? t('common.loading') : t('settings.bookmarksRemove')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="bookmark"
              title={
                deferredSearchQuery
                  ? t('settings.bookmarksNoSearchResults')
                  : messageFilter === 'encrypted'
                    ? t('settings.bookmarksNoEncrypted')
                    : t('settings.bookmarksEmpty')
              }
              subtitle={
                deferredSearchQuery
                  ? t('settings.bookmarksNoSearchResultsBody')
                  : messageFilter === 'encrypted'
                    ? t('settings.bookmarksNoEncryptedBody')
                    : t('settings.bookmarksHint')
              }
            />
          </View>
        }
        contentContainerStyle={filteredBookmarks.length === 0 ? styles.emptyList : styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: fs.sm,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: fs.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  author: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '600',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: 2,
  },
  timestamp: {
    color: colors.textDim,
    fontSize: fs.xs,
  },
  preview: {
    color: colors.textSecondary,
    fontSize: fs.base,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  openButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  openButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
});
