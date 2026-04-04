import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { api } from '../lib/api';
import {
  canSubmitCommunitySlug,
  getAutoCommunitySlugState,
  getManualCommunitySlugState,
  isCommunitySlugWarning,
  resolveCommunitySlugForSubmit,
} from '../lib/community-slug';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import type { CommunitySlugState, SlugFeedback } from '../lib/community-slug';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateCommunity'>;

type Visibility = 'public' | 'invite_only' | 'private';

export default function CreateCommunityScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [slugFeedback, setSlugFeedback] = useState<SlugFeedback>('idle');

  const slugManuallyEditedRef = useRef(false);
  const devActionAttemptedRef = useRef(false);

  React.useEffect(() => {
    if (!isFocused) {
      devActionAttemptedRef.current = false;
    }
  }, [isFocused]);

  const applySlugState = useCallback((nextState: CommunitySlugState) => {
    setSlug(nextState.slug);
    setSlugInput(nextState.slugInput);
    setSlugFeedback(nextState.slugFeedback);
  }, []);

  const handleNameChange = useCallback((nextName: string) => {
    setName(nextName);

    if (!slugManuallyEditedRef.current) {
      applySlugState(getAutoCommunitySlugState(nextName));
    }
  }, [applySlugState]);

  const handleNameEndEditing = useCallback(() => {
    if (!slugManuallyEditedRef.current) {
      applySlugState(getAutoCommunitySlugState(name));
    }
  }, [applySlugState, name]);

  const handleDescChange = useCallback((nextDescription: string) => {
    setDescription(nextDescription);
  }, []);

  const handleSlugChange = useCallback((value: string) => {
    slugManuallyEditedRef.current = value.trim().length > 0;
    applySlugState(getManualCommunitySlugState(value));
  }, [applySlugState]);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/api/communities', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          slug: resolveCommunitySlugForSubmit(name, slug),
          visibility,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      navigation.goBack();
    },
    onError: (err) => {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('community.createError'),
      );
    },
  });

  const handleCreate = useCallback(() => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('community.nameRequired'));
      return;
    }

    const finalSlug = resolveCommunitySlugForSubmit(name, slug);
    if (!finalSlug) {
      applySlugState(getAutoCommunitySlugState(name));
      Alert.alert(t('common.error'), t('community.slugRequired'));
      return;
    }

    createMutation.mutate();
  }, [applySlugState, createMutation, name, slug, t]);

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || !isFocused || devActionAttemptedRef.current) return;

    let cancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function runDevAction() {
      while (!cancelled && !devActionAttemptedRef.current) {
        const action = await readSimulatorHarnessJson<{
          type: 'create' | 'preview';
          name?: string;
          description?: string;
          slug?: string;
          slugInput?: string;
          visibility?: Visibility;
        }>('dev-create-community-action.json');
        if (!action || cancelled) {
          await sleep(250);
          continue;
        }

        try {
          if (action.type !== 'create' && action.type !== 'preview') {
            throw new Error('Unsupported create community dev action');
          }

          const name = action.name?.trim();
          if (!name) {
            throw new Error('Missing name for create community dev action');
          }

          devActionAttemptedRef.current = true;
          setName(name);
          setDescription(action.description?.trim() ?? '');
          setVisibility(action.visibility ?? 'public');

          const initialSlugState = action.slug?.trim()
            ? getManualCommunitySlugState(action.slug.trim())
            : getAutoCommunitySlugState(name);
          slugManuallyEditedRef.current = Boolean(action.slug?.trim());
          applySlugState(initialSlugState);

          if (action.type === 'preview') {
            let previewState = initialSlugState;

            if (typeof action.slugInput === 'string') {
              previewState = getManualCommunitySlugState(action.slugInput);
              slugManuallyEditedRef.current = true;
              applySlugState(previewState);
            }

            await writeSimulatorHarnessJson(
              'dev-create-community-result.json',
              {
                ok: true,
                action: 'preview',
                slugInput: previewState.slugInput,
                slug: previewState.slug,
                slugFeedback: previewState.slugFeedback,
                isWarning: previewState.isWarning,
                canSubmit: canSubmitCommunitySlug(name, previewState.slug),
              },
            );
            return;
          }

          const finalSlug = resolveCommunitySlugForSubmit(name, initialSlugState.slug);
          if (!finalSlug) {
            throw new Error('Unable to resolve slug for create community dev action');
          }

          const result = await api<{ community: { id: string; slug: string; name: string } }>('/api/communities', {
            method: 'POST',
            body: {
              name,
              description: (action.description?.trim() ?? '') || undefined,
              slug: finalSlug,
              visibility: action.visibility ?? 'public',
            },
          });

          await queryClient.invalidateQueries({ queryKey: ['communities'] });
          await writeSimulatorHarnessJson(
            'dev-create-community-result.json',
            {
              ok: true,
              communityId: result.community.id,
              slugInput: initialSlugState.slugInput,
              slug: result.community.slug,
              slugFeedback: initialSlugState.slugFeedback,
              isWarning: initialSlugState.isWarning,
              canSubmit: canSubmitCommunitySlug(name, initialSlugState.slug),
              name: result.community.name,
            },
          );
          return;
        } catch (error) {
          await writeSimulatorHarnessJson(
            'dev-create-community-result.json',
            {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          return;
        } finally {
          await deleteSimulatorHarnessFile('dev-create-community-action.json');
        }
      }
    }

    void runDevAction();
    return () => {
      cancelled = true;
    };
  }, [applySlugState, isFocused, queryClient]);

  const VISIBILITY_OPTIONS: { key: Visibility; label: string }[] = [
    { key: 'public', label: t('community.public') },
    { key: 'invite_only', label: t('community.inviteOnly') },
    { key: 'private', label: t('community.private') },
  ];

  const slugHelpText =
    slugFeedback === 'auto' && slug
      ? t('community.slugAutoGenerated', { slug })
      : slugFeedback === 'converted' && slug
        ? t('community.slugConverted', { slug })
        : slugFeedback === 'invalid'
          ? t('community.slugInvalid')
          : slugFeedback === 'needsManual'
            ? t('community.slugNeedsManual')
            : t('community.slugRules');

  const isSlugWarning =
    isCommunitySlugWarning(slugFeedback);
  const slugPreviewText = slug
    ? t('community.slugPreviewValue', { slug })
    : t('community.slugPreviewEmpty');
  const canCreate =
    !createMutation.isPending &&
    canSubmitCommunitySlug(name, slug);
  const createButtonHint = !name.trim()
    ? t('community.nameRequired')
    : canCreate
      ? t('community.createBtn')
      : slugHelpText;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('community.name')}</Text>
          <TextInput
            testID="create-community-name-input"
            style={styles.input}
            placeholder={t('community.namePlaceholder')}
            placeholderTextColor={colors.textDim}
            value={name}
            onChangeText={handleNameChange}
            onEndEditing={handleNameEndEditing}
            maxLength={100}
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('community.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('community.descPlaceholder')}
            placeholderTextColor={colors.textDim}
            value={description}
            onChangeText={handleDescChange}
            multiline
            maxLength={500}
            numberOfLines={3}
          />
        </View>

        {/* Slug */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('community.slug')}</Text>
          <TextInput
            testID="create-community-slug-input"
            accessibilityHint={slugHelpText}
            style={[
              styles.input,
              isSlugWarning && styles.inputWarning,
            ]}
            placeholder={t('community.slugPlaceholder')}
            placeholderTextColor={colors.textDim}
            value={slugInput}
            onChangeText={handleSlugChange}
            maxLength={60}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text
            testID="create-community-slug-help"
            accessibilityLiveRegion="polite"
            style={[
              styles.helpText,
              isSlugWarning && styles.helpTextWarning,
            ]}
          >
            {slugHelpText}
          </Text>
          <Text
            testID="create-community-slug-preview"
            accessibilityLiveRegion="polite"
            style={[
              styles.previewText,
              slug && styles.previewTextResolved,
            ]}
          >
            {slugPreviewText}
          </Text>
        </View>

        {/* Visibility */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('community.visibility')}</Text>
          <View style={styles.visibilityContainer}>
            {VISIBILITY_OPTIONS.map((option) => (
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

        {/* Create button */}
        <TouchableOpacity
          testID="create-community-submit"
          accessibilityHint={createButtonHint}
          accessibilityState={{ disabled: !canCreate, busy: createMutation.isPending }}
          style={[
            styles.createButton,
            !canCreate && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          <Text style={styles.createButtonText}>
            {createMutation.isPending ? t('community.creating') : t('community.createBtn')}
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
  inputWarning: {
    borderWidth: 1,
    borderColor: colors.warning,
  },
  helpText: {
    color: colors.textMuted,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  previewText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  previewTextResolved: {
    color: colors.primary,
  },
  helpTextWarning: {
    color: colors.warning,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fs.xl,
    fontWeight: '700',
  },
});
