import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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

type Props = NativeStackScreenProps<HomeStackParamList, 'CommunityReports'>;

type ReportStatus = 'open' | 'resolved' | 'dismissed';

interface ReportRow {
  report: {
    id: string;
    communityId: string;
    messageId: string | null;
    reportedUserId: string | null;
    reporterUserId: string;
    reasonCode: string;
    reasonText: string | null;
    status: ReportStatus;
    createdAt: string;
    resolvedByUserId: string | null;
  };
  message: {
    id: string | null;
    channelId: string | null;
    authorUserId: string | null;
    bodyPlaintext: string | null;
    isDeleted: boolean | null;
    isEncrypted: boolean | null;
  } | null;
  reporter: {
    id: string;
    displayName: string;
    username: string;
  } | null;
}

function getReasonLabel(
  reasonCode: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  switch (reasonCode) {
    case 'spam':
      return t('message.reportSpam');
    case 'harassment':
      return t('message.reportHarassment');
    case 'inappropriate':
      return t('message.reportInappropriate');
    default:
      return reasonCode;
  }
}

export default function CommunityReportsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'withMessage'>('all');
  const [sortField, setSortField] = useState<'reportedAt' | 'reporter'>('reportedAt');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['community-reports', route.params.communityId, status],
    queryFn: () =>
      api<{ reports: ReportRow[] }>(
        `/api/communities/${route.params.communityId}/reports?status=${encodeURIComponent(status)}`,
      ),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ reportId, nextStatus }: { reportId: string; nextStatus: 'resolved' | 'dismissed' }) =>
      api(`/api/reports/${reportId}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community-reports', route.params.communityId],
      });
    },
    onError: (mutationError) => {
      Alert.alert(
        t('common.error'),
        mutationError instanceof Error
          ? mutationError.message
          : t('community.reportsResolveFailed'),
      );
    },
  });

  const tabs = useMemo(
    () => [
      { key: 'open' as const, label: t('community.reportsOpen') },
      { key: 'resolved' as const, label: t('community.reportsResolved') },
      { key: 'dismissed' as const, label: t('community.reportsDismissed') },
    ],
    [t],
  );

  const handleResolve = useCallback(
    (reportId: string, nextStatus: 'resolved' | 'dismissed') => {
      resolveMutation.mutate({ reportId, nextStatus });
    },
    [resolveMutation],
  );

  const reports = data?.reports ?? [];
  const availableReasonFilters = useMemo(() => {
    const reasonCodes = Array.from(new Set(reports.map((item) => item.report.reasonCode)));
    return reasonCodes.sort((a, b) =>
      getReasonLabel(a, t).localeCompare(getReasonLabel(b, t)),
    );
  }, [reports, t]);
  const filteredReports = useMemo(() => {
    const filtered = reports.filter((item) => {
      if (messageFilter === 'withMessage' && (!item.message?.id || !item.message.channelId)) {
        return false;
      }

      if (selectedReasonFilter && item.report.reasonCode !== selectedReasonFilter) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const preview = item.message?.isDeleted
        ? t('message.deleted')
        : item.message?.isEncrypted
          ? t('dm.encryptedMessagePlaceholder')
          : (item.message?.bodyPlaintext || item.report.reasonText || '');
      const haystack = [
        getReasonLabel(item.report.reasonCode, t),
        item.report.reasonText ?? '',
        item.reporter?.displayName ?? '',
        item.reporter?.username ?? '',
        preview,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortField === 'reporter') {
        const left = (a.reporter?.displayName || a.reporter?.username || '').toLocaleLowerCase();
        const right = (b.reporter?.displayName || b.reporter?.username || '').toLocaleLowerCase();
        return sortOrder === 'newest'
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }

      const left = new Date(a.report.createdAt).getTime();
      const right = new Date(b.report.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [deferredSearchQuery, messageFilter, reports, selectedReasonFilter, sortField, sortOrder, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || isLoading) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{ type?: 'resolveOpen' }>(
        'dev-community-reports-action.json',
      );
      if (!action) return;

      try {
        if (action.type !== 'resolveOpen') return;

        const target = reports.find((item) => item.report.status === 'open');
        if (target) {
          handleResolve(target.report.id, 'resolved');
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-community-reports-action.json');
      }
    }

    void runDevAction();
  }, [handleResolve, isLoading, reports]);

  if (isLoading) {
    return <LoadingSpinner text={t('community.reportsLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {isError ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="🛡️"
            title={t('community.reportsUnavailable')}
            subtitle={error instanceof Error ? error.message : t('community.reportsUnavailableHint')}
          />
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.report.id}
          ListHeaderComponent={
            <View style={styles.headerFilters}>
              <View style={styles.tabs}>
                {tabs.map((tab) => {
                  const active = tab.key === status;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.tabButton, active && styles.tabButtonActive]}
                      onPress={() => setStatus(tab.key)}
                    >
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('community.reportsSearchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              <View style={styles.reasonFilterWrap}>
                {[
                  { key: 'reportedAt' as const, label: t('community.reportsSortReportedAt') },
                  { key: 'reporter' as const, label: t('community.reportsSortReporter') },
                ].map((option) => {
                  const selected = sortField === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]}
                      onPress={() => setSortField(option.key)}
                    >
                      <Text
                        style={[
                          styles.reasonFilterChipText,
                          selected && styles.reasonFilterChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.reasonFilterWrap}>
                {[
                  {
                    key: 'newest' as const,
                    label: sortField === 'reporter' ? t('settings.sortAsc') : t('settings.sortNewest'),
                  },
                  {
                    key: 'oldest' as const,
                    label: sortField === 'reporter' ? t('settings.sortDesc') : t('settings.sortOldest'),
                  },
                ].map((option) => {
                  const selected = sortOrder === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]}
                      onPress={() => setSortOrder(option.key)}
                    >
                      <Text
                        style={[
                          styles.reasonFilterChipText,
                          selected && styles.reasonFilterChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.reasonFilterWrap}>
                {[
                  { key: 'all' as const, label: t('community.reportsFilterAll') },
                  { key: 'withMessage' as const, label: t('community.reportsFilterWithMessage') },
                ].map((option) => {
                  const selected = messageFilter === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]}
                      onPress={() => setMessageFilter(option.key)}
                    >
                      <Text
                        style={[
                          styles.reasonFilterChipText,
                          selected && styles.reasonFilterChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.reasonFilterWrap}>
                <TouchableOpacity
                  style={[
                    styles.reasonFilterChip,
                    selectedReasonFilter === null && styles.reasonFilterChipSelected,
                  ]}
                  onPress={() => setSelectedReasonFilter(null)}
                >
                  <Text
                    style={[
                      styles.reasonFilterChipText,
                      selectedReasonFilter === null && styles.reasonFilterChipTextSelected,
                    ]}
                  >
                    {t('community.reportsFilterAll')}
                  </Text>
                </TouchableOpacity>
                {availableReasonFilters.map((reasonCode) => {
                  const selected = selectedReasonFilter === reasonCode;

                  return (
                    <TouchableOpacity
                      key={reasonCode}
                      style={[styles.reasonFilterChip, selected && styles.reasonFilterChipSelected]}
                      onPress={() => setSelectedReasonFilter(reasonCode)}
                    >
                      <Text
                        style={[
                          styles.reasonFilterChipText,
                          selected && styles.reasonFilterChipTextSelected,
                        ]}
                      >
                        {getReasonLabel(reasonCode, t)}
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
            const preview = item.message?.isDeleted
              ? t('message.deleted')
              : item.message?.isEncrypted
                ? t('dm.encryptedMessagePlaceholder')
                : (item.message?.bodyPlaintext || item.report.reasonText || '');
            const isResolving =
              resolveMutation.isPending && resolveMutation.variables?.reportId === item.report.id;

            return (
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.headerCopy}>
                    <Text style={styles.reason}>
                      {getReasonLabel(item.report.reasonCode, t)}
                    </Text>
                    <Text style={styles.meta}>
                      {t('community.reportedBy', {
                        name: item.reporter?.displayName ?? t('common.unknown'),
                      })}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {new Date(item.report.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={styles.preview} numberOfLines={4}>
                  {preview || t('community.reportsNoContext')}
                </Text>

                {item.report.reasonText ? (
                  <Text style={styles.reasonText}>{item.report.reasonText}</Text>
                ) : null}

                <View style={styles.footerRow}>
                  {item.message?.id && item.message.channelId ? (
                    <TouchableOpacity
                      style={styles.openButton}
                      onPress={() =>
                        navigation.navigate('ChannelScreen', {
                          communityId: route.params.communityId,
                          channelId: item.message?.channelId ?? '',
                          focusMessageId: item.message?.id ?? undefined,
                        })
                      }
                    >
                      <Text style={styles.openButtonText}>{t('community.reportsOpenMessage')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>{t('community.reportsNoMessage')}</Text>
                    </View>
                  )}

                  {status === 'open' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={() => handleResolve(item.report.id, 'dismissed')}
                        disabled={isResolving}
                      >
                        <Text style={styles.dismissButtonText}>
                          {t('community.reportsDismiss')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.resolveButton}
                        onPress={() => handleResolve(item.report.id, 'resolved')}
                        disabled={isResolving}
                      >
                        <Text style={styles.resolveButtonText}>
                          {isResolving ? t('common.loading') : t('community.reportsResolve')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="🛡️"
                title={
                  deferredSearchQuery
                    ? t('community.reportsNoSearchResults')
                    : messageFilter === 'withMessage'
                      ? t('community.reportsNoMessageMatches')
                      : t('community.reportsEmpty')
                }
                subtitle={
                  deferredSearchQuery
                    ? t('community.reportsNoSearchResultsBody')
                    : messageFilter === 'withMessage'
                      ? t('community.reportsNoMessageMatchesBody')
                      : t('community.reportsEmptyHint')
                }
              />
            </View>
          }
          contentContainerStyle={filteredReports.length === 0 ? styles.emptyList : styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerFilters: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: fs.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  reasonFilterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reasonFilterChipSelected: {
    backgroundColor: colors.primary,
  },
  reasonFilterChipText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  reasonFilterChipTextSelected: {
    color: colors.white,
  },
  tabButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  list: {
    paddingVertical: spacing.md,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  reason: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: spacing.xs,
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
  reasonText: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  openButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  openButtonText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dismissButtonText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  resolveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resolveButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  statusChip: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusChipText: {
    color: colors.textMuted,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fs.base,
    fontWeight: '600',
  },
});
