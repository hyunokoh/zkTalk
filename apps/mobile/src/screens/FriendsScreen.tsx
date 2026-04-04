import React, { useState, useCallback, useDeferredValue } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { api } from '../lib/api';
import { syncContacts } from '../lib/contacts';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, borderRadius, fontSize, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type FriendTab = 'all' | 'pending' | 'blocked';
type PendingFilter = 'all' | 'received' | 'sent';
type AllFriendsFilter = 'all' | 'online';

interface Friend {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  status: 'accepted' | 'pending' | 'blocked';
  isRequester: boolean;
  isOnline?: boolean;
}

interface FriendApiRow {
  id: string;
  status: Friend['status'];
  isRequester: boolean;
  createdAt: string;
  isOnline?: boolean;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

interface ContactSuggestion {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface ContactSuggestionsResponse {
  suggestions: ContactSuggestion[];
}

interface CreatedDmConversation {
  conversation: {
    id: string;
  };
}

interface DmCallTargetResponse {
  community: {
    id: string;
    slug: string;
    name: string;
  };
  channel: {
    id: string;
    name: string;
  };
  voiceChannel: {
    id: string;
    name: string;
  };
  alreadyPromoted: boolean;
}

interface SendFriendRequestResult {
  friendship: {
    id: string;
    status: 'pending' | 'accepted' | 'blocked';
  };
}

function normalizeFriend(row: FriendApiRow): Friend | null {
  if (!row.user) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user.id,
    displayName: row.user.displayName,
    username: row.user.username,
    avatarUrl: row.user.avatarUrl,
    status: row.status,
    isRequester: row.isRequester,
    isOnline: row.isOnline ?? false,
  };
}

function filterSuggestions(
  suggestions: ContactSuggestion[],
  friends: Friend[],
) {
  const unavailableUserIds = new Set(friends.map((friend) => friend.userId));
  return suggestions.filter((suggestion) => !unavailableUserIds.has(suggestion.userId));
}

function ensureFriend(friend: Friend | FriendApiRow): Friend | null {
  return 'user' in friend ? normalizeFriend(friend as unknown as FriendApiRow) : friend;
}

function FriendItem({
  friend,
  onAccept,
  onDecline,
  onCancelRequest,
  onRemove,
  onUnblock,
  onMessage,
  onVoiceCall,
  onVideoCall,
  busyAction,
  t,
}: {
  friend: Friend;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancelRequest?: () => void;
  onRemove?: () => void;
  onUnblock?: () => void;
  onMessage?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  busyAction?: 'accept' | 'decline' | 'cancel' | 'unblock' | 'message' | 'voice' | 'video' | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const displayName = friend.displayName || friend.username || t('friends.unknownUser');
  const username = friend.username || 'user';

  return (
    <View style={styles.friendItem}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
        {friend.status === 'accepted' && friend.isOnline ? (
          <View style={styles.onlineIndicator} />
        ) : null}
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{displayName}</Text>
        <Text style={styles.friendUsername}>@{username}</Text>
        {friend.status === 'pending' && (
          <Text style={styles.friendMeta}>
            {friend.isRequester
              ? t('friends.requestSentBadge')
              : t('friends.requestReceivedBadge')}
          </Text>
        )}
      </View>
      {friend.status === 'pending' && !friend.isRequester && (
        <View style={styles.pendingActions}>
          {onDecline && (
            <TouchableOpacity
              style={styles.pendingButton}
              onPress={onDecline}
              disabled={busyAction === 'decline'}
            >
              {busyAction === 'decline' ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={styles.pendingButtonText}>{t('friends.decline')}</Text>
              )}
            </TouchableOpacity>
          )}
          {onAccept && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={onAccept}
              disabled={busyAction === 'accept'}
            >
              {busyAction === 'accept' ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.acceptText}>{t('friends.accept')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
      {friend.status === 'pending' && friend.isRequester && onCancelRequest && (
        <TouchableOpacity
          style={styles.pendingButton}
          onPress={onCancelRequest}
          disabled={busyAction === 'cancel'}
        >
          {busyAction === 'cancel' ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={styles.pendingButtonText}>{t('friends.cancelRequest')}</Text>
          )}
        </TouchableOpacity>
      )}
      {friend.status === 'blocked' && onUnblock && (
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={onUnblock}
          disabled={busyAction === 'unblock'}
        >
          {busyAction === 'unblock' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.unblockText}>{t('friends.unblock')}</Text>
          )}
        </TouchableOpacity>
      )}
      {friend.status === 'accepted' && onMessage && (
        <View style={styles.acceptedActions}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={onMessage}
            disabled={busyAction === 'message'}
          >
            {busyAction === 'message' ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.messageButtonText}>{t('friends.message')}</Text>
            )}
          </TouchableOpacity>
          {onVoiceCall ? (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={onVoiceCall}
              disabled={busyAction === 'voice'}
            >
              {busyAction === 'voice' ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.messageButtonText}>{t('voice.join')}</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {onVideoCall ? (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={onVideoCall}
              disabled={busyAction === 'video'}
            >
              {busyAction === 'video' ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.messageButtonText}>{t('voice.videoCall')}</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {friend.status === 'accepted' && onRemove && (
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Text style={styles.removeText}>{'\u{22EF}'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SuggestionItem({
  user,
  onAdd,
  isBusy,
  t,
}: {
  user: ContactSuggestion;
  onAdd: () => void;
  isBusy?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const displayName = user.displayName || user.username || t('friends.unknownUser');
  const username = user.username || 'user';

  return (
    <View style={styles.friendItem}>
      <View style={[styles.friendAvatar, { backgroundColor: colors.success }]}>
        <Text style={styles.friendAvatarText}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{displayName}</Text>
        <Text style={styles.friendUsername}>@{username}</Text>
      </View>
      <TouchableOpacity style={styles.acceptButton} onPress={onAdd} disabled={isBusy}>
        {isBusy ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.acceptText}>{t('friends.add')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function FriendsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FriendTab>('all');
  const [pendingFilter, setPendingFilter] = useState<PendingFilter>('all');
  const [allFriendsFilter, setAllFriendsFilter] = useState<AllFriendsFilter>('all');
  const [sortField, setSortField] = useState<'name' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [syncing, setSyncing] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const queryClient = useQueryClient();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const devActionAttemptedRef = React.useRef(false);

  const TABS: { key: FriendTab; label: string }[] = [
    { key: 'all', label: t('friends.all') },
    { key: 'pending', label: t('friends.pending') },
    { key: 'blocked', label: t('friends.blocked') },
  ];
  const PENDING_FILTERS: { key: PendingFilter; label: string }[] = [
    { key: 'all', label: t('friends.pendingFilterAll') },
    { key: 'received', label: t('friends.pendingFilterReceived') },
    { key: 'sent', label: t('friends.pendingFilterSent') },
  ];

  const createDmMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api<CreatedDmConversation>('/api/dm/conversations', {
        method: 'POST',
        body: { targetUserId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });

  const callTargetMutation = useMutation({
    mutationFn: (conversationId: string) =>
      api<DmCallTargetResponse>(`/api/dm/conversations/${conversationId}/call-target`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const result = await api<{ friends: FriendApiRow[] }>('/api/friends');
      return {
        friends: result.friends
          .map(normalizeFriend)
          .filter((friend): friend is Friend => friend !== null),
      };
    },
  });

  const contactSuggestionsQuery = useQuery({
    queryKey: ['contact-suggestions'],
    queryFn: () => api<ContactSuggestionsResponse>('/api/contacts/suggestions'),
  });

  const invalidateFriendQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['friends'] });
    void queryClient.invalidateQueries({ queryKey: ['contact-suggestions'] });
  }, [queryClient]);

  const acceptMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}/accept`, { method: 'POST' }),
    onSuccess: () => invalidateFriendQueries(),
  });

  const removeMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFriendQueries(),
  });

  const blockMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}/block`, { method: 'POST' }),
    onSuccess: () => invalidateFriendQueries(),
  });

  const unblockMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFriendQueries(),
  });

  const addFriendMutation = useMutation({
    mutationFn: (userId: string) =>
      api<SendFriendRequestResult>('/api/friends/request', { method: 'POST', body: { userId } }),
    onSuccess: (result, userId) => {
      setSuggestions((prev) => prev.filter((user) => user.userId !== userId));
      invalidateFriendQueries();
      Alert.alert(
        result.friendship.status === 'accepted'
          ? t('friends.requestAcceptedTitle')
          : t('friends.requestSentTitle'),
        result.friendship.status === 'accepted'
          ? t('friends.requestAcceptedBody')
          : t('friends.requestSentBody'),
      );
    },
  });

  const handleMessage = useCallback(
    async (friend: Friend) => {
      try {
        const result = await createDmMutation.mutateAsync(friend.userId);
        navigation.navigate('Main', {
          screen: 'DmTab',
          params: {
            screen: 'DmScreen',
            params: {
              conversationId: result.conversation.id,
              userId: friend.userId,
              displayName: friend.displayName,
            },
          },
        });
      } catch (err) {
        Alert.alert(
          t('common.error'),
          err instanceof Error ? err.message : t('friends.dmFailed'),
        );
      }
    },
    [createDmMutation, navigation, t],
  );

  const handleStartCall = useCallback(
    async (friend: Friend, startWithVideo: boolean) => {
      try {
        const result = await createDmMutation.mutateAsync(friend.userId);
        const callTarget = await callTargetMutation.mutateAsync(result.conversation.id);
        navigation.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'VoiceCallScreen',
            params: {
              communityId: callTarget.community.id,
              channelId: callTarget.voiceChannel.id,
              channelName: callTarget.voiceChannel.name,
              startWithVideo,
            },
          },
        });
      } catch (err) {
        Alert.alert(
          startWithVideo ? t('voice.videoCall') : t('voice.join'),
          err instanceof Error ? err.message : t('voice.joinFailed'),
        );
      }
    },
    [callTargetMutation, createDmMutation, navigation, t],
  );

  const handleContactSync = useCallback(async () => {
    setSyncing(true);
    try {
      const matched = await syncContacts();
      const filtered = filterSuggestions(matched, data?.friends ?? []);
      setSuggestions(filtered);
      void queryClient.invalidateQueries({ queryKey: ['contact-suggestions'] });
      if (filtered.length === 0) {
        Alert.alert(t('friends.noMatches'), t('friends.noMatchesMsg'));
      }
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('friends.syncFailed'),
      );
    } finally {
      setSyncing(false);
    }
  }, [data?.friends, queryClient, t]);

  const friends = (data?.friends ?? [])
    .map((friend) => ensureFriend(friend))
    .filter((friend): friend is Friend => friend !== null);
  const persistedSuggestions = filterSuggestions(
    contactSuggestionsQuery.data?.suggestions ?? [],
    friends,
  );
  const visibleSuggestions = filterSuggestions(
    suggestions.length > 0 ? suggestions : persistedSuggestions,
    friends,
  );
  const filteredFriends = friends
    .filter((friend) => {
      if (activeTab === 'all') {
        if (friend.status !== 'accepted') {
          return false;
        }

        if (allFriendsFilter === 'online') {
          return !!friend.isOnline;
        }

        return true;
      }
      if (activeTab === 'pending') {
        if (friend.status !== 'pending') {
          return false;
        }

        if (pendingFilter === 'received') {
          return !friend.isRequester;
        }

        if (pendingFilter === 'sent') {
          return friend.isRequester;
        }

        return true;
      }

      return friend.status === 'blocked';
    })
    .filter((friend) => {
      if (!deferredSearchQuery) {
        return true;
      }

      const haystack = [friend.displayName, friend.username].join(' ').toLowerCase();
      return haystack.includes(deferredSearchQuery);
    })
    .sort((a, b) => {
      if (sortField === 'status') {
        const getStatusPriority = (friend: Friend) => {
          if (friend.status === 'accepted') {
            return friend.isOnline ? 3 : 2;
          }
          if (friend.status === 'pending') {
            return friend.isRequester ? 0 : 1;
          }
          return -1;
        };

        const left = getStatusPriority(a);
        const right = getStatusPriority(b);
        if (left !== right) {
          return sortOrder === 'asc' ? right - left : left - right;
        }
      }

      const left = (a.displayName || a.username).toLocaleLowerCase();
      const right = (b.displayName || b.username).toLocaleLowerCase();
      return sortOrder === 'asc'
        ? left.localeCompare(right)
        : right.localeCompare(left);
    });
  const filteredSuggestions = visibleSuggestions.filter((user) => {
    if (!deferredSearchQuery) {
      return true;
    }

    const haystack = [user.displayName, user.username].join(' ').toLowerCase();
    return haystack.includes(deferredSearchQuery);
  });

  const pendingCount = friends.filter((f) => f.status === 'pending').length;

  React.useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
      return;
    }

