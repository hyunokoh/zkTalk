import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'EditChannel'>;
type ChannelVisibility = 'public' | 'role_restricted';
const SLOW_MODE_OPTIONS = [0, 10, 30, 60, 300];
const DISAPPEARING_OPTIONS = [0, 30, 300, 3600, 86400];

interface ChannelDetail {
  id: string;
  communityId: string;
  categoryId?: string | null;
  name: string;
  description: string | null;
  type: 'chat' | 'announcement' | 'forum' | 'voice';
  visibility: 'public' | 'role_restricted';
  isArchived: boolean;
  slowModeSeconds?: number;
  disappearingDuration?: number | null;
  requireTopic?: boolean;
}

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

interface ChannelPermission {
  roleId: string;
  permissionKey: string;
  effect: 'allow' | 'deny';
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

export default function EditChannelScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState(route.params.channelName ?? '');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ChannelVisibility>('public');
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const [disappearingDuration, setDisappearingDuration] = useState<number | null>(null);
  const [requireTopic, setRequireTopic] = useState(false);
  const [allowedViewRoleIds, setAllowedViewRoleIds] = useState<string[]>([]);
  const [allowedPostRoleIds, setAllowedPostRoleIds] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const devActionAttemptedRef = React.useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['channel', route.params.channelId],
    queryFn: () =>
      api<{ channel: ChannelDetail }>(`/api/channels/${route.params.channelId}`),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', route.params.communityId],
    queryFn: async () => {
      const res = await api<{ categories: ChannelCategory[] }>(
        `/api/communities/${route.params.communityId}/categories`,
      );
      return res.categories ?? [];
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['community-roles', route.params.communityId],
    queryFn: () =>
      api<{ roles: CommunityRole[] }>(
        `/api/communities/${route.params.communityId}/roles`,
      ),
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['channel-permissions', route.params.channelId],
    queryFn: () =>
      api<{ permissions: ChannelPermission[] }>(
        `/api/channels/${route.params.channelId}/permissions`,
      ),
  });

  useEffect(() => {
    const channel = data?.channel;
    if (!channel) return;
    setName(channel.name);
    setDescription(channel.description ?? '');
    setCategoryId(channel.categoryId ?? null);
    setVisibility(channel.visibility ?? 'public');
    setSlowModeSeconds(channel.slowModeSeconds ?? 0);
    setDisappearingDuration(channel.disappearingDuration ?? null);
    setRequireTopic(channel.requireTopic ?? false);
  }, [data?.channel]);

  useEffect(() => {
    if (!rolesData?.roles || !permissionsData?.permissions) return;

    const selectableRoleIds = new Set(
      rolesData.roles
        .filter((role) => !['owner', 'admin'].includes(role.name))
        .map((role) => role.id),
    );

    setAllowedViewRoleIds(
      permissionsData.permissions
        .filter(
          (permission) =>
            permission.permissionKey === 'view_channel' &&
            permission.effect === 'allow' &&
            selectableRoleIds.has(permission.roleId),
        )
        .map((permission) => permission.roleId),
    );

    setAllowedPostRoleIds(
      permissionsData.permissions
        .filter(
          (permission) =>
            permission.permissionKey === 'post_message' &&
            permission.effect === 'allow' &&
            selectableRoleIds.has(permission.roleId),
        )
        .map((permission) => permission.roleId),
    );
  }, [permissionsData?.permissions, rolesData?.roles]);

  const saveMutation = useMutation({
    mutationFn: (
      overrides?: Partial<{
        name: string;
        description: string | null;
      }>,
    ) =>
      api<{ id: string; name: string; description: string | null }>(
        `/api/channels/${route.params.channelId}`,
        {
          method: 'PATCH',
          body: {
            name: overrides?.name?.trim() || name.trim(),
            description:
              overrides?.description !== undefined
                ? overrides.description
                : description.trim() || null,
            categoryId,
            visibility,
            slowModeSeconds,
            disappearingDuration,
            requireTopic,
            allowedViewRoleIds: visibility === 'role_restricted' ? allowedViewRoleIds : [],
            allowedPostRoleIds: visibility === 'role_restricted' ? allowedPostRoleIds : [],
          },
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channel', route.params.channelId] }),
        queryClient.invalidateQueries({
          queryKey: ['channel-permissions', route.params.channelId],
        }),
        queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] }),
      ]);
      Alert.alert(t('channel.editSavedTitle'), t('channel.editSavedBody'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.editFailed'),
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      api(`/api/channels/${route.params.channelId}/archive`, {
        method: 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channel', route.params.channelId] }),
        queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] }),
      ]);
      Alert.alert(t('channel.archiveSuccessTitle'), t('channel.archiveSuccessBody'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.archiveFailed'),
      );
    },
  });

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('channel.nameRequired'));
      return;
    }
    if (visibility === 'role_restricted' && allowedViewRoleIds.length === 0) {
      Alert.alert(t('common.error'), t('channel.visibilityRolesRequired'));
      return;
    }
    saveMutation.mutate(undefined);
  }, [allowedViewRoleIds.length, name, saveMutation, t, visibility]);

  const handleArchive = useCallback(() => {
    Alert.alert(t('channel.archive'), t('channel.archiveConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('channel.archive'),
        style: 'destructive',
        onPress: () => archiveMutation.mutate(),
      },
    ]);
  }, [archiveMutation, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
      return;
    }

    if (!data?.channel) {
      return;
    }
    const currentChannel = data.channel;

    devActionAttemptedRef.current = true;

    async function tryDevAction() {
      const payload = await readSimulatorHarnessJson<
        | {
            action?: 'save' | 'archive';
            channelId?: string;
            name?: string;
            description?: string;
          }
        | undefined
      >('dev-edit-channel-action.json');
      if (!payload) return;

      try {
        if (payload?.channelId !== route.params.channelId) {
          return;
        }

        if (payload.action === 'save') {
          setName(payload.name ?? currentChannel.name);
          setDescription(payload.description ?? currentChannel.description ?? '');

          await saveMutation.mutateAsync({
            name: payload.name?.trim() || currentChannel.name,
            description:
              (payload.description ?? currentChannel.description ?? '').trim() || null,
          });
        } else if (payload.action === 'archive') {
          await archiveMutation.mutateAsync();
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-edit-channel-action.json');
      }
    }

    void tryDevAction();
  }, [archiveMutation, data?.channel, route.params.channelId, saveMutation]);

  const channel = data?.channel;
  const visibilityOptions: { key: ChannelVisibility; label: string }[] = [
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

  if (isLoading) {
    return <LoadingSpinner text={t('channel.loadingDetails')} />;
  }

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
      >
        {channel?.isArchived ? (
          <View style={styles.archivedCard}>
            <Text style={styles.archivedTitle}>{t('channel.archivedTitle')}</Text>
            <Text style={styles.archivedBody}>{t('channel.archivedBody')}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.channelName')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('channel.namePlaceholder')}
            placeholderTextColor={colors.textDim}
            maxLength={100}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('community.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('channel.descPlaceholder')}
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('channel.category')}</Text>
          <TextInput
            style={styles.input}
            value={categorySearchQuery}
            onChangeText={setCategorySearchQuery}
            placeholder={t('channel.categorySearchPlaceholder')}
            placeholderTextColor={colors.textDim}
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
            {visibilityOptions.map((option) => {
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
              value={roleSearchQuery}
              onChangeText={setRoleSearchQuery}
              placeholder={t('channel.roleSearchPlaceholder')}
              placeholderTextColor={colors.textDim}
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
          <Text style={styles.label}>{t('disappearing.title')}</Text>
          <View style={styles.categoryWrap}>
            {DISAPPEARING_OPTIONS.map((seconds) => {
              const value = seconds === 0 ? null : seconds;
              const selected = disappearingDuration === value;
              return (
                <TouchableOpacity
                  key={seconds}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setDisappearingDuration(value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {seconds === 0
                      ? t('disappearing.off')
                      : t(`disappearing.${seconds === 30 ? '30s' : seconds === 300 ? '5m' : seconds === 3600 ? '1h' : '24h'}`)}
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

        <TouchableOpacity
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending || archiveMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {saveMutation.isPending ? t('channel.editSaving') : t('common.save')}
          </Text>
        </TouchableOpacity>

        {!channel?.isArchived && (
          <TouchableOpacity
            style={[styles.archiveButton, archiveMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleArchive}
            disabled={archiveMutation.isPending || saveMutation.isPending}
          >
            <Text style={styles.archiveButtonText}>
              {archiveMutation.isPending ? t('channel.archiving') : t('channel.archive')}
            </Text>
          </TouchableOpacity>
        )}
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
    minHeight: 88,
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
  archivedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.lg,
  },
  archivedTitle: {
    color: colors.warning,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  archivedBody: {
    color: colors.textMuted,
    fontSize: fs.base,
    lineHeight: 20,
    marginTop: spacing.xs,
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
  archiveButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  archiveButtonText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
});
