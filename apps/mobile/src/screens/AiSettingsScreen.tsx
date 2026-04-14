import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMobileSettingsFocusTarget,
  getSelectedMessageAiBehavior,
  getTranslationDisplayPreset,
  listAiCapabilities,
  listTranslationDisplayPresets,
  normalizeTranslationDisplayPreference,
  resolveTranslationDisplayPresetId,
  summarizeTranslationDisplayPreference,
  validateTranslationDisplayInput,
  type AiCapabilityId,
  type SelectedMessageAiAction,
  type TranslationDisplayMode,
  type TranslationDisplayPresetId,
} from '@zktalk/shared';
import { fetchAiRuntime, getAiRuntimePresentation } from '../lib/ai';
import { useTranslation } from '../lib/i18n';
import { fetchUserSettings, saveTranslationDisplay } from '../lib/user-settings';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/types';

function getProviderLabel(
  provider: 'openrouter' | 'anthropic' | 'gemini' | 'mock' | 'unset' | undefined,
) {
  switch (provider) {
    case 'openrouter':
      return 'OpenRouter';
    case 'anthropic':
      return 'Anthropic';
    case 'gemini':
      return 'Gemini';
    case 'mock':
      return 'Mock provider';
    case 'unset':
    default:
      return 'Not configured';
  }
}

type Props = NativeStackScreenProps<SettingsStackParamList, 'AiSettings'>;

