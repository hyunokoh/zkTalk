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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'ManageChannels'>;

interface Channel {
  id: string;
  name: string;
  type: string;
  position?: number;
  categoryId?: string | null;
  isArchived?: boolean;
  sourceDmConversation?: {
    id: string;
    name: string | null;
    type: 'direct' | 'group';
  } | null;
}

interface ChannelCategory {
  id: string;
  name: string;
  channels: Channel[];
}

interface ChannelSection {
  id: string;
  title: string;
  channels: Channel[];
}

type ChannelRow =
  | {
      type: 'section';
      id: string;
      title: string;
    }
  | {
      type: 'drop';
      id: string;
      sectionId: string;
      index: number;
    }
  | {
      type: 'channel';
      id: string;
      sectionId: string;
      channel: Channel;
      index: number;
      sectionLength: number;
    };

function getChannelIcon(type: string): string {
  switch (type) {
    case 'voice':
      return '\u{1F50A}';
    case 'forum':
      return '\u{1F4CB}';
    case 'announcement':
      return '\u{1F4E2}';
    default:
      return '#';
  }
}

function getSourceDmSearchTerms(
  channel: Channel,
  directDmLabel: string,
  groupDmLabel: string,
): string[] {
  if (!channel.sourceDmConversation) {
    return [];
  }

  return [
    channel.sourceDmConversation.name ?? '',
    channel.sourceDmConversation.type === 'direct' ? directDmLabel : groupDmLabel,
  ];
}

