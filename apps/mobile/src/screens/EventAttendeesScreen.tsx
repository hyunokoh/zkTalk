import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  getSimulatorHarnessPath,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessFile,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, getAvatarColor, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'EventAttendees'>;

interface EventAttendee {
  status: 'interested' | 'going';
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
}

interface CreateDmResult {
  id?: string;
  conversation?: {
    id: string;
  };
}

export default function EventAttendeesScreen({ route }: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'going' | 'interested'>('all');
  const [sortField, setSortField] = useState<'name' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['event-attendees', route.params.eventId],
    queryFn: () =>
      api<{ attendees: EventAttendee[] }>(`/api/events/${route.params.eventId}/attendees`),
  });

  const createDmMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api<CreateDmResult>('/api/dm/conversations', {
        method: 'POST',
        body: { targetUserId },
      }),
  });

  const attendees = data?.attendees ?? [];
  const filteredAttendees = useMemo(() => {
    const filtered = attendees.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [item.user.displayName, item.user.username, item.status]
        .join(' ')
        .toLowerCase();

      return haystack.includes(deferredSearchQuery);
    });
    return [...filtered].sort((a, b) => {
      if (sortField === 'status') {
        const getStatusPriority = (item: EventAttendee) =>
          item.status === 'going' ? 1 : 0;
        const left = getStatusPriority(a);
        const right = getStatusPriority(b);
        if (left !== right) {
          return sortOrder === 'asc' ? right - left : left - right;
        }
      }

      const left = a.user.displayName.toLocaleLowerCase();
      const right = b.user.displayName.toLocaleLowerCase();
      return sortOrder === 'asc'
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });
  }, [attendees, deferredSearchQuery, sortField, sortOrder, statusFilter]);
  const going = useMemo(
    () => filteredAttendees.filter((item) => item.status === 'going'),
    [filteredAttendees],
  );
  const interested = useMemo(
    () => filteredAttendees.filter((item) => item.status === 'interested'),
    [filteredAttendees],
  );

  const handleMessage = useCallback(
    async (attendee: EventAttendee) => {
      try {
        const result = await createDmMutation.mutateAsync(attendee.user.id);
        const conversationId = result.id ?? result.conversation?.id;
        if (!conversationId) {
          throw new Error(t('event.messageAttendeeFailed'));
        }
        navigation.navigate('Main', {
          screen: 'DmTab',
          params: {
            screen: 'DmScreen',
            params: {
              conversationId,
              userId: attendee.user.id,
              displayName: attendee.user.displayName,
            },
          },
        });
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('event.messageAttendeeFailed'),
        );
      }
    },
    [createDmMutation, navigation, t],
  );

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || isLoading) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{ type?: 'messageFirst' }>(
        'dev-event-attendees-action.json',
      );
      if (!action) return;

      try {
        if (action.type !== 'messageFirst') return;
        if (filteredAttendees[0]) {
          await handleMessage(filteredAttendees[0]);
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-event-attendees-action.json');
      }
    }

    void runDevAction();
  }, [filteredAttendees, handleMessage, isLoading]);

  if (isLoading) {
    return <LoadingSpinner text={t('event.attendeesLoading')} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          filteredAttendees.length === 0 && styles.emptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.searchWrap}>
          <View style={styles.filterRow}>
            {[
              { key: 'all' as const, label: t('event.filterAll') },
              { key: 'going' as const, label: t('event.going') },
              { key: 'interested' as const, label: t('event.interested') },
            ].map((option) => {
              const active = statusFilter === option.key;

              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setStatusFilter(option.key)}
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
              { key: 'name' as const, label: t('event.attendeesSortName') },
              { key: 'status' as const, label: t('event.attendeesSortStatus') },
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
                label: sortField === 'status' ? t('event.attendeesSortGoingFirst') : t('settings.sortAsc'),
              },
              {
                key: 'desc' as const,
                label: sortField === 'status' ? t('event.attendeesSortInterestedFirst') : t('settings.sortDesc'),
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
            placeholder={t('event.attendeesSearchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {filteredAttendees.length === 0 ? (
          <EmptyState
            icon={'\u{1F465}'}
            title={deferredSearchQuery ? t('event.attendeesNoSearchResults') : t('event.attendeesEmpty')}
            subtitle={deferredSearchQuery ? t('event.attendeesNoSearchResultsBody') : t('event.attendeesEmptyBody')}
          />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('event.going')} ({going.length})
              </Text>
              {going.length === 0 ? (
                <Text style={styles.sectionHint}>{t('event.attendeesNone')}</Text>
              ) : (
                going.map((item) => (
                  <View key={`going-${item.user.id}`} style={styles.row}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: getAvatarColor(item.user.displayName) },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {item.user.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.name}>{item.user.displayName}</Text>
                      <Text style={styles.username}>@{item.user.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => handleMessage(item)}
                    >
                      <Text style={styles.messageButtonText}>{t('dm.message')}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('event.interested')} ({interested.length})
              </Text>
              {interested.length === 0 ? (
                <Text style={styles.sectionHint}>{t('event.attendeesNone')}</Text>
              ) : (
                interested.map((item) => (
                  <View key={`interested-${item.user.id}`} style={styles.row}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: getAvatarColor(item.user.displayName) },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {item.user.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.name}>{item.user.displayName}</Text>
                      <Text style={styles.username}>@{item.user.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => handleMessage(item)}
                    >
                      <Text style={styles.messageButtonText}>{t('dm.message')}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  searchWrap: {
    marginBottom: spacing.sm,
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
    borderColor: colors.borderLight,
  },
  emptyContent: {
    flexGrow: 1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: fs.xl,
    fontWeight: '700',
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: fs.base,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    color: colors.white,
    fontSize: fs.base,
    fontWeight: '600',
  },
  username: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    marginTop: spacing.xs,
  },
  messageButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '700',
  },
});
