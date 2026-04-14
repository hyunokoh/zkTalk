import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  RefreshControl,
  Share,
  TextInput,
} from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { api, ApiError, createRequestId } from '../lib/api';
import {
  buildSelectedMessageAiAction,
  fetchAiRuntime,
  getAiRuntimePresentation,
  getSelectedMessageAiAppliedMessageKey,
  isAiRuntimeUsable,
  requestAiChat,
} from '../lib/ai';
import { enqueueMessage, getPendingMessages } from '../lib/offline-queue';
import { getUserFacingErrorMessage } from '../lib/error-message';
import {
  useChannelSubscription,
  useTypingIndicator,
  useWebSocketStatus,
} from '../hooks/useWebSocket';
import {
  pickImage,
  takePhoto,
  pickDocument,
  uploadFile,
  attachToMessage,
  getAttachmentFileUrl,
  type PickedFile,
} from '../lib/file-picker';
import { getToken, saveLastVisited } from '../lib/storage';
import { fetchUserSettings } from '../lib/user-settings';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  deleteSimulatorHarnessPath,
  getSimulatorHarnessPath,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  simulatorHarnessDirectory,
} from '../lib/simulator-harness';
import MessageBubble from '../components/MessageBubble';
import MessageComposer from '../components/MessageComposer';
import MessageActionSheet, { type ActionSheetMessage } from '../components/MessageActionSheet';
import AttachmentLightbox from '../components/AttachmentLightbox';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import {
  createTranslationRenderCacheEntry,
  resolveChannelSurfaceActionOrder,
  getSelectedMessageAiSourceText,
  getTranslationRenderSourceVersion,
  inferMessageLanguage,
  isImageAttachmentMimeType,
  normalizeTranslationDisplayPreference,
  resolveTranslationDisplayDecision,
  resolveTranslationResponse,
  resolveTranslationRenderCacheState,
  shouldHideAttachmentBody,
  type TranslationRenderCacheEntry,
  type TranslationRuntimeStatus,
} from '@zktalk/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ChannelScreen'>;

interface Message {
  id: string;
  bodyPlaintext: string;
  bodyMarkdown?: string;
  topic?: string | null;
  threadId?: string | null;
  parentMessageId?: string | null;
  authorUserId: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  author?: {
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
  }>;
}

interface ChannelDetail {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  requireTopic?: boolean;
  sourceDmConversation?: {
    id: string;
    name: string | null;
    type: 'direct' | 'group';
  } | null;
}

interface MessageRow {
  message: Message;
  author: {
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  attachments?: NonNullable<Message['attachments']>;
}

interface ChannelMessagesResponse {
  messages: Array<MessageRow | Message>;
  unreadCounts?: Record<string, number>;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    username: string;
    displayName: string;
  }>;
}

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  voted: boolean;
}

interface MessagePoll {
  id: string;
  messageId: string | null;
  question: string;
  options: PollOption[];
  totalVotes: number;
  closed: boolean;
}

function flattenMessage(item: Message | MessageRow): Message {
  if ('message' in item) {
    return {
      ...item.message,
      author: item.author,
      attachments: item.attachments ?? item.message.attachments ?? [],
    };
  }
  return item;
}

interface PendingMessage {
  id: string;
  body: string;
  createdAt: number;
}

interface InlineTranslationState {
  entry?: TranslationRenderCacheEntry | null;
  runtimeStatus: TranslationRuntimeStatus;
  issue?: string;
}

interface ChannelMePermissions {
  canViewChannel: boolean;
  canPostMessage: boolean;
  canManageChannel: boolean;
  canReact: boolean;
  canUploadAttachment: boolean;
}

interface ThreadSummary {
  thread: {
    id: string;
    rootMessageId: string;
    replyCount: number;
    isLocked: boolean;
    lastActivityAt: string;
  };
}

const MOBILE_FALLBACK_MESSAGE_POLL_MS = 5_000;
const REALTIME_FOLLOWUP_REFRESH_MS = 150;

function formatUnreadCount(unreadCount: number): string {
  return String(Math.min(99, Math.max(0, Math.trunc(unreadCount))));
}

function formatMessageMetaTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatMessageDateDivider(value: string | Date): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function createOptimisticChannelMessage(params: {
  authorUserId: string;
  authorDisplayName: string;
  authorUsername: string;
  authorAvatarUrl?: string | null;
  bodyPlaintext: string;
  topic?: string | null;
  parentMessageId?: string | null;
}): Message {
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bodyPlaintext: params.bodyPlaintext,
    bodyMarkdown: params.bodyPlaintext,
    topic: params.topic ?? null,
    threadId: null,
    parentMessageId: params.parentMessageId ?? null,
    authorUserId: params.authorUserId,
    createdAt: new Date().toISOString(),
    author: {
      displayName: params.authorDisplayName,
      username: params.authorUsername,
      avatarUrl: params.authorAvatarUrl ?? null,
    },
    attachments: [],
  };
}

