import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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

type Props = NativeStackScreenProps<HomeStackParamList, 'CommunityOnboarding'>;

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface OnboardingRow {
  welcomeMessage: string | null;
  rules: string | null;
  defaultChannelIds: string | null;
  isEnabled: boolean;
}

interface OnboardingPayload {
  isEnabled: boolean;
  welcomeMessage?: string;
  rules: string[];
  defaultChannelIds: string[];
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export default function CommunityOnboardingScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [defaultChannelIds, setDefaultChannelIds] = useState<string[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');

  const onboardingQuery = useQuery({
    queryKey: ['community-onboarding', route.params.communityId],
    queryFn: () =>
      api<{ onboarding: OnboardingRow | null }>(
        `/api/communities/${route.params.communityId}/onboarding`,
      ),
  });

  const channelsQuery = useQuery({
    queryKey: ['channels', route.params.communityId],
    queryFn: async () => {
      const res = await api<{ uncategorized: Channel[]; categories: { channels: Channel[] }[] }>(
        `/api/communities/${route.params.communityId}/channels`,
      );
      return [
        ...(res.uncategorized ?? []),
        ...(res.categories ?? []).flatMap((category) => category.channels ?? []),
      ];
    },
  });

  useEffect(() => {
    const onboarding = onboardingQuery.data?.onboarding;
    if (!onboarding) return;

    setIsEnabled(Boolean(onboarding.isEnabled));
    setWelcomeMessage(onboarding.welcomeMessage ?? '');
    setRulesText(parseJsonArray(onboarding.rules).join('\n'));
    setDefaultChannelIds(parseJsonArray(onboarding.defaultChannelIds));
  }, [onboardingQuery.data?.onboarding]);

  const saveMutation = useMutation({
    mutationFn: (payload?: OnboardingPayload) =>
      api(`/api/communities/${route.params.communityId}/onboarding`, {
        method: 'PUT',
        body:
          payload ?? {
            isEnabled,
            welcomeMessage: welcomeMessage.trim() || undefined,
            rules: rulesText
              .split('\n')
              .map((rule) => rule.trim())
              .filter(Boolean),
            defaultChannelIds,
          },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community-onboarding', route.params.communityId],
      });
      Alert.alert(t('community.onboardingSavedTitle'), t('community.onboardingSavedBody'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('community.onboardingSaveFailed'),
      );
    },
  });

  const channels = channelsQuery.data ?? [];
  const filteredChannels = useMemo(() => {
    const normalizedQuery = channelSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return channels;
    }

    return channels.filter((channel) => channel.name.toLowerCase().includes(normalizedQuery));
  }, [channelSearchQuery, channels]);
  const hasLoaded = !onboardingQuery.isLoading && !channelsQuery.isLoading;
  const ruleCount = useMemo(
    () => rulesText.split('\n').map((rule) => rule.trim()).filter(Boolean).length,
    [rulesText],
  );

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || !hasLoaded) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{
        type?: 'save';
        welcomeMessage?: string;
        rules?: string[];
        defaultChannelIds?: string[];
        isEnabled?: boolean;
      }>('dev-community-onboarding-action.json');
      if (!action) return;

      try {
        if (action.type !== 'save') return;

        const nextChannelIds =
          action.defaultChannelIds?.filter((channelId) =>
            channels.some((channel) => channel.id === channelId),
          ) ?? [];
        const nextRules = action.rules ?? ['Be kind', 'Start in #general'];
        const nextWelcomeMessage = action.welcomeMessage ?? 'Simulator onboarding welcome';
        const nextEnabled = action.isEnabled ?? true;

        setIsEnabled(nextEnabled);
        setWelcomeMessage(nextWelcomeMessage);
        setRulesText(nextRules.join('\n'));
        setDefaultChannelIds(nextChannelIds);
        saveMutation.mutate({
          isEnabled: nextEnabled,
          welcomeMessage: nextWelcomeMessage,
          rules: nextRules,
          defaultChannelIds: nextChannelIds,
        });
      } finally {
        await deleteSimulatorHarnessFile('dev-community-onboarding-action.json');
      }
    }

    void runDevAction();
  }, [channels, hasLoaded, saveMutation]);

  if (!hasLoaded) {
    return <LoadingSpinner text={t('community.onboardingLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
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
          <View style={styles.section}>
            <Text style={styles.label}>{t('community.onboardingStatus')}</Text>
            <TouchableOpacity
              style={[styles.toggleCard, isEnabled && styles.toggleCardActive]}
              onPress={() => setIsEnabled((prev) => !prev)}
            >
              <Text style={[styles.toggleTitle, isEnabled && styles.toggleTitleActive]}>
                {isEnabled ? t('community.onboardingEnabled') : t('community.onboardingDisabled')}
              </Text>
              <Text style={styles.toggleBody}>{t('community.onboardingStatusHint')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('community.onboardingWelcome')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={welcomeMessage}
              onChangeText={setWelcomeMessage}
              placeholder={t('community.onboardingWelcomePlaceholder')}
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>{t('community.onboardingRules')}</Text>
              <Text style={styles.counter}>
                {t('community.onboardingRulesCount', { count: ruleCount })}
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.textAreaLarge]}
              value={rulesText}
              onChangeText={setRulesText}
              placeholder={t('community.onboardingRulesPlaceholder')}
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('community.onboardingDefaultChannels')}</Text>
            <Text style={styles.helper}>{t('community.onboardingDefaultChannelsHint')}</Text>
            <TextInput
              style={styles.input}
              value={channelSearchQuery}
              onChangeText={setChannelSearchQuery}
              placeholder={t('community.onboardingChannelSearchPlaceholder')}
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <View style={styles.channelWrap}>
              {filteredChannels.map((channel) => {
                const selected = defaultChannelIds.includes(channel.id);
                return (
                  <TouchableOpacity
                    key={channel.id}
                    style={[styles.channelChip, selected && styles.channelChipSelected]}
                    onPress={() =>
                      setDefaultChannelIds((prev) =>
                        prev.includes(channel.id)
                          ? prev.filter((id) => id !== channel.id)
                          : [...prev, channel.id],
                      )
                    }
                  >
                    <Text style={[styles.channelChipText, selected && styles.channelChipTextSelected]}>
                      # {channel.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredChannels.length === 0 ? (
              <Text style={styles.helper}>
                {channelSearchQuery.trim()
                  ? t('community.onboardingChannelNoSearchResults')
                  : t('community.onboardingNoChannels')}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
            onPress={() => saveMutation.mutate(undefined)}
            disabled={saveMutation.isPending}
          >
            <Text style={styles.saveButtonText}>
              {saveMutation.isPending ? t('community.onboardingSaving') : t('common.save')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  counter: {
    color: colors.textDim,
    fontSize: fs.sm,
  },
  helper: {
    color: colors.textMuted,
    fontSize: fs.base,
    lineHeight: 20,
  },
  toggleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  toggleTitleActive: {
    color: colors.primaryLight,
  },
  toggleBody: {
    color: colors.textMuted,
    fontSize: fs.base,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fs.lg,
  },
  textArea: {
    minHeight: 96,
  },
  textAreaLarge: {
    minHeight: 140,
  },
  channelWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  channelChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  channelChipSelected: {
    backgroundColor: colors.primary,
  },
  channelChipText: {
    color: colors.textSecondary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  channelChipTextSelected: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
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
