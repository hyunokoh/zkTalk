import React, { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'ChannelPolls'>;

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  voted: boolean;
}

interface Poll {
  id: string;
  channelId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  anonymous: boolean;
  multipleChoice: boolean;
  expiresAt: string | null;
  closed: boolean;
  createdAt: string;
}

interface ChannelPermissions {
  canPostMessage: boolean;
}

export default function ChannelPollsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [voteFilter, setVoteFilter] = useState<'all' | 'voted'>('all');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'anonymous'>('all');
  const [choiceFilter, setChoiceFilter] = useState<'all' | 'multiple'>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'question' | 'votes'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const devPollActionAttemptedRef = useRef(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const permissionsQuery = useQuery({
    queryKey: ['channel-me-permissions', route.params.channelId],
    queryFn: () =>
      api<{ permissions: ChannelPermissions }>(
        `/api/channels/${route.params.channelId}/me-permissions`,
      ),
  });

  const pollsQuery = useQuery({
    queryKey: ['polls', route.params.channelId],
    queryFn: () =>
      api<{ polls: Poll[] }>(`/api/channels/${route.params.channelId}/polls`),
  });

  const canCreatePoll = permissionsQuery.data?.permissions.canPostMessage ?? true;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        canCreatePoll ? (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('CreatePoll', {
                channelId: route.params.channelId,
                channelName: route.params.channelName,
              })
            }
            hitSlop={8}
          >
            <Text style={styles.headerAction}>+</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [canCreatePoll, navigation, route.params.channelId, route.params.channelName]);

  const voteMutation = useMutation({
    mutationFn: ({
      pollId,
      optionId,
      voted,
    }: {
      pollId: string;
      optionId: string;
      voted: boolean;
    }) =>
      voted
        ? api(`/api/polls/${pollId}/vote/${optionId}`, { method: 'DELETE' })
        : api(`/api/polls/${pollId}/vote`, {
            method: 'POST',
            body: { optionId },
          }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['polls', route.params.channelId] }),
        queryClient.invalidateQueries({ queryKey: ['polls-by-message', route.params.channelId] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('poll.voteFailed'),
      );
    },
  });

  const polls = pollsQuery.data?.polls ?? [];
  const statusTabs = [
    { key: 'all' as const, label: t('poll.filterAll') },
    { key: 'open' as const, label: t('poll.open') },
    { key: 'closed' as const, label: t('poll.closed') },
  ];
  const voteTabs = [
    { key: 'all' as const, label: t('poll.filterAll') },
    { key: 'voted' as const, label: t('poll.filterVoted') },
  ];
  const privacyTabs = [
    { key: 'all' as const, label: t('poll.filterAll') },
    { key: 'anonymous' as const, label: t('poll.filterAnonymous') },
  ];
  const choiceTabs = [
    { key: 'all' as const, label: t('poll.filterAll') },
    { key: 'multiple' as const, label: t('poll.filterMultiple') },
  ];
  const filteredPolls = useMemo(() => {
    const filtered = polls.filter((poll) => {
      const isExpired = poll.closed || (poll.expiresAt && new Date(poll.expiresAt) < new Date());
      const hasMyVote = poll.options.some((option) => option.voted);

      if (statusFilter === 'open' && isExpired) {
        return false;
      }

      if (statusFilter === 'closed' && !isExpired) {
        return false;
      }

      if (voteFilter === 'voted' && !hasMyVote) {
        return false;
      }

      if (privacyFilter === 'anonymous' && !poll.anonymous) {
        return false;
      }

      if (choiceFilter === 'multiple' && !poll.multipleChoice) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      return poll.question.toLowerCase().includes(deferredSearchQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortField === 'question') {
        const left = a.question.toLocaleLowerCase();
        const right = b.question.toLocaleLowerCase();
        return sortOrder === 'newest'
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }

      if (sortField === 'votes') {
        return sortOrder === 'newest'
          ? b.totalVotes - a.totalVotes
          : a.totalVotes - b.totalVotes;
      }

      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [
    choiceFilter,
    deferredSearchQuery,
    polls,
    privacyFilter,
    sortField,
    sortOrder,
    statusFilter,
    voteFilter,
  ]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devPollActionAttemptedRef.current) {
      return;
    }
    if (pollsQuery.isLoading || voteMutation.isPending) {
      return;
    }

    async function runDevPollAction() {
      const parsed = await readSimulatorHarnessJson<
        | {
            action?: 'vote' | 'unvote';
            pollId?: string;
            optionId?: string;
            optionIndex?: number;
          }
        | undefined
      >('dev-poll-action.json');
      if (!parsed) {
        return;
      }

      devPollActionAttemptedRef.current = true;

      const poll =
        (parsed?.pollId ? polls.find((item) => item.id === parsed?.pollId) : null) ?? polls[0];
      const option =
        (parsed?.optionId
          ? poll?.options.find((item) => item.id === parsed.optionId)
          : null) ?? (typeof parsed?.optionIndex === 'number' ? poll?.options[parsed.optionIndex] : poll?.options[0]);

      if (!poll || !option) {
        await deleteSimulatorHarnessFile('dev-poll-action.json');
        return;
      }

      const shouldUnvote = parsed?.action === 'unvote';
      const voted = shouldUnvote ? true : option.voted;

      await deleteSimulatorHarnessFile('dev-poll-action.json');

      voteMutation.mutate({
        pollId: poll.id,
        optionId: option.id,
        voted,
      });
    }

    void runDevPollAction();
  }, [polls, pollsQuery.isLoading, voteMutation]);

  if (pollsQuery.isLoading) {
    return <LoadingSpinner text={t('poll.loading')} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredPolls}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={pollsQuery.isRefetching}
            onRefresh={pollsQuery.refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <View style={styles.filterRow}>
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setStatusFilter(tab.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.filterRow}>
              {voteTabs.map((tab) => {
                const active = voteFilter === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setVoteFilter(tab.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.filterRow}>
              {privacyTabs.map((tab) => {
                const active = privacyFilter === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setPrivacyFilter(tab.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.filterRow}>
              {choiceTabs.map((tab) => {
                const active = choiceFilter === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setChoiceFilter(tab.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.filterRow}>
              {[
                { key: 'createdAt' as const, label: t('poll.sortCreatedAt') },
                { key: 'question' as const, label: t('poll.sortQuestion') },
                { key: 'votes' as const, label: t('poll.sortVotes') },
              ].map((tab) => {
                const active = sortField === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setSortField(tab.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
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
                    sortField === 'question'
                      ? t('settings.sortAsc')
                      : sortField === 'votes'
                        ? t('poll.sortHighestVotes')
                        : t('settings.sortNewest'),
                },
                {
                  key: 'oldest' as const,
                  label:
                    sortField === 'question'
                      ? t('settings.sortDesc')
                      : sortField === 'votes'
                        ? t('poll.sortLowestVotes')
                        : t('settings.sortOldest'),
                },
              ].map((tab) => {
                const active = sortOrder === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setSortOrder(tab.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('poll.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        }
        renderItem={({ item }) => {
          const isExpired = item.closed || (item.expiresAt && new Date(item.expiresAt) < new Date());
          const maxVotes = Math.max(...item.options.map((option) => option.voteCount), 1);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.question}>{item.question}</Text>
                {isExpired ? (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>{t('poll.closed')}</Text>
                  </View>
                ) : null}
              </View>

              {item.options.map((option) => {
                const pct =
                  item.totalVotes > 0
                    ? Math.round((option.voteCount / item.totalVotes) * 100)
                    : 0;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionButton,
                      option.voted && styles.optionButtonActive,
                      isExpired && styles.optionDisabled,
                    ]}
                    onPress={() =>
                      voteMutation.mutate({
                        pollId: item.id,
                        optionId: option.id,
                        voted: option.voted,
                      })
                    }
                    disabled={isExpired || voteMutation.isPending}
                  >
                    <View
                      style={[
                        styles.optionFill,
                        option.voted ? styles.optionFillActive : styles.optionFillInactive,
                        { width: `${pct}%` },
                      ]}
                    />
                    <View style={styles.optionRow}>
                      <Text
                        style={[
                          styles.optionText,
                          option.voted && styles.optionTextActive,
                        ]}
                      >
                        {option.text}
                      </Text>
                      <Text style={styles.optionMeta}>
                        {pct}% ({option.voteCount})
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.footerText}>
                {t('poll.totalVotes', { count: item.totalVotes })}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={'\u{1F5F3}'}
            title={
              deferredSearchQuery
                ? t('poll.noSearchResults')
                : choiceFilter === 'multiple'
                  ? t('poll.noMultiplePolls')
                : privacyFilter === 'anonymous'
                  ? t('poll.noAnonymousPolls')
                : voteFilter === 'voted'
                  ? t('poll.noVotedPolls')
                  : t('poll.empty')
            }
            subtitle={
              deferredSearchQuery
                ? t('poll.noSearchResultsBody')
                : choiceFilter === 'multiple'
                  ? t('poll.noMultiplePollsBody')
                : privacyFilter === 'anonymous'
                  ? t('poll.noAnonymousPollsBody')
                : voteFilter === 'voted'
                  ? t('poll.noVotedPollsBody')
                  : t('poll.emptyBody')
            }
          />
        }
        contentContainerStyle={[
          styles.content,
          filteredPolls.length === 0 && styles.emptyContent,
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerAction: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 28,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchWrap: {
    marginBottom: spacing.md,
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
    borderColor: colors.border,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  question: {
    flex: 1,
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  closedBadge: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  closedBadgeText: {
    color: colors.textMuted,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  optionButton: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    minHeight: 46,
    justifyContent: 'center',
  },
  optionButtonActive: {
    borderColor: colors.primary,
  },
  optionDisabled: {
    opacity: 0.8,
  },
  optionFill: {
    position: 'absolute',
    inset: 0,
  },
  optionFillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.24)',
  },
  optionFillInactive: {
    backgroundColor: 'rgba(55, 65, 81, 0.45)',
  },
  optionRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.primaryLight,
  },
  optionMeta: {
    color: colors.textSecondary,
    fontSize: fs.sm,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: spacing.md,
  },
});
