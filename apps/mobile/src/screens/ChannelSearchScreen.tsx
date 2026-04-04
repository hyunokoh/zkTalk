import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import EmptyState from '../components/EmptyState';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ChannelSearch'>;

interface SearchRow {
  message: {
    id: string;
    bodyPlaintext: string;
    bodyMarkdown?: string;
    createdAt: string;
  };
  author: {
    displayName: string;
    username: string;
  };
}

export default function ChannelSearchScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const { data, isFetching } = useQuery({
    queryKey: ['channel-search', route.params.channelId, deferredQuery],
    enabled: deferredQuery.length > 0,
    queryFn: () =>
      api<{ messages: SearchRow[] }>(
        `/api/search/messages?q=${encodeURIComponent(deferredQuery)}&communityId=${encodeURIComponent(route.params.communityId)}&channelId=${encodeURIComponent(route.params.channelId)}`,
      ),
  });

  const results = data?.messages ?? [];
  const isSearching = query.trim() !== deferredQuery || isFetching;

  useEffect(() => {
    if (!isSimulatorHarnessEnabled) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<{ type?: 'search'; query?: string }>(
        'dev-channel-search-action.json',
      );
      if (!action) return;

      try {
        if (action.type !== 'search') return;
        setQuery(action.query ?? '');
      } finally {
        await deleteSimulatorHarnessFile('dev-channel-search-action.json');
      }
    }

    void runDevAction();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('channel.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.message.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultCard}
            activeOpacity={0.8}
            onPress={() =>
              navigation.replace('ChannelScreen', {
                channelId: route.params.channelId,
                communityId: route.params.communityId,
                channelName: route.params.channelName,
                focusMessageId: item.message.id,
              })
            }
          >
            <View style={styles.resultHeader}>
              <Text style={styles.author}>{item.author.displayName}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.message.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.preview} numberOfLines={3}>
              {item.message.bodyPlaintext || item.message.bodyMarkdown || t('message.deleted')}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={'\u{1F50D}'}
              title={
                deferredQuery.length > 0
                  ? t('channel.searchEmpty')
                  : t('channel.searchHintTitle')
              }
              subtitle={
                deferredQuery.length > 0
                  ? t('channel.searchEmptyBody')
                  : t('channel.searchHintBody')
              }
            />
          </View>
        }
        contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: fs.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fs.lg,
    paddingVertical: spacing.sm,
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
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  author: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    color: colors.textDim,
    fontSize: fs.xs,
  },
  preview: {
    color: colors.textSecondary,
    fontSize: fs.base,
    lineHeight: 20,
  },
});
