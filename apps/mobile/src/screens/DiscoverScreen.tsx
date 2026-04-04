import React, { useState, useCallback, useRef, useDeferredValue } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getVersionedImageUrl } from '../lib/community-image';
import { useTranslation } from '../lib/i18n';
import {
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, borderRadius, fontSize, spacing } from '../theme';
import type { NavigationProp } from '@react-navigation/native';
import type { MainTabParamList } from '../navigation/types';

interface DiscoverCommunity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  updatedAt?: string;
  memberCount: number;
  isJoined: boolean;
}

const ICON_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
];

function getIconColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

function CommunityCard({
  community,
  onPrimaryAction,
  isJoining,
  t,
}: {
  community: DiscoverCommunity;
  onPrimaryAction: () => void;
  isJoining: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const iconBg = getIconColor(community.name);
  const iconUrl = getVersionedImageUrl(community.iconUrl, community.updatedAt);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {iconUrl ? (
          <Image
            source={{ uri: iconUrl }}
            style={styles.communityIcon}
          />
        ) : (
          <View style={[styles.communityIcon, { backgroundColor: iconBg }]}>
            <Text style={styles.communityInitial}>
              {community.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.communityMeta}>
          <Text style={styles.communityName}>{community.name}</Text>
          <Text style={styles.memberCount}>
            {community.memberCount === 1
              ? t('discover.member', { count: community.memberCount })
              : t('discover.members', { count: community.memberCount })}
          </Text>
        </View>
      </View>

      {community.description && (
        <Text style={styles.communityDescription} numberOfLines={2}>
          {community.description}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.joinButton,
          community.isJoined && styles.joinedButton,
          isJoining && styles.joiningButton,
        ]}
        onPress={onPrimaryAction}
        disabled={isJoining}
      >
        {isJoining ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text
            style={[
              styles.joinButtonText,
              community.isJoined && styles.joinedButtonText,
            ]}
          >
            {community.isJoined ? t('discover.openCommunity') : t('discover.join')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [joinFilter, setJoinFilter] = useState<'all' | 'joined' | 'not_joined'>('all');
  const [sortField, setSortField] = useState<'name' | 'memberCount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const devActionAttemptedRef = useRef(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchRef = useRef('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const { data, isLoading, refetch, isRefetching, isFetching } = useQuery({
    queryKey: ['discover', deferredSearchQuery],
    queryFn: () => {
      const params = deferredSearchQuery
        ? `?q=${encodeURIComponent(deferredSearchQuery)}`
        : '';
      return api<{ communities: DiscoverCommunity[] }>(`/api/discover${params}`);
    },
  });

  const joinMutation = useMutation({
    mutationFn: (communityId: string) =>
      api(`/api/communities/${communityId}/join`, { method: 'POST' }),
    onMutate: (communityId) => setJoiningId(communityId),
    onSuccess: (_result, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      refetch();
      Alert.alert(
        t('discover.joinedTitle'),
        t('discover.joinedBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('discover.openCommunity'),
            onPress: () => {
              navigation.navigate('HomeTab', {
                screen: 'HomeScreen',
                params: { selectedCommunityId: communityId },
              });
            },
          },
        ],
      );
    },
    onError: (err) => {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('discover.joinFailed'));
    },
    onSettled: () => setJoiningId(null),
  });

  const handleSearch = useCallback((e: { nativeEvent: { text: string } }) => {
    const text = e.nativeEvent.text;
    searchRef.current = text;
    setSearchQuery(text);
  }, []);

  const handleOpenCommunity = useCallback(
    (communityId: string) => {
      navigation.navigate('HomeTab', {
        screen: 'HomeScreen',
        params: { selectedCommunityId: communityId },
      });
    },
    [navigation],
  );

  const communities = data?.communities ?? [];
  const filteredCommunities = communities.filter((community) => {
    if (joinFilter === 'joined') {
      return community.isJoined;
    }

    if (joinFilter === 'not_joined') {
      return !community.isJoined;
    }

    return true;
  });
  const sortedCommunities = [...filteredCommunities].sort((a, b) => {
    const comparison =
      sortField === 'memberCount'
        ? a.memberCount - b.memberCount
        : a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base',
            numeric: true,
          });

    return sortOrder === 'asc' ? comparison : -comparison;
  });
  const isSearching = searchQuery !== deferredSearchQuery || isFetching;

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) return;
    if (!data?.communities) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{
        type: 'join';
        communityId?: string;
        slug?: string;
        name?: string;
      }>('dev-discover-action.json');
      if (!action) return;

      try {
        if (action.type !== 'join') {
          throw new Error('Unsupported discover dev action');
        }

        const communities = data?.communities ?? [];
        let target = communities.find((community) => {
          if (action.communityId && community.id === action.communityId) return true;
          if (action.slug && community.slug === action.slug) return true;
          if (action.name && community.name === action.name) return true;
          return false;
        });

        if (!target && action.name) {
          const searchResult = await api<{ communities: DiscoverCommunity[] }>(
            `/api/discover?q=${encodeURIComponent(action.name)}`,
          );
          target = searchResult.communities.find((community) => community.name === action.name);
        }

        if (!target) {
          throw new Error('No matching discover community found');
        }

        devActionAttemptedRef.current = true;

        if (target.isJoined) {
          handleOpenCommunity(target.id);
          await writeSimulatorHarnessJson(
            'dev-discover-result.json',
            {
              ok: true,
              action: 'open',
              communityId: target.id,
              slug: target.slug,
              name: target.name,
            },
          );
          return;
        }

        await joinMutation.mutateAsync(target.id);
        await queryClient.invalidateQueries({ queryKey: ['communities'] });
        await queryClient.invalidateQueries({ queryKey: ['discover'] });
        await writeSimulatorHarnessJson(
          'dev-discover-result.json',
          {
            ok: true,
            action: 'join',
            communityId: target.id,
            slug: target.slug,
            name: target.name,
            },
        );
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-discover-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    void runDevAction();
  }, [data?.communities, handleOpenCommunity, joinMutation, queryClient]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t('discover.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('discover.listSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('discover.search')}
            placeholderTextColor={colors.textMuted}
            onChange={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isSearching && (
            <ActivityIndicator
              size="small"
              color={colors.textMuted}
              style={styles.searchSpinner}
            />
          )}
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                searchRef.current = '';
                searchInputRef.current?.clear();
              }}
            >
              <Text style={styles.clearButton}>{'\u{2715}'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Community list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedCommunities}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.filtersSection}>
              <View style={styles.filterRow}>
                {[
                  { key: 'all' as const, label: t('discover.filterAll') },
                  { key: 'joined' as const, label: t('discover.filterJoined') },
                  { key: 'not_joined' as const, label: t('discover.filterNotJoined') },
                ].map((option) => {
                  const active = joinFilter === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setJoinFilter(option.key)}
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
                  { key: 'name' as const, label: t('discover.sortName') },
                  { key: 'memberCount' as const, label: t('discover.sortMembers') },
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
                    key: 'asc' as const,
                    label: sortField === 'memberCount' ? t('discover.sortFewest') : t('settings.sortAsc'),
                  },
                  {
                    key: 'desc' as const,
                    label: sortField === 'memberCount' ? t('discover.sortMost') : t('settings.sortDesc'),
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
          renderItem={({ item }) => (
            <CommunityCard
              community={item}
              onPrimaryAction={() => {
                if (item.isJoined) {
                  handleOpenCommunity(item.id);
                  return;
                }
                joinMutation.mutate(item.id);
              }}
              isJoining={joiningId === item.id}
              t={t}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>{'\u{1F9ED}'}</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? t('discover.noResults')
                  : t('discover.noDiscover')}
              </Text>
              {searchQuery ? (
                <Text style={styles.emptyHint}>{t('discover.tryDifferent')}</Text>
              ) : (
                <Text style={styles.emptyHint}>{t('discover.checkLater')}</Text>
              )}
            </View>
          }
          contentContainerStyle={
            sortedCommunities.length === 0
              ? [styles.listContent, styles.emptyList]
              : styles.listContent
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerCopy: {
    flex: 1,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    color: colors.textSecondary,
    fontSize: 16,
    padding: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  filtersSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  communityMeta: {
    flex: 1,
  },
  communityName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  memberCount: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  communityDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  joinedButton: {
    backgroundColor: colors.surfaceLight,
  },
  joiningButton: {
    opacity: 0.7,
  },
  joinButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  joinedButtonText: {
    color: colors.textSecondary,
  },
  emptyList: {
    flex: 1,
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
