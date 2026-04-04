import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, ApiError, createRequestId } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  getSimulatorHarnessPath,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessFile,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import MessageBubble from '../components/MessageBubble';
import MessageComposer from '../components/MessageComposer';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import MessageActionSheet, { type ActionSheetMessage } from '../components/MessageActionSheet';
import AttachmentLightbox from '../components/AttachmentLightbox';
import { useChannelSubscription, useWebSocketStatus } from '../hooks/useWebSocket';
import {
  attachToMessage,
  getAttachmentFileUrl,
  pickDocument,
  pickImage,
  takePhoto,
  type PickedFile,
  uploadFile,
} from '../lib/file-picker';
import { getUserFacingErrorMessage } from '../lib/error-message';
import { getToken, saveLastVisited } from '../lib/storage';
import type { HomeStackParamList } from '../navigation/types';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';
import {
  isImageAttachmentMimeType,
  shouldHideAttachmentBody,
} from '@zktalk/shared';

type Props = NativeStackScreenProps<HomeStackParamList, 'ThreadScreen'>;

interface ThreadAuthor {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}

interface ThreadMessage {
  id: string;
  bodyPlaintext: string;
  bodyMarkdown?: string;
  threadId?: string | null;
  authorUserId: string;
  createdAt: string;
  isEdited?: boolean;
  author?: ThreadAuthor;
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
  }>;
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

interface ThreadMessageRow {
  message: ThreadMessage;
  author: ThreadAuthor;
  attachments?: NonNullable<ThreadMessage['attachments']>;
}

interface ThreadMessagesPage {
  items: ThreadMessage[];
  nextCursor: string | null;
}

interface ThreadDetailResponse {
  thread: {
    id: string;
    channelId: string;
    rootMessageId: string;
    title?: string | null;
    isLocked: boolean;
  };
  creator: ThreadAuthor;
  rootMessage: ThreadMessageRow | null;
  isFollowing: boolean;
  lastReadMessageId: string | null;
  permissions: {
    canPostReply: boolean;
    canModerateThread: boolean;
  };
}

interface ThreadChannelDetail {
  id: string;
  name: string;
  type: 'chat' | 'announcement' | 'forum';
}

interface ChannelPermissions {
  canUploadAttachment: boolean;
}

function formatThreadDateDivider(
  dateString: string,
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t('thread.dateToday');
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return t('thread.dateYesterday');
  }

  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function flattenThreadMessage(row: ThreadMessage | ThreadMessageRow): ThreadMessage {
  if ('message' in row) {
    return {
      ...row.message,
      author: row.author,
      attachments: row.attachments ?? row.message.attachments ?? [],
    };
  }

  return row;
}

