import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Paths, File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';

type OperationState = 'idle' | 'backing_up' | 'restoring';

export default function BackupScreen() {
  const { t } = useTranslation();
  const [state, setState] = useState<OperationState>('idle');
  const [progress, setProgress] = useState('');
  const devActionAttemptedRef = React.useRef(false);

  const shareBackupFile = async (fileUri: string, filename: string) => {
    try {
      await Share.share({
        title: filename,
        message: filename,
        url: fileUri,
      });
    } catch {
      Alert.alert(t('backup.shareFailedTitle'), t('backup.shareFailedBody'));
    }
  };

  const handleBackup = async () => {
    setState('backing_up');
    setProgress(t('backup.progressDownload'));

    try {
      // Fetch backup from server
      const backupData = await api<unknown>('/api/me/backup', {
        method: 'POST',
      });

      setProgress(t('backup.progressEncrypt'));

      // Simple base64 obfuscation (in production, use proper encryption)
      const raw = JSON.stringify(backupData);
      const encoded = btoa(unescape(encodeURIComponent(raw)));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `zktalk-backup-${timestamp}.json`;
      const file = new File(Paths.document, filename);
      await file.write(encoded);

      setProgress('');
      Alert.alert(
        t('backup.completeTitle'),
        t('backup.completeBody', { filename }),
        [
          {
            text: t('backup.share'),
            onPress: () => {
              void shareBackupFile(file.uri, filename);
            },
          },
          { text: t('common.confirm') },
        ],
      );
    } catch (err) {
      Alert.alert(
        t('backup.failedTitle'),
        err instanceof Error ? err.message : t('backup.failedBody'),
      );
    } finally {
      setState('idle');
      setProgress('');
    }
  };

  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      setState('restoring');
      setProgress(t('backup.progressRead'));

      const pickedFile = new File(file.uri);
      const encoded = await pickedFile.text();

      setProgress(t('backup.progressDecrypt'));

      try {
        const raw = decodeURIComponent(escape(atob(encoded)));
        JSON.parse(raw);
      } catch {
        throw new Error(t('backup.invalidFile'));
      }

      setProgress(t('backup.progressUpload'));

      await api('/api/me/restore', {
        method: 'POST',
        body: { encryptedData: encoded },
      });

      setProgress('');
      Alert.alert(
        t('backup.restoreCompleteTitle'),
        t('backup.restoreCompleteBody'),
        [{ text: t('common.confirm') }],
      );
    } catch (err) {
      Alert.alert(
        t('backup.restoreFailedTitle'),
        err instanceof Error ? err.message : t('backup.restoreFailedBody'),
      );
    } finally {
      setState('idle');
      setProgress('');
    }
  };

  const isWorking = state !== 'idle';

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
      return;
    }

    devActionAttemptedRef.current = true;

    async function tryDevAction() {
      const payload = await readSimulatorHarnessJson<
        | {
            action?: 'backup' | 'restore';
            fileUri?: string;
          }
        | undefined
      >('dev-backup-action.json');
      if (!payload) return;

      try {
        if (payload?.action === 'backup') {
          await handleBackup();
        } else if (payload?.action === 'restore' && payload.fileUri) {
          setState('restoring');
          setProgress(t('backup.progressRead'));

          const pickedFile = new File(payload.fileUri);
          const encoded = await pickedFile.text();

          setProgress(t('backup.progressDecrypt'));

          try {
            const rawJson = decodeURIComponent(escape(atob(encoded)));
            JSON.parse(rawJson);
          } catch {
            throw new Error(t('backup.invalidFile'));
          }

          setProgress(t('backup.progressUpload'));
          await api('/api/me/restore', {
            method: 'POST',
            body: { encryptedData: encoded },
          });
          setProgress('');
        }
      } catch (err) {
        Alert.alert(
          t('common.error'),
          err instanceof Error ? err.message : t('backup.failedBody'),
        );
      } finally {
        setState('idle');
        setProgress('');
        await deleteSimulatorHarnessFile('dev-backup-action.json');
      }
    }

    void tryDevAction();
  }, [t]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.icon}>{'💾'}</Text>
          <Text style={styles.title}>{t('backup.title')}</Text>
          <Text style={styles.subtitle}>{t('backup.subtitle')}</Text>
        </View>

        {/* Progress */}
        {isWorking && (
          <View style={styles.progressCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.progressText}>{progress}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, isWorking && styles.actionDisabled]}
            onPress={handleBackup}
            disabled={isWorking}
          >
            <Text style={styles.actionIcon}>{'⬇️'}</Text>
            <Text style={styles.actionTitle}>{t('backup.create')}</Text>
            <Text style={styles.actionDesc}>{t('backup.createDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, isWorking && styles.actionDisabled]}
            onPress={handleRestore}
            disabled={isWorking}
          >
            <Text style={styles.actionIcon}>{'⬆️'}</Text>
            <Text style={styles.actionTitle}>{t('backup.restore')}</Text>
            <Text style={styles.actionDesc}>{t('backup.restoreDesc')}</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('backup.infoTitle')}</Text>
          <Text style={styles.infoText}>{t('backup.infoText')}</Text>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fs.title,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fs.base,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: fs.base,
    flex: 1,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    color: colors.textPrimary,
    fontSize: fs.xxl,
    fontWeight: '600',
  },
  actionDesc: {
    color: colors.textMuted,
    fontSize: fs.md,
    flex: 1,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    color: colors.textSecondary,
    fontSize: fs.base,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: fs.md,
    lineHeight: 18,
  },
});