export default function AiSettingsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const sectionOffsetsRef = useRef<Record<'ai_translation' | 'machine_control', number>>({
    ai_translation: 0,
    machine_control: 0,
  });
  const [layoutVersion, setLayoutVersion] = useState(0);
  const { data: runtime } = useQuery({
    queryKey: ['ai-runtime'],
    queryFn: fetchAiRuntime,
    staleTime: 30_000,
  });
  const {
    data: userSettings,
    refetch: refetchUserSettings,
    isLoading: isUserSettingsLoading,
  } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 30_000,
  });
  const [translationMode, setTranslationMode] = useState<TranslationDisplayMode>('manual_only');
  const [targetLanguageInput, setTargetLanguageInput] = useState('');
  const [readableLanguagesInput, setReadableLanguagesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const runtimePresentation = useMemo(() => getAiRuntimePresentation(t, runtime), [runtime, t]);
  const translationPresets = useMemo(() => listTranslationDisplayPresets(), []);
  const activePresetId = useMemo<TranslationDisplayPresetId | null>(
    () => resolveTranslationDisplayPresetId(userSettings?.translationDisplay),
    [userSettings?.translationDisplay],
  );
  const translationPreferenceSummary = useMemo(
    () => summarizeTranslationDisplayPreference(userSettings?.translationDisplay),
    [userSettings?.translationDisplay],
  );
  const mobileCapabilities = useMemo(() => listAiCapabilities('mobile'), []);
  const selectedMessageBehaviorItems = useMemo(
    () =>
      (['reply-draft', 'rewrite-draft', 'translate-inline'] as SelectedMessageAiAction[]).map(
        (action) => {
          const behavior = getSelectedMessageAiBehavior(action);

          if (behavior.effect === 'create-reply-draft') {
            return {
              action,
              title: t('settings.aiCapabilitySelectedMessageReplyDraft'),
              body: t('settings.aiBehaviorReplyDraft'),
            };
          }

          if (behavior.effect === 'replace-composer-draft') {
            return {
              action,
              title: t('settings.aiCapabilitySelectedMessageRewriteDraft'),
              body: t('settings.aiBehaviorRewriteDraft'),
            };
          }

          return {
            action,
            title: t('settings.aiCapabilitySelectedMessageTranslateInline'),
            body: t('settings.aiBehaviorTranslateInline'),
          };
        },
      ),
    [t],
  );

  useEffect(() => {
    const normalized = normalizeTranslationDisplayPreference(userSettings?.translationDisplay);
    setTranslationMode(normalized.mode);
    setTargetLanguageInput(normalized.targetLanguage ?? '');
    setReadableLanguagesInput(normalized.readableLanguages.join(', '));
  }, [userSettings?.translationDisplay]);

  const recordSectionOffset = React.useCallback(
    (sectionId: 'ai_translation' | 'machine_control', nextOffset: number) => {
      if (sectionOffsetsRef.current[sectionId] === nextOffset) {
        return;
      }

      sectionOffsetsRef.current[sectionId] = nextOffset;
      setLayoutVersion((current) => current + 1);
    },
    [],
  );

  const focusTarget = route.params?.focusTarget;

  useFocusEffect(
    React.useCallback(() => {
      if (!focusTarget) {
        return undefined;
      }

      const scrollY = sectionOffsetsRef.current[focusTarget] ?? 0;
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(scrollY - spacing.lg, 0),
          animated: true,
        });
      });

      return undefined;
    }, [focusTarget, layoutVersion]),
  );

  const getCapabilityLabel = (capability: AiCapabilityId) => {
    switch (capability) {
      case 'selected-message-reply-draft':
        return t('settings.aiCapabilitySelectedMessageReplyDraft');
      case 'selected-message-rewrite-draft':
        return t('settings.aiCapabilitySelectedMessageRewriteDraft');
      case 'selected-message-translate-inline':
        return t('settings.aiCapabilitySelectedMessageTranslateInline');
      default:
        return capability;
    }
  };

  const getLocalizedTranslationPreset = (presetId: TranslationDisplayPresetId) => {
    const preset = getTranslationDisplayPreset(presetId);

    return {
      label: t(`settings.translationPreset.${preset.id}.label`),
      description: t(`settings.translationPreset.${preset.id}.description`),
      bridgeInstruction: t(`settings.translationPreset.${preset.id}.bridgeInstruction`),
      fallbackLabel: preset.label,
      fallbackDescription: preset.description,
      fallbackBridgeInstruction: preset.bridgeInstruction,
    };
  };

  const getTranslationModeLabel = (mode: TranslationDisplayMode) => {
    switch (mode) {
      case 'target_language_all':
        return t('settings.translationModeAll');
      case 'target_language_except_readable':
        return t('settings.translationModeExceptReadable');
      case 'manual_only':
      default:
        return t('settings.translationModeManual');
    }
  };

  const getTranslationProductSummary = () => {
    if (translationPreferenceSummary.modeLabel === 'manual_only') {
      return {
        headline: t('settings.translationProductManualTitle'),
        detail: t('settings.translationProductManualBody'),
      };
    }

    if (translationPreferenceSummary.modeLabel === 'target_language_all') {
      return {
        headline: t('settings.translationProductAllTitle', {
          targetLanguage:
            translationPreferenceSummary.targetLanguage ?? t('settings.translationNone'),
        }),
        detail: t('settings.translationProductAllBody'),
      };
    }

    return {
      headline: t('settings.translationProductExceptReadableTitle', {
        targetLanguage:
          translationPreferenceSummary.targetLanguage ?? t('settings.translationNone'),
      }),
      detail: t('settings.translationProductExceptReadableBody', {
        readableLanguages:
          translationPreferenceSummary.readableLanguages.length > 0
            ? translationPreferenceSummary.readableLanguages.join(', ')
            : t('settings.translationNone'),
      }),
    };
  };

  const handlePresetSave = async (presetId: TranslationDisplayPresetId) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveTranslationDisplay(getTranslationDisplayPreset(presetId).translationDisplay);
      await refetchUserSettings();
    } catch {
      setSaveError(t('settings.translationSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomSave = async () => {
    const validation = validateTranslationDisplayInput({
      preference: userSettings?.translationDisplay,
      mode: translationMode,
      targetLanguageInput,
      readableLanguagesInput,
    });

    if (!validation.success) {
      setSaveError(
        validation.reason === 'invalid_readable_language'
          ? t('settings.translationReadableInvalid')
          : t('settings.translationTargetInvalid'),
      );
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveTranslationDisplay(validation.translationDisplay);
      await refetchUserSettings();
    } catch {
      setSaveError(t('settings.translationSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="ai-settings-screen"
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('settings.aiTranslation')}</Text>
        <Text style={styles.heroTitle}>{t('settings.aiTranslationTitle')}</Text>
        <Text style={styles.heroBody}>{t('settings.aiTranslationBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.relatedSettingsTitle')}</Text>
        <Text style={styles.sectionBody}>{t('settings.relatedSettingsBody')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.relatedButton}
            onPress={() =>
              navigation.navigate('LanguageSettings', {
                focusTarget: getMobileSettingsFocusTarget('language'),
              })
            }
            testID="ai-settings-open-language"
          >
            <Text style={styles.relatedButtonLabel}>{t('settings.appDisplayLanguage')}</Text>
            <Text style={styles.relatedButtonBody}>{t('settings.languageSectionHint')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.relatedButton, styles.relatedButtonDivider]}
            onPress={() =>
              navigation.navigate('SettingsScreen', {
                focusTarget: 'main',
              })
            }
            testID="ai-settings-open-home"
          >
            <Text style={styles.relatedButtonLabel}>{t('settings.openSettingsHome')}</Text>
            <Text style={styles.relatedButtonBody}>{t('settings.aiSummary')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.aiRuntime')}</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{getProviderLabel(runtime?.provider)}</Text>
            <View
              style={[
                styles.badge,
                runtimePresentation?.tone === 'live'
                  ? styles.badgeLive
                  : runtimePresentation?.tone === 'mock'
                    ? styles.badgeMock
                    : styles.badgeUnavailable,
              ]}
            >
              <Text style={styles.badgeText}>
                {runtimePresentation?.label ?? t('settings.aiRuntimeLoading')}
              </Text>
            </View>
          </View>
          <Text style={styles.cardBody}>
            {runtimePresentation?.description ?? t('settings.aiRuntimeLoadingBody')}
          </Text>
          <Text style={styles.cardHint}>{t('settings.aiMobileOnly')}</Text>
        </View>
      </View>

      <View
        style={styles.section}
        onLayout={(event) => recordSectionOffset('ai_translation', event.nativeEvent.layout.y)}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{t('settings.translationPresets')}</Text>
          <Text style={styles.sectionMeta}>
            {activePresetId
              ? getLocalizedTranslationPreset(activePresetId).label
              : t('settings.custom')}
          </Text>
        </View>
        <Text style={styles.sectionBody}>{t('settings.translationPresetsBody')}</Text>
        <View style={styles.card} testID="ai-settings-active-translation-rule">
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{t('settings.translationActiveRule')}</Text>
            <Text style={styles.activeRuleMode}>
              {getTranslationModeLabel(translationPreferenceSummary.modeLabel)}
            </Text>
          </View>
          <Text style={styles.cardBody}>{getTranslationProductSummary().headline}</Text>
          <Text style={styles.cardHintStrong}>{getTranslationProductSummary().detail}</Text>
          <Text style={styles.cardHint}>
            {t('settings.translationTargetLabelPrefix')}
            {translationPreferenceSummary.targetLanguage ?? t('settings.translationNone')}
          </Text>
          <Text style={styles.cardHint}>
            {t('settings.translationReadableLabelPrefix')}
            {translationPreferenceSummary.readableLanguages.length > 0
              ? translationPreferenceSummary.readableLanguages.join(', ')
              : t('settings.translationNone')}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.translationBoundaryTitle')}</Text>
          <Text style={styles.cardBody}>{t('settings.languageTranslationBoundary')}</Text>
        </View>
        {isUserSettingsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>{t('settings.translationLoading')}</Text>
          </View>
        ) : null}
        {translationPresets.map((preset) => {
          const isActive = activePresetId === preset.id;
          const localizedPreset = getLocalizedTranslationPreset(preset.id);

          return (
            <TouchableOpacity
              key={preset.id}
              style={[styles.card, isActive && styles.cardActive]}
              disabled={isSaving}
              onPress={() => void handlePresetSave(preset.id)}
              testID={`ai-settings-preset-${preset.id}`}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>
                  {localizedPreset.label || localizedPreset.fallbackLabel}
                </Text>
                {isActive ? <Text style={styles.activeLabel}>{t('settings.active')}</Text> : null}
              </View>
              <Text style={styles.cardBody}>
                {localizedPreset.description || localizedPreset.fallbackDescription}
              </Text>
              <Text style={styles.cardHint}>
                {t('settings.bridgeDefaultPrefix')}
                {localizedPreset.bridgeInstruction || localizedPreset.fallbackBridgeInstruction}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.translationCustomTitle')}</Text>
        <Text style={styles.sectionBody}>{t('settings.translationCustomBody')}</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('settings.translationMode')}</Text>
          <View style={styles.segmentedControl}>
            {(
              [
                ['manual_only', t('settings.translationModeManual')],
                ['target_language_except_readable', t('settings.translationModeExceptReadable')],
                ['target_language_all', t('settings.translationModeAll')],
              ] as Array<[TranslationDisplayMode, string]>
            ).map(([value, label], index) => {
              const selected = translationMode === value;

              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.segmentedOption,
                    index === 0 && styles.segmentedOptionFirst,
                    selected && styles.segmentedOptionSelected,
                  ]}
                  onPress={() => setTranslationMode(value)}
                >
                  <Text
                    style={[
                      styles.segmentedOptionText,
                      selected && styles.segmentedOptionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('settings.translationTargetLanguage')}</Text>
          <TextInput
            value={targetLanguageInput}
            onChangeText={setTargetLanguageInput}
            editable={translationMode !== 'manual_only'}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="pt-BR"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              translationMode === 'manual_only' && styles.textInputDisabled,
            ]}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('settings.translationReadableLanguages')}</Text>
          <TextInput
            value={readableLanguagesInput}
            onChangeText={setReadableLanguagesInput}
            editable={translationMode !== 'target_language_all'}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="en, ko, zh-Hant"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.textInput,
              translationMode === 'target_language_all' && styles.textInputDisabled,
            ]}
          />
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          disabled={isSaving}
          onPress={() => void handleCustomSave()}
          testID="ai-settings-custom-save"
        >
          <Text style={styles.primaryButtonText}>{t('settings.translationSave')}</Text>
        </TouchableOpacity>
        <Text style={styles.cardHint}>{t('settings.translationCustomHint')}</Text>
        <Text style={styles.cardHintStrong}>
          {isUserSettingsLoading
            ? t('settings.translationLoading')
            : isSaving
              ? t('settings.translationSaving')
              : t('settings.translationSavedHint')}
        </Text>
        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      </View>

      <View
        style={styles.section}
        onLayout={(event) => recordSectionOffset('machine_control', event.nativeEvent.layout.y)}
      >
        <Text style={styles.sectionTitle}>{t('settings.machineControl')}</Text>
        <Text style={styles.sectionBody}>{t('settings.machineControlSummary')}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.machineControl')}</Text>
          <Text style={styles.cardBody}>{t('settings.machineControlHint')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.aiEntryPointsTitle')}</Text>
        <Text style={styles.sectionBody}>{t('settings.aiSummary')}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.aiSelectedMessageTitle')}</Text>
          <Text style={styles.cardBody}>{t('settings.aiSelectedMessageBody')}</Text>
        </View>
        {selectedMessageBehaviorItems.map((item) => (
          <View key={item.action} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </View>
        ))}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.aiIncludedFeatures')}</Text>
          {mobileCapabilities.map((capability) => (
            <Text key={capability} style={styles.listItem}>
              {'• '}
              {getCapabilityLabel(capability)}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fs.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: fs.xxl,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  heroBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  cardActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primary,
  },
  cardTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: fs.base,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  cardHint: {
    color: colors.textMuted,
    fontSize: fs.xs,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  cardHintStrong: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeLive: {
    backgroundColor: colors.success + '22',
  },
  badgeMock: {
    backgroundColor: colors.warning + '22',
  },
  badgeUnavailable: {
    backgroundColor: colors.danger + '22',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  activeLabel: {
    color: colors.primary,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activeRuleMode: {
    color: colors.textMuted,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
  },
  inputGroup: {
    marginTop: spacing.md,
  },
  inputLabel: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  segmentedControl: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentedOption: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  segmentedOptionFirst: {
    borderTopWidth: 0,
  },
  segmentedOptionSelected: {
    backgroundColor: colors.primary + '22',
  },
  segmentedOptionText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '500',
  },
  segmentedOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: fs.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textInputDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.backgroundDark,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  listItem: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  relatedButton: {
    paddingVertical: spacing.sm,
  },
  relatedButtonDivider: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  relatedButtonLabel: {
    color: colors.textPrimary,
    fontSize: fs.md,
    fontWeight: '700',
  },
  relatedButtonBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});