export default function ThreadScreen({ navigation, route }: Props) {
  const { threadId, channelId, rootMessageId, focusMessageId } = route.params;
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ThreadMessage>>(null);
  const jumpHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollTargetRef = useRef<{ index: number; viewPosition: number } | null>(null);
  const devReplyAttemptedRef = useRef(false);
  const threadRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const { queuedEventCount, consumeEvents } = useChannelSubscription(channelId);
  const wsStatus = useWebSocketStatus();
  const shouldPollReplies = wsStatus !== 'connected';
  const [editingMessage, setEditingMessage] = React.useState<ThreadMessage | null>(null);
  const [actionMessage, setActionMessage] = React.useState<ThreadMessage | null>(null);
  const [translatedBodies, setTranslatedBodies] = React.useState<Record<string, string>>({});
  const [pendingAttachment, setPendingAttachment] = React.useState<PickedFile | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [showAttachMenu, setShowAttachMenu] = React.useState(false);
  const [authToken, setAuthToken] = React.useState<string | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = React.useState<string | null>(null);
  const [previewGallery, setPreviewGallery] = React.useState<{
    attachments: NonNullable<ThreadMessage['attachments']>;
    index: number;
  } | null>(null);
  const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'mine' | 'starter' | 'attachments' | 'images' | 'files' | 'unread' | 'reactions' | 'edited'
  >('all');
  const [participantFilterUserId, setParticipantFilterUserId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'time' | 'author' | 'reactions'>('time');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const threadQuery = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api<ThreadDetailResponse>(`/api/threads/${threadId}`),
  });

  useEffect(() => {
    if (threadId) {
      void saveLastVisited({
        kind: 'thread',
        channelId,
        threadId,
      });
    }
  }, [channelId, threadId]);
  const channelQuery = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => api<{ channel: ThreadChannelDetail }>(`/api/channels/${channelId}`),
  });
  const channelPermissionsQuery = useQuery({
    queryKey: ['channel-me-permissions', channelId],
    queryFn: () =>
      api<{ permissions: ChannelPermissions }>(`/api/channels/${channelId}/me-permissions`),
  });

  const repliesQuery = useInfiniteQuery({
    queryKey: ['thread-messages', threadId],
    queryFn: async ({ pageParam }: { pageParam?: string | null }) => {
      const result = await api<{ items: ThreadMessageRow[]; nextCursor: string | null }>(
        `/api/threads/${threadId}/messages${
          pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''
        }`,
      );
      return {
        items: result.items.map(flattenThreadMessage),
        nextCursor: result.nextCursor,
      } satisfies ThreadMessagesPage;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: shouldPollReplies ? 30_000 : false,
  });
  const scheduleThreadRefresh = useCallback(
    (delayMs = 1_200) => {
      if (threadRefreshTimeoutRef.current) {
        clearTimeout(threadRefreshTimeoutRef.current);
      }

      threadRefreshTimeoutRef.current = setTimeout(() => {
        threadRefreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] });
        void queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      }, delayMs);
    },
    [queryClient, threadId],
  );
  const rootMessage = threadQuery.data?.rootMessage
    ? flattenThreadMessage(threadQuery.data.rootMessage)
    : null;
  const starterUserId = rootMessage?.authorUserId ?? threadQuery.data?.creator.id;
  const replies = useMemo(
    () => [...(repliesQuery.data?.pages ?? [])].reverse().flatMap((page) => page.items),
    [repliesQuery.data],
  );
  const hasFocusedMessage = focusMessageId
    ? focusMessageId === rootMessage?.id || replies.some((message) => message.id === focusMessageId)
    : true;
  const focusedMessageQuery = useQuery({
    queryKey: ['message', focusMessageId],
    enabled: !!focusMessageId && !hasFocusedMessage,
    queryFn: async () => {
      const result = await api<ThreadMessageRow | ThreadMessage>(`/api/messages/${focusMessageId}`);
      return flattenThreadMessage(result);
    },
  });
  const mergedReplies = useMemo(() => {
    const focusedMessage = focusedMessageQuery.data;
    if (
      !focusedMessage ||
      focusedMessage.id === rootMessage?.id ||
      focusedMessage.threadId !== threadId ||
      replies.some((message) => message.id === focusedMessage.id)
    ) {
      return replies;
    }

    return [...replies, focusedMessage].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [focusedMessageQuery.data, replies, rootMessage?.id, threadId]);
  const messageIds = [
    ...(rootMessage ? [rootMessage.id] : []),
    ...mergedReplies.map((message) => message.id),
  ];
  const { data: reactionsData } = useQuery({
    queryKey: ['message-reactions', 'thread', threadId, messageIds],
    enabled: messageIds.length > 0,
    queryFn: () =>
      api<{ reactionsByMessageId: Record<string, ReactionSummary[]> }>(
        `/api/reactions?messageIds=${messageIds.map(encodeURIComponent).join(',')}`,
      ),
  });
  const reactionsByMessageId = reactionsData?.reactionsByMessageId ?? {};
  const filterCounts = useMemo(() => {
    const lastReadMessageId = threadQuery.data?.lastReadMessageId ?? null;
    return {
      all: mergedReplies.length,
      unread: mergedReplies.filter((message) =>
        lastReadMessageId ? message.id > lastReadMessageId : true,
      ).length,
      mine: mergedReplies.filter((message) => message.authorUserId === currentUser?.id).length,
      starter: mergedReplies.filter((message) =>
        starterUserId ? message.authorUserId === starterUserId : false,
      ).length,
      reactions: mergedReplies.filter(
        (message) => (reactionsByMessageId[message.id]?.length ?? 0) > 0,
      ).length,
      edited: mergedReplies.filter((message) => !!message.isEdited).length,
      images: mergedReplies.filter((message) =>
        message.attachments?.some((attachment) =>
          isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
        ),
      ).length,
      files: mergedReplies.filter((message) =>
        message.attachments?.some((attachment) =>
          !isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
        ),
      ).length,
      attachments: mergedReplies.filter((message) => (message.attachments?.length ?? 0) > 0)
        .length,
    } as const;
  }, [
    currentUser?.id,
    mergedReplies,
    reactionsByMessageId,
    starterUserId,
    threadQuery.data?.lastReadMessageId,
  ]);
  const participantBaseReplies = useMemo(() => {
    const lastReadMessageId = threadQuery.data?.lastReadMessageId ?? null;
    const baseByMode =
      filterMode === 'mine'
        ? mergedReplies.filter((message) => message.authorUserId === currentUser?.id)
        : filterMode === 'starter'
          ? mergedReplies.filter((message) =>
              starterUserId ? message.authorUserId === starterUserId : false,
            )
            : filterMode === 'unread'
              ? mergedReplies.filter((message) =>
                  lastReadMessageId ? message.id > lastReadMessageId : true,
                )
              : filterMode === 'edited'
                ? mergedReplies.filter((message) => !!message.isEdited)
                : filterMode === 'images'
                  ? mergedReplies.filter((message) =>
                      message.attachments?.some((attachment) =>
                        isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
                      ),
                    )
                  : filterMode === 'files'
                    ? mergedReplies.filter((message) =>
                        message.attachments?.some((attachment) =>
                          !isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
                        ),
                      )
              : filterMode === 'reactions'
                ? mergedReplies.filter(
                    (message) => (reactionsByMessageId[message.id]?.length ?? 0) > 0,
                )
              : filterMode === 'attachments'
                ? mergedReplies.filter((message) => (message.attachments?.length ?? 0) > 0)
                : mergedReplies;

    return !deferredSearchQuery
      ? baseByMode
      : baseByMode.filter((message) => {
          const haystack = [
            message.bodyPlaintext ?? '',
            message.author?.displayName ?? '',
            message.author?.username ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(deferredSearchQuery);
        });
  }, [
    currentUser?.id,
    deferredSearchQuery,
    filterMode,
    mergedReplies,
    reactionsByMessageId,
    starterUserId,
    threadQuery.data?.lastReadMessageId,
  ]);
  const participantOptions = useMemo(() => {
    const counts = new Map<
      string,
      {
        userId: string;
        label: string;
        isCurrentUser: boolean;
        isStarter: boolean;
        count: number;
      }
    >();

    for (const message of participantBaseReplies) {
      const userId = message.authorUserId;
      const label = message.author?.displayName || message.author?.username || t('common.unknown');
      const existing = counts.get(userId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(userId, {
          userId,
          label,
          isCurrentUser: userId === currentUser?.id,
          isStarter: !!starterUserId && userId === starterUserId,
          count: 1,
        });
      }
    }

    const allOptions = Array.from(counts.values())
      .sort((left, right) => {
        if (left.isCurrentUser !== right.isCurrentUser) {
          return left.isCurrentUser ? -1 : 1;
        }
        if (left.isStarter !== right.isStarter) {
          return left.isStarter ? -1 : 1;
        }
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.label.localeCompare(right.label);
      })
      .map((option) => {
        const badges = [
          option.isCurrentUser ? t('common.you') : null,
          option.isStarter ? t('thread.starterBadge') : null,
        ].filter(Boolean);

        return {
          ...option,
          displayLabel: badges.length > 0 ? `${option.label} · ${badges.join(' · ')}` : option.label,
        };
      });

    if (!participantFilterUserId) {
      return allOptions.slice(0, 5);
    }

    const selected = allOptions.find((option) => option.userId === participantFilterUserId);
    const topOptions = allOptions.filter((option) => option.userId !== participantFilterUserId).slice(0, 4);
    return selected ? [selected, ...topOptions] : topOptions;
  }, [currentUser?.id, participantBaseReplies, participantFilterUserId, starterUserId, t]);
  const activeParticipantOption = participantOptions.find(
    (option) => option.userId === participantFilterUserId,
  );
  const visibleReplies = useMemo(() => {
    const lastReadMessageId = threadQuery.data?.lastReadMessageId ?? null;
    const baseByMode =
      filterMode === 'mine'
        ? mergedReplies.filter((message) => message.authorUserId === currentUser?.id)
        : filterMode === 'starter'
          ? mergedReplies.filter((message) =>
              starterUserId ? message.authorUserId === starterUserId : false,
            )
        : filterMode === 'unread'
          ? mergedReplies.filter((message) =>
              lastReadMessageId ? message.id > lastReadMessageId : true,
            )
          : filterMode === 'reactions'
            ? mergedReplies.filter(
                (message) => (reactionsByMessageId[message.id]?.length ?? 0) > 0,
              )
          : filterMode === 'attachments'
            ? mergedReplies.filter((message) => (message.attachments?.length ?? 0) > 0)
            : mergedReplies;
    const base = participantFilterUserId
      ? baseByMode.filter((message) => message.authorUserId === participantFilterUserId)
      : baseByMode;

    const filtered = !deferredSearchQuery
      ? base
      : base.filter((message) => {
          const haystack = [
            message.bodyPlaintext ?? '',
            message.author?.displayName ?? '',
            message.author?.username ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(deferredSearchQuery);
        });

    return [...filtered].sort((left, right) => {
      if (sortField === 'author') {
        const leftAuthor = (left.author?.displayName || left.author?.username || '').toLocaleLowerCase();
        const rightAuthor = (right.author?.displayName || right.author?.username || '').toLocaleLowerCase();
        return sortOrder === 'newest'
          ? leftAuthor.localeCompare(rightAuthor)
          : rightAuthor.localeCompare(leftAuthor);
      }

      if (sortField === 'reactions') {
        const leftReactions = reactionsByMessageId[left.id]?.reduce(
          (sum, reaction) => sum + reaction.count,
          0,
        ) ?? 0;
        const rightReactions = reactionsByMessageId[right.id]?.reduce(
          (sum, reaction) => sum + reaction.count,
          0,
        ) ?? 0;
        if (leftReactions !== rightReactions) {
          return sortOrder === 'newest'
            ? rightReactions - leftReactions
            : leftReactions - rightReactions;
        }
      }

      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortOrder === 'newest' ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [
    currentUser?.id,
    deferredSearchQuery,
    filterMode,
    mergedReplies,
    participantFilterUserId,
    reactionsByMessageId,
    sortField,
    sortOrder,
    starterUserId,
    threadQuery.data?.lastReadMessageId,
  ]);
  const firstUnreadVisibleReplyId = useMemo(() => {
    if (
      filterMode !== 'all' ||
      participantFilterUserId ||
      deferredSearchQuery ||
      sortField !== 'time' ||
      sortOrder !== 'oldest'
    ) {
      return null;
    }

    const lastReadMessageId = threadQuery.data?.lastReadMessageId ?? null;
    if (!lastReadMessageId) {
      return visibleReplies[0]?.id ?? null;
    }

    return visibleReplies.find((message) => message.id > lastReadMessageId)?.id ?? null;
  }, [
    deferredSearchQuery,
    filterMode,
    participantFilterUserId,
    sortField,
    sortOrder,
    threadQuery.data?.lastReadMessageId,
    visibleReplies,
  ]);
  const unreadVisibleReplyCount = useMemo(() => {
    if (
      filterMode !== 'all' ||
      participantFilterUserId ||
      deferredSearchQuery ||
      sortField !== 'time' ||
      sortOrder !== 'oldest'
    ) {
      return 0;
    }

    const lastReadMessageId = threadQuery.data?.lastReadMessageId ?? null;
    if (!lastReadMessageId) {
      return visibleReplies.length;
    }

    return visibleReplies.filter((message) => message.id > lastReadMessageId).length;
  }, [
    deferredSearchQuery,
    filterMode,
    participantFilterUserId,
    sortField,
    sortOrder,
    threadQuery.data?.lastReadMessageId,
    visibleReplies,
  ]);
  const handleJumpToFirstUnread = useCallback(() => {
    if (!firstUnreadVisibleReplyId) {
      return;
    }

    const focusIndex = visibleReplies.findIndex((message) => message.id === firstUnreadVisibleReplyId);
    if (focusIndex === -1) {
      return;
    }

    pendingScrollTargetRef.current = { index: focusIndex, viewPosition: 0.2 };
    listRef.current?.scrollToIndex({
      index: focusIndex,
      animated: true,
      viewPosition: 0.2,
    });
    setJumpHighlightMessageId(firstUnreadVisibleReplyId);
    if (jumpHighlightTimeoutRef.current) {
      clearTimeout(jumpHighlightTimeoutRef.current);
    }
    jumpHighlightTimeoutRef.current = setTimeout(() => {
      setJumpHighlightMessageId((current) =>
        current === firstUnreadVisibleReplyId ? null : current,
      );
      jumpHighlightTimeoutRef.current = null;
    }, 2200);
  }, [firstUnreadVisibleReplyId, visibleReplies]);
  const handleJumpToLatestReply = useCallback(() => {
    if (visibleReplies.length === 0) {
      return;
    }

    const latestIndex = sortOrder === 'newest' ? 0 : visibleReplies.length - 1;
    const latestMessageId = visibleReplies[latestIndex]?.id;

    const viewPosition = sortOrder === 'newest' ? 0.2 : 0.8;
    pendingScrollTargetRef.current = { index: latestIndex, viewPosition };
    listRef.current?.scrollToIndex({
      index: latestIndex,
      animated: true,
      viewPosition,
    });

    if (latestMessageId) {
      setJumpHighlightMessageId(latestMessageId);
      if (jumpHighlightTimeoutRef.current) {
        clearTimeout(jumpHighlightTimeoutRef.current);
      }
      jumpHighlightTimeoutRef.current = setTimeout(() => {
        setJumpHighlightMessageId((current) =>
          current === latestMessageId ? null : current,
        );
        jumpHighlightTimeoutRef.current = null;
      }, 2200);
    }
  }, [sortOrder, visibleReplies]);
  const handleJumpToRoot = useCallback(() => {
    if (!rootMessage?.id) {
      return;
    }

    pendingScrollTargetRef.current = null;
    listRef.current?.scrollToOffset({
      offset: 0,
      animated: true,
    });

    setJumpHighlightMessageId(rootMessage.id);
    if (jumpHighlightTimeoutRef.current) {
      clearTimeout(jumpHighlightTimeoutRef.current);
    }
    jumpHighlightTimeoutRef.current = setTimeout(() => {
      setJumpHighlightMessageId((current) =>
        current === rootMessage.id ? null : current,
      );
      jumpHighlightTimeoutRef.current = null;
    }, 2200);
  }, [rootMessage?.id]);
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: 'search' | 'mode' | 'participant' | 'sort'; label: string }> = [];

    if (searchQuery.trim()) {
      filters.push({
        key: 'search',
        label: t('thread.activeSearchFilter', { query: searchQuery.trim() }),
      });
    }

    if (filterMode !== 'all') {
      filters.push({
        key: 'mode',
        label:
          filterMode === 'unread'
            ? t('thread.filterUnread')
            : filterMode === 'mine'
              ? t('thread.filterMine')
              : filterMode === 'starter'
                ? t('thread.filterStarter')
                : filterMode === 'edited'
                  ? t('thread.filterEdited')
                  : filterMode === 'images'
                    ? t('thread.filterImages')
                    : filterMode === 'files'
                      ? t('thread.filterFiles')
              : filterMode === 'reactions'
                ? t('thread.filterReactions')
                : t('thread.filterAttachments'),
      });
    }

    if (activeParticipantOption) {
      filters.push({
        key: 'participant',
        label: activeParticipantOption.displayLabel,
      });
    }

    if (sortOrder !== 'oldest') {
      filters.push({
        key: 'sort',
        label:
          sortField === 'time'
            ? t('settings.sortNewest')
            : sortField === 'author'
              ? t('settings.sortAsc')
              : t('thread.sortMostReactions'),
      });
    }

    return filters;
  }, [activeParticipantOption, filterMode, searchQuery, sortField, sortOrder, t]);

  const sendMutation = useMutation({
    mutationFn: async (bodyMarkdown: string) => {
      if (editingMessage) {
        return api(`/api/messages/${editingMessage.id}`, {
          method: 'PATCH',
          body: { bodyMarkdown },
        });
      }

      let attachmentData: Awaited<ReturnType<typeof uploadFile>> | null = null;
      if (pendingAttachment) {
        setUploadProgress(0);
        attachmentData = await uploadFile(pendingAttachment, { channelId }, setUploadProgress);
      }

      const result = await api<{ message: ThreadMessage }>(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        body: { bodyMarkdown },
        headers: {
          'X-Request-Id': createRequestId(),
        },
      });

      if (attachmentData && result.message?.id) {
        await attachToMessage(result.message.id, attachmentData);
      }

      return result;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] }),
        queryClient.invalidateQueries({ queryKey: ['message-reactions', 'thread', threadId] }),
        queryClient.invalidateQueries({ queryKey: ['messages', channelId] }),
        queryClient.invalidateQueries({ queryKey: ['thread', threadId] }),
      ]);
      setEditingMessage(null);
      setPendingAttachment(null);
      setUploadProgress(null);
      setShowAttachMenu(false);
    },
    onError: (error) => {
      setUploadProgress(null);
      Alert.alert(
        t('common.error'),
        error instanceof Error
          ? error.message
          : editingMessage
            ? t('message.editFailed')
            : t('thread.replyFailed'),
      );
    },
  });

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      api(`/api/threads/${threadId}/follow`, {
        method: follow ? 'POST' : 'DELETE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('thread.followFailed'),
      );
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => api(`/api/threads/${threadId}/lock`, { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['thread', threadId] }),
        queryClient.invalidateQueries({ queryKey: ['forum-threads', channelId] }),
      ]);
    },
    onError: (error) => {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('thread.lockFailed'),
      );
    },
  });

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if ((!trimmed && !pendingAttachment) || sendMutation.isPending) return false;
      setShowAttachMenu(false);
      try {
        const fallbackBody = trimmed || (
          pendingAttachment
            ? pendingAttachment.name || ' '
            : ' '
        );
        await sendMutation.mutateAsync(
          fallbackBody,
        );
        return true;
      } catch (error) {
        const message =
          pendingAttachment && error instanceof ApiError && error.status === 0
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
    [pendingAttachment, sendMutation, t],
  );

  useEffect(() => {
    return () => {
      if (threadRefreshTimeoutRef.current) {
        clearTimeout(threadRefreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devReplyAttemptedRef.current) {
      return;
    }
    if (sendMutation.isPending || threadQuery.isLoading) {
      return;
    }

    async function runDevReply() {
      const parsed = await readSimulatorHarnessJson<
        | {
            body?: string;
          }
        | undefined
      >('dev-thread-reply.json');
      if (!parsed) {
        return;
      }

      devReplyAttemptedRef.current = true;
      await deleteSimulatorHarnessFile('dev-thread-reply.json');
      await handleSend(parsed?.body?.trim() || 'Simulator thread reply test');
    }

    void runDevReply();
  }, [handleSend, sendMutation.isPending, threadQuery.isLoading]);

  useEffect(() => {
    if (queuedEventCount === 0) return;

    const newEvents = consumeEvents();
    let shouldRefreshThread = false;
    let shouldRefreshReplies = false;

    for (const event of newEvents) {
      const payload = event.payload as Record<string, unknown>;
      const payloadThread = payload.thread as Record<string, unknown> | undefined;
      const payloadMessage = payload.message as Record<string, unknown> | undefined;
      const eventThreadId =
        (payloadThread?.id as string | undefined) ??
        (payloadThread?.threadId as string | undefined) ??
        (payloadMessage?.threadId as string | undefined) ??
        (payload.threadId as string | undefined);

      if (eventThreadId !== threadId) {
        continue;
      }

      switch (event.type) {
        case 'message.created':
        case 'message.updated':
        case 'message.deleted':
          shouldRefreshReplies = true;
          break;
        case 'message.reaction_added':
        case 'message.reaction_removed':
          void queryClient.invalidateQueries({ queryKey: ['message-reactions', 'thread', threadId] });
          break;
        case 'thread.updated':
        case 'thread.locked':
          shouldRefreshThread = true;
          break;
      }
    }

    if (shouldRefreshReplies) {
      scheduleThreadRefresh();
    } else if (shouldRefreshThread) {
      void queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    }
  }, [consumeEvents, queuedEventCount, queryClient, scheduleThreadRefresh, threadId]);

  const handleToggleFollow = useCallback(() => {
    const isFollowing = threadQuery.data?.isFollowing ?? false;
    followMutation.mutate(!isFollowing);
  }, [followMutation, threadQuery.data?.isFollowing]);

  const handleLock = useCallback(() => {
    Alert.alert(t('thread.lockConfirmTitle'), t('thread.lockConfirmBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('thread.lock'),
        style: 'destructive',
        onPress: () => lockMutation.mutate(),
      },
    ]);
  }, [lockMutation, t]);

  const handleOpenContext = useCallback(() => {
    if (!route.params.communityId) {
      return;
    }

    const channelType = channelQuery.data?.channel.type;

    if (channelType === 'forum') {
      navigation.navigate('ForumChannelScreen', {
        channelId,
        communityId: route.params.communityId,
        channelName: channelQuery.data?.channel.name ?? route.params.channelName,
      });
      return;
    }

    navigation.navigate('ChannelScreen', {
      channelId,
      communityId: route.params.communityId,
      channelName: channelQuery.data?.channel.name ?? route.params.channelName,
      focusMessageId: threadQuery.data?.thread.rootMessageId ?? rootMessageId,
    });
  }, [
    channelId,
    channelQuery.data?.channel.name,
    channelQuery.data?.channel.type,
    navigation,
    rootMessageId,
    route.params.channelName,
    route.params.communityId,
    threadQuery.data?.thread.rootMessageId,
  ]);

  const handleDelete = useCallback(
    (message: ActionSheetMessage) => {
      Alert.alert(t('message.delete'), t('message.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('message.delete'),
          style: 'destructive',
          onPress: () => {
            api(`/api/messages/${message.id}`, { method: 'DELETE' })
              .then(() =>
                Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] }),
                  queryClient.invalidateQueries({ queryKey: ['thread', threadId] }),
                  queryClient.invalidateQueries({ queryKey: ['messages', channelId] }),
                ]),
              )
              .catch(() => {});
          },
        },
      ]);
    },
    [channelId, queryClient, t, threadId],
  );

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

        await queryClient.invalidateQueries({ queryKey: ['message-reactions', 'thread', threadId] });
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('message.reactionFailed'),
        );
      }
    },
    [currentUser?.id, queryClient, reactionsByMessageId, t, threadId],
  );

  const handleReact = useCallback(
    (emoji: string) => {
      if (!actionMessage) return;
      void toggleReaction(actionMessage.id, emoji);
    },
    [actionMessage, toggleReaction],
  );

  const handleTranslate = useCallback(async () => {
    if (!actionMessage) return;

    const existing = translatedBodies[actionMessage.id];
    if (existing) {
      setTranslatedBodies((prev) => {
        const next = { ...prev };
        delete next[actionMessage.id];
        return next;
      });
      return;
    }

    try {
      const result = await api<{ translatedText: string }>('/api/translate', {
        method: 'POST',
        body: {
          text: actionMessage.bodyPlaintext,
          targetLang: locale,
        },
      });
      setTranslatedBodies((prev) => ({
        ...prev,
        [actionMessage.id]: result.translatedText,
      }));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('message.translateFailed'),
      );
    }
  }, [actionMessage, locale, t, translatedBodies]);

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

    Alert.alert(t('message.reportTitle'), t('message.reportBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('message.reportSpam'), onPress: () => submitReport('spam') },
      { text: t('message.reportHarassment'), onPress: () => submitReport('harassment') },
      { text: t('message.reportInappropriate'), onPress: () => submitReport('inappropriate') },
    ]);
  }, [actionMessage, route.params.communityId, t]);

  const handleEdit = useCallback(() => {
    if (!actionMessage) return;
    setEditingMessage(actionMessage);
    setPendingAttachment(null);
    setShowAttachMenu(false);
    setActionMessage(null);
  }, [actionMessage]);

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
    async (attachment: NonNullable<ThreadMessage['attachments']>[number]) => {
      if (openingAttachmentId) return;

      setOpeningAttachmentId(attachment.id);
      try {
        const token = authToken ?? (await getToken());
        const attachmentDirectory = new Directory(Paths.cache, 'attachments');
        attachmentDirectory.create({ idempotent: true, intermediates: true });

        const targetFile = new File(
          attachmentDirectory,
          `${attachment.id}-${sanitizeAttachmentName(attachment.fileName)}`,
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
      attachment: NonNullable<ThreadMessage['attachments']>[number],
      attachments?: NonNullable<ThreadMessage['attachments']>,
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

  useLayoutEffect(() => {
    const isFollowing = threadQuery.data?.isFollowing ?? false;
    const canModerateThread = threadQuery.data?.permissions.canModerateThread ?? false;
    const isLocked = threadQuery.data?.thread.isLocked ?? false;

    navigation.setOptions({
      title: threadQuery.data?.thread.title || t('message.thread'),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            hitSlop={8}
            disabled={followMutation.isPending}
            onPress={handleToggleFollow}
          >
            <Text style={styles.headerActionText}>
              {followMutation.isPending
                ? t('thread.following')
                : isFollowing
                  ? t('thread.unfollow')
                  : t('thread.follow')}
            </Text>
          </TouchableOpacity>
          {canModerateThread && !isLocked ? (
            <TouchableOpacity
              hitSlop={8}
              disabled={lockMutation.isPending}
              onPress={handleLock}
            >
              <Text style={[styles.headerActionText, styles.headerActionDanger]}>
                {lockMutation.isPending ? t('thread.locking') : t('thread.lock')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ),
    });
  }, [
    followMutation.isPending,
    handleLock,
    handleToggleFollow,
    lockMutation.isPending,
    navigation,
    t,
    threadQuery.data?.isFollowing,
    threadQuery.data?.permissions.canModerateThread,
    threadQuery.data?.thread.isLocked,
    threadQuery.data?.thread.title,
  ]);

  useEffect(() => {
    getToken()
      .then(setAuthToken)
      .catch(() => setAuthToken(null));
  }, []);

  useEffect(
    () => () => {
      if (jumpHighlightTimeoutRef.current) {
        clearTimeout(jumpHighlightTimeoutRef.current);
      }
    },
    [],
  );

  const canPostReply = threadQuery.data?.permissions.canPostReply ?? false;
  const canUploadAttachment =
    channelPermissionsQuery.data?.permissions.canUploadAttachment ?? true;
  const latestVisibleMessageId =
    mergedReplies.length > 0 ? mergedReplies[mergedReplies.length - 1]?.id : rootMessage?.id;

  useEffect(() => {
    if (!latestVisibleMessageId) return;

    api(`/api/threads/${threadId}/read`, {
      method: 'POST',
      body: { messageId: latestVisibleMessageId },
    })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['forum-threads', channelId] });
        void queryClient.invalidateQueries({ queryKey: ['inbox'] });
      })
      .catch(() => {});
  }, [channelId, latestVisibleMessageId, queryClient, threadId]);

  useEffect(() => {
    if (!focusMessageId || focusMessageId === rootMessage?.id || visibleReplies.length === 0) {
      return;
    }

    const focusIndex = visibleReplies.findIndex((message) => message.id === focusMessageId);
    if (focusIndex === -1) {
      return;
    }

    const timer = setTimeout(() => {
      pendingScrollTargetRef.current = { index: focusIndex, viewPosition: 0.5 };
      listRef.current?.scrollToIndex({
        index: focusIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [focusMessageId, rootMessage?.id, visibleReplies]);

  if (threadQuery.isLoading || repliesQuery.isLoading) {
    return <LoadingSpinner text={t('thread.loading')} />;
  }

  const renderAttachments = (
    attachments: NonNullable<ThreadMessage['attachments']>,
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <FlatList
          ref={listRef}
          data={visibleReplies}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            const target = pendingScrollTargetRef.current ?? { index, viewPosition: 0.5 };
            listRef.current?.scrollToOffset({
              offset: Math.max(0, averageItemLength * index),
              animated: true,
            });
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: target.index,
                animated: true,
                viewPosition: target.viewPosition,
              });
            }, 120);
          }}
          refreshControl={
            <RefreshControl
              refreshing={threadQuery.isRefetching || repliesQuery.isRefetching}
              onRefresh={() => {
                void Promise.all([threadQuery.refetch(), repliesQuery.refetch()]);
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {threadQuery.data?.thread.title || t('message.thread')}
              </Text>
              {rootMessage ? (
                <View
                  style={[
                    styles.rootWrap,
                    focusMessageId === rootMessage.id || jumpHighlightMessageId === rootMessage.id
                      ? styles.focusedMessageWrap
                      : undefined,
                  ]}
                >
                  <Text style={styles.rootLabel}>{t('thread.rootMessage')}</Text>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onLongPress={() => setActionMessage(rootMessage)}
                    delayLongPress={400}
                  >
                  <MessageBubble
                    authorName={rootMessage.author?.displayName ?? t('common.unknown')}
                    body={
                      shouldHideAttachmentBody(
                        rootMessage.bodyPlaintext || rootMessage.bodyMarkdown,
                        rootMessage.attachments ?? [],
                      )
                        ? ''
                        : rootMessage.bodyPlaintext
                    }
                    translatedBody={translatedBodies[rootMessage.id]}
                    translatedLabel={
                      translatedBodies[rootMessage.id] ? t('message.translated') : undefined
                    }
                    time={new Date(rootMessage.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    isOwn={rootMessage.authorUserId === currentUser?.id}
                    isEdited={rootMessage.isEdited}
                    editedLabel={t('message.edited')}
                    reactions={(reactionsByMessageId[rootMessage.id] ?? []).map((reaction) => ({
                      emoji: reaction.emoji,
                      count: reaction.count,
                      reactedByMe: reaction.users.some((user) => user.id === currentUser?.id),
                    }))}
                    onPressReaction={(emoji) => {
                      void toggleReaction(rootMessage.id, emoji);
                    }}
                    onPressAddReaction={() => setActionMessage(rootMessage)}
                    onPressMore={() => setActionMessage(rootMessage)}
                    showAvatar
                    showAuthorName
                    startsGroup
                    endsGroup
                  />
                  </TouchableOpacity>
                  {rootMessage.attachments && rootMessage.attachments.length > 0
                    ? renderAttachments(
                        rootMessage.attachments,
                        isOwnMessage(rootMessage, currentUser?.id),
                      )
                    : null}
                  {route.params.communityId ? (
                    <TouchableOpacity
                      style={styles.contextButton}
                      activeOpacity={0.75}
                      onPress={handleOpenContext}
                    >
                      <Text style={styles.contextButtonText}>
                        {channelQuery.data?.channel.type === 'forum'
                          ? t('thread.backToForum')
                          : t('thread.backToChannel')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : rootMessageId ? (
                <View style={styles.missingRoot}>
                  <Text style={styles.missingRootText}>{t('message.replyUnavailable')}</Text>
                </View>
              ) : null}
              {repliesQuery.hasNextPage ? (
                <TouchableOpacity
                  style={styles.loadOlderButton}
                  activeOpacity={0.8}
                  onPress={() => void repliesQuery.fetchNextPage()}
                  disabled={repliesQuery.isFetchingNextPage}
                >
                  {repliesQuery.isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.loadOlderButtonText}>{t('thread.loadOlder')}</Text>
                  )}
                </TouchableOpacity>
              ) : null}
              <Text style={styles.replyCount}>
                {t('thread.replyCount', { count: mergedReplies.length })}
              </Text>
              <View style={styles.sortRow}>
                {([
                  { key: 'all' as const, label: t('thread.filterAll') },
                  { key: 'unread' as const, label: t('thread.filterUnread') },
                  { key: 'mine' as const, label: t('thread.filterMine') },
                  { key: 'starter' as const, label: t('thread.filterStarter') },
                  { key: 'edited' as const, label: t('thread.filterEdited') },
                  { key: 'images' as const, label: t('thread.filterImages') },
                  { key: 'files' as const, label: t('thread.filterFiles') },
                  { key: 'reactions' as const, label: t('thread.filterReactions') },
                  { key: 'attachments' as const, label: t('thread.filterAttachments') },
                ]).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.sortChip, filterMode === option.key && styles.sortChipActive]}
                    onPress={() => setFilterMode(option.key)}
                  >
                    <Text style={[styles.sortChipText, filterMode === option.key && styles.sortChipTextActive]}>
                      {`${option.label} (${filterCounts[option.key]})`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {participantOptions.length > 0 ? (
                <View style={styles.sortRow}>
                  <TouchableOpacity
                    style={[
                      styles.sortChip,
                      participantFilterUserId === null && styles.sortChipActive,
                    ]}
                    onPress={() => setParticipantFilterUserId(null)}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        participantFilterUserId === null && styles.sortChipTextActive,
                      ]}
                    >
                      {t('thread.participantAll')}
                    </Text>
                  </TouchableOpacity>
                  {participantOptions.map((option) => (
                    <TouchableOpacity
                      key={option.userId}
                      style={[
                        styles.sortChip,
                        participantFilterUserId === option.userId && styles.sortChipActive,
                      ]}
                      onPress={() => setParticipantFilterUserId(option.userId)}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          participantFilterUserId === option.userId && styles.sortChipTextActive,
                        ]}
                      >
                        {`${option.displayLabel} (${option.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('thread.searchPlaceholder')}
                placeholderTextColor={colors.textDim}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.sortRow}>
                {([
                  { key: 'time' as const, label: t('thread.sortTime') },
                  { key: 'author' as const, label: t('thread.sortAuthor') },
                  { key: 'reactions' as const, label: t('thread.sortReactions') },
                ]).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.sortChip, sortField === option.key && styles.sortChipActive]}
                    onPress={() => setSortField(option.key)}
                  >
                    <Text style={[styles.sortChipText, sortField === option.key && styles.sortChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.sortRow}>
                {([
                  {
                    key: 'oldest' as const,
                    label:
                      sortField === 'time'
                        ? t('settings.sortOldest')
                        : sortField === 'author'
                          ? t('settings.sortDesc')
                          : t('thread.sortFewestReactions'),
                  },
                  {
                    key: 'newest' as const,
                    label:
                      sortField === 'time'
                        ? t('settings.sortNewest')
                        : sortField === 'author'
                          ? t('settings.sortAsc')
                          : t('thread.sortMostReactions'),
                  },
                ]).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.sortChip, sortOrder === option.key && styles.sortChipActive]}
                    onPress={() => setSortOrder(option.key)}
                  >
                    <Text style={[styles.sortChipText, sortOrder === option.key && styles.sortChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.visibleCount}>
                {visibleReplies.length === mergedReplies.length
                  ? t('thread.visibleAllReplies', { count: mergedReplies.length })
                  : t('thread.visibleFilteredReplies', {
                      visible: visibleReplies.length,
                      total: mergedReplies.length,
                    })}
              </Text>
              {firstUnreadVisibleReplyId ? (
                <TouchableOpacity
                  style={styles.jumpUnreadButton}
                  activeOpacity={0.8}
                  onPress={handleJumpToFirstUnread}
                >
                  <Text style={styles.jumpUnreadButtonText}>
                    {t('thread.jumpToUnreadCount', { count: unreadVisibleReplyCount })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {visibleReplies.length > 1 ? (
                <TouchableOpacity
                  style={styles.jumpUnreadButton}
                  activeOpacity={0.8}
                  onPress={handleJumpToRoot}
                >
                  <Text style={styles.jumpUnreadButtonText}>{t('thread.jumpToRoot')}</Text>
                </TouchableOpacity>
              ) : null}
              {visibleReplies.length > 1 ? (
                <TouchableOpacity
                  style={styles.jumpUnreadButton}
                  activeOpacity={0.8}
                  onPress={handleJumpToLatestReply}
                >
                  <Text style={styles.jumpUnreadButtonText}>{t('thread.jumpToLatest')}</Text>
                </TouchableOpacity>
              ) : null}
              {activeFilters.length > 0 ? (
                <View style={styles.activeFiltersRow}>
                  {activeFilters.map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      style={styles.activeFilterChip}
                      onPress={() => {
                        if (filter.key === 'search') {
                          setSearchQuery('');
                        } else if (filter.key === 'mode') {
                          setFilterMode('all');
                        } else if (filter.key === 'participant') {
                          setParticipantFilterUserId(null);
                        } else {
                          setSortField('time');
                          setSortOrder('oldest');
                        }
                      }}
                    >
                      <Text style={styles.activeFilterChipText}>{filter.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.clearFiltersChip}
                    onPress={() => {
                      setSearchQuery('');
                      setFilterMode('all');
                      setParticipantFilterUserId(null);
                      setSortField('time');
                      setSortOrder('oldest');
                    }}
                  >
                    <Text style={styles.clearFiltersChipText}>{t('thread.clearFilters')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={'\u{1F9F5}'}
                title={
                  deferredSearchQuery
                    ? t('thread.noSearchResults')
                    : filterMode === 'unread'
                      ? t('thread.noUnreadReplies')
                    : filterMode === 'mine'
                      ? t('thread.noMineReplies')
                    : filterMode === 'starter'
                      ? t('thread.noStarterReplies')
                    : filterMode === 'edited'
                      ? t('thread.noEditedReplies')
                    : filterMode === 'images'
                      ? t('thread.noImageReplies')
                      : filterMode === 'files'
                        ? t('thread.noFileReplies')
                      : filterMode === 'reactions'
                        ? t('thread.noReactionReplies')
                      : participantFilterUserId
                        ? t('thread.noParticipantReplies')
                      : filterMode === 'attachments'
                        ? t('thread.noAttachmentReplies')
                        : t('thread.empty')
                }
                subtitle={
                  deferredSearchQuery
                    ? t('thread.noSearchResultsBody')
                    : filterMode === 'unread'
                      ? t('thread.noUnreadRepliesBody')
                    : filterMode === 'mine'
                      ? t('thread.noMineRepliesBody')
                    : filterMode === 'starter'
                      ? t('thread.noStarterRepliesBody')
                    : filterMode === 'edited'
                      ? t('thread.noEditedRepliesBody')
                    : filterMode === 'images'
                      ? t('thread.noImageRepliesBody')
                      : filterMode === 'files'
                        ? t('thread.noFileRepliesBody')
                      : filterMode === 'reactions'
                        ? t('thread.noReactionRepliesBody')
                      : participantFilterUserId
                        ? t('thread.noParticipantRepliesBody')
                      : filterMode === 'attachments'
                        ? t('thread.noAttachmentRepliesBody')
                        : t('thread.emptyBody')
                }
              />
            </View>
          }
          renderItem={({ item, index }) => (
            <View>
              {index === 0 ||
              new Date(visibleReplies[index - 1].createdAt).toDateString() !==
                new Date(item.createdAt).toDateString() ? (
                <View style={styles.dateDividerRow}>
                  <View style={styles.dateDividerLine} />
                  <Text style={styles.dateDividerText}>
                    {formatThreadDateDivider(item.createdAt, locale, t)}
                  </Text>
                  <View style={styles.dateDividerLine} />
                </View>
              ) : null}
              {item.id === firstUnreadVisibleReplyId ? (
                <View style={styles.unreadDividerRow}>
                  <View style={styles.unreadDividerLine} />
                  <Text style={styles.unreadDividerText}>{t('thread.unreadDivider')}</Text>
                  <View style={styles.unreadDividerLine} />
                </View>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  setSelectedMessageId((current) => (current === item.id ? null : item.id))
                }
                onLongPress={() => setActionMessage(item)}
                delayLongPress={400}
              >
                <View
                  style={
                    item.id === focusMessageId || item.id === jumpHighlightMessageId
                      ? styles.focusedMessageWrap
                      : undefined
                  }
                >
                  {item.authorUserId === starterUserId ? (
                    <View
                      style={[
                        styles.replyBadgeRow,
                        isOwnMessage(item, currentUser?.id) && styles.replyBadgeRowOwn,
                      ]}
                    >
                      <Text style={styles.replyBadgeText}>{t('thread.starterBadge')}</Text>
                    </View>
                  ) : null}
                  <MessageBubble
                    authorName={item.author?.displayName ?? t('common.unknown')}
                    authorAvatarUrl={item.author?.avatarUrl ?? null}
                    body={
                      shouldHideAttachmentBody(item.bodyPlaintext || item.bodyMarkdown, item.attachments ?? [])
                        ? ''
                        : item.bodyPlaintext
                    }
                    translatedBody={translatedBodies[item.id]}
                    translatedLabel={translatedBodies[item.id] ? t('message.translated') : undefined}
                    time={new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    isOwn={item.authorUserId === currentUser?.id}
                    isEdited={item.isEdited}
                    editedLabel={t('message.edited')}
                    reactions={(reactionsByMessageId[item.id] ?? []).map((reaction) => ({
                      emoji: reaction.emoji,
                      count: reaction.count,
                      reactedByMe: reaction.users.some((user) => user.id === currentUser?.id),
                    }))}
                    onPressReaction={(emoji) => {
                      void toggleReaction(item.id, emoji);
                    }}
                    onPressAddReaction={() => setActionMessage(item)}
                    onPressMore={() => setActionMessage(item)}
                    showAvatar={index === 0 || visibleReplies[index - 1].authorUserId !== item.authorUserId}
                    showAuthorName={index === 0 || visibleReplies[index - 1].authorUserId !== item.authorUserId}
                    startsGroup={index === 0 || visibleReplies[index - 1].authorUserId !== item.authorUserId}
                    endsGroup={
                      index === visibleReplies.length - 1 ||
                      visibleReplies[index + 1].authorUserId !== item.authorUserId
                    }
                    showActionChips={selectedMessageId === item.id}
                  />
                  {item.attachments && item.attachments.length > 0
                    ? renderAttachments(item.attachments, isOwnMessage(item, currentUser?.id))
                    : null}
                </View>
              </TouchableOpacity>
            </View>
          )}
        />

        {pendingAttachment && (
          <View style={styles.attachmentPreview}>
            {isImageAttachmentMimeType(pendingAttachment.mimeType, pendingAttachment.name) ? (
              <>
                <Image
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
                  <Text style={styles.previewFileName} numberOfLines={1}>
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
                  <Text style={styles.previewFileName} numberOfLines={1}>
                    {pendingAttachment.name}
                  </Text>
                  <Text style={styles.previewFileMeta}>
                    {formatFileSize(pendingAttachment.size)}
                  </Text>
                </View>
              </>
            )}
            <TouchableOpacity
              style={styles.removeAttachment}
              onPress={() => setPendingAttachment(null)}
            >
              <Text style={styles.removeAttachmentText}>{t('channel.remove')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {uploadProgress !== null && (
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]}
            />
          </View>
        )}

        {showAttachMenu && (
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickImage}>
              <Text style={styles.attachMenuText}>{t('channel.photoVideo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handleTakePhoto}>
              <Text style={styles.attachMenuText}>{t('channel.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickDocument}>
              <Text style={styles.attachMenuText}>{t('channel.document')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {threadQuery.data?.thread.isLocked ? (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>{t('thread.locked')}</Text>
          </View>
        ) : !canPostReply ? (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>{t('channel.readOnly')}</Text>
          </View>
        ) : (
          <MessageComposer
            placeholder={editingMessage ? t('message.editPlaceholder') : t('thread.replyPlaceholder')}
            sendLabel={editingMessage ? t('common.save') : t('message.send')}
            sendingLabel={editingMessage ? t('common.save') : t('thread.replying')}
            isSending={sendMutation.isPending}
            onSend={handleSend}
            onPressAdd={editingMessage || !canUploadAttachment ? undefined : handleToggleAttachMenu}
            allowEmptySubmit={!!pendingAttachment}
            draftText={editingMessage?.bodyMarkdown ?? editingMessage?.bodyPlaintext ?? ''}
            draftKey={editingMessage?.id ?? null}
          />
        )}
        {actionMessage ? (
          <MessageActionSheet
            message={actionMessage}
            isOwn={actionMessage.authorUserId === currentUser?.id}
            onEdit={actionMessage.authorUserId === currentUser?.id ? handleEdit : undefined}
            onTranslate={handleTranslate}
            onReport={actionMessage.authorUserId !== currentUser?.id ? handleReport : undefined}
            onReact={handleReact}
            onClose={() => setActionMessage(null)}
            onDelete={handleDelete}
          />
        ) : null}
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function isOwnMessage(message: ThreadMessage, currentUserId?: string) {
  return message.authorUserId === currentUserId;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeAttachmentName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
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
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.white,
    fontSize: fs.xl,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerActionText: {
    color: colors.primary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  headerActionDanger: {
    color: colors.error,
  },
  rootWrap: {
    gap: spacing.xs,
  },
  rootLabel: {
    color: colors.textMuted,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  replyBadgeRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  replyBadgeRowOwn: {
    alignItems: 'flex-end',
  },
  replyBadgeText: {
    alignSelf: 'flex-start',
    color: colors.primaryLight,
    backgroundColor: colors.backgroundDark,
    fontSize: fs.xs,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  unreadDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  dateDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dateDividerText: {
    color: colors.textMuted,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  unreadDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primary + '44',
  },
  unreadDividerText: {
    color: colors.primaryLight,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  attachments: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  focusedMessageWrap: {
    backgroundColor: colors.primary + '14',
    borderRadius: borderRadius.lg,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
  },
  attachmentImageMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 15, 35, 0.5)',
  },
  attachmentImageMoreText: {
    color: colors.white,
    fontSize: fs.lg,
    fontWeight: '800',
  },
  attachmentFile: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    minWidth: 220,
  },
  attachmentFileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  attachmentFileTypeBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  attachmentFileName: {
    color: colors.primary,
    fontSize: fs.base,
    fontWeight: '700',
    flex: 1,
  },
  attachmentSize: {
    color: colors.textDim,
    fontSize: fs.sm,
    marginTop: 2,
  },
  attachmentFileCta: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentFileCtaText: {
    color: colors.textSecondary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  replyCount: {
    color: colors.textSecondary,
    fontSize: fs.sm,
  },
  searchInput: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fs.base,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  sortChipActive: {
    backgroundColor: colors.primaryDark,
  },
  sortChipText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  sortChipTextActive: {
    color: colors.white,
  },
  visibleCount: {
    color: colors.textSecondary,
    fontSize: fs.sm,
  },
  jumpUnreadButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '18',
  },
  jumpUnreadButtonText: {
    color: colors.primaryLight,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  activeFilterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '18',
  },
  activeFilterChipText: {
    color: colors.primaryLight,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  clearFiltersChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  clearFiltersChipText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  loadOlderButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
  },
  loadOlderButtonText: {
    color: colors.primaryLight,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  contextButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
  },
  contextButtonText: {
    color: colors.primaryLight,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingTop: spacing.xl,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
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
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  attachMenu: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  attachMenuItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  attachMenuText: {
    color: colors.textPrimary,
    fontSize: fs.base,
  },
  missingRoot: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  missingRootText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
  },
  lockedBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundDark,
  },
  lockedText: {
    color: colors.warning,
    fontSize: fs.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
});
