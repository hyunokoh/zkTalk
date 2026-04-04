import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  claimSimulatorHarnessMarker,
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreatePoll'>;

export default function CreatePollScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const devCreateAttemptedRef = useRef(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      api(`/api/channels/${route.params.channelId}/polls`, {
        method: 'POST',
        body: {
          question: question.trim(),
          options: options.map((item) => item.trim()).filter(Boolean),
          isAnonymous,
          allowMultiple,
          expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['polls', route.params.channelId] }),
        queryClient.invalidateQueries({ queryKey: ['messages', route.params.channelId] }),
        queryClient.invalidateQueries({ queryKey: ['polls-by-message', route.params.channelId] }),
      ]);
      Alert.alert(t('poll.createdTitle'), t('poll.createdBody'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('poll.createFailed'),
      );
    },
  });

  const addOption = useCallback(() => {
    if (options.length < 10) {
      setOptions((current) => [...current, '']);
    }
  }, [options.length]);

  const removeOption = useCallback((index: number) => {
    setOptions((current) => (current.length > 2 ? current.filter((_, i) => i !== index) : current));
  }, []);

  const updateOption = useCallback((index: number, value: string) => {
    setOptions((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }, []);

  const handleCreate = useCallback(() => {
    if (!question.trim()) {
      Alert.alert(t('common.error'), t('poll.questionRequired'));
      return;
    }

    if (options.map((item) => item.trim()).filter(Boolean).length < 2) {
      Alert.alert(t('common.error'), t('poll.optionsRequired'));
      return;
    }

    createMutation.mutate();
  }, [createMutation, options, question, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devCreateAttemptedRef.current) {
      return;
    }

    async function runDevCreatePoll() {
      const parsed = await readSimulatorHarnessJson<
        | {
            question?: string;
            options?: string[];
            isAnonymous?: boolean;
            allowMultiple?: boolean;
            expiresInHours?: number | string;
          }
        | undefined
      >('dev-create-poll.json');
      if (!parsed) {
        return;
      }

      devCreateAttemptedRef.current = true;
      await deleteSimulatorHarnessFile('dev-create-poll.json');

      const nextQuestion = parsed?.question?.trim() || 'Simulator poll create test';
      const nextOptions = (parsed?.options ?? ['Yes', 'No'])
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10);

      setQuestion(nextQuestion);
      setOptions(nextOptions.length >= 2 ? nextOptions : ['Yes', 'No']);
      setIsAnonymous(Boolean(parsed?.isAnonymous));
      setAllowMultiple(Boolean(parsed?.allowMultiple));
      setExpiresInHours(
        parsed?.expiresInHours !== undefined && parsed?.expiresInHours !== null
          ? String(parsed.expiresInHours)
          : '',
      );
    }

    void runDevCreatePoll();
  }, []);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || !devCreateAttemptedRef.current || createMutation.isPending) {
      return;
    }

    if (!question.trim() || options.map((item) => item.trim()).filter(Boolean).length < 2) {
      return;
    }

    async function submitDevCreatePoll() {
      const claimed = await claimSimulatorHarnessMarker(
        'dev-create-poll-submitted.txt',
        question.trim(),
      );
      if (!claimed) {
        return;
      }

      createMutation.mutate();
    }

    void submitDevCreatePoll();
  }, [createMutation, options, question]);

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
          <Text style={styles.label}>{t('poll.question')}</Text>
          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder={t('poll.questionPlaceholder')}
            placeholderTextColor={colors.textDim}
            maxLength={500}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('poll.options')}</Text>
          <View style={styles.optionsList}>
            {options.map((option, index) => (
              <View key={`${index}`} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, styles.optionInput]}
                  value={option}
                  onChangeText={(value) => updateOption(index, value)}
                  placeholder={t('poll.option', { num: index + 1 })}
                  placeholderTextColor={colors.textDim}
                  maxLength={200}
                />
                {options.length > 2 ? (
                  <TouchableOpacity
                    style={styles.removeOptionButton}
                    onPress={() => removeOption(index)}
                  >
                    <Text style={styles.removeOptionText}>{t('poll.removeOption')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
          {options.length < 10 ? (
            <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
              <Text style={styles.addOptionText}>+ {t('poll.addOption')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>{t('poll.anonymous')}</Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>{t('poll.multiple')}</Text>
            </View>
            <Switch
              value={allowMultiple}
              onValueChange={setAllowMultiple}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('poll.expiresHours')}</Text>
          <TextInput
            style={styles.input}
            value={expiresInHours}
            onChangeText={setExpiresInHours}
            placeholder={t('poll.expiresPlaceholder')}
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          <Text style={styles.createButtonText}>
            {createMutation.isPending ? t('poll.creating') : t('poll.create')}
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fs.lg,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  optionInput: {
    flex: 1,
  },
  removeOptionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  removeOptionText: {
    color: colors.danger,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  addOptionButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  addOptionText: {
    color: colors.primaryLight,
    fontSize: fs.base,
    fontWeight: '600',
  },
  switchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
  },
  switchTitle: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
});