export default function ChannelScreen({ navigation, route }: Props) {
  const { channelId, focusMessageId } = route.params;
  const { t, locale } = useTranslation();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const listRef = useRef<FlatList<Message>>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<PickedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [translatedBodies, setTranslatedBodies] = useState<Record<string, InlineTranslationState>>({});
  const [autoTranslatedBodies, setAutoTranslatedBodies] = useState<Record<string, InlineTranslationState>>({});
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [previewGallery, setPreviewGallery] = useState<{
    attachments: NonNullable<Message['attachments']>;
    index: number;
  } | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [composerDraftText, setComposerDraftText] = useState('');
  const [composerDraftSeed, setComposerDraftSeed] = useState('');
  const [composerDraftKey, setComposerDraftKey] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const devComposeInFlightRef = useRef(false);
  const devAttachmentAttemptedRef = useRef(false);
  const lastMarkedReadMessageIdRef = useRef<string | null>(null);
  const messageRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isFocused = useIsFocused();
  const wsStatus = useWebSocketStatus();
  const shouldPollMessages = wsStatus !== 'connected';
  const endpoint = `/api/channels/${channelId}/messages`;
  const channelMessagesQueryKey = ['messages', channelId] as const;
  const { data: channelDetailData } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => api<{ channel: ChannelDetail }>(`/api/channels/${channelId}`),
  });

  useEffect(() => {
    if (channelId) {
      void saveLastVisited({
        kind: 'channel',
        communityId: channelDetailData?.channel.communityId,
        channelId,
      });
    }
  }, [channelDetailData?.channel.communityId, channelId]);
  const { data: permissionsData } = useQuery({
    queryKey: ['channel-me-permissions', channelId],
    queryFn: () =>
      api<{ permissions: ChannelMePermissions }>(
        `/api/channels/${channelId}/me-permissions`,
      ),
  });
  const { data: aiRuntime } = useQuery({
    queryKey: ['ai-runtime'],
    queryFn: fetchAiRuntime,
    staleTime: 60_000,
  });
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 60_000,
  });
  const canManageChannel = permissionsData?.permissions.canManageChannel ?? false;
  const canPostChannel = permissionsData?.permissions.canPostMessage ?? true;
  const canReactToMessages = permissionsData?.permissions.canReact ?? true;
  const canUploadAttachment = permissionsData?.permissions.canUploadAttachment ?? true;
  const isArchived = channelDetailData?.channel.isArchived ?? false;
  const requiresTopic = channelDetailData?.channel.requireTopic ?? false;
  const sourceDmConversation = channelDetailData?.channel.sourceDmConversation ?? null;
  const sourceDmName = sourceDmConversation?.name?.trim() || null;
  const sourceDmTypeLabel = sourceDmConversation
    ? sourceDmConversation.type === 'direct'
      ? t('dm.filterDirect')
      : t('dm.filterGroup')
    : null;
  const sourceDmHeaderLabel = sourceDmTypeLabel
    ? `${sourceDmTypeLabel} ${t('dm.historyCompact')}`
    : t('dm.historyCompact');
  const sourceDmFullLabel = sourceDmName
    ? `${sourceDmHeaderLabel} · ${sourceDmName}`
    : sourceDmHeaderLabel;
  const sourceDmBody = sourceDmName
    ? t('channel.sourceDmNamedBody', { name: sourceDmName })
    : t('channel.sourceDmBody');
  const channelName = channelDetailData?.channel.name ?? route.params.channelName ?? t('nav.channel');
  const channelDescription = channelDetailData?.channel.description?.trim() || t('channel.headerSubtitle');
  const channelHeaderActions = resolveChannelSurfaceActionOrder({
    showSearch: !!route.params.communityId,
    showPins: true,
    showSourceDm: !!sourceDmConversation,
    showPolls: true,
    showEditChannel: !!route.params.communityId && canManageChannel,
  });

  const openSourceDmHistory = useCallback(() => {
    if (!sourceDmConversation) {
      return;
    }

    rootNavigation.navigate('Main', {
      screen: 'DmTab',
      params: {
        screen: 'DmScreen',
        params: {
          conversationId: sourceDmConversation.id,
          displayName: sourceDmConversation.name ?? t('dm.message'),
        },
      },
    });
  }, [rootNavigation, sourceDmConversation, t]);

  const openChannelSearch = useCallback(() => {
    if (!route.params.communityId) {
      return;
    }

    navigation.navigate('ChannelSearch', {
      channelId,
      communityId: route.params.communityId as string,
      channelName: route.params.channelName,
    });
  }, [channelId, navigation, route.params.channelName, route.params.communityId]);

  const openChannelPolls = useCallback(() => {
    navigation.navigate('ChannelPolls', {
      channelId,
      communityId: route.params.communityId,
      channelName: route.params.channelName,
    });
  }, [channelId, navigation, route.params.channelName, route.params.communityId]);

  const openChannelPins = useCallback(() => {
    navigation.navigate('ChannelPins', {
      channelId,
      channelName: route.params.channelName,
      communityId: route.params.communityId,
    });
  }, [channelId, navigation, route.params.channelName, route.params.communityId]);

  const openEditChannel = useCallback(() => {
    if (!route.params.communityId) {
      return;
    }

    navigation.navigate('EditChannel', {
      channelId,
      communityId: route.params.communityId as string,
      channelName: channelName,
    });
  }, [channelId, channelName, navigation, route.params.communityId]);

  const openHeaderOverflowMenu = useCallback(() => {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: 'cancel' | 'destructive' | 'default';
    }> = [];

    for (const action of channelHeaderActions.overflow) {
      if (action === 'source_dm' && sourceDmConversation) {
        buttons.push({
          text: sourceDmFullLabel,
          onPress: openSourceDmHistory,
        });
      }

      if (action === 'polls') {
        buttons.push({
          text: t('poll.title'),
          onPress: openChannelPolls,
        });
      }

      if (action === 'edit_channel') {
        buttons.push({
          text: t('channel.edit'),
          onPress: openEditChannel,
        });
      }
    }

    buttons.push({
      text: t('common.cancel'),
      style: 'cancel',
    });

    Alert.alert(`# ${channelName}`, undefined, buttons);
  }, [
    channelHeaderActions.overflow,
    channelName,
    openChannelPolls,
    openEditChannel,
    openSourceDmHistory,
    sourceDmConversation,
    sourceDmFullLabel,
    t,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `# ${channelName}`,
      headerStyle: {
        backgroundColor: colors.talkPanel,
      },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {
        color: colors.textPrimary,
        fontWeight: '700',
      },
      headerRight: () => (
        <View style={styles.headerActions}>
          {channelHeaderActions.primary.includes('search') ? (
            <TouchableOpacity
              testID="channel-header-search"
              onPress={openChannelSearch}
              hitSlop={8}
              style={styles.headerIconAction}
              accessibilityRole="button"
              accessibilityLabel={t('channel.searchHintTitle')}
            >
              <Text style={styles.headerIconText}>{'\u2315'}</Text>
            </TouchableOpacity>
          ) : null}
          {channelHeaderActions.primary.includes('pins') ? (
            <TouchableOpacity
              testID="channel-header-pins"
              onPress={openChannelPins}
              hitSlop={8}
              style={styles.headerIconAction}
              accessibilityRole="button"
              accessibilityLabel={t('pin.pinned')}
            >
              <Text style={styles.headerIconText}>{'\u{1F4CC}'}</Text>
            </TouchableOpacity>
          ) : null}
          {channelHeaderActions.overflow.length > 0 ? (
            <TouchableOpacity
              testID="channel-header-overflow"
              onPress={openHeaderOverflowMenu}
              hitSlop={8}
              style={styles.headerIconAction}
              accessibilityRole="button"
              accessibilityLabel={t('message.actions')}
            >
              <Text style={styles.headerIconText}>{'\u22EF'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ),
    });
  }, [
    channelName,
    channelHeaderActions,
    navigation,
    openChannelSearch,
    openHeaderOverflowMenu,
    openChannelPins,
    t,
  ]);

  // WebSocket subscription for real-time updates
  const { queuedEventCount, consumeEvents, typingUserIds } = useChannelSubscription(channelId);
  const { startTyping, stopTyping } = useTypingIndicator(channelId);
  const scheduleMessageRefresh = useCallback(
    (delayMs = REALTIME_FOLLOWUP_REFRESH_MS) => {
      if (messageRefreshTimeoutRef.current) {
        clearTimeout(messageRefreshTimeoutRef.current);
      }

      messageRefreshTimeoutRef.current = setTimeout(() => {
        messageRefreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({ queryKey: channelMessagesQueryKey });
      }, delayMs);
    },
    [channelMessagesQueryKey, queryClient],
  );

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: channelMessagesQueryKey,
    queryFn: async () => {
      const res = await api<ChannelMessagesResponse>(endpoint);
      const messages = (res.messages ?? []).map(flattenMessage);
      return {
        messages,
        unreadCounts: res.unreadCounts ?? {},
      };
    },
    refetchInterval: shouldPollMessages ? MOBILE_FALLBACK_MESSAGE_POLL_MS : false,
  });
  const messages = data?.messages ?? [];
  const unreadCounts = data?.unreadCounts ?? {};
  const rootMessageIds = messages
    .filter((message) => !message.parentMessageId && !message.threadId)
    .map((message) => message.id);
  const { data: threadSummariesData } = useQuery({
    queryKey: ['thread-summaries', channelId, rootMessageIds.join(',')],
    enabled: rootMessageIds.length > 0,
    queryFn: () =>
      api<{ items: ThreadSummary[] }>(
        `/api/threads?rootMessageIds=${encodeURIComponent(rootMessageIds.join(','))}`,
      ),
  });
  const threadSummariesByRootId = new Map(
    (threadSummariesData?.items ?? []).map((item) => [item.thread.rootMessageId, item.thread]),
  );
  const hasFocusedMessage = focusMessageId
    ? messages.some((message) => message.id === focusMessageId)
    : true;
  const { data: focusedMessageData } = useQuery({
    queryKey: ['message', focusMessageId],
    enabled: !!focusMessageId && !hasFocusedMessage,
    queryFn: async () => {
      const res = await api<MessageRow | Message>(`/api/messages/${focusMessageId}`);
      return flattenMessage(res);
    },
  });
  const mergedMessages = React.useMemo(() => {
    const baseMessages =
      focusedMessageData && !messages.some((message) => message.id === focusedMessageData.id)
        ? [...messages, focusedMessageData]
        : messages;
    const seen = new Set<string>();
    return baseMessages.filter((message) => {
      if (seen.has(message.id)) {
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }, [focusedMessageData, messages]);
  const normalizedTranslationPreference = React.useMemo(
    () => normalizeTranslationDisplayPreference(userSettings?.translationDisplay),
    [userSettings?.translationDisplay],
  );
  const latestVisibleMessageId = mergedMessages[0]?.id ?? null;
  const messageIds = mergedMessages.map((message) => message.id);
  const { data: reactionsData } = useQuery({
    queryKey: ['message-reactions', channelId, messageIds],
    enabled: messageIds.length > 0,
    queryFn: () =>
      api<{ reactionsByMessageId: Record<string, ReactionSummary[]> }>(
        `/api/reactions?messageIds=${messageIds.map(encodeURIComponent).join(',')}`,
      ),
  });
  const reactionsByMessageId = reactionsData?.reactionsByMessageId ?? {};
  const { data: pollsData } = useQuery({
    queryKey: ['polls-by-message', channelId, messageIds],
    enabled: messageIds.length > 0,
    queryFn: () =>
      api<{ pollsByMessageId: Record<string, MessagePoll> }>(
        `/api/polls?messageIds=${messageIds.map(encodeURIComponent).join(',')}`,
      ),
  });
  const pollsByMessageId = pollsData?.pollsByMessageId ?? {};

  useEffect(
    () => () => {
      if (messageRefreshTimeoutRef.current) {
        clearTimeout(messageRefreshTimeoutRef.current);
      }
    },
    [],
  );

  // Handle real-time WebSocket events
  useEffect(() => {
    if (queuedEventCount === 0) return;

    const newEvents = consumeEvents();
    for (const event of newEvents) {
      const payload = event.payload as Record<string, unknown>;

      switch (event.type) {
        case 'message.created': {
          queryClient.setQueryData(
            ['messages', channelId],
            (old: { messages: Message[]; unreadCounts?: Record<string, number> } | undefined) => {
              if (!old) return old;
              const newMsg = flattenMessage(payload as unknown as MessageRow);
              // Avoid duplicates
              if (old.messages.some((m) => m.id === newMsg.id)) return old;
              return {
                messages: [newMsg, ...old.messages],
                unreadCounts: old.unreadCounts ?? {},
              };
            },
          );
          scheduleMessageRefresh();
          break;
        }
        case 'message.updated': {
          queryClient.setQueryData(
            ['messages', channelId],
            (old: { messages: Message[]; unreadCounts?: Record<string, number> } | undefined) => {
              if (!old) return old;
              const updated = flattenMessage(payload as unknown as MessageRow);
              return {
                messages: old.messages.map((m) =>
                  m.id === updated.id ? { ...m, ...updated } : m,
                ),
                unreadCounts: old.unreadCounts ?? {},
              };
            },
          );
          scheduleMessageRefresh();
          break;
        }
        case 'message.deleted': {
          const deletedId = payload.messageId as string;
          queryClient.setQueryData(
            ['messages', channelId],
            (old: { messages: Message[]; unreadCounts?: Record<string, number> } | undefined) => {
              if (!old) return old;
              return {
                messages: old.messages.filter((m) => m.id !== deletedId),
                unreadCounts: old.unreadCounts ?? {},
              };
            },
          );
          break;
        }
        case 'message.reaction_added':
        case 'message.reaction_removed': {
          void queryClient.invalidateQueries({ queryKey: ['message-reactions', channelId] });
          break;
        }
        case 'thread.created':
        case 'thread.updated':
        case 'thread.locked': {
          void queryClient.invalidateQueries({ queryKey: ['thread-summaries', channelId] });
          break;
        }
        case 'channel.updated': {
          void queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
          break;
        }
      }
    }
  }, [queuedEventCount, channelId, consumeEvents, queryClient, scheduleMessageRefresh]);

  // Check for pending offline messages on mount
  useEffect(() => {
    const checkPending = async () => {
      const queued = await getPendingMessages();
      const channelPending = queued.filter((m) => m.endpoint === endpoint);
      setPendingMessages(
        channelPending.map((m) => ({
          id: m.id,
          body: (m.body as { bodyMarkdown?: string }).bodyMarkdown ?? '',
          createdAt: m.createdAt,
        })),
      );
    };
    checkPending();
  }, [endpoint]);

  useEffect(() => {
    getToken()
      .then(setAuthToken)
      .catch(() => setAuthToken(null));
  }, []);

  useEffect(() => {
    if (!isArchived) return;
    setReplyTo(null);
    setEditingMessage(null);
    setPendingAttachment(null);
    setShowAttachMenu(false);
    setTopic('');
  }, [isArchived]);

  useEffect(() => {
    if (editingMessage) {
      setTopic(editingMessage.topic ?? '');
      return;
    }

    if (!requiresTopic) {
      setTopic('');
    }
  }, [editingMessage, requiresTopic]);

  useFocusEffect(
    useCallback(() => {
      if (!latestVisibleMessageId) {
        return undefined;
      }
      if (lastMarkedReadMessageIdRef.current === latestVisibleMessageId) {
        return undefined;
      }

      let cancelled = false;
      const timeout = setTimeout(() => {
        void (async () => {
          try {
            await api(`/api/channels/${channelId}/read`, {
              method: 'POST',
              body: { lastMessageId: latestVisibleMessageId },
            });
            if (cancelled) {
              return;
            }
            lastMarkedReadMessageIdRef.current = latestVisibleMessageId;
            void queryClient.invalidateQueries({ queryKey: ['channels', route.params.communityId] });
            void queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
          } catch {
            // Best effort only.
          }
        })();
      }, 250);

      return () => {
        cancelled = true;
        clearTimeout(timeout);
      };
    }, [channelId, latestVisibleMessageId, queryClient, route.params.communityId]),
  );

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (editingMessage) {
        await api(`/api/messages/${editingMessage.id}`, {
          method: 'PATCH',
          body: { bodyMarkdown: body },
        });
        return { queued: false as const, message: null as Message | null };
      }

      // If there's a pending attachment, upload it first
      let attachmentData: Awaited<ReturnType<typeof uploadFile>> | null = null;
      const pendingAttachmentName = pendingAttachment?.name ?? null;

      if (pendingAttachment) {
        setUploadProgress(0);
        try {
          attachmentData = await uploadFile(
            pendingAttachment,
            { channelId },
            setUploadProgress,
          );
        } catch (err) {
          setUploadProgress(null);
          throw err;
        }
      }

      try {
        const fallbackBody = body.trim().length > 0 ? body : pendingAttachmentName || ' ';
        const messageBody: Record<string, unknown> = { bodyMarkdown: fallbackBody };
        if (replyTo) {
          messageBody.parentMessageId = replyTo.id;
        }
        const trimmedTopic = topic.trim();
        if (trimmedTopic) {
          messageBody.topic = trimmedTopic;
        }
        const result = await api<{ message: Message }>(endpoint, {
          method: 'POST',
          body: messageBody,
          headers: {
            'X-Request-Id': createRequestId(),
          },
        });

        // Attach file if uploaded
        if (attachmentData && result.message?.id) {
          await attachToMessage(result.message.id, attachmentData);
          const hydratedMessage = await api<Message>(`/api/messages/${result.message.id}`);
          return { queued: false as const, message: hydratedMessage };
        }

        return { queued: false as const, message: result.message ?? null };
      } catch (err) {
        const shouldQueue = !(err instanceof ApiError) || err.status === 0;
        if (!shouldQueue) {
          throw err;
        }

        if (pendingAttachment) {
          throw err;
        }

        const fallbackBody = body.trim().length > 0 ? body : pendingAttachmentName || ' ';
        const queuedBody: Record<string, unknown> = { bodyMarkdown: fallbackBody };
        const trimmedTopic = topic.trim();
        if (trimmedTopic) {
          queuedBody.topic = trimmedTopic;
        }
        const queued = await enqueueMessage(endpoint, queuedBody);
        setPendingMessages((prev) => [
          ...prev,
          { id: queued.id, body, createdAt: queued.createdAt },
        ]);
        return { queued: true as const, message: null as Message | null };
      }
    },
    onMutate: async (body) => {
      if (editingMessage) {
        return { optimisticId: null as string | null };
      }

      const fallbackBody = body.trim().length > 0 ? body : pendingAttachment?.name || ' ';
      const trimmedTopic = topic.trim();
      const optimisticMessage = createOptimisticChannelMessage({
        authorUserId: currentUser?.id ?? 'me',
        authorDisplayName: currentUser?.displayName ?? t('common.you'),
        authorUsername: currentUser?.username ?? 'me',
        authorAvatarUrl: currentUser?.avatarUrl ?? null,
        bodyPlaintext: fallbackBody,
        topic: trimmedTopic || null,
        parentMessageId: replyTo?.id ?? null,
      });

      queryClient.setQueryData(
        channelMessagesQueryKey,
        (old: { messages: Message[]; unreadCounts?: Record<string, number> } | undefined) => ({
          messages: [optimisticMessage, ...(old?.messages ?? [])],
          unreadCounts: old?.unreadCounts ?? {},
        }),
      );

      return { optimisticId: optimisticMessage.id };
    },
    onSuccess: (result, _body, context) => {
      if (result.queued && context?.optimisticId) {
        queryClient.setQueryData(
          channelMessagesQueryKey,
          (old: { messages: Message[]; unreadCounts?: Record<string, number> } | undefined) => {
            if (!old) return old;
            return {
              messages: old.messages.filter((message) => message.id !== context.optimisticId),
              unreadCounts: old.unreadCounts ?? {},
            };
          },
        );
      } else if (result.message && context?.optimisticId) {
        const resolvedMessage = flattenMessage(result.message);
        queryClient.setQueryData(
          channelMessagesQueryKey,
          (old: { messages: Message[]; unreadCounts?: Record<string, number> } | undefined) => {
            if (!old) {
              return { messages: [resolvedMessage], unreadCounts: {} };
            }
            return {
              messages: [
                resolvedMessage,
                ...old.messages.filter(
                  (message) =>
                    message.id !== context.optimisticId && message.id !== resolvedMessage.id,
                ),
              ],
              unreadCounts: old.unreadCounts ?? {},
            };
          },
        );
      }

      if (!result.queued && shouldPollMessages) {
        void queryClient.invalidateQueries({ queryKey: channelMessagesQueryKey });
      }
      setPendingAttachment(null);
      setUploadProgress(null);
      setReplyTo(null);
      setEditingMessage(null);
      if (!requiresTopic) {
        setTopic('');
      }
      stopTyping();
      if (result.queued) {
        Alert.alert(t('common.offline'), t('common.offlineQueue'));
      }
    },
    onError: (_error, _body, context) => {
      if (context?.optimisticId) {
        queryClient.setQueryData(
          channelMessagesQueryKey,
          (old: { messages: Message[]; unreadCounts?: Record<string, number> } | undefined) => {
            if (!old) return old;
            return {
              messages: old.messages.filter((message) => message.id !== context.optimisticId),
              unreadCounts: old.unreadCounts ?? {},
            };
          },
        );
      }
      setUploadProgress(null);
    },
  });

  // Delete handler for action sheet
  const handleDelete = useCallback(
    (message: ActionSheetMessage) => {
      Alert.alert(
        t('message.delete'),
        t('message.deleteConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('message.delete'),
            style: 'destructive',
            onPress: () => {
              api(`/api/messages/${message.id}`, { method: 'DELETE' })
                .then(() => {
                  queryClient.setQueryData(
                    ['messages', channelId],
                    (old: { messages: Message[] } | undefined) => {
                      if (!old) return old;
                      return {
                        messages: old.messages.filter((m) => m.id !== message.id),
                      };
                    },
                  );
                })
                .catch(() => {});
            },
          },
        ],
      );
    },
    [t, channelId, queryClient],
  );

  // Reply handler for action sheet
  const handleReply = useCallback(() => {
    if (actionMessage) {
      setEditingMessage(null);
      setReplyTo(actionMessage);
    }
    setActionMessage(null);
  }, [actionMessage]);

  const handleEdit = useCallback(() => {
    if (!actionMessage) return;
    setReplyTo(null);
    setPendingAttachment(null);
    setShowAttachMenu(false);
    setEditingMessage(actionMessage);
    setActionMessage(null);
  }, [actionMessage]);

  const handleOpenThread = useCallback(async () => {
    if (!actionMessage) return;

    try {
      const threadId = actionMessage.threadId
        ? actionMessage.threadId
        : (
            await api<{ id: string }>(`/api/messages/${actionMessage.id}/thread`, {
              method: 'POST',
            })
          ).id;

      navigation.navigate('ThreadScreen', {
        threadId,
        channelId,
        communityId: route.params.communityId,
        channelName: route.params.channelName,
        rootMessageId: actionMessage.id,
      });
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('thread.openFailed'),
      );
    }
  }, [actionMessage, channelId, navigation, route.params.channelName, route.params.communityId, t]);

  const openThreadForMessage = useCallback(
    async (message: Message) => {
      try {
        const existingThreadId = threadSummariesByRootId.get(message.id)?.id;
        const threadId = existingThreadId
          ? existingThreadId
          : message.threadId
            ? message.threadId
            : (
                await api<{ id: string }>(`/api/messages/${message.id}/thread`, {
                  method: 'POST',
                })
              ).id;

        navigation.navigate('ThreadScreen', {
          threadId,
          channelId,
          communityId: route.params.communityId,
          channelName: route.params.channelName,
          rootMessageId: message.id,
        });
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('thread.openFailed'),
        );
      }
    },
    [channelId, navigation, route.params.channelName, route.params.communityId, t, threadSummariesByRootId],
  );

  const applyComposerDraft = useCallback((nextDraft: string) => {
    setComposerDraftSeed(nextDraft);
    setComposerDraftText(nextDraft);
    setComposerDraftKey(`ai-draft-${Date.now()}`);
  }, []);

  const aiRuntimePresentation = getAiRuntimePresentation(t, aiRuntime);
  const aiStatusLabel = aiRuntimePresentation?.label;
  const aiStatusTone: 'live' | 'mock' | 'unavailable' = aiRuntimePresentation?.tone ?? 'unavailable';
  const aiStatusRuntimeDescription = aiRuntimePresentation?.description ?? t('common.loading');
  const aiStatusDescription = [aiStatusRuntimeDescription, t('ai.selectedMessageScopeHint')]
    .filter(Boolean)
    .join(' ');

  const handleBookmark = useCallback(() => {
    if (!actionMessage) return;

    api(`/api/bookmarks/${actionMessage.id}`, { method: 'POST' }).catch((error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.bookmarksSaveFailed'),
      );
    });
  }, [actionMessage, t]);

  const handlePin = useCallback(() => {
    if (!actionMessage) return;

    api(`/api/channels/${channelId}/pins/${actionMessage.id}`, { method: 'POST' }).catch((error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('channel.pinFailed'),
      );
    });
  }, [actionMessage, channelId, t]);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const reactedByMe =
        reactionsByMessageId[messageId]?.some(
          (reaction) =>
            reaction.emoji === emoji &&
            reaction.users.some((user) => user.id === currentUser?.id),
        ) ?? false;

      try {
        if (reactedByMe) {
          await api(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
            method: 'DELETE',
          });
        } else {
          await api(`/api/messages/${messageId}/reactions`, {
            method: 'POST',
            body: { emoji },
          });
        }

        queryClient.invalidateQueries({ queryKey: ['message-reactions', channelId] });
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('message.reactionFailed'),
        );
      }
    },
    [channelId, currentUser?.id, queryClient, reactionsByMessageId, t],
  );

  const handleReact = useCallback(
    (emoji: string) => {
      if (!actionMessage) return;
      void toggleReaction(actionMessage.id, emoji);
    },
    [actionMessage, toggleReaction],
  );

  const votePollMutation = useMutation({
    mutationFn: ({
      pollId,
      optionId,
      voted,
    }: {
      pollId: string;
      optionId: string;
      voted: boolean;
    }) =>
      voted
        ? api(`/api/polls/${pollId}/vote/${optionId}`, { method: 'DELETE' })
        : api(`/api/polls/${pollId}/vote`, {
            method: 'POST',
            body: { optionId },
          }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['polls', channelId] }),
        queryClient.invalidateQueries({ queryKey: ['polls-by-message', channelId] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('poll.voteFailed'),
      );
    },
  });

  const handleTranslate = useCallback(async () => {
    if (!actionMessage) return;

    const contract = buildSelectedMessageAiAction({
      action: 'translate-inline',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: actionMessage.author?.displayName,
        bodyText: getSelectedMessageAiSourceText(actionMessage),
      },
    });

    if (contract.errorKey || !contract.sourceText) {
      Alert.alert(t('common.error'), t(contract.errorKey ?? 'ai.selectedMessageUnavailable'));
      return;
    }

    const existing = translatedBodies[actionMessage.id]?.entry;
    const sourceVersion = getTranslationRenderSourceVersion(actionMessage);
    const existingState = resolveTranslationRenderCacheState({
      entry: existing,
      sourceVersion,
      targetLanguage: locale,
    });
    if (existingState === 'ready') {
      setTranslatedBodies((prev) => {
        const next = { ...prev };
        delete next[actionMessage.id];
        return next;
      });
      return;
    }

    try {
      const result = await api<{
        translatedText: string | null;
        runtime: {
          status: TranslationRuntimeStatus;
          issue?: string;
        };
      }>('/api/translate', {
        method: 'POST',
        body: {
          text: contract.sourceText,
          targetLang: locale,
        },
      });
      const resolution = resolveTranslationResponse({
        response: result,
        targetLanguage: locale,
        sourceVersion,
      });

      const entry = resolution.entry;
      if (entry) {
        setTranslatedBodies((prev) => ({
          ...prev,
          [actionMessage.id]: {
            entry,
            runtimeStatus: resolution.runtime.status,
            issue: resolution.runtime.issue,
          },
        }));
        return;
      }

      Alert.alert(
        t('common.error'),
        resolution.state === 'runtime-disabled'
          ? t('message.translationDisabled')
          : resolution.runtime.issue
            ? t('message.translationUnavailableWithIssue', { issue: resolution.runtime.issue })
            : t('message.translationUnavailable'),
      );
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('message.translateFailed'),
      );
    }
  }, [actionMessage, locale, t, translatedBodies]);

  const getRenderedTranslation = useCallback(
    (message: Message) => {
      const sourceVersion = getTranslationRenderSourceVersion(message);
      const manualState = translatedBodies[message.id];
      const manualEntry = manualState?.entry;
      const manualCacheState = resolveTranslationRenderCacheState({
        entry: manualEntry,
        sourceVersion,
        targetLanguage: locale,
      });
      if (manualEntry && (manualCacheState === 'ready' || manualCacheState === 'stale')) {
        return {
          body: manualEntry.translatedText,
          variant: 'manual' as const,
          label:
            manualCacheState === 'stale'
              ? t('message.translatedStale')
              : manualState?.runtimeStatus === 'mock'
                ? t('message.translatedMock')
                : t('message.translated'),
          statusLabel: undefined,
          statusIssue: undefined,
        };
      }

      const body = shouldHideAttachmentBody(
        message.bodyPlaintext || message.bodyMarkdown,
        message.attachments ?? [],
      )
        ? ''
        : message.bodyPlaintext;
      const autoState = autoTranslatedBodies[message.id];
      const autoEntry = autoState?.entry;
      const autoCacheState = resolveTranslationRenderCacheState({
        entry: autoEntry,
        sourceVersion,
        targetLanguage: normalizedTranslationPreference.targetLanguage,
      });
      const autoDecision = resolveTranslationDisplayDecision({
        preference: normalizedTranslationPreference,
        messageLanguage: inferMessageLanguage(body),
        hasTranslatedText: autoCacheState === 'ready' || autoCacheState === 'stale',
        translationLanguage: autoEntry?.targetLanguage ?? null,
        runtime: autoState?.runtimeStatus ?? 'available',
        stale: autoCacheState === 'stale',
      });

      if (
        autoDecision.render === 'translated' &&
        autoEntry &&
        (autoCacheState === 'ready' || autoCacheState === 'stale')
      ) {
        return {
          body: autoEntry.translatedText,
          variant: 'automatic' as const,
          label:
            autoDecision.state === 'translation-runtime-mock'
              ? t('message.autoTranslatedMock')
              : autoDecision.state === 'translation-stale'
                ? t('message.autoTranslatedStale')
                : t('message.autoTranslated'),
          statusLabel: undefined,
          statusIssue: undefined,
        };
      }

      return {
        body: undefined,
        variant: undefined,
        label: undefined,
        statusLabel:
          autoDecision.state === 'translation-runtime-disabled'
            ? t('message.autoTranslationDisabled')
            : autoDecision.state === 'translation-unavailable'
              ? t('message.autoTranslationUnavailable')
              : undefined,
        statusIssue:
          autoDecision.state === 'translation-runtime-disabled' ||
          autoDecision.state === 'translation-unavailable'
            ? autoState?.issue
            : undefined,
      };
    },
    [autoTranslatedBodies, locale, normalizedTranslationPreference, t, translatedBodies],
  );

  const handleAiReplyDraft = useCallback(async () => {
    if (!actionMessage) {
      return;
    }

    const contract = buildSelectedMessageAiAction({
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: actionMessage.author?.displayName,
        bodyText: getSelectedMessageAiSourceText(actionMessage),
      },
    });

    if (contract.errorKey || !contract.chatMessages) {
      Alert.alert(t('common.error'), t(contract.errorKey ?? 'ai.selectedMessageUnavailable'));
      return;
    }

    try {
      const reply = await requestAiChat(contract.chatMessages);
      setReplyTo(actionMessage);
      setEditingMessage(null);
      applyComposerDraft(reply);
      Alert.alert(t('ai.messageReplyDraft'), t(getSelectedMessageAiAppliedMessageKey('reply-draft', aiRuntime)));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        getUserFacingErrorMessage(error, t),
      );
    }
  }, [actionMessage, aiRuntime, applyComposerDraft, t]);

  const handleAiRewriteDraft = useCallback(async () => {
    if (!actionMessage) {
      return;
    }

    const contract = buildSelectedMessageAiAction({
      action: 'rewrite-draft',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: actionMessage.author?.displayName,
        bodyText: getSelectedMessageAiSourceText(actionMessage),
      },
      currentDraft: composerDraftText,
    });

    if (contract.errorKey || !contract.chatMessages) {
      Alert.alert(t('common.error'), t(contract.errorKey ?? 'ai.selectedMessageUnavailable'));
      return;
    }

    try {
      const rewrittenDraft = await requestAiChat(contract.chatMessages);
      applyComposerDraft(rewrittenDraft);
      Alert.alert(
        t('ai.messageRewriteDraft'),
        t(getSelectedMessageAiAppliedMessageKey('rewrite-draft', aiRuntime)),
      );
    } catch (error) {
      Alert.alert(
        t('common.error'),
        getUserFacingErrorMessage(error, t),
      );
    }
  }, [actionMessage, aiRuntime, applyComposerDraft, composerDraftText, t]);

  const handleReport = useCallback(() => {
    if (!actionMessage || !route.params.communityId) return;

    const submitReport = (reasonCode: string) => {
      api('/api/reports', {
        method: 'POST',
        body: {
          communityId: route.params.communityId,
          messageId: actionMessage.id,
          reportedUserId: actionMessage.authorUserId,
          reasonCode,
        },
      })
        .then(() => {
          Alert.alert(t('message.reportTitle'), t('message.reportSubmitted'));
        })
        .catch((error) => {
          Alert.alert(
            t('common.error'),
            error instanceof Error ? error.message : t('message.reportFailed'),
          );
        });
    };

    Alert.alert(
      t('message.reportTitle'),
      t('message.reportBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('message.reportSpam'),
          onPress: () => submitReport('spam'),
        },
        {
          text: t('message.reportHarassment'),
          onPress: () => submitReport('harassment'),
        },
        {
          text: t('message.reportInappropriate'),
          onPress: () => submitReport('inappropriate'),
        },
      ],
    );
  }, [actionMessage, route.params.communityId, t]);

  // Attachment handlers
  const handlePickImage = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const file = await pickImage();
      if (file) setPendingAttachment(file);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.errorOccurred'));
    }
  }, [t]);

  const handleTakePhoto = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const file = await takePhoto();
      if (file) setPendingAttachment(file);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.errorOccurred'));
    }
  }, [t]);

  const handlePickDocument = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const file = await pickDocument();
      if (file) setPendingAttachment(file);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.errorOccurred'));
    }
  }, [t]);

  const handleToggleAttachMenu = useCallback(() => {
    setShowAttachMenu((prev) => !prev);
  }, []);

  const handleShareAttachment = useCallback(
    async (attachment: NonNullable<Message['attachments']>[number]) => {
      if (openingAttachmentId) return;

      setOpeningAttachmentId(attachment.id);
      try {
        const token = authToken ?? (await getToken());
        const attachmentDirectory = new Directory(Paths.cache, 'attachments');
        attachmentDirectory.create({ idempotent: true, intermediates: true });

        const targetFile = new File(
          attachmentDirectory,
          sanitizeAttachmentName(attachment.fileName),
        );

        const downloadedFile = await File.downloadFileAsync(
          getAttachmentFileUrl(attachment.id),
          targetFile,
          {
            idempotent: true,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );

        await Share.share({
          title: attachment.fileName,
          message: attachment.fileName,
          url: downloadedFile.uri,
        });
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('channel.openAttachmentFailed'),
        );
      } finally {
        setOpeningAttachmentId(null);
      }
    },
    [authToken, openingAttachmentId, t],
  );

  const handleOpenAttachment = useCallback(
    async (
      attachment: NonNullable<Message['attachments']>[number],
      attachments?: NonNullable<Message['attachments']>,
    ) => {
      if (isImageAttachmentMimeType(attachment.mimeType, attachment.fileName)) {
        const imageAttachments = (attachments ?? [attachment]).filter((item) =>
          isImageAttachmentMimeType(item.mimeType, item.fileName),
        );
        const index = imageAttachments.findIndex((item) => item.id === attachment.id);
        setPreviewGallery({
          attachments: imageAttachments.length > 0 ? imageAttachments : [attachment],
          index: index >= 0 ? index : 0,
        });
        return;
      }

      await handleShareAttachment(attachment);
    },
    [handleShareAttachment],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if ((!trimmed && !pendingAttachment) || sendMutation.isPending) return false;
      if (!editingMessage && requiresTopic && !topic.trim()) {
        Alert.alert(t('common.error'), t('channel.topicRequired'));
        return false;
      }
      setShowAttachMenu(false);
      try {
        await sendMutation.mutateAsync(trimmed);
        return true;
      } catch (error) {
        const isOffline = error instanceof ApiError && error.status === 0;
        const message = pendingAttachment && isOffline
          ? t('channel.attachmentNeedsConnection')
          : getUserFacingErrorMessage(error, t, {
              rateLimitedKey: pendingAttachment
                ? 'message.attachmentRateLimited'
                : 'common.rateLimited',
            });
        Alert.alert(t('common.error'), message);
        return false;
      }
    },
    [editingMessage, pendingAttachment, requiresTopic, sendMutation, t, topic],
  );

  useEffect(() => {
    if (!isSimulatorHarnessEnabled) {
      return;
    }
    let cancelled = false;

    async function tryDevCompose() {
      if (cancelled || devComposeInFlightRef.current) {
        return;
      }

      devComposeInFlightRef.current = true;
      const payload = await readSimulatorHarnessJson<
        | {
            channelId?: string;
            body?: string;
          }
        | undefined
      >('dev-compose.json');
      if (!payload || cancelled) {
        devComposeInFlightRef.current = false;
        return;
      }

      try {
        if (payload?.channelId !== channelId) {
          return;
        }

        if (typeof payload.body !== 'string' || payload.body.trim().length === 0) {
          await deleteSimulatorHarnessFile('dev-compose.json');
          return;
        }

        const sent = await handleSend(payload.body);
        if (sent) {
          await deleteSimulatorHarnessFile('dev-compose.json');
        }
      } finally {
        devComposeInFlightRef.current = false;
      }
    }

    void tryDevCompose();
    const interval = setInterval(() => {
      void tryDevCompose();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channelId, handleSend]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devAttachmentAttemptedRef.current || !simulatorHarnessDirectory) {
      return;
    }

    let cancelled = false;
    devAttachmentAttemptedRef.current = true;

    async function tryDevAttachment() {
      const payload = await readSimulatorHarnessJson<
        | {
            channelId?: string;
            body?: string;
            fileName?: string;
            mimeType?: string;
            contents?: string;
          }
        | undefined
      >('dev-attachment.json');
      if (!payload || cancelled) {
        devAttachmentAttemptedRef.current = false;
        return;
      }

      try {
        await deleteSimulatorHarnessFile('dev-attachment.json');

        if (
          payload?.channelId !== channelId ||
          typeof payload.contents !== 'string' ||
          !payload.contents.length
        ) {
          return;
        }

        const tempFileName = payload.fileName || `dev-attachment-${Date.now()}.txt`;
        const tempUri = `${simulatorHarnessDirectory}${tempFileName}`;
        await LegacyFileSystem.writeAsStringAsync(tempUri, payload.contents);

        const attachmentData = await uploadFile(
          {
            uri: tempUri,
            name: tempFileName,
            mimeType: payload.mimeType || 'text/plain',
            size: payload.contents.length,
          },
          { channelId },
        );

        const messageBody: Record<string, unknown> = {
          bodyMarkdown: payload.body?.trim() || payload.fileName?.trim() || ' ',
        };

        const trimmedTopic = topic.trim();
        if (trimmedTopic) {
          messageBody.topic = trimmedTopic;
        }

        const result = await api<{ message: Message }>(endpoint, {
          method: 'POST',
          body: messageBody,
          headers: {
            'X-Request-Id': createRequestId(),
          },
        });

        if (result.message?.id) {
          await attachToMessage(result.message.id, attachmentData);
          await queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
        }

        await deleteSimulatorHarnessPath(tempUri);
      } finally {
        devAttachmentAttemptedRef.current = false;
      }
    }

    void tryDevAttachment();

    return () => {
      cancelled = true;
    };
  }, [channelId, endpoint, queryClient, t, topic]);

  useEffect(() => {
    if (!focusMessageId || mergedMessages.length === 0) return;
    const focusIndex = mergedMessages.findIndex((message) => message.id === focusMessageId);
    if (focusIndex === -1) return;

    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: focusIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [focusMessageId, mergedMessages]);

  useEffect(() => {
    if (
      normalizedTranslationPreference.mode === 'manual_only' ||
      mergedMessages.length === 0
    ) {
      return;
    }

    let cancelled = false;

    for (const message of mergedMessages) {
      const body = shouldHideAttachmentBody(
        message.bodyPlaintext || message.bodyMarkdown,
        message.attachments ?? [],
      )
        ? ''
        : message.bodyPlaintext;
      if (!body.trim()) {
        continue;
      }

      const sourceVersion = getTranslationRenderSourceVersion(message);
      const translationState = autoTranslatedBodies[message.id];
      const entry = translationState?.entry;
      const cacheState = resolveTranslationRenderCacheState({
        entry,
        sourceVersion,
        targetLanguage: normalizedTranslationPreference.targetLanguage,
      });
      const decision = resolveTranslationDisplayDecision({
        preference: normalizedTranslationPreference,
        messageLanguage: inferMessageLanguage(body),
        hasTranslatedText: cacheState === 'ready' || cacheState === 'stale',
        translationLanguage: entry?.targetLanguage ?? null,
        runtime: translationState?.runtimeStatus ?? 'available',
        stale: cacheState === 'stale',
      });

      if (
        !decision.shouldAutoTranslate ||
        (decision.state !== 'translation-pending' &&
          decision.state !== 'translation-stale') ||
        !decision.targetLanguage
      ) {
        continue;
      }

      void api<{
        translatedText: string | null;
        runtime: {
          status: TranslationRuntimeStatus;
          issue?: string;
        };
      }>('/api/translate', {
        method: 'POST',
        body: {
          text: body,
          targetLang: decision.targetLanguage,
        },
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          setAutoTranslatedBodies((prev) => ({
            ...prev,
            [message.id]: result.translatedText
              ? {
                  entry: createTranslationRenderCacheEntry({
                    translatedText: result.translatedText,
                    targetLanguage: decision.targetLanguage as string,
                    sourceVersion,
                  }),
                  runtimeStatus: result.runtime.status,
                  issue: result.runtime.issue,
                }
              : {
                  entry: null,
                  runtimeStatus: result.runtime.status,
                  issue: result.runtime.issue,
                },
          }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setAutoTranslatedBodies((prev) => ({
            ...prev,
            [message.id]: {
              entry: null,
              runtimeStatus: 'unavailable',
            },
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [autoTranslatedBodies, mergedMessages, normalizedTranslationPreference]);

  if (isLoading) {
    return <LoadingSpinner text={t('channel.loadingMessages')} />;
  }

  const messagesById = new Map(mergedMessages.map((message) => [message.id, message]));
  const renderAttachments = (
    attachments: NonNullable<Message['attachments']>,
    isOwn: boolean,
  ) => {
    const imageAttachments = attachments.filter((attachment) =>
      isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
    );
    const fileAttachments = attachments.filter(
      (attachment) => !isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
    );
    const visibleImageAttachments = imageAttachments.slice(0, 4);

    return (
      <View style={[styles.attachments, isOwn && styles.attachmentsOwn]}>
        {imageAttachments.length > 0 ? (
          <View
            style={[
              styles.attachmentImageGrid,
              imageAttachments.length === 1 && styles.attachmentImageGridSingle,
              isOwn && styles.attachmentImageGridOwn,
            ]}
          >
            {visibleImageAttachments.map((attachment, index) => {
              const isSingle = imageAttachments.length === 1;
              const isHero = imageAttachments.length === 3 && index === 0;
              const extraCount = imageAttachments.length > 4 && index === 3
                ? imageAttachments.length - 4
                : 0;

              return (
                <TouchableOpacity
                  key={attachment.id}
                  testID={`channel-attachment-image-${attachment.id}`}
                  style={[
                    styles.attachmentImageCard,
                    isSingle && styles.attachmentImageCardSingle,
                    !isSingle && styles.attachmentImageCardGrid,
                    isHero && styles.attachmentImageCardHero,
                  ]}
                  activeOpacity={0.88}
                  onPress={() => void handleOpenAttachment(attachment, attachments)}
                >
                  <Image
                    source={{
                      uri: getAttachmentFileUrl(attachment.id),
                      ...(authToken
                        ? { headers: { Authorization: `Bearer ${authToken}` } }
                        : {}),
                    }}
                    style={styles.attachmentImage}
                    resizeMode="cover"
                  />
                  {extraCount > 0 ? (
                    <View style={styles.attachmentImageMoreOverlay}>
                      <Text style={styles.attachmentImageMoreText}>{`+${extraCount}`}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {fileAttachments.map((attachment) => (
          <View key={attachment.id} style={styles.attachmentItem}>
            <TouchableOpacity
              testID={`channel-attachment-file-${attachment.id}`}
              style={styles.attachmentFile}
              activeOpacity={0.8}
              onPress={() => void handleOpenAttachment(attachment, attachments)}
              disabled={openingAttachmentId === attachment.id}
            >
              <View style={styles.attachmentFileIconWrap}>
                <Text style={styles.attachmentFileIcon}>{'\u{1F4C4}'}</Text>
              </View>
              <View style={styles.attachmentFileContent}>
                <View style={styles.attachmentFileMetaRow}>
                  <View style={styles.attachmentFileTypeBadge}>
                    <Text style={styles.attachmentFileTypeBadgeText}>
                      {getAttachmentKindLabel(attachment.fileName, attachment.mimeType)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.attachmentFileName} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                <Text style={styles.attachmentSize}>
                  {openingAttachmentId === attachment.id
                    ? t('channel.openingAttachment')
                    : formatFileSize(attachment.fileSize)}
                </Text>
              </View>
              <View style={styles.attachmentFileCta}>
                <Text style={styles.attachmentFileCtaText}>{t('channel.shareAttachment')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      testID="channel-screen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        testID="channel-message-list"
        ref={listRef}
        data={mergedMessages}
        keyExtractor={(item) => item.id}
        inverted
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        refreshControl={
                <RefreshControl
                  refreshing={isFocused && isRefetching}
                  onRefresh={refetch}
                  tintColor={colors.primary}
                />
        }
        renderItem={({ item, index }) => {
          const isOwn = item.authorUserId === currentUser?.id;
          const previousMessage = index > 0 ? mergedMessages[index - 1] : undefined;
          const nextMessage = index < mergedMessages.length - 1 ? mergedMessages[index + 1] : undefined;
          const startsGroup = previousMessage?.authorUserId !== item.authorUserId;
          const endsGroup = nextMessage?.authorUserId !== item.authorUserId;
          const repliedMessage = item.parentMessageId
            ? messagesById.get(item.parentMessageId)
            : undefined;
          const messagePoll = pollsByMessageId[item.id];
          const threadSummary = threadSummariesByRootId.get(item.id);
          const itemAttachments = item.attachments ?? [];
          const messageReactions = reactionsByMessageId[item.id] ?? [];
          const translated = getRenderedTranslation(item);
          const displayBody = shouldHideAttachmentBody(
            item.bodyPlaintext || item.bodyMarkdown,
            itemAttachments,
          )
            ? ''
            : item.bodyPlaintext;
          return (
            <TouchableOpacity
              testID={`channel-message-touchable-${item.id}`}
              activeOpacity={1}
              onLongPress={() => {
                setSelectedMessageId(item.id);
                setActionMessage(item);
              }}
              delayLongPress={400}
            >
              <View>
              {index === 0 ||
              new Date(mergedMessages[index - 1].createdAt).toDateString() !==
                new Date(item.createdAt).toDateString() ? (
                <View style={styles.dateDividerRow}>
                  <View style={styles.dateDividerLine} />
                  <Text style={styles.dateDividerText}>{formatMessageDateDivider(item.createdAt)}</Text>
                  <View style={styles.dateDividerLine} />
                </View>
              ) : null}
              <View
                style={
                  item.id === focusMessageId
                    ? styles.focusedMessageWrap
                    : undefined
                }
              >
              <MessageBubble
                authorName={item.author?.displayName ?? t('common.unknown')}
                authorAvatarUrl={item.author?.avatarUrl ?? null}
                body={displayBody}
                topic={item.topic}
                translatedBody={translated.body}
                translatedLabel={translated.label}
                translationVariant={translated.variant}
                translationStatusLabel={translated.statusLabel}
                translationStatusIssue={translated.statusIssue}
                replyAuthorName={repliedMessage?.author?.displayName ?? t('message.reply')}
                replyBody={
                  item.parentMessageId
                    ? repliedMessage?.bodyPlaintext ?? t('message.replyUnavailable')
                    : undefined
                }
                  time={formatMessageMetaTime(item.createdAt)}
                isOwn={isOwn}
                isEdited={item.isEdited}
                editedLabel={t('message.edited')}
                readCount={itemAttachments.length > 0 ? undefined : unreadCounts[item.id]}
                showAvatar={startsGroup}
                showAuthorName={startsGroup}
                startsGroup={startsGroup}
                endsGroup={endsGroup}
                showActionChips={selectedMessageId === item.id}
                reactions={messageReactions.map((reaction) => ({
                  emoji: reaction.emoji,
                  count: reaction.count,
                  reactedByMe: reaction.users.some((user) => user.id === currentUser?.id),
                }))}
                poll={
                  messagePoll
                    ? {
                        ...messagePoll,
                        footerLabel: `${t('poll.totalVotes', { count: messagePoll.totalVotes })} • ${
                          messagePoll.closed ? t('poll.closed') : t('poll.open')
                        }`,
                      }
                    : undefined
                }
                onPressPollOption={
                  messagePoll
                    ? (optionId, voted) => {
                        votePollMutation.mutate({
                          pollId: messagePoll.id,
                          optionId,
                          voted,
                        });
                      }
                    : undefined
                }
                onPressReaction={
                  canReactToMessages
                    ? (emoji) => {
                        void toggleReaction(item.id, emoji);
                      }
                    : undefined
                }
                onPressAddReaction={
                  canReactToMessages ? () => setActionMessage(item) : undefined
                }
                onPressMore={() => setActionMessage(item)}
                threadButtonLabel={
                  threadSummary
                    ? t('thread.openThread', { count: threadSummary.replyCount })
                    : undefined
                }
                onPressThread={
                  threadSummary
                    ? () => {
                        void openThreadForMessage(item);
                      }
                    : undefined
                }
              />
                {itemAttachments.length > 0 ? (
                  <View style={[styles.attachmentMetaRow, isOwn ? styles.attachmentMetaRowOwn : styles.attachmentMetaRowOther]}>
                    {isOwn ? (
                      <View style={[styles.attachmentMetaColumn, styles.attachmentMetaColumnOwn]}>
                        {(unreadCounts[item.id] ?? 0) > 0 ? (
                          <Text style={styles.attachmentReadCount}>
                            {formatUnreadCount(unreadCounts[item.id] ?? 0)}
                          </Text>
                        ) : null}
                        {messageReactions.length === 0 ? (
                          <Text style={styles.attachmentMetaTime}>{formatMessageMetaTime(item.createdAt)}</Text>
                        ) : null}
                      </View>
                    ) : null}
                    <View style={styles.attachmentMetaMain}>
                      {renderAttachments(itemAttachments, isOwn)}
                    </View>
                    {!isOwn ? (
                      <View style={[styles.attachmentMetaColumn, styles.attachmentMetaColumnOther]}>
                        {(unreadCounts[item.id] ?? 0) > 0 ? (
                          <Text style={styles.attachmentReadCount}>
                            {formatUnreadCount(unreadCounts[item.id] ?? 0)}
                          </Text>
                        ) : null}
                        {messageReactions.length === 0 ? (
                          <Text style={styles.attachmentMetaTime}>{formatMessageMetaTime(item.createdAt)}</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          pendingMessages.length > 0 ? (
            <View style={styles.pendingSection}>
              {pendingMessages.map((pm) => (
                <View key={pm.id} style={styles.pendingItem}>
                  <Text style={styles.pendingBody}>{pm.body}</Text>
                  <Text style={styles.pendingLabel}>{t('channel.sendingMsg')}</Text>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ transform: [{ scaleY: -1 }] }}>
            <EmptyState
              icon="message"
              title={t('channel.noMessages')}
              subtitle={t('channel.beFirst')}
            />
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          mergedMessages.length === 0 && pendingMessages.length === 0
            ? styles.emptyContainer
            : null,
        ]}
      />

      {/* Typing indicator */}
      {typingUserIds.length > 0 && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>
            {typingUserIds.length === 1
              ? t('channel.typing')
              : t('channel.typingMultiple', { count: typingUserIds.length })}
          </Text>
        </View>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>{t('message.reply')}</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyTo.bodyPlaintext}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyClose}>{'\u{2715}'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {editingMessage && (
        <View style={styles.replyBar}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>{t('common.edit')}</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {editingMessage.bodyPlaintext}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setEditingMessage(null)}>
            <Text style={styles.replyClose}>{'\u{2715}'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isArchived && canPostChannel && requiresTopic && (
        <View style={styles.topicBar}>
          <Text style={styles.topicLabel}>{t('channel.topic')}</Text>
          <TextInput
            style={styles.topicInput}
            value={topic}
            onChangeText={setTopic}
            placeholder={t('channel.topicPlaceholder')}
            placeholderTextColor={colors.textDim}
            maxLength={200}
          />
        </View>
      )}

      {/* Pending attachment preview */}
      {pendingAttachment && (
        <View testID="channel-pending-attachment" style={styles.attachmentPreview}>
          {isImageAttachmentMimeType(pendingAttachment.mimeType, pendingAttachment.name) ? (
            <>
              <Image
                testID="channel-pending-attachment-image"
                source={{ uri: pendingAttachment.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewMeta}>
                <View style={styles.previewBadgeRow}>
                  <Text style={styles.previewBadge}>
                    {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                  </Text>
                </View>
                <Text testID="channel-pending-attachment-name" style={styles.previewFileName} numberOfLines={1}>
                  {pendingAttachment.name}
                </Text>
                <Text style={styles.previewFileMeta}>
                  {formatFileSize(pendingAttachment.size)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.previewFileIconWrap}>
                <Text style={styles.previewFileIconLabel}>
                  {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                </Text>
              </View>
              <View style={styles.previewMeta}>
                <View style={styles.previewBadgeRow}>
                  <Text style={styles.previewBadge}>
                    {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                  </Text>
                </View>
                <Text testID="channel-pending-attachment-name" style={styles.previewFileName} numberOfLines={1}>
                  {pendingAttachment.name}
                </Text>
                <Text style={styles.previewFileMeta}>
                  {formatFileSize(pendingAttachment.size)}
                </Text>
              </View>
            </>
          )}
          <TouchableOpacity
            testID="channel-pending-attachment-remove"
            style={styles.removeAttachment}
            onPress={() => setPendingAttachment(null)}
          >
            <Text style={styles.removeAttachmentText}>{t('channel.remove')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload progress */}
      {uploadProgress !== null && (
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]}
          />
        </View>
      )}

      {/* Attachment menu */}
      {showAttachMenu && (
        <View testID="channel-attach-menu" style={styles.attachMenu}>
          <TouchableOpacity
            testID="channel-attach-menu-photo"
            style={styles.attachMenuItem}
            onPress={handlePickImage}
          >
            <Text style={styles.attachMenuText}>{t('channel.photoVideo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="channel-attach-menu-camera"
            style={styles.attachMenuItem}
            onPress={handleTakePhoto}
          >
            <Text style={styles.attachMenuText}>{t('channel.camera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="channel-attach-menu-document"
            style={styles.attachMenuItem}
            onPress={handlePickDocument}
          >
            <Text style={styles.attachMenuText}>{t('channel.document')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="channel-attach-menu-poll"
            style={styles.attachMenuItem}
            onPress={() => {
              setShowAttachMenu(false);
              openChannelPolls();
            }}
          >
            <Text style={styles.attachMenuText}>{t('poll.title')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {(isArchived || !canPostChannel) && (
        <View style={styles.archivedBanner}>
          <Text style={styles.archivedBannerTitle}>{t('channel.archivedTitle')}</Text>
          <Text style={styles.archivedBannerText}>
            {isArchived ? t('channel.archivedReadOnly') : t('channel.readOnlyNoPost')}
          </Text>
        </View>
      )}

      {/* Composer */}
      {!isArchived && canPostChannel && (
        <MessageComposer
          placeholder={editingMessage ? t('message.editPlaceholder') : t('channel.messageInput')}
          sendLabel={editingMessage ? t('common.save') : t('channel.send')}
          sendingLabel={t('channel.sending')}
          isSending={sendMutation.isPending}
          onSend={handleSend}
          onDraftChange={setComposerDraftText}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          onPressAdd={
            editingMessage || !canUploadAttachment ? undefined : handleToggleAttachMenu
          }
          allowEmptySubmit={!!pendingAttachment}
          draftText={editingMessage?.bodyMarkdown ?? composerDraftSeed}
          draftKey={editingMessage?.id ?? composerDraftKey}
        />
      )}

      <AttachmentLightbox
        attachments={previewGallery?.attachments ?? []}
        currentIndex={previewGallery?.index ?? 0}
        authToken={authToken}
        isSharing={openingAttachmentId === previewGallery?.attachments[previewGallery.index]?.id}
        closeLabel={t('common.cancel')}
        shareLabel={t('channel.shareAttachment')}
        sharingLabel={t('channel.openingAttachment')}
        previousLabel={t('lightbox.previous')}
        nextLabel={t('lightbox.next')}
        onClose={() => setPreviewGallery(null)}
        onNavigate={(index) =>
          setPreviewGallery((current) => (current ? { ...current, index } : current))
        }
        onShare={() => {
          const attachment = previewGallery?.attachments[previewGallery.index];
          if (!attachment) {
            return;
          }
          void handleShareAttachment(attachment);
        }}
      />

      {/* KakaoTalk-style message action sheet */}
      {actionMessage && (
        <MessageActionSheet
          message={actionMessage}
          isOwn={actionMessage.authorUserId === currentUser?.id}
          onReply={canPostChannel ? handleReply : undefined}
          onThread={handleOpenThread}
          onEdit={
            canPostChannel && actionMessage.authorUserId === currentUser?.id
              ? handleEdit
              : undefined
          }
          onReport={
            actionMessage.authorUserId !== currentUser?.id && route.params.communityId
              ? handleReport
              : undefined
          }
          onTranslate={handleTranslate}
          onAiReplyDraft={handleAiReplyDraft}
          onAiRewriteDraft={handleAiRewriteDraft}
          aiStatusLabel={aiStatusLabel}
          aiStatusTone={aiStatusTone}
          aiStatusDescription={aiStatusDescription}
          aiActionsDisabled={!isAiRuntimeUsable(aiRuntime)}
          onReact={canReactToMessages ? handleReact : undefined}
          onPin={handlePin}
          onBookmark={handleBookmark}
          onClose={() => setActionMessage(null)}
          onDelete={handleDelete}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeAttachmentName(fileName: string): string {
  const normalized = fileName.trim().replace(/[\/\\:\u0000-\u001F]/g, '_');
  return normalized.length > 0 ? normalized : 'attachment';
}

function getAttachmentKindLabel(fileName: string, mimeType: string): string {
  if (isImageAttachmentMimeType(mimeType, fileName)) return 'IMG';
  const extension = fileName.split('.').pop()?.trim();
  if (extension) {
    return extension.toUpperCase().slice(0, 6);
  }

  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLS';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'ZIP';
  if (mimeType.includes('audio')) return 'AUDIO';
  if (mimeType.includes('video')) return 'VIDEO';
  return 'FILE';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.talkBackground,
  },
  emptyContainer: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sourceHistoryBannerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sourceHistoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.talkPanel,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  sourceHistoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2b2d31',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  sourceHistoryBadgeText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  sourceHistoryTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#40444b',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  sourceHistoryTypeBadgeText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  sourceHistoryContent: {
    flex: 1,
  },
  sourceHistoryTitle: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  sourceHistoryName: {
    marginTop: 2,
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '600',
  },
  sourceHistoryBody: {
    marginTop: 2,
    color: colors.talkMeta,
    fontSize: fs.xs,
  },
  sourceHistoryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sourceHistoryButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  headerAction: {
    fontSize: 20,
    marginRight: spacing.sm,
    color: colors.talkMeta,
  },
  channelHeroWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  channelHeroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: colors.talkPanel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  channelHeroEyebrow: {
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  channelHeroTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  channelHeroBody: {
    marginTop: spacing.xs,
    color: colors.talkMeta,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  channelHeroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  channelHeroMetaBadge: {
    borderRadius: 999,
    backgroundColor: '#40444b',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  channelHeroMetaBadgeText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  channelHeroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  channelHeroActionChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: colors.talkOtherBubble,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  channelHeroActionChipPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  channelHeroActionChipText: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  channelHeroActionChipPrimaryText: {
    color: colors.white,
  },
  headerHistoryAction: {
    marginRight: spacing.sm,
    maxWidth: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  headerHistoryActionText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.talkPanel,
    marginLeft: spacing.xs,
  },
  headerIconText: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  // Pending offline messages
  pendingSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pendingItem: {
    backgroundColor: 'rgba(254,229,0,0.72)',
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.xs,
    opacity: 0.6,
    alignSelf: 'flex-end',
    maxWidth: '78%',
    borderWidth: 1,
    borderColor: colors.talkOwnBubbleBorder,
  },
  pendingBody: {
    color: '#1f2933',
    fontSize: fs.base,
  },
  pendingLabel: {
    color: '#9a6d00',
    fontSize: fs.xs,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  // Attachments in messages
  attachments: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  focusedMessageWrap: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.sm,
  },
  attachmentsOwn: {
    alignItems: 'flex-end',
  },
  attachmentImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    maxWidth: 284,
  },
  attachmentImageGridSingle: {
    maxWidth: 200,
  },
  attachmentImageGridOwn: {
    alignSelf: 'flex-end',
  },
  attachmentItem: {
    marginTop: spacing.xs,
  },
  attachmentImageCard: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.talkOtherBubbleBorder,
    backgroundColor: colors.talkOtherBubble,
    position: 'relative',
  },
  attachmentImageCardSingle: {
    width: 200,
    height: 150,
  },
  attachmentImageCardGrid: {
    width: 138,
    height: 138,
  },
  attachmentImageCardHero: {
    width: 284,
    height: 138,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.talkOtherBubble,
  },
  attachmentImageMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 48, 64, 0.42)',
  },
  attachmentImageMoreText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '800',
  },
  attachmentFile: {
    backgroundColor: colors.talkOtherBubble,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.talkOtherBubbleBorder,
    gap: spacing.sm,
    minWidth: 220,
  },
  attachmentFileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b2d31',
    borderWidth: 1,
    borderColor: colors.talkOtherBubbleBorder,
  },
  attachmentFileIcon: {
    fontSize: 20,
  },
  attachmentFileContent: {
    flex: 1,
    minWidth: 0,
  },
  attachmentFileMetaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  attachmentFileTypeBadge: {
    borderRadius: 999,
    backgroundColor: '#2b2d31',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  attachmentFileTypeBadgeText: {
    color: colors.talkMeta,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  attachmentFileName: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '700',
    flex: 1,
  },
  attachmentSize: {
    color: colors.talkMeta,
    fontSize: fs.sm,
    marginTop: 2,
  },
  attachmentFileCta: {
    borderRadius: 999,
    backgroundColor: '#2b2d31',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.talkOtherBubbleBorder,
  },
  attachmentFileCtaText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  attachmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  attachmentMetaRowOwn: {
    alignSelf: 'flex-end',
  },
  attachmentMetaRowOther: {
    alignSelf: 'flex-start',
  },
  attachmentMetaMain: {
    flexShrink: 1,
    minWidth: 0,
  },
  attachmentMetaColumn: {
    minWidth: 14,
    alignSelf: 'flex-end',
    gap: 1,
    pointerEvents: 'none',
  },
  attachmentMetaColumnOther: {
    alignItems: 'flex-start',
  },
  attachmentMetaColumnOwn: {
    alignItems: 'flex-end',
  },
  attachmentReadCount: {
    color: colors.talkMeta,
    fontSize: 10,
    fontWeight: '800',
  },
  attachmentMetaTime: {
    color: colors.talkMeta,
    fontSize: 10,
    fontWeight: '500',
  },
  channelHeaderCompact: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  channelHeaderCompactTitle: {
    color: colors.textPrimary,
    fontSize: fs.xl,
    fontWeight: '800',
  },
  channelHeaderCompactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  channelHeaderCompactChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.talkOtherBubbleBorder,
    backgroundColor: colors.talkOtherBubble,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  channelHeaderCompactChipText: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  dateDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dateDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.talkPanelBorder,
  },
  dateDividerText: {
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  // Typing indicator
  typingBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: 'transparent',
  },
  typingText: {
    color: colors.talkMeta,
    fontSize: fs.sm,
    fontStyle: 'italic',
  },
  // Reply indicator
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.talkPanel,
    borderTopWidth: 1,
    borderTopColor: colors.talkPanelBorder,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    color: colors.talkMeta,
    fontSize: fs.base,
  },
  replyClose: {
    color: colors.talkMeta,
    fontSize: 18,
    paddingHorizontal: spacing.sm,
  },
  topicBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.talkPanelBorder,
    backgroundColor: colors.talkPanel,
  },
  topicLabel: {
    color: colors.talkMeta,
    fontSize: fs.xs,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  topicInput: {
    backgroundColor: colors.talkOtherBubble,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fs.base,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  // Attachment preview (pending upload)
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.talkPanel,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  previewImage: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.md,
  },
  previewMeta: {
    flex: 1,
    minWidth: 0,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  previewBadge: {
    color: '#f0d74c',
    backgroundColor: 'rgba(240, 215, 76, 0.14)',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  previewFileName: {
    color: colors.textPrimary,
    fontSize: fs.base,
    fontWeight: '600',
  },
  previewFileMeta: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    marginTop: 2,
  },
  previewFileIconWrap: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.md,
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFileIconLabel: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '800',
  },
  removeAttachment: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  removeAttachmentText: {
    color: colors.error,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  // Upload progress bar
  progressBar: {
    height: 3,
    backgroundColor: colors.talkPanel,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f0d74c',
  },
  // Attachment picker menu
  attachMenu: {
    backgroundColor: colors.talkPanel,
    borderTopWidth: 1,
    borderTopColor: colors.talkPanelBorder,
    paddingVertical: spacing.xs,
  },
  attachMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  attachMenuText: {
    color: colors.textPrimary,
    fontSize: fs.base,
  },
  archivedBanner: {
    backgroundColor: colors.talkPanel,
    borderTopWidth: 1,
    borderTopColor: colors.talkPanelBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  archivedBannerTitle: {
    color: colors.warning,
    fontSize: fs.base,
    fontWeight: '700',
  },
  archivedBannerText: {
    color: colors.talkMeta,
    fontSize: fs.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