    if (!data?.friends?.length) {
      return;
    }

    devActionAttemptedRef.current = true;

    async function tryDevAction() {
      const payload = await readSimulatorHarnessJson<
        | {
            action?: 'accept' | 'message';
            userId?: string;
          }
        | undefined
      >('dev-friend-action.json');
      if (!payload) return;

      try {
        if (payload?.action === 'accept' && payload.userId) {
          const target = friends.find(
            (friend) =>
              friend.status === 'pending' &&
              !friend.isRequester &&
              friend.userId === payload.userId,
          );
          if (target) {
            await acceptMutation.mutateAsync(target.id);
          }
        } else if (payload?.action === 'message' && payload.userId) {
          const target = friends.find(
            (friend) =>
              friend.status === 'accepted' &&
              friend.userId === payload.userId,
          );
          if (target) {
            await handleMessage(target);
          }
        }
      } finally {
        await deleteSimulatorHarnessFile('dev-friend-action.json');
      }
    }

    void tryDevAction();
  }, [acceptMutation, data?.friends?.length, friends, handleMessage]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t('friends.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('friends.listSubtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.secondaryHeaderButton}
            onPress={() =>
              navigation.navigate('Main', {
                screen: 'SettingsTab',
                params: {
                  screen: 'MyQr',
                },
              })
            }
          >
            <Text style={styles.secondaryHeaderButtonText}>{t('friends.shareProfile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleContactSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.syncIcon}>{'\u{1F4D6}'}</Text>
                <Text style={styles.syncText}>{t('friends.findFromContacts')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('friends.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.pendingFilterRow}>
        {[
          { key: 'name' as const, label: t('friends.sortName') },
          { key: 'status' as const, label: t('friends.sortStatus') },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.pendingFilterChip,
              sortField === option.key && styles.pendingFilterChipActive,
            ]}
            onPress={() => setSortField(option.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.pendingFilterChipText,
                sortField === option.key && styles.pendingFilterChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.pendingFilterRow}>
        {[
          {
            key: 'asc' as const,
            label: sortField === 'status' ? t('friends.sortStatusHigh') : t('settings.sortAsc'),
          },
          {
            key: 'desc' as const,
            label: sortField === 'status' ? t('friends.sortStatusLow') : t('settings.sortDesc'),
          },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.pendingFilterChip,
              sortOrder === option.key && styles.pendingFilterChipActive,
            ]}
            onPress={() => setSortOrder(option.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.pendingFilterChipText,
                sortOrder === option.key && styles.pendingFilterChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'pending' ? (
        <View style={styles.pendingFilterRow}>
          {PENDING_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.pendingFilterChip,
                pendingFilter === filter.key && styles.pendingFilterChipActive,
              ]}
              onPress={() => setPendingFilter(filter.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pendingFilterChipText,
                  pendingFilter === filter.key && styles.pendingFilterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {activeTab === 'all' ? (
        <View style={styles.pendingFilterRow}>
          {[
            { key: 'all' as const, label: t('friends.pendingFilterAll') },
            { key: 'online' as const, label: t('friends.onlineOnly') },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.pendingFilterChip,
                allFriendsFilter === filter.key && styles.pendingFilterChipActive,
              ]}
              onPress={() => setAllFriendsFilter(filter.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pendingFilterChipText,
                  allFriendsFilter === filter.key && styles.pendingFilterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Contact suggestions */}
      {filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>{t('friends.contactSuggestions')}</Text>
          {filteredSuggestions.map((user) => (
            <SuggestionItem
              key={user.userId}
              user={user}
              onAdd={() => addFriendMutation.mutate(user.userId)}
              isBusy={addFriendMutation.isPending && addFriendMutation.variables === user.userId}
              t={t}
            />
          ))}
        </View>
      )}

      {/* Friend list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || contactSuggestionsQuery.isRefetching}
              onRefresh={() => {
                void refetch();
                void contactSuggestionsQuery.refetch();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <FriendItem
              friend={item}
              busyAction={
                callTargetMutation.isPending && createDmMutation.variables === item.userId
                  ? 'voice'
                  : createDmMutation.isPending && createDmMutation.variables === item.userId
                  ? 'message'
                  : acceptMutation.isPending && acceptMutation.variables === item.id
                    ? 'accept'
                    : removeMutation.isPending && removeMutation.variables === item.id
                      ? (item.status === 'blocked'
                          ? 'unblock'
                          : item.isRequester
                            ? 'cancel'
                            : item.status === 'pending'
                              ? 'decline'
                              : null)
                      : unblockMutation.isPending && unblockMutation.variables === item.id
                        ? 'unblock'
                        : null
              }
              t={t}
              onAccept={
                item.status === 'pending' && !item.isRequester
                  ? () => acceptMutation.mutate(item.id)
                  : undefined
              }
              onDecline={
                item.status === 'pending' && !item.isRequester
                  ? () => {
                      Alert.alert(
                        t('friends.declineRequestTitle'),
                        t('friends.declineRequestConfirm', { name: item.displayName }),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('friends.decline'),
                            style: 'destructive',
                            onPress: () => removeMutation.mutate(item.id),
                          },
                        ],
                      );
                    }
                  : undefined
              }
              onCancelRequest={
                item.status === 'pending' && item.isRequester
                  ? () => {
                      Alert.alert(
                        t('friends.cancelRequestTitle'),
                        t('friends.cancelRequestConfirm', { name: item.displayName }),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('friends.cancelRequest'),
                            style: 'destructive',
                            onPress: () => removeMutation.mutate(item.id),
                          },
                        ],
                      );
                    }
                  : undefined
              }
              onMessage={
                item.status === 'accepted'
                  ? () => handleMessage(item)
                  : undefined
              }
              onVoiceCall={
                item.status === 'accepted'
                  ? () => {
                      void handleStartCall(item, false);
                    }
                  : undefined
              }
              onVideoCall={
                item.status === 'accepted'
                  ? () => {
                      void handleStartCall(item, true);
                    }
                  : undefined
              }
              onRemove={
                item.status === 'accepted'
                  ? () => {
                      Alert.alert(
                        item.displayName,
                        undefined,
                        [
                          {
                            text: t('friends.block'),
                            style: 'destructive',
                            onPress: () => {
                              Alert.alert(
                                t('friends.blockFriendTitle'),
                                t('friends.blockFriendConfirm', { name: item.displayName }),
                                [
                                  { text: t('common.cancel'), style: 'cancel' },
                                  {
                                    text: t('friends.block'),
                                    style: 'destructive',
                                    onPress: () => blockMutation.mutate(item.id),
                                  },
                                ],
                              );
                            },
                          },
                          {
                            text: t('friends.remove'),
                            style: 'destructive',
                            onPress: () => {
                              Alert.alert(
                                t('friends.removeFriend'),
                                t('friends.removeConfirm', { name: item.displayName }),
                                [
                                  { text: t('common.cancel'), style: 'cancel' },
                                  {
                                    text: t('friends.remove'),
                                    style: 'destructive',
                                    onPress: () => removeMutation.mutate(item.id),
                                  },
                                ],
                              );
                            },
                          },
                          { text: t('common.cancel'), style: 'cancel' },
                        ],
                      );
                    }
                  : undefined
              }
              onUnblock={
                item.status === 'blocked'
                  ? () => unblockMutation.mutate(item.id)
                  : undefined
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'all'
                  ? '\u{1F465}'
                  : activeTab === 'pending'
                    ? '\u{1F4E9}'
                    : '\u{1F6AB}'}
              </Text>
              <Text style={styles.emptyText}>
                {deferredSearchQuery
                  ? t('friends.noSearchResults')
                  : activeTab === 'all'
                    ? allFriendsFilter === 'online'
                      ? t('friends.noOnlineFriends')
                      : t('friends.noFriends')
                    : activeTab === 'pending'
                      ? pendingFilter === 'received'
                        ? t('friends.noReceivedRequests')
                        : pendingFilter === 'sent'
                          ? t('friends.noSentRequests')
                          : t('friends.noPending')
                      : t('friends.noBlocked')}
              </Text>
              {deferredSearchQuery ? (
                <Text style={styles.emptyHint}>{t('friends.noSearchResultsBody')}</Text>
              ) : activeTab === 'all' && allFriendsFilter === 'online' ? (
                <Text style={styles.emptyHint}>{t('friends.noOnlineFriendsBody')}</Text>
              ) : activeTab === 'pending' && pendingFilter === 'received' ? (
                <Text style={styles.emptyHint}>{t('friends.noReceivedRequestsBody')}</Text>
              ) : activeTab === 'pending' && pendingFilter === 'sent' ? (
                <Text style={styles.emptyHint}>{t('friends.noSentRequestsBody')}</Text>
              ) : activeTab === 'all' && (
                <Text style={styles.emptyHint}>
                  {t('friends.syncHint')}
                </Text>
              )}
            </View>
          }
          contentContainerStyle={filteredFriends.length === 0 ? styles.emptyList : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 4,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.white,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  secondaryHeaderButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryHeaderButtonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  syncIcon: {
    fontSize: 14,
  },
  syncText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pendingFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  pendingFilterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingFilterChipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  pendingFilterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  pendingFilterChipTextActive: {
    color: colors.primary,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  friendAvatarText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  friendUsername: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  friendMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  acceptText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  pendingButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  unblockButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  unblockText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  messageButton: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    marginRight: spacing.sm,
  },
  acceptedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '58%',
  },
  messageButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  removeButton: {
    padding: spacing.sm,
  },
  removeText: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  emptyList: {
    flex: 1,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
