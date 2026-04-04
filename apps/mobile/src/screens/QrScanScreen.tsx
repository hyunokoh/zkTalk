import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'QrScan'>;

const QR_PREFIX = 'zktalk://qr/';
const PROFILE_QR_PREFIX = 'zktalk://user/';

type FriendshipCheckResponse = {
  status: 'none' | 'pending' | 'accepted' | 'blocked';
  friendshipId: string | null;
};

type SendFriendRequestResponse = {
  friendship: {
    id: string;
    status: 'pending' | 'accepted' | 'blocked';
  };
};

async function sendFriendRequest(userId: string) {
  return api<SendFriendRequestResponse>('/api/friends/request', {
    method: 'POST',
    body: { userId },
  });
}

function getFriendRequestAlertKey(error: unknown) {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const message = error.message.toLowerCase();

  if (error.status === 400 && message.includes('yourself')) {
    return 'self' as const;
  }

  if (error.status === 403 && message.includes('cannot send friend request')) {
    return 'blocked' as const;
  }

  if (error.status === 409 && message.includes('already friends')) {
    return 'already-added' as const;
  }

  if (error.status === 409 && message.includes('already sent')) {
    return 'pending' as const;
  }

  return null;
}

export default function QrScanScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled) return;

    let cancelled = false;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{
        type: 'scan';
        qrData?: string;
        autoConfirm?: boolean;
      }>('dev-qr-scan-action.json');
      if (!action || cancelled) return;

      try {
        const qrData = action.qrData?.trim();

        if (action.type !== 'scan' || !qrData) {
          throw new Error('Missing qrData for QR scan dev action');
        }

        if (qrData.startsWith(QR_PREFIX)) {
          await handleDesktopLoginQr(qrData);
        } else if (qrData.startsWith(PROFILE_QR_PREFIX)) {
          await handleProfileQr(qrData, { autoConfirm: action.autoConfirm });
        } else {
          throw new Error('Unsupported QR payload');
        }

        await writeSimulatorHarnessJson(
          'dev-qr-scan-result.json',
          {
            ok: true,
            action: 'scan',
            qrData,
          },
        );
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-qr-scan-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      } finally {
        await deleteSimulatorHarnessFile('dev-qr-scan-action.json');
      }
    }

    void runDevAction();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePermissionAction = async () => {
    if (permission?.canAskAgain) {
      await requestPermission();
      return;
    }

    await Linking.openSettings();
  };

  const handleBarCodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned || confirming) return;

    if (data.startsWith(QR_PREFIX)) {
      await handleDesktopLoginQr(data);
      return;
    }

    if (data.startsWith(PROFILE_QR_PREFIX)) {
      await handleProfileQr(data);
      return;
    }

    setScanned(true);
    Alert.alert(
      t('settings.invalidQrTitle'),
      t('settings.invalidQrBody'),
      [{ text: t('settings.scanAgain'), onPress: () => setScanned(false) }],
    );
  };

  const handleDesktopLoginQr = async (data: string) => {
    const qrToken = data.slice(QR_PREFIX.length);
    if (!qrToken) {
      setScanned(true);
      Alert.alert(t('settings.invalidQrTitle'), t('settings.invalidQrEmpty'), [
        { text: t('settings.scanAgain'), onPress: () => setScanned(false) },
      ]);
      return;
    }

    setScanned(true);
    setConfirming(true);
    try {
      await api('/api/auth/qr/confirm', {
        method: 'POST',
        body: { qrToken },
      });
      Alert.alert(
        t('settings.qrLoginSuccessTitle'),
        t('settings.qrLoginSuccessBody'),
        [{ text: t('common.confirm'), onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('settings.qrLoginFailed'),
        [{ text: t('common.retry'), onPress: () => setScanned(false) }],
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleProfileQr = async (data: string, options?: { autoConfirm?: boolean }) => {
    const raw = data.slice(PROFILE_QR_PREFIX.length);
    const [encodedUserId, query = ''] = raw.split('?');
    const userId = decodeURIComponent(encodedUserId ?? '').trim();

    if (!userId) {
      setScanned(true);
      Alert.alert(t('settings.invalidQrTitle'), t('settings.invalidQrBody'), [
        { text: t('settings.scanAgain'), onPress: () => setScanned(false) },
      ]);
      return;
    }

    const params = new URLSearchParams(query);
    const displayName = params.get('displayName') || t('settings.unknown');
    const username = params.get('username') || '';

    setScanned(true);
    setConfirming(true);

    try {
      const friendship = await api<FriendshipCheckResponse>(`/api/friends/check/${userId}`);

      if (friendship.status === 'accepted') {
        Alert.alert(
          t('settings.friendAlreadyAddedTitle'),
          t('settings.friendAlreadyAddedBody', { name: displayName }),
          [{ text: t('common.confirm'), onPress: () => setScanned(false) }],
        );
        return;
      }

      if (friendship.status === 'blocked') {
        Alert.alert(
          t('settings.friendBlockedTitle'),
          t('settings.friendBlockedBody'),
          [{ text: t('common.confirm'), onPress: () => setScanned(false) }],
        );
        return;
      }

      const submitFriendRequest = async () => {
        try {
          const result = await sendFriendRequest(userId);

          if (result.friendship.status === 'accepted') {
            Alert.alert(
              t('settings.friendRequestAcceptedTitle'),
              t('settings.friendRequestAcceptedBody', { name: displayName }),
            );
          } else {
            Alert.alert(
              t('settings.friendRequestSentTitle'),
              t('settings.friendRequestSentBody', { name: displayName }),
            );
          }
        } catch (err) {
          const alertKey = getFriendRequestAlertKey(err);
          if (alertKey === 'pending') {
            Alert.alert(
              t('settings.friendPendingTitle'),
              t('settings.friendPendingBody', { name: displayName }),
            );
            return;
          }

          if (alertKey === 'self') {
            Alert.alert(
              t('settings.friendSelfTitle'),
              t('settings.friendSelfBody'),
            );
            return;
          }

          if (alertKey === 'already-added') {
            Alert.alert(
              t('settings.friendAlreadyAddedTitle'),
              t('settings.friendAlreadyAddedBody', { name: displayName }),
            );
            return;
          }

          if (alertKey === 'blocked') {
            Alert.alert(
              t('settings.friendBlockedTitle'),
              t('settings.friendBlockedBody'),
            );
            return;
          }

          Alert.alert(
            t('common.error'),
            err instanceof Error ? err.message : t('settings.friendRequestFailed'),
          );
        } finally {
          setScanned(false);
        }
      };

      if (options?.autoConfirm) {
        await submitFriendRequest();
        return;
      }

      Alert.alert(
        t('settings.friendQrTitle'),
        username
          ? t('settings.friendQrBodyWithUsername', { name: displayName, username })
          : t('settings.friendQrBody', { name: displayName }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => setScanned(false),
          },
          {
            text: t('friends.add'),
            onPress: () => {
              void submitFriendRequest();
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('settings.friendRequestFailed'),
        [{ text: t('common.retry'), onPress: () => setScanned(false) }],
      );
    } finally {
      setConfirming(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>{t('settings.qrCheckingPermission')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.icon}>{'📷'}</Text>
          <Text style={styles.title}>{t('settings.qrCameraRequiredTitle')}</Text>
          <Text style={styles.subtitle}>
            {permission.canAskAgain
              ? t('settings.qrCameraRequiredBody')
              : t('settings.qrCameraBlockedBody')}
          </Text>
          <TouchableOpacity style={styles.button} onPress={handlePermissionAction}>
            <Text style={styles.buttonText}>
              {permission.canAskAgain
                ? t('settings.qrGrantPermission')
                : t('settings.openSystemSettings')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
        <View style={styles.instructions}>
          {confirming ? (
            <View style={styles.confirmingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.instructionText}>{t('settings.qrWorking')}</Text>
            </View>
          ) : (
            <Text style={styles.instructionText}>
              {t('settings.qrScanHint')}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  instructions: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  instructionText: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    textAlign: 'center',
    fontWeight: '500',
  },
  confirmingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fs.xxl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fs.base,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: fs.base,
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    fontWeight: '600',
  },
});
