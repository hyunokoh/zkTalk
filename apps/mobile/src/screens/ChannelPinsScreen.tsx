import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, MainTabParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ChannelPins'>;

interface PinRow {
  pin: {
    id: string;
    messageId: string;
    pinnedAt: string;
  };
  message: {
    id: string;
    bodyPlaintext: string;
    bodyMarkdown?: string;
    createdAt: string;
  };
  author: {
    displayName: string;
    username: string;
  };
}

export default function ChannelPinsScreen({ route }: Props) {
  const { channelId } = route.params;
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'encrypted'>('all');
  const [sortField, setSortField] = useState<'pinnedAt' | 'author'>('pinnedAt');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['channel-pins', channelId],
    queryFn: () => api<{ pins: PinRow[] }>(`/api/channels/${channelId}/pins`),
  });

  const unpinMutation = useMutation({
    mutationFn: (messageId: string) =>
      api(`/api/channels/${channelId}/pins/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pins', channelId] });
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.unpinFailed'),
      );
    },
  });

  const handleOpenMessage = useCallback(
    (messageId: string) => {
      navigation.navigate('HomeTab', {
        screen: 'ChannelScreen',
        params: {
          channelId,
          communityId: route.params.communityId,
          channelName: route.params.channelName,
          focusMessageId: messageId,
        },
      });
    },
    [channelId, navigation, route.params.channelName],
  );

  const pins = data?.pins ?? [];
  const availableAuthorFilters = useMemo(
    () =>
      Array.from(
        new Set(pins.map((item) => item.author.displayName || item.author.username).filter(Boolean)),
      ) as string[],
    [pins],
  );
  const filteredPins = useMemo(() => {
    const filtered = pins.filter((item) => {
      const authorLabel = item.author.displayName || item.author.username;
      const preview = item.message.bodyPlaintext || item.message.bodyMarkdown || '';
      const displayPreview =
        preview === '[encrypted]' ? t('dm.encryptedMessagePlaceholder') : preview;

      if (selectedAuthorFilter && authorLabel !== selectedAuthorFilter) {
        return false;
      }

      if (messageFilter === 'encrypted' && displayPreview !== t('dm.encryptedMessagePlaceholder')) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [item.author.displayName, item.author.username, displayPreview]
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

      const left = new Date(a.pin.pinnedAt).getTime();
      const right = new Date(b.pin.pinnedAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [deferredSearchQuery, messageFilter, pins, selectedAuthorFilter, sortField, sortOrder, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || isLoading) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{ type?: 'openFirst' | 'unpinFirst' }>(
        'dev-channel-pins-action.json',
      );
      if (!action) return;

      try {
        if (action.type === 'openFirst' && filteredPins[0]) {
          handleOpenMessage(filteredPins[0].message.id);
        }
        if (action.type === 'unpinFirst' && filteredPins[0]) {
          unpinMutation.mutate(filteredPins[0].message.id);
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-channel-pins-action.json');
      }
    }

    void runDevAction();
  }, [filteredPins, handleOpenMessage, isLoading, unpinMutation]);

  if (isLoading) {
    return <LoadingSpinner text={t('channel.pinsLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredPins}
        keyExtractor={(item) => item.pin.id}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <View style={styles.filterRow}>
              {[
                { key: 'all' as const, label: t('channel.pinsFilterAll') },
                { key: 'encrypted' as const, label: t('channel.pinsFilterEncrypted') },
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
                  {t('channel.pinsFilterAll')}
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
              placeholder={t('channel.pinsSearchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.filterRow}>
              {[
                { key: 'pinnedAt' as const, label: t('channel.pinsSortPinnedTime') },
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
          const preview = item.message.bodyPlaintext || item.message.bodyMarkdown || t('message.deleted');
          const displayPreview = preview === '[encrypted]'
            ? t('dm.encryptedMessagePlaceholder')
            : preview;
          const isBusy =
            unpinMutation.isPending && unpinMutation.variables === item.message.id;

          return (
            <View style={styles.card}>
              <View style={styles.metaRow}>
                <View style={styles.authorWrap}>
                  <Text style={styles.author}>{item.author.displayName}</Text>
                  <Text style={styles.username}>@{item.author.username}</Text>
                </View>
                <Text style={styles.timestamp}>
                  {new Date(item.pin.pinnedAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={4}>
                {displayPreview}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => handleOpenMessage(item.message.id)}
                >
                  <Text style={styles.openButtonText}>{t('settings.bookmarksOpen')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.unpinButton}
                  onPress={() => unpinMutation.mutate(item.message.id)}
                  disabled={isBusy}
                >
                  <Text style={styles.unpinButtonText}>
                    {isBusy ? t('common.loading') : t('channel.unpin')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={'\u{1F4CC}'}
              title={
                deferredSearchQuery
                  ? t('channel.pinsNoSearchResults')
                  : messageFilter === 'encrypted'
                    ? t('channel.pinsNoEncrypted')
                    : t('channel.pinsEmpty')
              }
              subtitle={
                deferredSearchQuery
                  ? t('channel.pinsNoSearchResultsBody')
                  : messageFilter === 'encrypted'
                    ? t('channel.pinsNoEncryptedBody')
                    : t('channel.pinsHint')
              }
            />
          </View>
        }
        contentContainerStyle={filteredPins.length === 0 ? styles.emptyList : styles.list}
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
    paddingVertical: spacing.md,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  authorWrap: {
    flex: 1,
  },
  author: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '600',
  },
  username: {
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
  unpinButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  unpinButtonText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
});
