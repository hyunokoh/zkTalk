import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'ManageCategories'>;

interface Channel {
  id: string;
  name: string;
}

interface ChannelCategory {
  id: string;
  name: string;
  position: number;
}

interface CategoryRow {
  id: string;
  name: string;
  position: number;
  channelCount: number;
}

export default function ManageCategoriesScreen({ route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const devActionAttemptedRef = React.useRef(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['categories', route.params.communityId],
    queryFn: async () => {
      const res = await api<{ categories: ChannelCategory[] }>(
        `/api/communities/${route.params.communityId}/categories`,
      );
      return res.categories ?? [];
    },
  });

  const { data: channelsData } = useQuery({
    queryKey: ['channels', route.params.communityId],
    queryFn: () =>
      api<{ uncategorized: Channel[]; categories: Array<{ id: string; channels: Channel[] }> }>(
        `/api/communities/${route.params.communityId}/channels`,
      ),
  });

  const categories = useMemo<CategoryRow[]>(
    () =>
      (data ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        position: category.position ?? 0,
        channelCount:
          channelsData?.categories.find((entry) => entry.id === category.id)?.channels.length ?? 0,
      })),
    [channelsData?.categories, data],
  );
  const filteredCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, t('channel.categoryChannelCount', { count: category.channelCount })]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [categories, searchQuery, t]);

  const invalidateCategoryQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories', route.params.communityId] }),
      queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api(`/api/communities/${route.params.communityId}/categories`, {
        method: 'POST',
        body: {
          name,
          position:
            categories.reduce(
              (max, category) => Math.max(max, category.position),
              -1,
            ) + 1,
        },
      }),
    onSuccess: async () => {
      setNewCategoryName('');
      await invalidateCategoryQueries();
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.categoryCreateFailed'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      api(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        body: { name },
      }),
    onSuccess: async () => {
      setEditingCategoryId(null);
      setEditingName('');
      await invalidateCategoryQueries();
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.categorySaveFailed'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) =>
      api(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await invalidateCategoryQueries();
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.categoryDeleteFailed'),
      );
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      categoryId,
      position,
      swapCategoryId,
      swapPosition,
    }: {
      categoryId: string;
      position: number;
      swapCategoryId: string;
      swapPosition: number;
    }) => {
      await api(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        body: { position: swapPosition },
      });
      await api(`/api/categories/${swapCategoryId}`, {
        method: 'PATCH',
        body: { position },
      });
    },
    onSuccess: invalidateCategoryQueries,
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.categoryReorderFailed'),
      );
    },
  });

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
      return;
    }

    if (!data) {
      return;
    }

    devActionAttemptedRef.current = true;

    async function tryDevAction() {
      const payload = await readSimulatorHarnessJson<
        | {
            action?: 'create' | 'rename' | 'delete';
            name?: string;
            categoryId?: string;
            newName?: string;
          }
        | undefined
      >('dev-manage-categories-action.json');
      if (!payload) return;

      try {
        if (payload?.action === 'create' && payload.name?.trim()) {
          await createMutation.mutateAsync(payload.name.trim());
        } else if (
          payload?.action === 'rename' &&
          payload.categoryId &&
          payload.newName?.trim()
        ) {
          await updateMutation.mutateAsync({
            categoryId: payload.categoryId,
            name: payload.newName.trim(),
          });
        } else if (payload?.action === 'delete' && payload.categoryId) {
          await deleteMutation.mutateAsync(payload.categoryId);
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-manage-categories-action.json');
      }
    }

    void tryDevAction();
  }, [createMutation, data, deleteMutation, updateMutation]);

  if (isLoading) {
    return <LoadingSpinner text={t('channel.categoriesLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>{t('channel.categoryCreate')}</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder={t('channel.categoryNamePlaceholder')}
              placeholderTextColor={colors.textDim}
              maxLength={80}
            />
            <TouchableOpacity
              style={[styles.primaryButton, createMutation.isPending && styles.disabledButton]}
              onPress={() => {
                const trimmed = newCategoryName.trim();
                if (!trimmed) {
                  Alert.alert(t('common.error'), t('channel.categoryNameRequired'));
                  return;
                }
                createMutation.mutate(trimmed);
              }}
              disabled={createMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {createMutation.isPending ? t('channel.categoryCreating') : t('channel.categoryCreate')}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('channel.categorySearchPlaceholder')}
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        }
        renderItem={({ item }) => {
          const isEditing = editingCategoryId === item.id;
          const isDeleting = deleteMutation.isPending && deleteMutation.variables === item.id;
          const isSaving =
            updateMutation.isPending && updateMutation.variables?.categoryId === item.id;
          const currentIndex = filteredCategories.findIndex((category) => category.id === item.id);
          const previousCategory =
            currentIndex > 0 ? filteredCategories[currentIndex - 1] : null;
          const nextCategory =
            currentIndex >= 0 && currentIndex < filteredCategories.length - 1
              ? filteredCategories[currentIndex + 1]
              : null;
          const isReordering =
            reorderMutation.isPending &&
            (reorderMutation.variables?.categoryId === item.id ||
              reorderMutation.variables?.swapCategoryId === item.id);

          return (
            <View style={styles.card}>
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={editingName}
                    onChangeText={setEditingName}
                    placeholder={t('channel.categoryNamePlaceholder')}
                    placeholderTextColor={colors.textDim}
                    autoFocus
                    maxLength={80}
                  />
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setEditingCategoryId(null);
                        setEditingName('');
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, isSaving && styles.disabledButton]}
                      onPress={() => {
                        const trimmed = editingName.trim();
                        if (!trimmed) {
                          Alert.alert(t('common.error'), t('channel.categoryNameRequired'));
                          return;
                        }
                        updateMutation.mutate({ categoryId: item.id, name: trimmed });
                      }}
                      disabled={isSaving}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isSaving ? t('channel.categorySaving') : t('common.save')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.rowHeader}>
                    <View style={styles.rowCopy}>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <Text style={styles.categoryMeta}>
                        {t('channel.categoryChannelCount', { count: item.channelCount })}
                      </Text>
                    </View>
                    <View style={styles.reorderActions}>
                      <TouchableOpacity
                        style={[
                          styles.reorderButton,
                          (!previousCategory || isReordering) && styles.disabledButton,
                        ]}
                        disabled={!previousCategory || isReordering}
                        onPress={() => {
                          if (!previousCategory) return;
                          reorderMutation.mutate({
                            categoryId: item.id,
                            position: item.position,
                            swapCategoryId: previousCategory.id,
                            swapPosition: previousCategory.position,
                          });
                        }}
                      >
                        <Text style={styles.reorderButtonText}>{t('channel.categoryMoveUp')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.reorderButton,
                          (!nextCategory || isReordering) && styles.disabledButton,
                        ]}
                        disabled={!nextCategory || isReordering}
                        onPress={() => {
                          if (!nextCategory) return;
                          reorderMutation.mutate({
                            categoryId: item.id,
                            position: item.position,
                            swapCategoryId: nextCategory.id,
                            swapPosition: nextCategory.position,
                          });
                        }}
                      >
                        <Text style={styles.reorderButtonText}>
                          {t('channel.categoryMoveDown')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setEditingCategoryId(item.id);
                        setEditingName(item.name);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dangerButton,
                        (item.channelCount > 0 || isDeleting) && styles.disabledButton,
                      ]}
                      disabled={item.channelCount > 0 || isDeleting}
                      onPress={() =>
                        Alert.alert(
                          t('channel.categoryDelete'),
                          t('channel.categoryDeleteConfirm', { name: item.name }),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('channel.categoryDelete'),
                              style: 'destructive',
                              onPress: () => deleteMutation.mutate(item.id),
                            },
                          ],
                        )
                      }
                    >
                      <Text style={styles.dangerButtonText}>
                        {isDeleting ? t('common.loading') : t('channel.categoryDelete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {item.channelCount > 0 ? (
                    <Text style={styles.helperText}>{t('channel.categoryDeleteHint')}</Text>
                  ) : null}
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="🗂️"
              title={
                searchQuery.trim()
                  ? t('channel.categoryNoSearchResults')
                  : t('channel.categoriesEmpty')
              }
              subtitle={
                searchQuery.trim()
                  ? t('channel.categoryNoSearchResultsBody')
                  : t('channel.categoriesHint')
              }
            />
          </View>
        }
        contentContainerStyle={filteredCategories.length === 0 ? styles.emptyList : styles.list}
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
  emptyList: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowCopy: {
    flex: 1,
  },
  reorderActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reorderButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonText: {
    color: colors.textSecondary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  categoryName: {
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  categoryMeta: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fs.base,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
