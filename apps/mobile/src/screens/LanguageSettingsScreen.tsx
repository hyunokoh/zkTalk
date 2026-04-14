import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getMobileSettingsFocusTarget,
  summarizeTranslationDisplayPreference,
} from '@zktalk/shared';
import { localeNames, useI18nStore, useTranslation, type Locale } from '../lib/i18n';
import { fetchUserSettings } from '../lib/user-settings';
import type { SettingsStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

const LOCALE_OPTIONS = Object.entries(localeNames) as [Locale, string][];

type Props = NativeStackScreenProps<SettingsStackParamList, 'LanguageSettings'>;

export default function LanguageSettingsScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const setLocale = useI18nStore((state) => state.setLocale);
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 30_000,
  });
  const translationPreferenceSummary = summarizeTranslationDisplayPreference(
    userSettings?.translationDisplay,
  );
  const translationProductSummary =
    translationPreferenceSummary.modeLabel === 'manual_only'
      ? {
          headline: t('settings.translationProductManualTitle'),
          detail: t('settings.translationProductManualBody'),
        }
      : translationPreferenceSummary.modeLabel === 'target_language_all'
        ? {
            headline: t('settings.translationProductAllTitle', {
              targetLanguage:
                translationPreferenceSummary.targetLanguage ?? t('settings.translationNone'),
            }),
            detail: t('settings.translationProductAllBody'),
          }
        : {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{t('settings.language')}</Text>
        <Text style={styles.heroTitle}>{t('settings.languageTitle')}</Text>
        <Text style={styles.heroBody}>{t('settings.languageBody')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appDisplayLanguage')}</Text>
        <Text style={styles.sectionBody}>{t('settings.languageSectionHint')}</Text>
        <View style={styles.optionList}>
          {LOCALE_OPTIONS.map(([value, label]) => {
            const selected = value === locale;

            return (
              <TouchableOpacity
                key={value}
                style={[styles.optionCard, selected && styles.optionCardSelected]}
                onPress={() => setLocale(value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`language-option-${value}`}
              >
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{label}</Text>
                  <Text style={styles.optionBody}>
                    {value === 'ko'
                      ? t('settings.languageOptionKo')
                      : t('settings.languageOptionEn')}
                  </Text>
                </View>
                <Text style={[styles.optionBadge, selected && styles.optionBadgeSelected]}>
                  {selected ? t('settings.active') : t('settings.selectLanguage')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteMeta}>{t('settings.relatedSettingsTitle')}</Text>
        <Text style={styles.noteTitle}>{t('settings.relatedSettingsBody')}</Text>
        <TouchableOpacity
          style={styles.noteButton}
          onPress={() =>
            navigation.navigate('SettingsScreen', {
              focusTarget: 'main',
            })
          }
          testID="language-settings-open-home"
        >
          <Text style={styles.noteButtonText}>{t('settings.openSettingsHome')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.noteButton, styles.noteButtonSecondary]}
          onPress={() =>
            navigation.navigate('AiSettings', {
              focusTarget: getMobileSettingsFocusTarget('machine_control'),
            })
          }
          testID="language-settings-machine-control-entry"
        >
          <Text style={styles.noteButtonText}>{t('settings.machineControl')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteMeta}>{t('settings.translationPresets')}</Text>
        <Text style={styles.noteTitle}>{t('settings.translationBoundaryTitle')}</Text>
        <Text style={styles.noteBody}>{t('settings.languageTranslationBoundary')}</Text>
        <Text style={styles.noteSummary}>{translationProductSummary.headline}</Text>
        <Text style={styles.noteBody}>{translationProductSummary.detail}</Text>
        <Text style={styles.noteMeta}>{t('settings.translationActiveRule')}</Text>
        <Text style={styles.noteBodyMuted}>{translationPreferenceSummary.summary}</Text>
        <Text style={styles.noteBodyMuted}>
          {t('settings.translationTargetLabelPrefix')}
          {translationPreferenceSummary.targetLanguage ?? t('settings.translationNone')}
        </Text>
        <Text style={styles.noteBodyMuted}>
          {t('settings.translationReadableLabelPrefix')}
          {translationPreferenceSummary.readableLanguages.length > 0
            ? translationPreferenceSummary.readableLanguages.join(', ')
            : t('settings.translationNone')}
        </Text>
        <TouchableOpacity
          style={styles.noteButton}
          onPress={() =>
            navigation.navigate('AiSettings', {
              focusTarget: getMobileSettingsFocusTarget('ai_translation'),
            })
          }
          testID="language-settings-translation-entry"
        >
          <Text style={styles.noteButtonText}>{t('settings.openAiTranslation')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>{t('settings.aiEntryPointsTitle')}</Text>
        <Text style={styles.noteBody}>{t('settings.aiSummary')}</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>{'\u2022 ' + t('settings.aiBehaviorReplyDraft')}</Text>
          <Text style={styles.listItem}>{'\u2022 ' + t('settings.aiBehaviorRewriteDraft')}</Text>
          <Text style={styles.listItem}>{'\u2022 ' + t('settings.aiBehaviorTranslateInline')}</Text>
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
    paddingBottom: spacing.xl,
  },
  heroCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fs.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: fs.xxl,
    fontWeight: '800',
  },
  heroBody: {
    color: colors.textSecondary,
    fontSize: fs.md,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  optionList: {
    gap: spacing.sm,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  optionCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: fs.md,
    fontWeight: '700',
  },
  optionBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  optionBadge: {
    color: colors.textMuted,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  optionBadgeSelected: {
    color: colors.primary,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  noteTitle: {
    color: colors.textPrimary,
    fontSize: fs.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  noteBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  noteSummary: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  noteMeta: {
    color: colors.textMuted,
    fontSize: fs.xs,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noteBodyMuted: {
    color: colors.textMuted,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  noteButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  noteButtonSecondary: {
    marginTop: spacing.sm,
  },
  noteButtonText: {
    color: colors.backgroundDark,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  list: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  listItem: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    lineHeight: 20,
  },
});
