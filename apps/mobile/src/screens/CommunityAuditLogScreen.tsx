import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'CommunityAuditLog'>;

interface AuditRow {
  action: {
    id: string;
    communityId: string;
    actorUserId: string;
    targetUserId: string | null;
    targetMessageId: string | null;
    actionType: string;
    reason: string | null;
    createdAt: string;
  };
  actor: {
    id: string;
    displayName: string;
    username: string;
  };
  message: {
    id: string | null;
    channelId: string | null;
    bodyPlaintext: string | null;
    isDeleted: boolean | null;
    isEncrypted: boolean | null;
  } | null;
}

function getActionLabel(
  actionType: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  switch (actionType) {
    case 'report_created':
      return t('community.auditLogReportCreated');
    case 'report_resolved':
      return t('community.auditLogReportResolved');
    case 'report_dismissed':
      return t('community.auditLogReportDismissed');
    case 'member_muted':
      return t('community.auditLogMemberMuted');
    case 'member_kicked':
      return t('community.auditLogMemberKicked');
    case 'member_banned':
      return t('community.auditLogMemberBanned');
    default:
      return actionType;
  }
}

export default function CommunityAuditLogScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'withMessage'>('all');
  const [sortField, setSortField] = useState<'loggedAt' | 'actor'>('loggedAt');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['community-audit-log', route.params.communityId],
    queryFn: () =>
      api<{ actions: AuditRow[] }>(
        `/api/communities/${route.params.communityId}/audit-log`,
      ),
  });

  const actions = data?.actions ?? [];
  const availableActionFilters = useMemo(() => {
    const actionTypes = Array.from(new Set(actions.map((item) => item.action.actionType)));
    return actionTypes.sort((a, b) =>
      getActionLabel(a, t).localeCompare(getActionLabel(b, t)),
    );
  }, [actions, t]);
  const filteredActions = useMemo(() => {
    const filtered = actions.filter((item) => {
      if (messageFilter === 'withMessage' && (!item.message?.id || !item.message.channelId)) {
        return false;
      }

      if (selectedActionFilter && item.action.actionType !== selectedActionFilter) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const preview = item.message?.isDeleted
        ? t('message.deleted')
        : item.message?.isEncrypted
          ? t('dm.encryptedMessagePlaceholder')
          : (item.message?.bodyPlaintext || item.action.reason || '');
      const haystack = [
        getActionLabel(item.action.actionType, t),
        item.actor.displayName,
        item.actor.username,
        item.action.reason ?? '',
        preview,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortField === 'actor') {
        const left = (a.actor.displayName || a.actor.username || '').toLocaleLowerCase();
        const right = (b.actor.displayName || b.actor.username || '').toLocaleLowerCase();
        return sortOrder === 'newest'
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }

      const left = new Date(a.action.createdAt).getTime();
      const right = new Date(b.action.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [actions, deferredSearchQuery, messageFilter, selectedActionFilter, sortField, sortOrder, t]);

  if (isLoading) {
    return <LoadingSpinner text={t('community.auditLogLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredActions}
        keyExtractor={(item) => item.action.id}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('community.auditLogSearchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.actionFilterWrap}>
              {[
                { key: 'loggedAt' as const, label: t('community.auditLogSortLoggedAt') },
                { key: 'actor' as const, label: t('community.auditLogSortActor') },
              ].map((option) => {
                const selected = sortField === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]}
                    onPress={() => setSortField(option.key)}
                  >
                    <Text
                      style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.actionFilterWrap}>
              {[
                {
                  key: 'newest' as const,
                  label: sortField === 'actor' ? t('settings.sortAsc') : t('settings.sortNewest'),
                },
                {
                  key: 'oldest' as const,
                  label: sortField === 'actor' ? t('settings.sortDesc') : t('settings.sortOldest'),
                },
              ].map((option) => {
                const selected = sortOrder === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]}
                    onPress={() => setSortOrder(option.key)}
                  >
                    <Text
                      style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.actionFilterWrap}>
              {[
                { key: 'all' as const, label: t('community.auditLogFilterAll') },
                { key: 'withMessage' as const, label: t('community.auditLogFilterWithMessage') },
              ].map((option) => {
                const selected = messageFilter === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]}
                    onPress={() => setMessageFilter(option.key)}
                  >
                    <Text
                      style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.actionFilterWrap}>
              <TouchableOpacity
                style={[
                  styles.actionFilterChip,
                  selectedActionFilter === null && styles.actionFilterChipSelected,
                ]}
                onPress={() => setSelectedActionFilter(null)}
              >
                <Text
                  style={[
                    styles.actionFilterChipText,
                    selectedActionFilter === null && styles.actionFilterChipTextSelected,
                  ]}
                >
                  {t('community.auditLogFilterAll')}
                </Text>
              </TouchableOpacity>
              {availableActionFilters.map((actionType) => {
                const selected = selectedActionFilter === actionType;

                return (
                  <TouchableOpacity
                    key={actionType}
                    style={[styles.actionFilterChip, selected && styles.actionFilterChipSelected]}
                    onPress={() => setSelectedActionFilter(actionType)}
                  >
                    <Text
                      style={[
                        styles.actionFilterChipText,
                        selected && styles.actionFilterChipTextSelected,
                      ]}
                    >
                      {getActionLabel(actionType, t)}
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
              : (item.message?.bodyPlaintext || item.action.reason || '');

          return (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text style={styles.actionTitle}>
                    {getActionLabel(item.action.actionType, t)}
                  </Text>
                  <Text style={styles.meta}>
                    {t('community.auditLogActor', {
                      name: item.actor.displayName || t('common.unknown'),
                    })}
                  </Text>
                </View>
                <Text style={styles.timestamp}>
                  {new Date(item.action.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.preview} numberOfLines={3}>
                {preview || t('community.auditLogNoContext')}
              </Text>

              {item.action.reason ? (
                <Text style={styles.reasonText}>{item.action.reason}</Text>
              ) : null}

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
                  <Text style={styles.openButtonText}>{t('community.auditLogOpenMessage')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="🧾"
              title={
                deferredSearchQuery
                  ? t('community.auditLogNoSearchResults')
                  : messageFilter === 'withMessage'
                    ? t('community.auditLogNoMessageMatches')
                    : t('community.auditLogEmpty')
              }
              subtitle={
                deferredSearchQuery
                  ? t('community.auditLogNoSearchResultsBody')
                  : messageFilter === 'withMessage'
                    ? t('community.auditLogNoMessageMatchesBody')
                    : t('community.auditLogHint')
              }
            />
          </View>
        }
        contentContainerStyle={filteredActions.length === 0 ? styles.emptyList : styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  actionFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionFilterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionFilterChipSelected: {
    backgroundColor: colors.primary,
  },
  actionFilterChipText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  actionFilterChipTextSelected: {
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
  actionTitle: {
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
  openButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
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
});
