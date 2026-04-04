import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getVersionedImageUrl } from '../lib/community-image';
import { pickImage, uploadImageAsset } from '../lib/file-picker';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'EditCommunity'>;

type Visibility = 'public' | 'invite_only' | 'private';

interface CommunityListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  ownerUserId?: string;
  visibility?: Visibility;
}

interface UpdateCommunityPayload {
  name: string;
  description?: string;
  visibility: Visibility;
  iconUrl?: string | null;
}

export default function EditCommunityScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState(route.params.communityName ?? '');
  const [iconUrl, setIconUrl] = useState(route.params.iconUrl ?? '');
  const [iconPreviewVersion, setIconPreviewVersion] = useState<string | null>(null);
  const [description, setDescription] = useState(route.params.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(route.params.visibility ?? 'public');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsetsRef = useRef<Record<'appearance' | 'details' | 'visibility', number>>({
    appearance: 0,
    details: 0,
    visibility: 0,
  });

  const saveMutation = useMutation({
    mutationFn: (payload?: UpdateCommunityPayload) =>
      api<{ community: CommunityListItem }>(`/api/communities/${route.params.communityId}`, {
        method: 'PATCH',
        body: {
          name: payload?.name ?? name.trim(),
          description: payload?.description ?? (description.trim() || undefined),
          visibility: payload?.visibility ?? visibility,
          iconUrl: payload?.iconUrl ?? (iconUrl || null),
        },
      }),
    onSuccess: ({ community }) => {
      queryClient.setQueryData<{ communities: CommunityListItem[] } | undefined>(
        ['communities'],
        (current) => {
          if (!current) return current;
          return {
            communities: current.communities.map((item) =>
              item.id === community.id ? { ...item, ...community } : item,
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      Alert.alert(t('community.editSavedTitle'), t('community.editSavedBody'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('community.editFailed'),
      );
    },
  });

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('community.nameRequired'));
      return;
    }

    saveMutation.mutate(undefined);
  }, [name, saveMutation, t]);

  const handlePickIcon = useCallback(async () => {
    try {
      const file = await pickImage();
      if (!file) return;

      setIsUploadingIcon(true);
      const uploadedUrl = await uploadImageAsset(
        file,
        'community_icon',
        route.params.communityId,
      );
      setIconUrl(uploadedUrl);
      setIconPreviewVersion(String(Date.now()));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('community.editFailed'),
      );
    } finally {
      setIsUploadingIcon(false);
    }
  }, [route.params.communityId, t]);

  const scrollToSection = useCallback((section: 'appearance' | 'details' | 'visibility') => {
    scrollRef.current?.scrollTo({
      y: Math.max(sectionOffsetsRef.current[section] - spacing.lg, 0),
      animated: true,
    });
  }, []);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{
        type?: 'save';
        name?: string;
        description?: string;
        visibility?: Visibility;
      }>('dev-edit-community-action.json');
      if (!action) return;

      try {
        if (action.type !== 'save') return;

        const nextName = action.name ?? route.params.communityName ?? 'Simulator community';
        const nextDescription = action.description ?? '';
        const nextVisibility = action.visibility ?? route.params.visibility ?? 'public';

        setName(nextName);
        setDescription(nextDescription);
        setVisibility(nextVisibility);

        saveMutation.mutate({
          name: nextName.trim(),
          description: nextDescription.trim() || undefined,
          visibility: nextVisibility,
          iconUrl: iconUrl || null,
        });
      } finally {
        await deleteSimulatorHarnessFile('dev-edit-community-action.json');
      }
    }

    void runDevAction();
  }, [route.params.communityName, route.params.visibility, saveMutation]);

  const visibilityOptions: { key: Visibility; label: string }[] = [
    { key: 'public', label: t('community.public') },
    { key: 'invite_only', label: t('community.inviteOnly') },
    { key: 'private', label: t('community.private') },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{t('community.edit')}</Text>
          <Text style={styles.heroBody}>{t('community.editSubtitle')}</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroChip}
              onPress={() => scrollToSection('appearance')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroChipText}>{t('community.iconPhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroChip}
              onPress={() => scrollToSection('details')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroChipText}>{t('community.name')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroChip}
              onPress={() => scrollToSection('visibility')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroChipText}>{t('community.visibility')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={styles.sectionCard}
          onLayout={(event) => {
            sectionOffsetsRef.current.appearance = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionTitle}>{t('community.iconPhoto')}</Text>
          <View style={styles.iconCard}>
            <View style={styles.iconPreview}>
              {iconUrl ? (
                <Image
                  source={{ uri: getVersionedImageUrl(iconUrl, iconPreviewVersion) ?? iconUrl }}
                  style={styles.iconPreviewImage}
                />
              ) : (
                <Text style={styles.iconPreviewText}>
                  {(name || route.params.communityName || '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.iconCopy}>
              <Text style={styles.iconHint}>{t('community.iconHint')}</Text>
              <TouchableOpacity
                style={[styles.iconButton, isUploadingIcon && styles.saveButtonDisabled]}
                onPress={handlePickIcon}
                disabled={isUploadingIcon}
              >
                <Text style={styles.iconButtonText}>
                  {isUploadingIcon ? t('common.loading') : t('community.iconPhoto')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View
          style={styles.sectionCard}
          onLayout={(event) => {
            sectionOffsetsRef.current.details = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionTitle}>{t('community.name')}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{t('community.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('community.namePlaceholder')}
              placeholderTextColor={colors.textDim}
              maxLength={100}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('community.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('community.descPlaceholder')}
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View
          style={styles.sectionCard}
          onLayout={(event) => {
            sectionOffsetsRef.current.visibility = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionTitle}>{t('community.visibility')}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{t('community.visibility')}</Text>
            <View style={styles.visibilityContainer}>
              {visibilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.visibilityOption,
                    visibility === option.key && styles.visibilitySelected,
                  ]}
                  onPress={() => setVisibility(option.key)}
                >
                  <Text
                    style={[
                      styles.visibilityText,
                      visibility === option.key && styles.visibilityTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {saveMutation.isPending ? t('community.editSaving') : t('common.save')}
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
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    gap: spacing.xs,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroChipText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '700',
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
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  iconCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  iconPreview: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPreviewImage: {
    width: '100%',
    height: '100%',
  },
  iconPreviewText: {
    color: colors.white,
    fontSize: fs.xxl,
    fontWeight: '800',
  },
  iconCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  iconHint: {
    color: colors.textDim,
    fontSize: fs.sm,
    lineHeight: 18,
  },
  iconButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '700',
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
  textArea: {
    minHeight: 88,
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  visibilityOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visibilitySelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  visibilityText: {
    color: colors.textSecondary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  visibilityTextSelected: {
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
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
