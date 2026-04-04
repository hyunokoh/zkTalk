import React, { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  Alert,
  type AlertButton,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  getSimulatorHarnessPath,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/auth';
import { borderRadius, colors, fontSize as fs, getAvatarColor, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'EventDetails'>;

interface EventDetail {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  createdByUserId: string;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
  rsvpCounts: {
    interested: number;
    going: number;
  };
  userRsvpStatus: 'interested' | 'going' | null;
}

interface CreateDmResult {
  id: string;
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
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!end) {
    return startLabel;
  }

  return `${startLabel} - ${end.toLocaleString(locale, {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getLocationUrl(location: string) {
  const trimmed = location.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(trimmed)}`;
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toIcsDate(dateString: string) {
  return new Date(dateString)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export default function EventDetailsScreen({ navigation, route }: Props) {
  const { t, locale } = useTranslation();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['community-event', route.params.eventId],
    queryFn: () => api<{ event: EventDetail }>(`/api/events/${route.params.eventId}`),
  });

  const event = data?.event;
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
  const canManageEvent =
    !!event &&
    (['owner', 'admin'].includes(currentRole ?? '') || event.createdByUserId === currentUser?.id);

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-event', route.params.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['community-events', route.params.communityId] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendees', route.params.eventId] }),
      ]);
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
      api(`/api/events/${eventId}/rsvp`, { method: 'DELETE' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-event', route.params.eventId] }),
        queryClient.invalidateQueries({ queryKey: ['community-events', route.params.communityId] }),
        queryClient.invalidateQueries({ queryKey: ['event-attendees', route.params.eventId] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('event.rsvpFailed'),
      );
    },
  });

  const createDmMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api<CreateDmResult>('/api/dm/conversations', {
        method: 'POST',
        body: { targetUserId },
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      api(`/api/events/${eventId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-events', route.params.communityId] }),
        queryClient.invalidateQueries({ queryKey: ['community-event', route.params.eventId] }),
      ]);
      Alert.alert(t('event.deletedTitle'), t('event.deletedBody'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('event.deleteFailed'),
      );
    },
  });

  useLayoutEffect(() => {
    const handleEventMenu = () => {
      if (!event) return;

      const actions: AlertButton[] = [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.edit'),
          onPress: () => {
            navigation.navigate('EditCommunityEvent', {
              communityId: route.params.communityId,
              communityName: undefined,
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
    };

    navigation.setOptions({
      title: event?.title ?? route.params.eventTitle ?? t('event.detailsDefaultTitle'),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={async () => {
              if (!event) return;
              await Share.share({
                title: event.title,
                message: [
                  event.title,
                  formatEventRange(event.startAt, event.endAt, locale),
                  event.location ? `${t('event.location')}: ${event.location}` : null,
                  event.description,
                ]
                  .filter(Boolean)
                  .join('\n'),
              });
            }}
            hitSlop={8}
          >
            <Text style={styles.headerAction}>{'\u{1F4E4}'}</Text>
          </TouchableOpacity>
          {canManageEvent ? (
            <TouchableOpacity onPress={handleEventMenu} hitSlop={8}>
              <Text style={styles.headerAction}>{'\u{22EF}'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ),
    });
  }, [
    canManageEvent,
    deleteMutation,
    event,
    locale,
    navigation,
    route.params.communityId,
    route.params.eventId,
    route.params.eventTitle,
    t,
  ]);

  const handleRsvp = useCallback(
    async (status: 'interested' | 'going') => {
      if (!event) return;
      if (event.userRsvpStatus === status) {
        await removeRsvpMutation.mutateAsync(event.id);
        return;
      }

      await setRsvpMutation.mutateAsync({ eventId: event.id, status });
    },
    [event, removeRsvpMutation, setRsvpMutation],
  );

  const handleOpenLocation = useCallback(async () => {
    if (!event?.location) return;
    const url = getLocationUrl(event.location);
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(t('common.error'), t('event.openLocationFailed'));
      return;
    }
    await Linking.openURL(url);
  }, [event?.location, t]);

  const handleAddToCalendar = useCallback(async () => {
    if (!event) return;

    try {
      const fileName = `zktalk-event-${event.id}.ics`;
      const file = new File(Paths.cache, fileName);
      if (file.exists) {
        file.delete();
      }
      file.create();

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//zkTalk//Events//EN',
        'BEGIN:VEVENT',
        `UID:${event.id}@zktalk.app`,
        `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
        `DTSTART:${toIcsDate(event.startAt)}`,
        event.endAt ? `DTEND:${toIcsDate(event.endAt)}` : null,
        `SUMMARY:${escapeIcsText(event.title)}`,
        event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
        event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
        'END:VEVENT',
        'END:VCALENDAR',
      ]
        .filter(Boolean)
        .join('\r\n');

      file.write(lines);

      await Share.share({
        title: `${event.title}.ics`,
        message: t('event.calendarShareBody', { title: event.title }),
        url: file.uri,
      });
    } catch {
      Alert.alert(t('common.error'), t('event.calendarShareFailed'));
    }
  }, [event, t]);

  const handleMessageHost = useCallback(async () => {
    if (!event) return;

    try {
      const result = await createDmMutation.mutateAsync(event.creator.id);
      rootNavigation.navigate('Main', {
        screen: 'DmTab',
        params: {
          screen: 'DmScreen',
          params: {
            conversationId: result.id,
            userId: event.creator.id,
            displayName: event.creator.displayName,
          },
        },
      });
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('event.messageHostFailed'),
      );
    }
  }, [createDmMutation, event, rootNavigation, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || !event) return;

    let cancelled = false;
    const currentEventId = event.id;
    const currentStatus = event.userRsvpStatus;

    async function runDevEventAction() {
      const action = await readSimulatorHarnessJson<
        | {
            eventId?: string;
            action?: 'interested' | 'going' | 'clear' | 'messageHost';
          }
        | undefined
      >('dev-event-action.json');
      if (!action || cancelled) return;

      try {
        if (!action?.eventId || action.eventId !== currentEventId || !action.action) {
          return;
        }

        if (action.action === 'clear') {
          if (currentStatus) {
            await removeRsvpMutation.mutateAsync(currentEventId);
          }
          return;
        }

        if (action.action === 'messageHost') {
          await handleMessageHost();
          return;
        }

        if (currentStatus !== action.action) {
          await setRsvpMutation.mutateAsync({
            eventId: currentEventId,
            status: action.action,
          });
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-event-action.json');
      }
    }

    void runDevEventAction();

    return () => {
      cancelled = true;
    };
  }, [event, handleMessageHost, removeRsvpMutation, setRsvpMutation]);

  if (isLoading || !event) {
    return <LoadingSpinner text={t('community.eventsLoading')} />;
  }

  const isBusy = setRsvpMutation.isPending || removeRsvpMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.time}>{formatEventRange(event.startAt, event.endAt, locale)}</Text>

          <View style={styles.creatorRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: getAvatarColor(event.creator.displayName) },
              ]}
            >
              <Text style={styles.avatarText}>
                {event.creator.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorLabel}>{t('event.hostedBy')}</Text>
              <Text style={styles.creatorName}>
                {event.creator.displayName} @{event.creator.username}
              </Text>
            </View>
            {event.creator.id !== currentUser?.id ? (
              <TouchableOpacity
                style={styles.hostMessageButton}
                onPress={handleMessageHost}
              >
                <Text style={styles.hostMessageButtonText}>{t('event.messageHost')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          {event.location ? (
            <TouchableOpacity style={styles.locationCard} onPress={handleOpenLocation}>
              <Text style={styles.metaLabel}>{t('event.location')}</Text>
              <Text style={styles.locationValue}>{event.location}</Text>
              <Text style={styles.locationHint}>{t('event.openLocation')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.calendarButton} onPress={handleAddToCalendar}>
            <Text style={styles.calendarButtonText}>{t('event.addToCalendar')}</Text>
          </TouchableOpacity>

          <View style={styles.countRow}>
            <View style={styles.countChip}>
              <Text style={styles.countNumber}>{event.rsvpCounts.going}</Text>
              <Text style={styles.countLabel}>{t('event.going')}</Text>
            </View>
            <View style={styles.countChip}>
              <Text style={styles.countNumber}>{event.rsvpCounts.interested}</Text>
              <Text style={styles.countLabel}>{t('event.interested')}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.rsvpButton,
                event.userRsvpStatus === 'interested' && styles.interestedActive,
                isBusy && styles.disabledButton,
              ]}
              onPress={() => handleRsvp('interested')}
              disabled={isBusy}
            >
              <Text
                style={[
                  styles.rsvpButtonText,
                  event.userRsvpStatus === 'interested' && styles.activeButtonText,
                ]}
              >
                {t('event.interested')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rsvpButton,
                event.userRsvpStatus === 'going' && styles.goingActive,
                isBusy && styles.disabledButton,
              ]}
              onPress={() => handleRsvp('going')}
              disabled={isBusy}
            >
              <Text
                style={[
                  styles.rsvpButtonText,
                  event.userRsvpStatus === 'going' && styles.activeButtonText,
                ]}
              >
                {t('event.going')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.attendeesButton}
            onPress={() =>
              navigation.navigate('EventAttendees', {
                communityId: route.params.communityId,
                eventId: event.id,
                eventTitle: event.title,
              })
            }
          >
            <Text style={styles.attendeesButtonText}>{t('event.viewAttendees')}</Text>
          </TouchableOpacity>
        </View>
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
  },
  headerAction: {
    fontSize: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: fs.xxxl,
    fontWeight: '700',
  },
  time: {
    color: colors.textSecondary,
    fontSize: fs.base,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  creatorInfo: {
    flex: 1,
  },
  hostMessageButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hostMessageButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  creatorLabel: {
    color: colors.textMuted,
    fontSize: fs.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  creatorName: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  description: {
    color: colors.text,
    fontSize: fs.base,
    lineHeight: 22,
    marginTop: spacing.lg,
  },
  locationCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: fs.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  locationValue: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  locationHint: {
    color: colors.primaryLight,
    fontSize: fs.sm,
    marginTop: spacing.sm,
  },
  calendarButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  calendarButtonText: {
    color: colors.white,
    fontSize: fs.base,
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  countChip: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  countNumber: {
    color: colors.white,
    fontSize: fs.xxl,
    fontWeight: '700',
  },
  countLabel: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  rsvpButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
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
  attendeesButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
  },
  attendeesButtonText: {
    color: colors.primaryLight,
    fontSize: fs.base,
    fontWeight: '700',
  },
});
