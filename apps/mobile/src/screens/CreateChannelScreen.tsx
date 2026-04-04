import React, { useState, useCallback, useMemo, useRef } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateChannel'>;

type ChannelType = 'chat' | 'forum' | 'announcement' | 'voice';
type ChannelVisibility = 'public' | 'role_restricted';
const SLOW_MODE_OPTIONS = [0, 10, 30, 60, 300];

interface ChannelCategory {
  id: string;
  name: string;
  position: number;
}

interface CommunityRole {
  id: string;
  name: string;
  priority: number;
  color: string | null;
  isSystemRole: boolean;
}

function getRoleLabel(
  role: CommunityRole,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  switch (role.name) {
    case 'owner':
      return t('community.roleOwner');
    case 'admin':
      return t('community.roleAdmin');
    case 'moderator':
      return t('community.roleModerator');
    case 'member':
      return t('community.roleMember');
    case 'guest':
      return t('community.roleGuest');
    default:
      return role.name;
  }
}

export default function CreateChannelScreen({ navigation, route }: Props) {
  const { communityId } = route.params;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const nameRef = useRef('');
  const descRef = useRef('');
  const [channelType, setChannelType] = useState<ChannelType>('chat');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ChannelVisibility>('public');
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [requireTopic, setRequireTopic] = useState(false);
  const [allowedViewRoleIds, setAllowedViewRoleIds] = useState<string[]>([]);
  const [allowedPostRoleIds, setAllowedPostRoleIds] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const devSubmitAttemptedRef = useRef(false);

  const { data: categories } = useQuery({
    queryKey: ['categories', communityId],
    queryFn: async () => {
      const res = await api<{ categories: ChannelCategory[] }>(
        `/api/communities/${communityId}/categories`,
      );
      return res.categories ?? [];
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['community-roles', communityId],
    queryFn: () =>
      api<{ roles: CommunityRole[] }>(`/api/communities/${communityId}/roles`),
  });

  const handleNameChange = useCallback((e: { nativeEvent: { text: string } }) => {
    nameRef.current = e.nativeEvent.text;
  }, []);

  const handleDescChange = useCallback((e: { nativeEvent: { text: string } }) => {
    descRef.current = e.nativeEvent.text;
  }, []);

  const createMutation = useMutation({
    mutationFn: (
      overrides?: Partial<{
        name: string;
        description: string;
        type: ChannelType;
      }>,
    ) =>
      api(`/api/communities/${communityId}/channels`, {
        method: 'POST',
        body: {
          name: overrides?.name?.trim() ?? nameRef.current.trim(),
          type: overrides?.type ?? channelType,
          description:
            (overrides?.description?.trim() ?? descRef.current.trim()) || undefined,
          categoryId: categoryId ?? undefined,
          visibility,
          slowModeSeconds,
          requireTopic,
          allowedViewRoleIds: visibility === 'role_restricted' ? allowedViewRoleIds : [],
          allowedPostRoleIds: visibility === 'role_restricted' ? allowedPostRoleIds : [],
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', communityId] });
      navigation.goBack();
    },
    onError: (err) => {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('channel.createError'),
      );
    },
  });

  const handleCreate = useCallback(() => {
    if (!nameRef.current.trim()) {
      Alert.alert(t('common.error'), t('channel.nameRequired'));
      return;
    }
    if (visibility === 'role_restricted' && allowedViewRoleIds.length === 0) {
      Alert.alert(t('common.error'), t('channel.visibilityRolesRequired'));
      return;
    }
    createMutation.mutate(undefined);
  }, [allowedViewRoleIds.length, createMutation, t, visibility]);

  const TYPE_OPTIONS: { key: ChannelType; label: string }[] = [
    { key: 'chat', label: t('channel.typeChat') },
    { key: 'forum', label: t('channel.typeForum') },
    { key: 'announcement', label: t('channel.typeAnnouncement') },
    { key: 'voice', label: t('home.voice') },
  ];
  const VISIBILITY_OPTIONS: { key: ChannelVisibility; label: string }[] = [
    { key: 'public', label: t('channel.visibilityPublic') },
    { key: 'role_restricted', label: t('channel.visibilityRestricted') },
  ];
  const selectableRoles = (rolesData?.roles ?? []).filter(
    (role) => !['owner', 'admin'].includes(role.name),
  );
  const filteredCategories = useMemo(() => {
    const normalizedQuery = categorySearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return categories ?? [];
    }

    return (categories ?? []).filter((category) =>
      category.name.toLowerCase().includes(normalizedQuery),
    );
  }, [categories, categorySearchQuery]);
  const filteredRoles = useMemo(() => {
    const normalizedQuery = roleSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return selectableRoles;
    }

    return selectableRoles.filter((role) =>
      getRoleLabel(role, t).toLowerCase().includes(normalizedQuery),
    );
  }, [roleSearchQuery, selectableRoles, t]);
  const restrictedViewCount = allowedViewRoleIds.length;
  const restrictedPostCount = allowedPostRoleIds.length;

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || devSubmitAttemptedRef.current) {
      return;
    }

    devSubmitAttemptedRef.current = true;

    async function tryDevSubmit() {
      const payload = await readSimulatorHarnessJson<
        | {
            communityId?: string;
            name?: string;
            description?: string;
            type?: ChannelType;
          }
        | undefined
      >('dev-create-channel.json');
      if (!payload) return;

      try {
        if (payload?.communityId !== communityId || !payload.name?.trim()) {
          return;
        }

        nameRef.current = payload.name.trim();
        descRef.current = payload.description?.trim() ?? '';
        setChannelType(payload.type ?? 'chat');

        await createMutation.mutateAsync({
          name: payload.name,
          description: payload.description ?? '',
          type: payload.type ?? 'chat',
        });
      } finally {
        await deleteSimulatorHarnessFile('dev-create-channel.json');
      }
    }

    void tryDevSubmit();
  }, [communityId, createMutation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.channelName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('channel.namePlaceholder')}
            placeholderTextColor={colors.textDim}
            onChange={handleNameChange}
            maxLength={100}
            autoFocus
          />
        </View>

        {/* Type */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.type')}</Text>
          <View style={styles.typeContainer}>
            {TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.typeOption,
                  channelType === option.key && styles.typeSelected,
                ]}
                onPress={() => setChannelType(option.key)}
              >
                <Text
                  style={[
                    styles.typeText,
                    channelType === option.key && styles.typeTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('community.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('channel.descPlaceholder')}
            placeholderTextColor={colors.textDim}
            onChange={handleDescChange}
            multiline
            maxLength={500}
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.category')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('channel.categorySearchPlaceholder')}
            placeholderTextColor={colors.textDim}
            value={categorySearchQuery}
            onChangeText={setCategorySearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={styles.categoryWrap}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                categoryId === null && styles.categoryChipSelected,
              ]}
              onPress={() => setCategoryId(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  categoryId === null && styles.categoryChipTextSelected,
                ]}
              >
                {t('channel.noCategory')}
              </Text>
            </TouchableOpacity>
            {filteredCategories.map((category) => {
              const selected = categoryId === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setCategoryId(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {filteredCategories.length === 0 ? (
            <Text style={styles.helper}>{t('channel.categoryNoSearchResultsBody')}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.visibility')}</Text>
          <Text style={styles.helper}>{t('channel.visibilityHint')}</Text>
          <View style={styles.categoryWrap}>
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = visibility === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setVisibility(option.key)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {visibility === 'role_restricted' ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('channel.visibilityRoles')}</Text>
            <Text style={styles.helper}>{t('channel.visibilityRolesHint')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('channel.roleSearchPlaceholder')}
              placeholderTextColor={colors.textDim}
              value={roleSearchQuery}
              onChangeText={setRoleSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <Text style={styles.summaryText}>
              {t('channel.visibilityRolesSummary', { count: restrictedViewCount })}
            </Text>
            <View style={styles.categoryWrap}>
              {filteredRoles.map((role) => {
                const selected = allowedViewRoleIds.includes(role.id);
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() =>
                      setAllowedViewRoleIds((prev) => {
                        const next = prev.includes(role.id)
                          ? prev.filter((id) => id !== role.id)
                          : [...prev, role.id];
                        if (!next.includes(role.id)) {
                          setAllowedPostRoleIds((postPrev) =>
                            postPrev.filter((id) => id !== role.id),
                          );
                        }
                        return next;
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {getRoleLabel(role, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredRoles.length === 0 ? (
              <Text style={styles.helper}>{t('channel.roleNoSearchResultsBody')}</Text>
            ) : null}
          </View>
        ) : null}

        {visibility === 'role_restricted' ? (
          <View style={styles.field}>
            <Text style={styles.label}>{t('channel.postRoles')}</Text>
            <Text style={styles.helper}>{t('channel.postRolesHint')}</Text>
            <Text style={styles.summaryText}>
              {t('channel.postRolesSummary', { count: restrictedPostCount })}
            </Text>
            <View style={styles.categoryWrap}>
              {filteredRoles.map((role) => {
                const selected = allowedPostRoleIds.includes(role.id);
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() =>
                      setAllowedPostRoleIds((prev) => {
                        const next = prev.includes(role.id)
                          ? prev.filter((id) => id !== role.id)
                          : [...prev, role.id];
                        if (!prev.includes(role.id)) {
                          setAllowedViewRoleIds((viewPrev) =>
                            viewPrev.includes(role.id) ? viewPrev : [...viewPrev, role.id],
                          );
                        }
                        return next;
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {getRoleLabel(role, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredRoles.length === 0 ? (
              <Text style={styles.helper}>{t('channel.roleNoSearchResultsBody')}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.slowMode')}</Text>
          <Text style={styles.helper}>{t('channel.slowModeDesc')}</Text>
          <View style={styles.categoryWrap}>
            {SLOW_MODE_OPTIONS.map((seconds) => {
              const selected = slowModeSeconds === seconds;
              return (
                <TouchableOpacity
                  key={seconds}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setSlowModeSeconds(seconds)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {t('channel.slowModeValue', { seconds })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.requireTopic')}</Text>
          <Text style={styles.helper}>{t('channel.requireTopicHint')}</Text>
          <View style={styles.categoryWrap}>
            {[
              { value: false, label: t('channel.requireTopicOff') },
              { value: true, label: t('channel.requireTopicOn') },
            ].map((option) => {
              const selected = requireTopic === option.value;
              return (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setRequireTopic(option.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Create button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            createMutation.isPending && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          <Text style={styles.createButtonText}>
            {createMutation.isPending ? t('channel.creating') : t('channel.createBtn')}
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
  helper: {
    color: colors.textMuted,
    fontSize: fs.base,
    lineHeight: 20,
  },
  summaryText: {
    color: colors.primaryLight,
    fontSize: fs.sm,
    fontWeight: '600',
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  typeText: {
    color: colors.textSecondary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: colors.primary,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: colors.white,
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
