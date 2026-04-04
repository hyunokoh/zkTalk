import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  TextInput,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { getToken } from '../lib/storage';
import { useAuthStore } from '../stores/auth';
import { useTranslation, useI18nStore, localeNames, type Locale } from '../lib/i18n';
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

export default function SettingsScreen({ navigation }: Props) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [searchQuery, setSearchQuery] = useState('');
  const [devActionAttempted, setDevActionAttempted] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'on' | 'off' | 'unavailable'>(
    'off',
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

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

  const handleLanguage = () => {
    const options: { label: string; value: Locale }[] = [
      { label: '한국어', value: 'ko' },
      { label: 'English', value: 'en' },
    ];
    Alert.alert(
      t('settings.selectLanguage'),
      undefined,
      [
        ...options.map((opt) => ({
          text: opt.value === locale ? `${opt.label} ✓` : opt.label,
          onPress: () => useI18nStore.getState().setLocale(opt.value),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    );
  };

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
          Alert.alert(
            t('settings.notificationsEnabledTitle'),
            t('settings.notificationsGranted'),
          );
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
        await writeSimulatorHarnessJson(
          'dev-settings-result.json',
          {
            ok: true,
            action: 'logout',
            remainingTokenLength: remainingToken?.length ?? 0,
          },
        );
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-settings-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
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
    t('settings.preferences'),
    t('settings.language'),
    localeNames[locale],
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
    showEditProfile ||
    showLinkedAccounts ||
    showLogout;
  const showDataSection = showBackup || showBookmarks;
  const showPreferencesSection = showTheme || showLanguage || showNotifications;
  const showAccountSection = showLinkedAccounts || showLogout;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{t('settings.title')}</Text>
        <Text style={styles.heroBody}>{t('settings.listSubtitle')}</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('settings.searchPlaceholder')}
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {!hasResults ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('settings.noSearchResults')}</Text>
          <Text style={styles.emptyBody}>{t('settings.noSearchResultsBody')}</Text>
        </View>
      ) : null}

      {/* Profile Section */}
      {showProfileSection ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
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
        </View>
      ) : null}

      {/* Data Section */}
      {showDataSection ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
          {showBackup ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Backup')}
            >
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
        </View>
      ) : null}

      {/* Preferences Section */}
      {showPreferencesSection ? (
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
          {showLanguage ? (
            <TouchableOpacity style={styles.menuItem} onPress={handleLanguage}>
              <Text style={styles.menuIcon}>{'🌐'}</Text>
              <Text style={styles.menuText}>{t('settings.language')}</Text>
              <Text style={styles.menuValue}>{localeNames[locale]}</Text>
            </TouchableOpacity>
          ) : null}
          {showNotifications ? (
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
          ) : null}
        </View>
      ) : null}

      {/* Account Section */}
      {showAccountSection ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
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
            <TouchableOpacity
              style={[styles.menuItem, styles.dangerItem]}
              onPress={handleLogout}
            >
              <Text style={styles.dangerText}>{t('settings.logout')}</Text>
            </TouchableOpacity>
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