export default function ManageChannelsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pickedChannel, setPickedChannel] = useState<{
    channelId: string;
    sectionId: string;
    name: string;
  } | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['channels', route.params.communityId],
    queryFn: async () => {
      const res = await api<{ uncategorized: Channel[]; categories: ChannelCategory[] }>(
        `/api/communities/${route.params.communityId}/channels`,
      );
      return {
        uncategorized: res.uncategorized ?? [],
        categories: res.categories ?? [],
      };
    },
  });

  const sections = useMemo<ChannelSection[]>(() => {
    const nextSections: ChannelSection[] = [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const directDmSearchLabel = `${t('dm.filterDirect')} ${t('dm.historyCompact')}`;
    const groupDmSearchLabel = `${t('dm.filterGroup')} ${t('dm.historyCompact')}`;

    if ((data?.uncategorized.length ?? 0) > 0) {
      const uncategorizedChannels = (data?.uncategorized ?? []).filter((channel) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          channel.name,
          t('home.uncategorizedChannels'),
          ...getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel),
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      });

      nextSections.push({
        id: 'uncategorized',
        title: t('home.uncategorizedChannels'),
        channels: uncategorizedChannels,
      });
    }

    for (const category of data?.categories ?? []) {
      const channels = (category.channels ?? []).filter((channel) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          channel.name,
          category.name,
          ...getSourceDmSearchTerms(channel, directDmSearchLabel, groupDmSearchLabel),
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      });

      nextSections.push({
        id: category.id,
        title: category.name,
        channels,
      });
    }

    return nextSections.filter((section) => section.channels.length > 0);
  }, [data?.categories, data?.uncategorized, searchQuery, t]);

  const isReorderDisabled = searchQuery.trim().length > 0;

  const rows = useMemo<ChannelRow[]>(() => {
    const nextRows: ChannelRow[] = [];

    for (const section of sections) {
      nextRows.push({ type: 'section', id: `section:${section.id}`, title: section.title });
      if (pickedChannel && !isReorderDisabled) {
        nextRows.push({
          type: 'drop',
          id: `drop:${section.id}:0`,
          sectionId: section.id,
          index: 0,
        });
      }
      section.channels.forEach((channel, index) => {
        nextRows.push({
          type: 'channel',
          id: channel.id,
          sectionId: section.id,
          channel,
          index,
          sectionLength: section.channels.length,
        });

        if (pickedChannel && !isReorderDisabled) {
          nextRows.push({
            type: 'drop',
            id: `drop:${section.id}:${index + 1}`,
            sectionId: section.id,
            index: index + 1,
          });
        }
      });
    }

    return nextRows;
  }, [isReorderDisabled, pickedChannel, sections]);

  const invalidateQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] });
  };

  const reorderMutation = useMutation({
    mutationFn: async ({
      sourceSectionId,
      targetSectionId,
      targetIndex,
      channelId,
    }: {
      sourceSectionId: string;
      targetSectionId: string;
      targetIndex: number;
      channelId: string;
    }) => {
      const sourceSection = sections.find((entry) => entry.id === sourceSectionId);
      const targetSection = sections.find((entry) => entry.id === targetSectionId);
      if (!sourceSection || !targetSection) {
        throw new Error(t('channel.orderReorderFailed'));
      }

      const sourceIndex = sourceSection.channels.findIndex((channel) => channel.id === channelId);
      if (sourceIndex < 0) {
        return;
      }

      const sameSection = sourceSectionId === targetSectionId;
      const nextSourceChannels = [...sourceSection.channels];
      const [moved] = nextSourceChannels.splice(sourceIndex, 1);
      const nextTargetChannels = sameSection
        ? nextSourceChannels
        : [...targetSection.channels];

      const normalizedTargetIndex = Math.max(
        0,
        Math.min(
          sameSection && sourceIndex < targetIndex ? targetIndex - 1 : targetIndex,
          nextTargetChannels.length,
        ),
      );
      nextTargetChannels.splice(normalizedTargetIndex, 0, moved);

      const sourceCategoryId = sourceSectionId === 'uncategorized' ? null : sourceSectionId;
      const targetCategoryId = targetSectionId === 'uncategorized' ? null : targetSectionId;

      const updates = sameSection
        ? nextTargetChannels.map((channel, index) =>
            api(`/api/channels/${channel.id}`, {
              method: 'PATCH',
              body: {
                categoryId: targetCategoryId,
                position: index,
              },
            }),
          )
        : [
            ...nextSourceChannels.map((channel, index) =>
              api(`/api/channels/${channel.id}`, {
                method: 'PATCH',
                body: {
                  categoryId: sourceCategoryId,
                  position: index,
                },
              }),
            ),
            ...nextTargetChannels.map((channel, index) =>
              api(`/api/channels/${channel.id}`, {
                method: 'PATCH',
                body: {
                  categoryId: targetCategoryId,
                  position: index,
                },
              }),
            ),
          ];

      await Promise.all(updates);
    },
    onSuccess: async () => {
      setPickedChannel(null);
      await invalidateQueries();
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.orderReorderFailed'),
      );
    },
  });

  if (isLoading) {
    return <LoadingSpinner text={t('channel.orderLoading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
              </View>
            );
          }

          if (item.type === 'drop') {
            if (!pickedChannel || reorderMutation.isPending) {
              return null;
            }

            const isSameSlot =
              pickedChannel.sectionId === item.sectionId &&
              sections
                .find((section) => section.id === item.sectionId)
                ?.channels.findIndex((channel) => channel.id === pickedChannel.channelId) === item.index;

            if (isSameSlot) {
              return null;
            }

            return (
              <TouchableOpacity
                style={styles.dropSlot}
                activeOpacity={0.8}
                onPress={() =>
                  reorderMutation.mutate({
                    sourceSectionId: pickedChannel.sectionId,
                    targetSectionId: item.sectionId,
                    targetIndex: item.index,
                    channelId: pickedChannel.channelId,
                  })
                }
              >
                <Text style={styles.dropSlotText}>{t('channel.orderDropHere')}</Text>
              </TouchableOpacity>
            );
          }

          const isPicked = pickedChannel?.channelId === item.channel.id;
          const isMovingCurrent =
            reorderMutation.isPending && reorderMutation.variables?.channelId === item.channel.id;
          const canMoveUp = item.index > 0 && !isMovingCurrent;
          const canMoveDown = item.index < item.sectionLength - 1 && !isMovingCurrent;
          const sourceDmName = item.channel.sourceDmConversation?.name?.trim() ?? '';
          const normalizedSearchQuery = searchQuery.trim().toLowerCase();
          const sourceDmMatchLabel =
            normalizedSearchQuery.length > 0 &&
            sourceDmName.length > 0 &&
            sourceDmName.toLowerCase().includes(normalizedSearchQuery) &&
            !item.channel.name.toLowerCase().includes(normalizedSearchQuery)
              ? t('channel.sourceDmNameLabelWithName', { name: sourceDmName })
              : undefined;

          return (
            <TouchableOpacity
              style={[styles.card, isPicked && styles.cardPicked]}
              activeOpacity={0.92}
              delayLongPress={180}
              disabled={isReorderDisabled}
              onLongPress={() =>
                setPickedChannel({
                  channelId: item.channel.id,
                  sectionId: item.sectionId,
                  name: item.channel.name,
                })
              }
            >
              <TouchableOpacity
                style={styles.rowMain}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('EditChannel', {
                    channelId: item.channel.id,
                    communityId: route.params.communityId,
                    channelName: item.channel.name,
                  })
                }
              >
                <Text style={styles.channelIcon}>{getChannelIcon(item.channel.type)}</Text>
                <View style={styles.rowCopy}>
                  <Text style={styles.channelName}>{item.channel.name}</Text>
                  {sourceDmMatchLabel ? (
                    <Text style={styles.channelSourceMatch} numberOfLines={1}>
                      {sourceDmMatchLabel}
                    </Text>
                  ) : null}
                  <Text style={styles.channelMeta}>
                    {item.channel.isArchived
                      ? t('channel.orderArchivedHint')
                      : t('channel.orderTapToEdit')}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isReorderDisabled && styles.disabledButton,
                    isPicked && styles.actionButtonActive,
                  ]}
                  disabled={isReorderDisabled}
                  onPress={() =>
                    setPickedChannel((current) =>
                      current?.channelId === item.channel.id
                        ? null
                        : {
                            channelId: item.channel.id,
                            sectionId: item.sectionId,
                            name: item.channel.name,
                          })
                  }
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      isPicked && styles.actionButtonTextActive,
                    ]}
                  >
                    {t('channel.orderPickUp')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, !canMoveUp && styles.disabledButton]}
                  disabled={!canMoveUp}
                  onPress={() =>
                    reorderMutation.mutate({
                      sourceSectionId: item.sectionId,
                      targetSectionId: item.sectionId,
                      targetIndex: item.index - 1,
                      channelId: item.channel.id,
                    })
                  }
                >
                  <Text style={styles.actionButtonText}>{t('channel.orderMoveUp')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, !canMoveDown && styles.disabledButton]}
                  disabled={!canMoveDown}
                  onPress={() =>
                    reorderMutation.mutate({
                      sourceSectionId: item.sectionId,
                      targetSectionId: item.sectionId,
                      targetIndex: item.index + 2,
                      channelId: item.channel.id,
                    })
                  }
                >
                  <Text style={styles.actionButtonText}>{t('channel.orderMoveDown')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>{t('channel.orderTitleCard')}</Text>
            <Text style={styles.headerBody}>{t('channel.orderHint')}</Text>
            {pickedChannel ? (
              <View style={styles.pickedBanner}>
                <Text style={styles.pickedBannerText}>
                  {t('channel.orderPickedUp', { name: pickedChannel.name })}
                </Text>
                <TouchableOpacity onPress={() => setPickedChannel(null)}>
                  <Text style={styles.pickedBannerAction}>
                    {t('channel.orderCancelPickUp')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('channel.orderSearchPlaceholder')}
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isReorderDisabled ? (
              <Text style={styles.searchWarning}>{t('channel.orderSearchDisable')}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="🧭"
              title={
                searchQuery.trim()
                  ? t('channel.orderNoSearchResults')
                  : t('channel.orderEmpty')
              }
              subtitle={
                searchQuery.trim()
                  ? t('channel.orderNoSearchResultsBody')
                  : t('channel.orderHint')
              }
            />
          </View>
        }
        contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.list}
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
    marginBottom: spacing.xs,
  },
  headerBody: {
    color: colors.textMuted,
    fontSize: fs.sm,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    color: colors.textPrimary,
    fontSize: fs.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchWarning: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fs.sm,
  },
  pickedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  pickedBannerText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  pickedBannerAction: {
    color: colors.primary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fs.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPicked: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIcon: {
    color: colors.textMuted,
    fontSize: fs.lg,
    marginRight: spacing.md,
  },
  rowCopy: {
    flex: 1,
  },
  channelName: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '700',
  },
  channelMeta: {
    color: colors.textMuted,
    fontSize: fs.sm,
    marginTop: spacing.xs,
  },
  channelSourceMatch: {
    color: colors.textMuted,
    fontSize: fs.xs,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  actionButtonActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonTextActive: {
    color: colors.primary,
  },
  dropSlot: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dropSlotText: {
    color: colors.primary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
