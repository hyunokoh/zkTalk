import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  Alert,
  type AlertButton,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../stores/auth';
import { borderRadius, colors, fontSize as fs, getAvatarColor, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'CommunityMembers'>;

interface CommunityMember {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

interface CommunityRole {
  id: string;
  name: string;
  priority: number;
  color: string | null;
  isSystemRole: boolean;
}

interface CreateDmResult {
  id?: string;
  conversation?: {
    id: string;
  };
}

function getRoleLabel(
  role: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  switch (role) {
    case 'owner':
      return t('community.roleOwner');
    case 'admin':
      return t('community.roleAdmin');
    case 'moderator':
      return t('community.roleModerator');
    case 'member':
      return t('community.roleMember');
    default:
      return role;
  }
}

export default function CommunityMembersScreen({ route }: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'name' | 'joinedAt' | 'role'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const devActionAttemptedRef = React.useRef(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['community-members', route.params.communityId],
    queryFn: () =>
      api<{ members: CommunityMember[] }>(
        `/api/communities/${route.params.communityId}/members`,
      ),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['community-roles', route.params.communityId],
    queryFn: () =>
      api<{ roles: CommunityRole[] }>(
        `/api/communities/${route.params.communityId}/roles`,
      ),
  });

  const createDmMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api<CreateDmResult>('/api/dm/conversations', {
        method: 'POST',
        body: { targetUserId },
      }),
  });

  const moderateMemberMutation = useMutation({
    mutationFn: ({
      membershipId,
      action,
    }: {
      membershipId: string;
      action: 'mute' | 'kick' | 'ban';
    }) =>
      api(`/api/members/${membershipId}/${action}`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['community-members', route.params.communityId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['community-audit-log', route.params.communityId],
        }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('community.memberActionFailed'),
      );
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: string;
    }) =>
      api(`/api/communities/${route.params.communityId}/members/${userId}/role`, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['community-members', route.params.communityId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['community-audit-log', route.params.communityId],
        }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('community.memberRoleChangeFailed'),
      );
    },
  });

  const handleMessage = useCallback(
    async (member: CommunityMember) => {
      try {
        const result = await createDmMutation.mutateAsync(member.userId);
        const conversationId = result.id ?? result.conversation?.id;
        if (!conversationId) {
          throw new Error(t('community.membersMessageFailed'));
        }
        navigation.navigate('Main', {
          screen: 'DmTab',
          params: {
            screen: 'DmScreen',
            params: {
              conversationId,
              userId: member.userId,
              displayName: member.displayName,
            },
          },
        });
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('community.membersMessageFailed'),
        );
      }
    },
    [createDmMutation, navigation, t],
  );

  const members = data?.members ?? [];
  const rolePriorityMap = useMemo(
    () =>
      new Map(
        (rolesData?.roles ?? []).map((role) => [role.name, role.priority]),
      ),
    [rolesData?.roles],
  );
  const availableRoleFilters = useMemo(() => {
    const roleNames = Array.from(new Set(members.map((member) => member.role)));
    return roleNames.sort((a, b) => a.localeCompare(b));
  }, [members]);
  const filteredMembers = useMemo(() => {
    const filtered = members.filter((member) => {
      if (selectedRoleFilter && member.role !== selectedRoleFilter) {
        return false;
      }

      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [
        member.displayName,
        member.role,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(deferredSearchQuery);
    });
    return [...filtered].sort((a, b) => {
      if (sortField === 'role') {
        const left = rolePriorityMap.get(a.role) ?? Number.NEGATIVE_INFINITY;
        const right = rolePriorityMap.get(b.role) ?? Number.NEGATIVE_INFINITY;

        if (left !== right) {
          return sortOrder === 'asc' ? right - left : left - right;
        }

        const leftName = a.displayName.toLocaleLowerCase();
        const rightName = b.displayName.toLocaleLowerCase();
        return leftName.localeCompare(rightName);
      }

      if (sortField === 'joinedAt') {
        const left = new Date(a.joinedAt).getTime();
        const right = new Date(b.joinedAt).getTime();
        return sortOrder === 'asc' ? left - right : right - left;
      }

      const left = a.displayName.toLocaleLowerCase();
      const right = b.displayName.toLocaleLowerCase();
      return sortOrder === 'asc'
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });
  }, [deferredSearchQuery, members, rolePriorityMap, selectedRoleFilter, sortField, sortOrder]);
  const availableRoles = (rolesData?.roles ?? []).filter((role) => role.name !== 'owner');
  const currentUserRole = members.find((member) => member.userId === currentUser?.id)?.role;
  const canModerateMembers = ['owner', 'admin', 'moderator'].includes(currentUserRole ?? '');
  const canAssignRoles = ['owner', 'admin'].includes(currentUserRole ?? '');

  const handleModerationAction = useCallback(
    (
      member: CommunityMember,
      action: 'mute' | 'kick' | 'ban',
      title: string,
      body: string,
      successTitle: string,
      successBody: string,
    ) => {
      Alert.alert(title, body, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: title,
          style: 'destructive',
          onPress: async () => {
            try {
              await moderateMemberMutation.mutateAsync({
                membershipId: member.id,
                action,
              });
              Alert.alert(successTitle, successBody);
            } catch {
              // handled in mutation onError
            }
          },
        },
      ]);
    },
    [moderateMemberMutation, t],
  );

  const handleMemberMenu = useCallback(
    (member: CommunityMember) => {
      const buttons: AlertButton[] = [
        { text: t('common.cancel'), style: 'cancel' },
      ];

      if (canAssignRoles && member.role !== 'owner' && availableRoles.length > 0) {
        buttons.push({
          text: t('community.memberChangeRole'),
          onPress: () => {
            const roleButtons: AlertButton[] = [
              { text: t('common.cancel'), style: 'cancel' },
              ...availableRoles.map((role) => ({
                text: getRoleLabel(role.name, t),
                onPress: async () => {
                  try {
                    await assignRoleMutation.mutateAsync({
                      userId: member.userId,
                      role: role.name,
                    });
                    Alert.alert(
                      t('community.memberRoleChangeSuccessTitle'),
                      t('community.memberRoleChangeSuccessBody', {
                        name: member.displayName || t('common.unknown'),
                        role: getRoleLabel(role.name, t),
                      }),
                    );
                  } catch {
                    // handled in mutation onError
                  }
                },
              })),
            ];

            Alert.alert(
              t('community.memberChangeRole'),
              t('community.memberChangeRoleConfirm', {
                name: member.displayName || t('common.unknown'),
              }),
              roleButtons,
            );
          },
        });
      }

      if (!['owner', 'admin'].includes(member.role)) {
        buttons.push(
          {
            text: t('community.memberMute'),
            onPress: () =>
              handleModerationAction(
                member,
                'mute',
                t('community.memberMute'),
                t('community.memberMuteConfirm', { name: member.displayName || t('common.unknown') }),
                t('community.memberMuteSuccessTitle'),
                t('community.memberMuteSuccessBody', { name: member.displayName || t('common.unknown') }),
              ),
          },
          {
            text: t('community.memberKick'),
            style: 'destructive',
            onPress: () =>
              handleModerationAction(
                member,
                'kick',
                t('community.memberKick'),
                t('community.memberKickConfirm', { name: member.displayName || t('common.unknown') }),
                t('community.memberKickSuccessTitle'),
                t('community.memberKickSuccessBody', { name: member.displayName || t('common.unknown') }),
              ),
          },
          {
            text: t('community.memberBan'),
            style: 'destructive',
            onPress: () =>
              handleModerationAction(
                member,
                'ban',
                t('community.memberBan'),
                t('community.memberBanConfirm', { name: member.displayName || t('common.unknown') }),
                t('community.memberBanSuccessTitle'),
                t('community.memberBanSuccessBody', { name: member.displayName || t('common.unknown') }),
              ),
          },
        );
      }

      Alert.alert(member.displayName || t('common.unknown'), t('community.memberManageBody'), buttons);
    },
    [assignRoleMutation, availableRoles, canAssignRoles, handleModerationAction, t],
  );

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
      return;
    }

    if (!data?.members?.length) {
      return;
    }

    devActionAttemptedRef.current = true;

    async function tryDevAction() {
      const payload = await readSimulatorHarnessJson<
        | {
            action?: 'message' | 'role';
            userId?: string;
            role?: string;
          }
        | undefined
      >('dev-community-members-action.json');
      if (!payload) return;

      try {
        if (!payload?.userId) {
          return;
        }

        const member = (data?.members ?? []).find((item) => item.userId === payload.userId);
        if (!member) {
          return;
        }

        if (payload.action === 'message') {
          await handleMessage(member);
        } else if (payload.action === 'role' && payload.role) {
          await assignRoleMutation.mutateAsync({
            userId: member.userId,
            role: payload.role,
          });
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-community-members-action.json');
      }
    }

    void tryDevAction();
  }, [assignRoleMutation, data?.members, handleMessage]);

  if (isLoading) {
    return <LoadingSpinner text={t('community.membersLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('community.membersSearchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.roleFilterWrap}>
              <TouchableOpacity
                style={[
                  styles.roleFilterChip,
                  selectedRoleFilter === null && styles.roleFilterChipSelected,
                ]}
                onPress={() => setSelectedRoleFilter(null)}
              >
                <Text
                  style={[
                    styles.roleFilterChipText,
                    selectedRoleFilter === null && styles.roleFilterChipTextSelected,
                  ]}
                >
                  {t('community.membersFilterAll')}
                </Text>
              </TouchableOpacity>
              {availableRoleFilters.map((role) => {
                const selected = selectedRoleFilter === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleFilterChip, selected && styles.roleFilterChipSelected]}
                    onPress={() => setSelectedRoleFilter(role)}
                  >
                    <Text
                      style={[
                        styles.roleFilterChipText,
                        selected && styles.roleFilterChipTextSelected,
                      ]}
                    >
                      {getRoleLabel(role, t)}
                    </Text>
                  </TouchableOpacity>
                  );
                })}
            </View>
            <View style={styles.roleFilterWrap}>
              {[
                { key: 'name' as const, label: t('community.membersSortName') },
                { key: 'joinedAt' as const, label: t('community.membersSortJoined') },
                { key: 'role' as const, label: t('community.membersSortRole') },
              ].map((option) => {
                const selected = sortField === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.roleFilterChip, selected && styles.roleFilterChipSelected]}
                    onPress={() => setSortField(option.key)}
                  >
                    <Text
                      style={[
                        styles.roleFilterChipText,
                        selected && styles.roleFilterChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.roleFilterWrap}>
              {[
                {
                  key: 'asc' as const,
                  label:
                    sortField === 'joinedAt'
                      ? t('settings.sortOldest')
                      : sortField === 'role'
                        ? t('community.membersSortRoleHigh')
                        : t('settings.sortAsc'),
                },
                {
                  key: 'desc' as const,
                  label:
                    sortField === 'joinedAt'
                      ? t('settings.sortNewest')
                      : sortField === 'role'
                        ? t('community.membersSortRoleLow')
                        : t('settings.sortDesc'),
                },
              ].map((option) => {
                const selected = sortOrder === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.roleFilterChip, selected && styles.roleFilterChipSelected]}
                    onPress={() => setSortOrder(option.key)}
                  >
                    <Text
                      style={[
                        styles.roleFilterChipText,
                        selected && styles.roleFilterChipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const isCurrentUser = item.userId === currentUser?.id;
          const isMessaging =
            createDmMutation.isPending && createDmMutation.variables === item.userId;
          const isModerating =
            moderateMemberMutation.isPending && moderateMemberMutation.variables?.membershipId === item.id;
          const isAssigningRole =
            assignRoleMutation.isPending && assignRoleMutation.variables?.userId === item.userId;
          const displayName = item.displayName || t('common.unknown');
          const canModerateTarget =
            canModerateMembers && !isCurrentUser && !['owner', 'admin'].includes(item.role);
          const canManageRoleTarget =
            canAssignRoles && !isCurrentUser && item.role !== 'owner';
          const canOpenMenu = canModerateTarget || canManageRoleTarget;

          return (
            <View style={styles.card}>
              <View style={styles.memberRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(displayName || item.userId) },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {(displayName || item.userId).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberCopy}>
                  <View style={styles.nameRow}>
                    <Text style={styles.displayName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {isCurrentUser && <Text style={styles.youBadge}>{t('common.you')}</Text>}
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{getRoleLabel(item.role, t)}</Text>
                    </View>
                    <Text style={styles.joinedText}>
                      {t('community.memberJoined', {
                        date: new Date(item.joinedAt).toLocaleDateString(),
                      })}
                    </Text>
                  </View>
                </View>
                {!isCurrentUser && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => handleMessage(item)}
                      disabled={isMessaging || isModerating || isAssigningRole}
                    >
                      <Text style={styles.messageButtonText}>
                        {isMessaging ? t('common.loading') : t('friends.message')}
                      </Text>
                    </TouchableOpacity>
                    {canOpenMenu && (
                      <TouchableOpacity
                        style={styles.memberMenuButton}
                        onPress={() => handleMemberMenu(item)}
                        disabled={isModerating || isAssigningRole}
                      >
                        <Text style={styles.memberMenuButtonText}>
                          {isModerating || isAssigningRole ? '…' : '\u{22EF}'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="👥"
              title={deferredSearchQuery ? t('community.membersNoSearchResults') : t('community.membersEmpty')}
              subtitle={deferredSearchQuery ? t('community.membersNoSearchResultsBody') : t('community.membersHint')}
            />
          </View>
        }
        contentContainerStyle={filteredMembers.length === 0 ? styles.emptyList : styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingVertical: spacing.md,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: fs.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  roleFilterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  roleFilterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roleFilterChipSelected: {
    backgroundColor: colors.primary,
  },
  roleFilterChipText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  roleFilterChipTextSelected: {
    color: colors.white,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: fs.xl,
    fontWeight: '700',
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    fontWeight: '600',
    flexShrink: 1,
  },
  youBadge: {
    color: colors.primaryLight,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roleText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  joinedText: {
    color: colors.textMuted,
    fontSize: fs.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
    gap: spacing.sm,
  },
  messageButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  messageButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  memberMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberMenuButtonText: {
    color: colors.textSecondary,
    fontSize: fs.xl,
    lineHeight: 18,
  },
});
