import React, { useCallback, useDeferredValue, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type AlertButton,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import type { HomeStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/auth';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'CommunityEvents'>;

interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  createdByUserId: string;
  rsvpCounts: {
    interested: number;
    going: number;
  };
  userRsvpStatus: 'interested' | 'going' | null;
}

interface CommunityMember {
  id: string;
  userId: string;
  role: string;
}

function formatEventRange(startAt: string, endAt: string | null, locale: string) {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;

  const startLabel = start.toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!end) {
    return startLabel;
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${startLabel} - ${end.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return `${startLabel} - ${end.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function CommunityEventsScreen({ navigation, route }: Props) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'interested' | 'going'>('all');
  const [hostFilter, setHostFilter] = useState<'all' | 'mine'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'withLocation'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all');
  const [sortField, setSortField] = useState<'startAt' | 'title' | 'attendance'>('startAt');
  const [sortOrder, setSortOrder] = useState<'nearest' | 'farthest'>('nearest');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['community-events', route.params.communityId, scope],
    queryFn: () =>
      api<{ events: CommunityEvent[] }>(
        `/api/communities/${route.params.communityId}/events?scope=${scope}`,
      ),
  });

  const { data: membersData } = useQuery({
    queryKey: ['community-members', route.params.communityId],
    queryFn: () =>
      api<{ members: CommunityMember[] }>(
        `/api/communities/${route.params.communityId}/members`,
      ),
  });

  const currentRole = membersData?.members.find(
    (member) => member.userId === currentUser?.id,
  )?.role;
  const canManageAllEvents = ['owner', 'admin'].includes(currentRole ?? '');

  const setRsvpMutation = useMutation({
    mutationFn: ({
      eventId,
      status,
    }: {
      eventId: string;
      status: 'interested' | 'going';
    }) =>
      api(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        body: { status },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community-events', route.params.communityId],
      });
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('event.rsvpFailed'),
      );
    },
  });

  const removeRsvpMutation = useMutation({
    mutationFn: (eventId: string) =>
      api(`/api/events/${eventId}/rsvp`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community-events', route.params.communityId],
      });
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('event.rsvpFailed'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      api(`/api/events/${eventId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community-events', route.params.communityId],
      });
      Alert.alert(t('event.deletedTitle'), t('event.deletedBody'));
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('event.deleteFailed'),
      );
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('EditCommunityEvent', {
              communityId: route.params.communityId,
              communityName: route.params.communityName,
            })
          }
          hitSlop={8}
        >
          <Text style={styles.headerAction}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, route.params.communityId, route.params.communityName]);

  const handleRsvp = useCallback(
    async (event: CommunityEvent, status: 'interested' | 'going') => {
      if (event.userRsvpStatus === status) {
        await removeRsvpMutation.mutateAsync(event.id);
        return;
      }

      await setRsvpMutation.mutateAsync({
        eventId: event.id,
        status,
      });
    },
    [removeRsvpMutation, setRsvpMutation],
  );

  const canManageEvent = useCallback(
    (event: CommunityEvent) =>
      canManageAllEvents || event.createdByUserId === currentUser?.id,
    [canManageAllEvents, currentUser?.id],
  );

  const handleEventMenu = useCallback(
    (event: CommunityEvent) => {
      const actions: AlertButton[] = [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.edit'),
          onPress: () => {
            navigation.navigate('EditCommunityEvent', {
              communityId: route.params.communityId,
              communityName: route.params.communityName,
              eventId: event.id,
            });
          },
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('event.deleteConfirmTitle'),
              t('event.deleteConfirmBody', { title: event.title }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: () => deleteMutation.mutate(event.id),
                },
              ],
            );
          },
        },
      ];

      Alert.alert(event.title, t('event.manageBody'), actions);
    },
    [
      deleteMutation,
      navigation,
      route.params.communityId,
      route.params.communityName,
      t,
    ],
  );

  if (isLoading) {
    return <LoadingSpinner text={t('community.eventsLoading')} />;
  }

  const events = data?.events ?? [];
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysFromMonday);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(weekStart.getDate() + 7);

    const filtered = events.filter((event) => {
      if (locationFilter === 'withLocation' && !event.location?.trim()) {
        return false;
      }

      if (hostFilter === 'mine' && event.createdByUserId !== currentUser?.id) {
        return false;
      }

      if (rsvpFilter !== 'all' && event.userRsvpStatus !== rsvpFilter) {
        return false;
      }

      const eventStart = new Date(event.startAt);
      if (timeFilter === 'today' && (eventStart < todayStart || eventStart >= tomorrowStart)) {
        return false;
      }

      if (timeFilter === 'week' && (eventStart < weekStart || eventStart >= nextWeekStart)) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [event.title, event.description ?? '', event.location ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(deferredSearchQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortField === 'title') {
        const left = a.title.toLocaleLowerCase();
        const right = b.title.toLocaleLowerCase();
        return sortOrder === 'nearest'
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }

      if (sortField === 'attendance') {
        const left = a.rsvpCounts.interested + a.rsvpCounts.going;
        const right = b.rsvpCounts.interested + b.rsvpCounts.going;
        return sortOrder === 'nearest' ? right - left : left - right;
      }

      const left = new Date(a.startAt).getTime();
      const right = new Date(b.startAt).getTime();
      return sortOrder === 'nearest' ? left - right : right - left;
    });
  }, [
    currentUser?.id,
    deferredSearchQuery,
    events,
    hostFilter,
    locationFilter,
    rsvpFilter,
    sortField,
    sortOrder,
    timeFilter,
  ]);
  const pendingEventId =
    setRsvpMutation.variables?.eventId ??
    (typeof removeRsvpMutation.variables === 'string'
      ? removeRsvpMutation.variables
      : null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerFilters}>
            <View style={styles.scopeTabs}>
              <TouchableOpacity
                style={[
                  styles.scopeTab,
                  scope === 'upcoming' && styles.scopeTabActive,
                ]}
                onPress={() => setScope('upcoming')}
              >
                <Text
                  style={[
                    styles.scopeTabText,
                    scope === 'upcoming' && styles.scopeTabTextActive,
                  ]}
                >
                  {t('event.upcomingTab')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scopeTab,
                  scope === 'past' && styles.scopeTabActive,
                ]}
                onPress={() => setScope('past')}
              >
                <Text
                  style={[
                    styles.scopeTabText,
                    scope === 'past' && styles.scopeTabTextActive,
                  ]}
                >
                  {t('event.pastTab')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rsvpTabs}>
              {[
                { key: 'all' as const, label: t('event.filterAll') },
                { key: 'interested' as const, label: t('event.interested') },
                { key: 'going' as const, label: t('event.going') },
              ].map((option) => {
                const active = rsvpFilter === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    onPress={() => setRsvpFilter(option.key)}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.rsvpTabs}>
              {[
                { key: 'all' as const, label: t('event.filterAll') },
                { key: 'mine' as const, label: t('event.filterMine') },
              ].map((option) => {
                const active = hostFilter === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    onPress={() => setHostFilter(option.key)}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.rsvpTabs}>
              {[
                { key: 'all' as const, label: t('event.filterAll') },
                { key: 'withLocation' as const, label: t('event.filterWithLocation') },
              ].map((option) => {
                const active = locationFilter === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    onPress={() => setLocationFilter(option.key)}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.rsvpTabs}>
              {[
                { key: 'all' as const, label: t('event.filterAll') },
                { key: 'today' as const, label: t('event.filterToday') },
                { key: 'week' as const, label: t('event.filterThisWeek') },
              ].map((option) => {
                const active = timeFilter === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    onPress={() => setTimeFilter(option.key)}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('event.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.rsvpTabs}>
              {[
                { key: 'startAt' as const, label: t('event.sortStartAt') },
                { key: 'title' as const, label: t('event.sortTitle') },
                { key: 'attendance' as const, label: t('event.sortAttendance') },
              ].map((option) => {
                const active = sortField === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    onPress={() => setSortField(option.key)}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.rsvpTabs}>
              {[
                {
                  key: 'nearest' as const,
                  label:
                    sortField === 'startAt'
                      ? t('event.sortNearest')
                      : sortField === 'title'
                        ? t('settings.sortAsc')
                        : t('event.sortMostAttendees'),
                },
                {
                  key: 'farthest' as const,
                  label:
                    sortField === 'startAt'
                      ? t('event.sortFarthest')
                      : sortField === 'title'
                        ? t('settings.sortDesc')
                        : t('event.sortFewestAttendees'),
                },
              ].map((option) => {
                const active = sortOrder === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    onPress={() => setSortOrder(option.key)}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        active && styles.scopeTabTextActive,
                      ]}
                    >
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
          const isBusy =
            pendingEventId === item.id &&
            (setRsvpMutation.isPending || removeRsvpMutation.isPending);

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  style={styles.cardHeaderPressable}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('EventDetails', {
                      communityId: route.params.communityId,
                      eventId: item.id,
                      eventTitle: item.title,
                    })
                  }
                >
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.time}>
                      {formatEventRange(item.startAt, item.endAt, locale)}
                    </Text>
                  </View>

                  {item.description ? (
                    <Text style={styles.description}>{item.description}</Text>
                  ) : null}

                  {item.location ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{t('event.location')}</Text>
                      <Text style={styles.metaValue}>{item.location}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                {canManageEvent(item) ? (
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => handleEventMenu(item)}
                    hitSlop={8}
                  >
                    <Text style={styles.menuButtonText}>{'\u{22EF}'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    item.userRsvpStatus === 'interested' && styles.interestedActive,
                    isBusy && styles.disabledButton,
                  ]}
                  onPress={() => handleRsvp(item, 'interested')}
                  disabled={isBusy}
                >
                  <Text
                    style={[
                      styles.rsvpButtonText,
                      item.userRsvpStatus === 'interested' && styles.activeButtonText,
                    ]}
                  >
                    {t('event.interested')} ({item.rsvpCounts.interested})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    item.userRsvpStatus === 'going' && styles.goingActive,
                    isBusy && styles.disabledButton,
                  ]}
                  onPress={() => handleRsvp(item, 'going')}
                  disabled={isBusy}
                >
                  <Text
                    style={[
                      styles.rsvpButtonText,
                      item.userRsvpStatus === 'going' && styles.activeButtonText,
                    ]}
                  >
                    {t('event.going')} ({item.rsvpCounts.going})
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.attendeesButton}
                onPress={() =>
                  navigation.navigate('EventAttendees', {
                    communityId: route.params.communityId,
                    eventId: item.id,
                    eventTitle: item.title,
                  })
                }
              >
                <Text style={styles.attendeesButtonText}>
                  {t('event.viewAttendees')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={'\u{1F4C5}'}
            title={
              deferredSearchQuery
                ? t('event.noSearchResults')
                : timeFilter === 'today'
                  ? t('event.noTodayEvents')
                : timeFilter === 'week'
                  ? t('event.noThisWeekEvents')
                : locationFilter === 'withLocation'
                  ? t('event.noLocationEvents')
                : hostFilter === 'mine'
                  ? t('event.noHostedEvents')
                : scope === 'past'
                  ? t('event.noPastEvents')
                  : t('event.noEvents')
            }
            subtitle={
              deferredSearchQuery
                ? t('event.noSearchResultsBody')
                : timeFilter === 'today'
                  ? t('event.noTodayEventsBody')
                : timeFilter === 'week'
                  ? t('event.noThisWeekEventsBody')
                : locationFilter === 'withLocation'
                  ? t('event.noLocationEventsBody')
                : hostFilter === 'mine'
                  ? t('event.noHostedEventsBody')
                : scope === 'past'
                  ? t('event.noPastEventsBody')
                  : t('community.eventsHint')
            }
          />
        }
        contentContainerStyle={[
          styles.content,
          filteredEvents.length === 0 && styles.emptyContent,
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
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
  headerFilters: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  scopeTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rsvpTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  scopeTab: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scopeTabText: {
    color: colors.textSecondary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  scopeTabTextActive: {
    color: colors.white,
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
  },
  cardHeaderText: {
    flex: 1,
  },
  cardHeaderPressable: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontSize: fs.xl,
    fontWeight: '700',
  },
  time: {
    color: colors.textSecondary,
    fontSize: fs.base,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  description: {
    color: colors.text,
    fontSize: fs.base,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  metaRow: {
    marginTop: spacing.md,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: fs.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValue: {
    color: colors.textSecondary,
    fontSize: fs.base,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundDark,
  },
  menuButtonText: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  attendeesButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  attendeesButtonText: {
    color: colors.primaryLight,
    fontSize: fs.base,
    fontWeight: '600',
  },
  rsvpButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  interestedActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goingActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  disabledButton: {
    opacity: 0.6,
  },
  rsvpButtonText: {
    color: colors.textSecondary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  activeButtonText: {
    color: colors.white,
  },
});
