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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import { pickImage, uploadImageAsset } from '../lib/file-picker';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { SettingsStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/auth';
import { borderRadius, colors, fontSize, spacing } from '../theme';
import Avatar from '../components/Avatar';

type Props = NativeStackScreenProps<SettingsStackParamList, 'EditProfile'>;

type UpdateProfileResponse = {
  user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
  };
};

export default function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const initialDisplayName = user?.displayName ?? '';
  const initialBio = user?.bio ?? '';
  const initialAvatarUrl = user?.avatarUrl ?? '';

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isDirty = useMemo(
    () =>
      displayName.trim() !== initialDisplayName ||
      bio.trim() !== initialBio ||
      avatarUrl !== initialAvatarUrl,
    [avatarUrl, bio, displayName, initialAvatarUrl, initialBio, initialDisplayName],
  );

  const handlePickAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const file = await pickImage();
      if (!file) return;
      const uploadedAvatarUrl = await uploadImageAsset(file, 'user_avatar');
      setAvatarUrl(uploadedAvatarUrl);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.profileSaveFailed'),
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const nextDisplayName = displayName.trim();
    const nextBio = bio.trim();

    if (!nextDisplayName) {
      Alert.alert(t('common.error'), t('settings.displayNameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const result = await api<UpdateProfileResponse>('/api/me', {
        method: 'PATCH',
        body: {
          displayName: nextDisplayName,
          bio: nextBio || undefined,
          avatarUrl: avatarUrl || null,
        },
      });

      setUser(result.user);
      Alert.alert(t('settings.profile'), t('settings.profileSaved'));
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.profileSaveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isSimulatorHarnessEnabled) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{
        type?: 'save';
        displayName?: string;
        bio?: string;
      }>('dev-edit-profile-action.json');
      if (!action) return;

      try {
        if (action.type !== 'save') return;

        setDisplayName(action.displayName ?? initialDisplayName);
        setBio(action.bio ?? initialBio);

        const nextDisplayName = (action.displayName ?? initialDisplayName).trim();
        const nextBio = (action.bio ?? initialBio).trim();

        if (!nextDisplayName) {
          return;
        }

        setIsSaving(true);
        try {
          const result = await api<UpdateProfileResponse>('/api/me', {
            method: 'PATCH',
            body: {
              displayName: nextDisplayName,
              bio: nextBio || undefined,
              avatarUrl: avatarUrl || null,
            },
          });
          setUser(result.user);
          await writeSimulatorHarnessJson(
            'dev-edit-profile-result.json',
            {
              ok: true,
              action: 'save',
              displayName: result.user.displayName,
              bio: result.user.bio ?? '',
              avatarUrl: result.user.avatarUrl,
            },
          );
          Alert.alert(t('settings.profile'), t('settings.profileSaved'));
        } catch (error) {
          await writeSimulatorHarnessJson(
            'dev-edit-profile-result.json',
            {
              ok: false,
              error: error instanceof Error ? error.message : t('settings.profileSaveFailed'),
            },
          );
          Alert.alert(
            t('common.error'),
            error instanceof Error ? error.message : t('settings.profileSaveFailed'),
          );
        } finally {
          setIsSaving(false);
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-edit-profile-action.json');
      }
    }

    void runDevAction();
  }, [initialBio, initialDisplayName, setUser, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <Avatar
              name={displayName || user?.displayName || t('settings.unknown')}
              avatarUrl={avatarUrl || null}
              size={92}
            />
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => void handlePickAvatar()}
              disabled={isUploadingAvatar}
            >
              <Text style={styles.avatarButtonText}>
                {isUploadingAvatar ? t('common.loading') : t('settings.avatarPhoto')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('settings.displayName')}</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('settings.displayNamePlaceholder')}
              placeholderTextColor={colors.textDim}
              maxLength={100}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('settings.bio')}</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder={t('settings.bioPlaceholder')}
              placeholderTextColor={colors.textDim}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (!isDirty || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isDirty || isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? t('common.loading') : t('common.save')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarButton: {
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  avatarButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  bioInput: {
    minHeight: 140,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
});
