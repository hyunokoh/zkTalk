import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import {
  getMobileSettingsFocusTarget,
  getSelectedMessageAiBehavior,
  listAiCapabilities,
  summarizeTranslationDisplayPreference,
  sortSettingsSectionIds,
  type SelectedMessageAiAction,
  type AiCapabilityId,
  type SettingsSectionId,
} from '@zktalk/shared';
import { getToken } from '../lib/storage';
import { useAuthStore } from '../stores/auth';
import { useTranslation, localeNames } from '../lib/i18n';
import { fetchAiRuntime, getAiRuntimePresentation } from '../lib/ai';
import { fetchUserSettings } from '../lib/user-settings';
import {
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import Avatar from '../components/Avatar';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsScreen'>;

export default function SettingsScreen({ navigation, route }: Props) {
  const { t, locale } = useTranslation();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const sectionOffsetsRef = useRef<Record<'account' | 'notifications' | 'data_privacy', number>>({
    account: 0,
    notifications: 0,
    data_privacy: 0,
  });
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [searchQuery, setSearchQuery] = useState('');
  const [devActionAttempted, setDevActionAttempted] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'on' | 'off' | 'unavailable'>('off');
  const [layoutVersion, setLayoutVersion] = useState(0);
  const { data: aiRuntime } = useQuery({
    queryKey: ['ai-runtime'],
    queryFn: fetchAiRuntime,
    staleTime: 30_000,
  });
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 30_000,
  });
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const aiRuntimePresentation = getAiRuntimePresentation(t, aiRuntime);
  const mobileAiCapabilities = listAiCapabilities('mobile');
  const translationPreferenceSummary = summarizeTranslationDisplayPreference(
    userSettings?.translationDisplay,
  );
  const selectedMessageAiSummary = (
    ['reply-draft', 'rewrite-draft', 'translate-inline'] as SelectedMessageAiAction[]
  ).map((action) => {
    const behavior = getSelectedMessageAiBehavior(action);

    if (behavior.effect === 'create-reply-draft') {
      return t('settings.aiBehaviorReplyDraft');
    }

    if (behavior.effect === 'replace-composer-draft') {
      return t('settings.aiBehaviorRewriteDraft');
    }

    return t('settings.aiBehaviorTranslateInline');
  });

  const openAiSettings = useCallback(
    (focusTarget: 'ai_translation' | 'machine_control') => {
      // Shared IA root remains navigation.navigate('AiSettings'); focusTarget only refines landing.
      navigation.navigate('AiSettings', {
        focusTarget,
      });
    },
    [navigation],
  );

  const recordSectionOffset = useCallback(
    (sectionId: 'account' | 'notifications' | 'data_privacy', nextOffset: number) => {
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
    useCallback(() => {
      const scrollY =
        !focusTarget || focusTarget === 'main' ? 0 : sectionOffsetsRef.current[focusTarget] ?? 0;

      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(scrollY - spacing.lg, 0),
          animated: true,
        });
      });

      return undefined;
    }, [focusTarget, layoutVersion]),
  );

  const getAiCapabilityLabel = useCallback(
    (capability: AiCapabilityId) => {
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
    },
    [t],
  );

  const matchesSearch = useCallback(
    (...values: Array<string | null | undefined>) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      return values.some((value) => value?.toLowerCase().includes(normalizedSearchQuery));
    },
    [normalizedSearchQuery],
  );

  const refreshNotificationStatus = useCallback(async () => {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      setNotificationStatus(permissions.granted ? 'on' : 'off');
    } catch {
      setNotificationStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    refreshNotificationStatus();
    const unsubscribe = navigation.addListener('focus', refreshNotificationStatus);
    return unsubscribe;
  }, [navigation, refreshNotificationStatus]);

  const handleNotifications = async () => {
    try {
      const current = await Notifications.getPermissionsAsync();

      if (current.granted) {
        Alert.alert(
          t('settings.notificationsEnabledTitle'),
          t('settings.notificationsEnabledBody'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.openSystemSettings'),
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
        return;
      }

      if (current.canAskAgain) {
        const requested = await Notifications.requestPermissionsAsync();
        const isGranted = requested.granted;
        setNotificationStatus(isGranted ? 'on' : 'off');

        if (isGranted) {
          Alert.alert(t('settings.notificationsEnabledTitle'), t('settings.notificationsGranted'));
        } else {
          Alert.alert(
            t('settings.notificationsDisabledTitle'),
            t('settings.notificationsDisabledBody'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('settings.openSystemSettings'),
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
        }
        return;
      }

      setNotificationStatus('off');
      Alert.alert(
        t('settings.notificationsDisabledTitle'),
        t('settings.notificationsDisabledBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.openSystemSettings'),
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
    } catch {
      setNotificationStatus('unavailable');
      Alert.alert(t('common.error'), t('settings.notificationsUnavailable'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttempted) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{ type: 'logout' }>('dev-settings-action.json');
      if (!action) return;

      try {
        if (action.type !== 'logout') {
          throw new Error('Unsupported settings dev action');
        }

        setDevActionAttempted(true);
        await logout();
        const remainingToken = await getToken();
        await writeSimulatorHarnessJson('dev-settings-result.json', {
          ok: true,
          action: 'logout',
          remainingTokenLength: remainingToken?.length ?? 0,
        });
      } catch (error) {
        await writeSimulatorHarnessJson('dev-settings-result.json', {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void runDevAction();
  }, [devActionAttempted, logout]);

  const showProfileSection = matchesSearch(
    t('settings.profile'),
    user?.displayName,
    user?.username,
    user?.bio,
    t('settings.editProfile'),
    t('settings.scanQr'),
    t('settings.myQr'),
  );
  const showScanQr = matchesSearch(t('settings.qrCode'), t('settings.scanQr'));
  const showMyQr = matchesSearch(t('settings.qrCode'), t('settings.myQr'));
  const showBackup = matchesSearch(t('settings.data'), t('settings.backup'));
  const showBookmarks = matchesSearch(t('settings.data'), t('settings.bookmarks'));
  const showTheme = matchesSearch(
    t('settings.preferences'),
    t('settings.theme'),
    t('settings.themeLockedHint'),
    t('settings.dark'),
  );
  const showLanguage = matchesSearch(
    t('settings.language'),
    localeNames[locale],
    'korean',
    'english',
    '한국어',
    '영어',
  );
  const showNotifications = matchesSearch(
    t('settings.preferences'),
    t('settings.notifications'),
    notificationStatus === 'on'
      ? t('settings.on')
      : notificationStatus === 'off'
        ? t('settings.off')
        : t('settings.unavailable'),
  );
  const showAi = matchesSearch(
    t('settings.ai'),
    t('settings.aiTranslation'),
    t('settings.aiTranslationSummary'),
    t('settings.aiSummary'),
    t('settings.aiMobileOnly'),
    t('ai.messageReplyDraft'),
    t('ai.messageRewriteDraft'),
    t('ai.messageTranslateInline'),
    aiRuntimePresentation?.label,
    aiRuntimePresentation?.description,
  );
  const showMachineControl = matchesSearch(
    t('settings.machineControl'),
    t('settings.machineControlSummary'),
    t('settings.machineControlHint'),
  );
  const showEditProfile = matchesSearch(t('settings.account'), t('settings.editProfile'));
  const showLinkedAccounts = matchesSearch(t('settings.account'), t('settings.linkedAccounts'));
  const showLogout = matchesSearch(t('settings.account'), t('settings.logout'));

  const hasResults =
    showProfileSection ||
    showBackup ||
    showBookmarks ||
    showTheme ||
    showLanguage ||
    showNotifications ||
    showAi ||
    showMachineControl ||
    showEditProfile ||
    showLinkedAccounts ||
    showLogout;
  const showDataSection = showBackup || showBookmarks;
  const showLanguageSection = showLanguage;
  const showPreferencesSection = showTheme;
  const showNotificationsSection = showNotifications;
  const showAiSection = showAi;
  const showAccountSection =
    showProfileSection || showEditProfile || showLinkedAccounts || showLogout;
  const sectionVisibility: Record<SettingsSectionId | 'preferences', boolean> = {
    account: showAccountSection,
    notifications: showNotificationsSection,
    language: showLanguageSection,
    ai_translation: showAiSection,
    machine_control: showMachineControl,
    data_privacy: showDataSection,
    preferences: showPreferencesSection,
  };
  const orderedSectionIds = [
    ...sortSettingsSectionIds([
      'account',
      'notifications',
      'language',
      'ai_translation',
      'machine_control',
      'data_privacy',
    ]),
    'preferences' as const,
  ].filter((sectionId) => sectionVisibility[sectionId]);

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} testID="settings-screen">
      {orderedSectionIds.includes('account') ? (
        <View
          style={styles.section}
          onLayout={(event) => recordSectionOffset('account', event.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileMainRow}>
              <Avatar
                name={user?.displayName ?? t('settings.unknown')}
                avatarUrl={user?.avatarUrl}
                size={56}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.displayName}>{user?.displayName ?? t('settings.unknown')}</Text>
                <Text style={styles.username}>
                  {user?.username ? `@${user.username}` : t('settings.unknown')}
                </Text>
                {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
              </View>
            </View>
            <View style={styles.profileActionRow}>
              {showEditProfile ? (
                <TouchableOpacity
                  style={styles.profileActionChipPrimary}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Text style={styles.profileActionChipPrimaryText}>
                    {t('settings.editProfile')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {showMyQr ? (
                <TouchableOpacity
                  style={styles.profileActionChip}
                  onPress={() => navigation.navigate('MyQr')}
                >
                  <Text style={styles.profileActionChipText}>{t('settings.myQr')}</Text>
                </TouchableOpacity>
              ) : null}
              {showScanQr ? (
                <TouchableOpacity
                  style={styles.profileActionChip}
                  onPress={() => navigation.navigate('QrScan')}
                >
                  <Text style={styles.profileActionChipText}>{t('settings.scanQr')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          {showLinkedAccounts ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('LinkedAccounts')}
            >
              <Text style={styles.menuIcon}>{'🔗'}</Text>
              <Text style={styles.menuText}>{t('settings.linkedAccounts')}</Text>
              <Text style={styles.menuArrow}>{'›'}</Text>
            </TouchableOpacity>
          ) : null}
          {showLogout ? (
            <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleLogout}>
              <Text style={styles.dangerText}>{t('settings.logout')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {orderedSectionIds.includes('notifications') ? (
        <View
          style={styles.section}
          onLayout={(event) => recordSectionOffset('notifications', event.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
            <Text style={styles.menuIcon}>{'🔔'}</Text>
            <Text style={styles.menuText}>{t('settings.notifications')}</Text>
            <Text style={styles.menuValue}>
              {notificationStatus === 'on'
                ? t('settings.on')
                : notificationStatus === 'off'
                  ? t('settings.off')
                  : t('settings.unavailable')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {orderedSectionIds.includes('language') ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('LanguageSettings')}
            testID="settings-language-entry"
          >
            <Text style={styles.menuIcon}>{'🌐'}</Text>
            <View style={styles.staticMenuContent}>
              <Text style={styles.menuText}>{t('settings.appDisplayLanguage')}</Text>
              <Text style={styles.menuSubtext}>{t('settings.languageSectionHint')}</Text>
            </View>
            <Text style={styles.menuValue}>{localeNames[locale]}</Text>
            <Text style={styles.menuArrow}>{'›'}</Text>
          </TouchableOpacity>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{t('settings.translationBoundaryTitle')}</Text>
            <Text style={styles.infoCardHint}>{t('settings.languageTranslationBoundary')}</Text>
          </View>
        </View>
      ) : null}

      {orderedSectionIds.includes('ai_translation') ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.aiTranslation')}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => openAiSettings(getMobileSettingsFocusTarget('ai_translation'))}
            testID="settings-ai-entry"
          >
            <Text style={styles.menuIcon}>{'✨'}</Text>
            <View style={styles.staticMenuContent}>
              <Text style={styles.menuText}>{t('settings.aiTranslation')}</Text>
              <Text style={styles.menuSubtext}>
                {t('settings.aiTranslationSummary', {
                  runtime: aiRuntimePresentation?.label ?? t('settings.aiRuntimeLoading'),
                })}
              </Text>
            </View>
            <Text style={styles.menuArrow}>{'›'}</Text>
          </TouchableOpacity>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{t('settings.translationActiveRule')}</Text>
            <Text style={styles.infoCardBody}>{translationPreferenceSummary.summary}</Text>
            <Text style={styles.infoCardHint}>
              {t('settings.translationTargetLabelPrefix')}
              {translationPreferenceSummary.targetLanguage ?? t('settings.translationNone')}
            </Text>
            <Text style={styles.infoCardHint}>
              {t('settings.translationReadableLabelPrefix')}
              {translationPreferenceSummary.readableLanguages.length > 0
                ? translationPreferenceSummary.readableLanguages.join(', ')
                : t('settings.translationNone')}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{t('settings.aiEntryPointsTitle')}</Text>
            <View style={styles.infoList}>
              {selectedMessageAiSummary.map((item) => (
                <Text key={item} style={styles.infoListItem}>
                  {'• '}
                  {item}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{t('settings.aiIncludedFeatures')}</Text>
            <View style={styles.infoList}>
              {mobileAiCapabilities.map((capability) => (
                <Text key={capability} style={styles.infoListItem}>
                  {'• '}
                  {getAiCapabilityLabel(capability)}
                </Text>
              ))}
            </View>
            <Text style={styles.infoCardHint}>{t('settings.aiMobileOnly')}</Text>
          </View>
        </View>
      ) : null}

      {orderedSectionIds.includes('machine_control') ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.machineControl')}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => openAiSettings(getMobileSettingsFocusTarget('machine_control'))}
            testID="settings-machine-control-entry"
          >
            <Text style={styles.menuIcon}>{'🖥️'}</Text>
            <View style={styles.staticMenuContent}>
              <Text style={styles.menuText}>{t('settings.machineControl')}</Text>
              <Text style={styles.menuSubtext}>{t('settings.machineControlSummary')}</Text>
            </View>
            <Text style={styles.menuArrow}>{'›'}</Text>
          </TouchableOpacity>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardHint}>{t('settings.machineControlHint')}</Text>
          </View>
        </View>
      ) : null}

      {orderedSectionIds.includes('data_privacy') ? (
        <View
          style={styles.section}
          onLayout={(event) => recordSectionOffset('data_privacy', event.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>{t('settings.dataPrivacy')}</Text>
          {showBackup ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Backup')}>
              <Text style={styles.menuIcon}>{'💾'}</Text>
              <Text style={styles.menuText}>{t('settings.backup')}</Text>
              <Text style={styles.menuArrow}>{'›'}</Text>
            </TouchableOpacity>
          ) : null}
          {showBookmarks ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Bookmarks')}
            >
              <Text style={styles.menuIcon}>{'🔖'}</Text>
              <Text style={styles.menuText}>{t('settings.bookmarks')}</Text>
              <Text style={styles.menuArrow}>{'›'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ApiKeys')}
          >
            <Text style={styles.menuIcon}>{'🔑'}</Text>
            <Text style={styles.menuText}>{t('apiKeys.title')}</Text>
            <Text style={styles.menuArrow}>{'›'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {orderedSectionIds.includes('preferences') ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
          {showTheme ? (
            <View style={[styles.menuItem, styles.staticMenuItem]}>
              <Text style={styles.menuIcon}>{'🎨'}</Text>
              <View style={styles.staticMenuContent}>
                <Text style={styles.menuText}>{t('settings.theme')}</Text>
                <Text style={styles.menuSubtext}>{t('settings.themeLockedHint')}</Text>
              </View>
              <Text style={styles.menuValue}>{t('settings.dark')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('settings.version')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: fs.xxl,
    fontWeight: '800',
  },
  heroBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 18,
    marginTop: 4,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: fs.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: fs.base,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fs.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infoCardTitle: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
    flex: 1,
  },
  infoBadge: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  infoBadgeText: {
    color: colors.textSecondary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  infoCardBody: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  infoList: {
    gap: spacing.xs,
  },
  infoListItem: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  infoCardHint: {
    color: colors.textMuted,
    fontSize: fs.sm,
    lineHeight: 18,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: fs.xxl,
    fontWeight: '600',
  },
  username: {
    color: colors.textMuted,
    fontSize: fs.base,
    marginTop: 2,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: fs.base,
    marginTop: spacing.sm,
  },
  profileActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  profileActionChip: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileActionChipPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  profileActionChipText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  profileActionChipPrimaryText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: 2,
  },
  staticMenuItem: {
    opacity: 0.92,
  },
  staticMenuContent: {
    flex: 1,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    flex: 1,
  },
  menuSubtext: {
    color: colors.textMuted,
    fontSize: fs.md,
    marginTop: spacing.xs,
  },
  menuValue: {
    color: colors.textMuted,
    fontSize: fs.lg,
  },
  menuArrow: {
    color: colors.textDim,
    fontSize: fs.xxl,
    fontWeight: '300',
  },
  dangerItem: {
    marginTop: spacing.sm,
  },
  dangerText: {
    color: colors.error,
    fontSize: fs.xl,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  footerText: {
    color: colors.textDim,
    fontSize: fs.md,
  },
});
