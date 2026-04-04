import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../stores/auth';
import Avatar from '../components/Avatar';
import { useTranslation } from '../lib/i18n';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';

export default function MyQrScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const qrValue = `zktalk://user/${user?.id ?? ''}?displayName=${encodeURIComponent(
    user?.displayName ?? '',
  )}&username=${encodeURIComponent(user?.username ?? '')}`;

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: t('settings.myQrShareMessage', {
          name: user?.displayName ?? t('settings.unknown'),
          qrValue,
        }),
        title: t('settings.myQrShareTitle'),
      });
    } catch {
      // User cancelled sharing
    }
  }, [qrValue, t, user?.displayName]);

  const handleCopyLink = useCallback(() => {
    try {
      if (typeof Clipboard?.setString === 'function') {
        Clipboard.setString(qrValue);
        Alert.alert(t('settings.copyLinkSuccessTitle'), t('settings.copyLinkSuccessBody'));
        return;
      }
    } catch {
      // Fall through to the generic error below.
    }

    Alert.alert(t('common.error'), t('message.copyFailed'));
  }, [qrValue, t]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('settings.myQrNotLoggedIn')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Avatar name={user.displayName} avatarUrl={user.avatarUrl} size={72} />
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        {/* QR Code */}
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrValue}
              size={220}
              backgroundColor={colors.textPrimary}
              color={colors.backgroundDark}
            />
          </View>
          <Text style={styles.qrHint}>
            {t('settings.myQrHint')}
          </Text>
          <Text style={styles.desktopHint}>
            {t('settings.myQrDesktopHint')}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
            <Text style={styles.copyButtonText}>{t('settings.copyLinkButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>{t('settings.myQrShareButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textMuted,
    fontSize: fs.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xxl,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: fs.xxxl,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  username: {
    color: colors.textMuted,
    fontSize: fs.lg,
    marginTop: spacing.xs,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: fs.base,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
    width: '100%',
  },
  qrWrapper: {
    padding: spacing.lg,
    backgroundColor: colors.textPrimary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  qrHint: {
    color: colors.textMuted,
    fontSize: fs.md,
    textAlign: 'center',
  },
  desktopHint: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  copyButton: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyButtonText: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  shareButtonText: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    fontWeight: '600',
  },
});
