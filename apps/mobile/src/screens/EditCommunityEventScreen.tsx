import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'EditCommunityEvent'>;

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
}

type PickerField = 'startAt' | 'endAt';
type PickerStep = 'date' | 'time' | 'datetime';

function formatDateTime(date: Date, locale: string) {
  return date.toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mergeDatePart(base: Date, selected: Date) {
  const next = new Date(base);
  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return next;
}

function mergeTimePart(base: Date, selected: Date) {
  const next = new Date(base);
  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
}

export default function EditCommunityEventScreen({ navigation, route }: Props) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = Boolean(route.params.eventId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    return now;
  });
  const [hasEndAt, setHasEndAt] = useState(false);
  const [endAt, setEndAt] = useState(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  });
  const [activePicker, setActivePicker] = useState<{
    field: PickerField;
    step: PickerStep;
  } | null>(null);
  const [devActionAttempted, setDevActionAttempted] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['community-event', route.params.eventId],
    queryFn: () =>
      api<{ event: CommunityEvent }>(`/api/events/${route.params.eventId}`),
    enabled: isEditing,
  });

  useEffect(() => {
    const event = eventQuery.data?.event;
    if (!event) return;

    setTitle(event.title);
    setDescription(event.description ?? '');
    setLocation(event.location ?? '');
    setStartAt(new Date(event.startAt));
    if (event.endAt) {
      setHasEndAt(true);
      setEndAt(new Date(event.endAt));
    } else {
      setHasEndAt(false);
      const fallbackEnd = new Date(event.startAt);
      fallbackEnd.setHours(fallbackEnd.getHours() + 1);
      setEndAt(fallbackEnd);
    }
  }, [eventQuery.data?.event]);

  const payload = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startAt: startAt.toISOString(),
      endAt: hasEndAt ? endAt.toISOString() : undefined,
    }),
    [description, endAt, hasEndAt, location, startAt, title],
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      api<{ event: CommunityEvent }>(
        isEditing
          ? `/api/events/${route.params.eventId}`
          : `/api/communities/${route.params.communityId}/events`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          body: payload,
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['community-events', route.params.communityId],
        }),
        route.params.eventId
          ? queryClient.invalidateQueries({
              queryKey: ['community-event', route.params.eventId],
            })
          : Promise.resolve(),
      ]);
      Alert.alert(
        isEditing ? t('event.savedTitle') : t('event.createdTitle'),
        isEditing ? t('event.savedBody') : t('event.createdBody'),
        [{ text: t('common.confirm'), onPress: () => navigation.goBack() }],
      );
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error
          ? error.message
          : isEditing
            ? t('event.saveFailed')
            : t('event.createFailed'),
      );
    },
  });

  const openPicker = useCallback(
    (field: PickerField) => {
      if (field === 'endAt' && !hasEndAt) {
        setHasEndAt(true);
        const fallback = new Date(startAt);
        fallback.setHours(fallback.getHours() + 1);
        setEndAt(fallback);
      }

      setActivePicker({
        field,
        step: Platform.OS === 'ios' ? 'datetime' : 'date',
      });
    },
    [hasEndAt, startAt],
  );

  const handlePickerChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (!activePicker) return;

      if (event.type === 'dismissed') {
        setActivePicker(null);
        return;
      }

      if (!selected) return;

      const currentValue = activePicker.field === 'startAt' ? startAt : endAt;

      if (Platform.OS === 'ios') {
        if (activePicker.field === 'startAt') {
          setStartAt(selected);
          if (hasEndAt && selected > endAt) {
            const adjusted = new Date(selected);
            adjusted.setHours(adjusted.getHours() + 1);
            setEndAt(adjusted);
          }
        } else {
          setEndAt(selected);
        }
        return;
      }

      if (activePicker.step === 'date') {
        const nextDate = mergeDatePart(currentValue, selected);
        if (activePicker.field === 'startAt') {
          setStartAt(nextDate);
        } else {
          setEndAt(nextDate);
        }
        setActivePicker({ field: activePicker.field, step: 'time' });
        return;
      }

      const nextDate = mergeTimePart(currentValue, selected);
      if (activePicker.field === 'startAt') {
        setStartAt(nextDate);
        if (hasEndAt && nextDate > endAt) {
          const adjusted = new Date(nextDate);
          adjusted.setHours(adjusted.getHours() + 1);
          setEndAt(adjusted);
        }
      } else {
        setEndAt(nextDate);
      }
      setActivePicker(null);
    },
    [activePicker, endAt, hasEndAt, startAt],
  );

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('event.titleRequired'));
      return;
    }

    if (hasEndAt && endAt <= startAt) {
      Alert.alert(t('common.error'), t('event.endAfterStart'));
      return;
    }

    saveMutation.mutate();
  }, [endAt, hasEndAt, saveMutation, startAt, t, title]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttempted) return;
    if (isEditing && !eventQuery.data?.event) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{
        type: 'save';
        title?: string;
        description?: string;
        location?: string;
        startAt?: string;
        endAt?: string | null;
      }>('dev-edit-community-event-action.json');
      if (!action) return;

      try {
        if (action.type !== 'save') {
          throw new Error('Unsupported community event dev action');
        }

        const nextTitle = action.title?.trim();
        if (!nextTitle) {
          throw new Error('Missing title for community event dev action');
        }

        setDevActionAttempted(true);
        setTitle(nextTitle);
        setDescription(action.description?.trim() ?? '');
        setLocation(action.location?.trim() ?? '');

        const nextStartAt = action.startAt ? new Date(action.startAt) : startAt;
        const nextEndAt = action.endAt ? new Date(action.endAt) : endAt;
        const nextHasEndAt = action.endAt !== null;

        setStartAt(nextStartAt);
        setHasEndAt(nextHasEndAt);
        setEndAt(nextEndAt);

        const result = await api<{ event: CommunityEvent }>(
          isEditing
            ? `/api/events/${route.params.eventId}`
            : `/api/communities/${route.params.communityId}/events`,
          {
            method: isEditing ? 'PATCH' : 'POST',
            body: {
              title: nextTitle,
              description: action.description?.trim() || undefined,
              location: action.location?.trim() || undefined,
              startAt: nextStartAt.toISOString(),
              endAt: nextHasEndAt ? nextEndAt.toISOString() : undefined,
            },
          },
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['community-events', route.params.communityId],
          }),
          route.params.eventId
            ? queryClient.invalidateQueries({
                queryKey: ['community-event', route.params.eventId],
              })
            : Promise.resolve(),
        ]);

        await writeSimulatorHarnessJson(
          'dev-edit-community-event-result.json',
          {
            ok: true,
            eventId: result.event.id,
            title: result.event.title,
            startAt: result.event.startAt,
            endAt: result.event.endAt,
          },
        );
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-edit-community-event-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      } finally {
        await deleteSimulatorHarnessFile('dev-edit-community-event-action.json');
      }
    }

    void runDevAction();
  }, [
    devActionAttempted,
    endAt,
    eventQuery.data?.event,
    isEditing,
    queryClient,
    route.params.communityId,
    route.params.eventId,
    startAt,
  ]);

  if (isEditing && eventQuery.isLoading) {
    return <LoadingSpinner text={t('community.eventsLoading')} />;
  }

  const pickerValue = activePicker
    ? activePicker.field === 'startAt'
      ? startAt
      : endAt
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>{t('event.formTitle')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('event.titlePlaceholder')}
            placeholderTextColor={colors.textDim}
            maxLength={200}
            autoFocus={!isEditing}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('community.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('event.descriptionPlaceholder')}
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={4}
            maxLength={2000}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('event.location')}</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder={t('event.locationPlaceholder')}
            placeholderTextColor={colors.textDim}
            maxLength={500}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('event.startAt')}</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => openPicker('startAt')}
          >
            <Text style={styles.pickerValue}>
              {formatDateTime(startAt, locale)}
            </Text>
            <Text style={styles.pickerHint}>{t('event.changeDateTime')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <View style={styles.endToggleRow}>
            <View style={styles.endToggleText}>
              <Text style={styles.label}>{t('event.endAt')}</Text>
              <Text style={styles.helper}>{t('event.endAtHint')}</Text>
            </View>
            <Switch
              value={hasEndAt}
              onValueChange={(nextValue) => {
                setHasEndAt(nextValue);
                if (nextValue && endAt <= startAt) {
                  const adjusted = new Date(startAt);
                  adjusted.setHours(adjusted.getHours() + 1);
                  setEndAt(adjusted);
                }
              }}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {hasEndAt ? (
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => openPicker('endAt')}
            >
              <Text style={styles.pickerValue}>
                {formatDateTime(endAt, locale)}
              </Text>
              <Text style={styles.pickerHint}>{t('event.changeDateTime')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {activePicker && pickerValue ? (
          <View style={styles.pickerCard}>
            <DateTimePicker
              value={pickerValue}
              mode={Platform.OS === 'ios' ? 'datetime' : activePicker.step}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handlePickerChange}
              minimumDate={activePicker.field === 'endAt' ? startAt : undefined}
            />
            {Platform.OS === 'ios' ? (
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setActivePicker(null)}
              >
                <Text style={styles.pickerDoneText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {saveMutation.isPending
              ? isEditing
                ? t('event.saving')
                : t('event.creating')
              : isEditing
                ? t('common.save')
                : t('event.create')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  helper: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fs.lg,
  },
  textArea: {
    minHeight: 100,
  },
  pickerButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  pickerValue: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '600',
  },
  pickerHint: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    marginTop: spacing.xs,
  },
  endToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  endToggleText: {
    flex: 1,
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerDoneButton: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pickerDoneText: {
    color: colors.primary,
    fontSize: fs.base,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
});
