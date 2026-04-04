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
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, createRequestId } from '../lib/api';
import { Directory, File, Paths } from 'expo-file-system';
import {
  dequeueMessagesByEndpoint,
  enqueueMessage,
  getPendingMessages,
} from '../lib/offline-queue';
import { useDmSubscription, useWebSocketStatus } from '../hooks/useWebSocket';
import {
  encryptMessage,
  decryptMessage,
  deriveSharedKey,
  ensureKeyPair,
  isE2eeSupported,
} from '../lib/crypto';
import { getE2eeKeyPair } from '../lib/secure-storage';
import {
  attachToDmMessage,
  getAttachmentFileUrl,
  pickDocument,
  pickImage,
  takePhoto,
  uploadFile,
  type PickedFile,
} from '../lib/file-picker';
import { getUserFacingErrorMessage } from '../lib/error-message';
import { getToken, saveLastVisited } from '../lib/storage';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../lib/i18n';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
} from '../lib/simulator-harness';
import MessageBubble from '../components/MessageBubble';
import AttachmentLightbox from '../components/AttachmentLightbox';
import MessageComposer from '../components/MessageComposer';
import MessageActionSheet, { type ActionSheetMessage } from '../components/MessageActionSheet';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import { useFocusEffect, useIsFocused, useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  isImageAttachmentMimeType,
  shouldHideAttachmentBody,
} from '@zktalk/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DmStackParamList, RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DmStackParamList, 'DmScreen'>;

interface DmAuthor {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}

interface DmMessage {
  id: string;
  conversationId: string;
  bodyPlaintext: string;
  bodyMarkdown?: string;
  authorUserId: string;
  createdAt: string;
  isEncrypted?: boolean;
  encryptedPayload?: string | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  author?: DmAuthor;
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
  }>;
}

interface DmMessageRow {
  message: DmMessage;
  author: DmAuthor;
  attachments?: NonNullable<DmMessage['attachments']>;
}

interface DmMessagesResponse {
  messages: DmMessageRow[];
  unreadCounts?: Record<string, number>;
}

interface DmConversationDetailResponse {
  conversation: {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    promotedCommunityId?: string | null;
    promotedChannelId?: string | null;
  };
  participants: Array<{
    id: string;
    userId: string;
  }>;
  promotedCommunity?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  promotedChannel?: {
    id: string;
    name: string;
  } | null;
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

interface SendDmMessageInput {
  bodyMarkdown: string;
  isEncrypted?: boolean;
  encryptedPayload?: string;
}

function flattenDmMessage(row: DmMessage | DmMessageRow): DmMessage {
  if ('message' in row) {
    return {
      ...row.message,
      author: row.author,
      attachments: row.attachments ?? row.message.attachments ?? [],
    };
  }
  return row;
}

async function hydrateDmMessage(
  message: DmMessage,
  sharedKey: string | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): Promise<DmMessage> {
  if (!message.isEncrypted) {
    return message;
  }

  if (!sharedKey || !message.encryptedPayload) {
    return {
      ...message,
      bodyPlaintext: t('dm.encryptedMessagePlaceholder'),
    };
  }

  try {
    const plaintext = await decryptMessage(message.encryptedPayload, sharedKey);
    return { ...message, bodyPlaintext: plaintext };
  } catch {
    return {
      ...message,
      bodyPlaintext: t('dm.decryptFailed'),
    };
  }
}

interface PendingMessage {
  id: string;
  body: string;
  createdAt: number;
}

export default function DmScreen({ route, navigation }: Props) {
  const { conversationId, userId = '', displayName = '' } = route.params;
  const { t, locale } = useTranslation();
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<PickedFile | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [sharedKey, setSharedKey] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<DmMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<DmMessage | null>(null);
  const [translatedBodies, setTranslatedBodies] = useState<Record<string, string>>({});
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [promotedConflictTarget, setPromotedConflictTarget] = useState<{
    community: NonNullable<DmConversationDetailResponse['promotedCommunity']>;
    channel: NonNullable<DmConversationDetailResponse['promotedChannel']>;
  } | null>(null);
  const [promotionCommunityName, setPromotionCommunityName] = useState(
    displayName || t('dm.groupConversation'),
  );
  const [promotionChannelName, setPromotionChannelName] = useState('general');
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    if (conversationId) {
      void saveLastVisited({
        kind: 'dm',
        conversationId,
      });
    }
  }, [conversationId]);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [previewGallery, setPreviewGallery] = useState<{
    attachments: NonNullable<DmMessage['attachments']>;
    index: number;
  } | null>(null);
  const devComposeInFlightRef = useRef(false);
  const lastMarkedReadMessageIdRef = useRef<string | null>(null);
  const dmRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((s) => s.user);
  const isFocused = useIsFocused();
  const wsStatus = useWebSocketStatus();
  const shouldPollMessages = wsStatus !== 'connected';
  const endpoint = `/api/dm/conversations/${conversationId}/messages`;
  const dmMessagesQueryKey = ['dm-messages', conversationId] as const;

  useEffect(() => {
    getToken()
      .then(setAuthToken)
      .catch(() => setAuthToken(null));
  }, []);

  // WebSocket subscription for real-time DM updates
  const { queuedEventCount, consumeEvents } = useDmSubscription(conversationId);
  const scheduleDmRefresh = useCallback(
    (delayMs = 1_200) => {
      if (dmRefreshTimeoutRef.current) {
        clearTimeout(dmRefreshTimeoutRef.current);
      }

      dmRefreshTimeoutRef.current = setTimeout(() => {
        dmRefreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({ queryKey: dmMessagesQueryKey });
      }, delayMs);
    },
    [dmMessagesQueryKey, queryClient],
  );

  // Initialize E2EE if both parties have public keys
  useEffect(() => {
    const initE2ee = async () => {
      if (!userId || !isE2eeSupported()) {
        setSharedKey(null);
        setE2eeEnabled(false);
        return;
      }

      try {
        // Ensure we have a key pair
        await ensureKeyPair();

        // Fetch the other user's public key
        const otherUser = await api<{ publicKey: string | null }>(
          `/api/users/${userId}/keys`,
        );

        if (otherUser.publicKey) {
          const keyPair = await getE2eeKeyPair();
          if (keyPair) {
            const derived = await deriveSharedKey(
              keyPair.privateKey,
              otherUser.publicKey,
            );
            setSharedKey(derived);
            setE2eeEnabled(true);
            return;
          }
        }
      } catch {
        // E2EE not available, continue without encryption
      }

      setSharedKey(null);
      setE2eeEnabled(false);
    };
    initE2ee();
  }, [userId]);

  useEffect(() => {
    if (!sharedKey) return;
    queryClient.invalidateQueries({ queryKey: dmMessagesQueryKey });
  }, [sharedKey, queryClient, conversationId]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: dmMessagesQueryKey,
    queryFn: async (): Promise<{ messages: DmMessage[]; unreadCounts: Record<string, number> }> => {
      const result = await api<DmMessagesResponse>(endpoint);
      const messages = result.messages.map(flattenDmMessage);
      const hydratedMessages = await Promise.all(
        messages.map((message) => hydrateDmMessage(message, sharedKey, t)),
      );
      return {
        messages: hydratedMessages,
        unreadCounts: result.unreadCounts ?? {},
      };
    },
    // Slower polling with WS fallback
    refetchInterval: shouldPollMessages ? 30_000 : false,
  });
  const loadConversationDetail = useCallback(
    () => api<DmConversationDetailResponse>(`/api/dm/conversations/${conversationId}`),
    [conversationId],
  );

  const { data: conversationDetail } = useQuery({
    queryKey: ['dm-conversation', conversationId],
    queryFn: loadConversationDetail,
  });
  const promotedTarget =
    conversationDetail?.promotedCommunity && conversationDetail?.promotedChannel
      ? {
          community: conversationDetail.promotedCommunity,
          channel: conversationDetail.promotedChannel,
        }
      : null;
  const unreadCounts = data?.unreadCounts ?? {};
  const latestVisibleMessageId = data?.messages[0]?.id ?? null;

  useEffect(() => {
    return () => {
      if (dmRefreshTimeoutRef.current) {
        clearTimeout(dmRefreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!promotedTarget) {
      return;
    }

    void dequeueMessagesByEndpoint(endpoint);
    setPendingMessages([]);
    setEditingMessage(null);
    setActionMessage(null);
    setShowPromoteModal(false);
    setErrorDialog(null);
    setPromotedConflictTarget(null);
  }, [endpoint, promotedTarget]);

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
            await api(`/api/dm/conversations/${conversationId}/read`, {
              method: 'POST',
              body: { messageId: latestVisibleMessageId },
            });
            if (cancelled) {
              return;
            }
            lastMarkedReadMessageIdRef.current = latestVisibleMessageId;
            void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
          } catch {
            // Best effort only.
          }
        })();
      }, 250);

      return () => {
        cancelled = true;
        clearTimeout(timeout);
      };
    }, [conversationId, latestVisibleMessageId, queryClient]),
  );

  const navigateToPromotedCommunity = useCallback(
    (
      target:
        | {
            community: NonNullable<DmConversationDetailResponse['promotedCommunity']>;
            channel: NonNullable<DmConversationDetailResponse['promotedChannel']>;
          }
        | null,
    ) => {
      if (!target) {
        return;
      }

      rootNavigation.navigate('Main', {
        screen: 'HomeTab',
        params: {
          screen: 'ChannelScreen',
          params: {
            channelId: target.channel.id,
            channelName: target.channel.name,
            communityId: target.community.id,
          },
        },
      });
    },
    [rootNavigation],
  );

  const handlePromotedReadOnlyError = useCallback(
    async (error: unknown) => {
      if (!(error instanceof ApiError) || error.code !== 'DM_PROMOTED_READ_ONLY') {
        setErrorDialog({
          title: t('common.error'),
          message: getUserFacingErrorMessage(error, t),
        });
        return;
      }

      const refreshed = await queryClient.fetchQuery({
        queryKey: ['dm-conversation', conversationId],
        queryFn: loadConversationDetail,
      });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });

      const nextTarget =
        refreshed.promotedCommunity && refreshed.promotedChannel
          ? {
              community: refreshed.promotedCommunity,
              channel: refreshed.promotedChannel,
            }
          : null;

      if (!nextTarget) {
        setErrorDialog({
          title: t('common.error'),
          message: getUserFacingErrorMessage(error, t),
        });
        return;
      }

      setPromotedConflictTarget(nextTarget);
    },
    [conversationId, loadConversationDetail, navigateToPromotedCommunity, queryClient, t],
  );

  // Handle real-time WebSocket DM events
  useEffect(() => {
    if (queuedEventCount === 0) return;

    const processEvents = async () => {
      const newEvents = consumeEvents();
      for (const event of newEvents) {
        switch (event.type) {
          case 'dm.message_created': {
            const payload = await hydrateDmMessage(
              flattenDmMessage(event.payload as unknown as DmMessageRow),
              sharedKey,
              t,
            );
            queryClient.setQueryData(
              dmMessagesQueryKey,
              (old: { messages: DmMessage[]; unreadCounts?: Record<string, number> } | undefined) => {
                if (!old) {
                  return { messages: [payload], unreadCounts: {} };
                }
                if (old.messages.some((m) => m.id === payload.id)) return old;
                return {
                  messages: [payload, ...old.messages],
                  unreadCounts: old.unreadCounts ?? {},
                };
              },
            );
            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
            scheduleDmRefresh();
            break;
          }
          case 'dm.message_updated': {
            const payload = await hydrateDmMessage(
              flattenDmMessage(event.payload as unknown as DmMessageRow),
              sharedKey,
              t,
            );
            queryClient.setQueryData(
              dmMessagesQueryKey,
              (old: { messages: DmMessage[]; unreadCounts?: Record<string, number> } | undefined) => {
                if (!old) return old;
                return {
                  messages: old.messages.map((message) =>
                    message.id === payload.id ? { ...message, ...payload } : message,
                  ),
                  unreadCounts: old.unreadCounts ?? {},
                };
              },
            );
            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
            break;
          }
          case 'dm.message_deleted': {
            const deletedId = event.payload.messageId as string | undefined;
            if (!deletedId) break;
            queryClient.setQueryData(
              dmMessagesQueryKey,
              (old: { messages: DmMessage[]; unreadCounts?: Record<string, number> } | undefined) => {
                if (!old) return old;
                return {
                  messages: old.messages.filter((message) => message.id !== deletedId),
                  unreadCounts: old.unreadCounts ?? {},
                };
              },
            );
            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
            break;
          }
          case 'dm.conversation_updated': {
            queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
            break;
          }
        }
      }
    };

    void processEvents();
  }, [
    conversationId,
    consumeEvents,
    dmMessagesQueryKey,
    queuedEventCount,
    queryClient,
    scheduleDmRefresh,
    sharedKey,
    t,
  ]);

  // Check for pending offline messages on mount
  useEffect(() => {
    const checkPending = async () => {
      const queued = await getPendingMessages();
      const dmPending = queued.filter((m) => m.endpoint === endpoint);
      setPendingMessages(
        dmPending.map((m) => ({
          id: m.id,
          body: (m.body as { bodyMarkdown?: string }).bodyMarkdown ?? '',
          createdAt: m.createdAt,
        })),
      );
    };
    checkPending();
  }, [endpoint]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (editingMessage) {
        let messageBody: Record<string, unknown> = { bodyMarkdown: body };

        if (editingMessage.isEncrypted) {
          if (!sharedKey) {
            throw new Error(t('dm.editEncryptedUnavailable'));
          }

          const encrypted = await encryptMessage(body, sharedKey);
          messageBody = {
            bodyMarkdown: '[encrypted]',
            isEncrypted: true,
            encryptedPayload: encrypted,
          } satisfies SendDmMessageInput;
        }

        await api(`/api/dm/messages/${editingMessage.id}`, {
          method: 'PATCH',
          body: messageBody,
        });
        return { queued: false as const };
      }

      let attachmentData: Awaited<ReturnType<typeof uploadFile>> | null = null;
      const pendingAttachmentName = pendingAttachment?.name ?? null;
      if (pendingAttachment) {
        attachmentData = await uploadFile(pendingAttachment, { conversationId });
      }

      try {
        // Encrypt the message if E2EE is enabled
        const fallbackBody = body.trim().length > 0 ? body : pendingAttachmentName || ' ';
        let messageBody: Record<string, unknown> = { bodyMarkdown: fallbackBody };
        if (e2eeEnabled && sharedKey) {
          try {
            const encrypted = await encryptMessage(fallbackBody, sharedKey);
            messageBody = {
              bodyMarkdown: '[encrypted]',
              isEncrypted: true,
              encryptedPayload: encrypted,
            } satisfies SendDmMessageInput;
          } catch {
            // Fall back to unencrypted if encryption fails
            messageBody = { bodyMarkdown: fallbackBody };
          }
        }

        const result = await api<{ message?: DmMessage }>(endpoint, {
          method: 'POST',
          body: messageBody,
          headers: {
            'X-Request-Id': createRequestId(),
          },
        });

        if (attachmentData && result.message?.id) {
          await attachToDmMessage(result.message.id, attachmentData);
        }
        return { queued: false as const };
      } catch (err) {
        const shouldQueue = !(err instanceof ApiError) || err.status === 0;
        if (!shouldQueue) {
          throw err;
        }

        if (pendingAttachment) {
          throw err;
        }

        const fallbackBody = body.trim().length > 0 ? body : pendingAttachmentName || ' ';
        const queued = await enqueueMessage(endpoint, { bodyMarkdown: fallbackBody });
        setPendingMessages((prev) => [
          ...prev,
          { id: queued.id, body: fallbackBody, createdAt: queued.createdAt },
        ]);
        return { queued: true as const };
      }
    },
    onSuccess: (result) => {
      if (!result.queued && shouldPollMessages) {
        void queryClient.invalidateQueries({ queryKey: dmMessagesQueryKey });
        void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      } else if (result.queued) {
        Alert.alert(t('common.offline'), t('common.offlineQueue'));
      }
      setPendingAttachment(null);
      setEditingMessage(null);
    },
  });

  const promoteMutation = useMutation({
    mutationFn: ({
      communityName,
      channelName,
    }: {
      communityName: string;
      channelName: string;
    }) =>
      api<{
        community: { id: string; slug: string; name: string };
        channel: { id: string; name: string };
        alreadyPromoted: boolean;
      }>(`/api/dm/conversations/${conversationId}/promote`, {
        method: 'POST',
        body: {
          communityName,
          channelName,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
      setShowPromoteModal(false);
      navigateToPromotedCommunity({
        community: result.community,
        channel: result.channel,
      });
    },
  });

  const callTargetMutation = useMutation({
    mutationFn: () =>
      api<DmCallTargetResponse>(`/api/dm/conversations/${conversationId}/call-target`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
    },
  });

  // Stable callback for MessageComposer
  const handleSend = useCallback(
    async (text: string) => {
      if (sendMutation.isPending) return false;
      try {
        await sendMutation.mutateAsync(text);
        return true;
      } catch (error) {
        const isOffline = error instanceof ApiError && error.status === 0;
        if (!isOffline && error instanceof ApiError && error.code === 'DM_PROMOTED_READ_ONLY') {
          await handlePromotedReadOnlyError(error);
          return false;
        }

        setErrorDialog({
          title: t('common.error'),
          message:
            pendingAttachment && isOffline
              ? t('channel.attachmentNeedsConnection')
              : getUserFacingErrorMessage(error, t, {
                  rateLimitedKey: pendingAttachment
                    ? 'message.attachmentRateLimited'
                    : 'common.rateLimited',
                }),
        });
        return false;
      }
    },
    [handlePromotedReadOnlyError, pendingAttachment, sendMutation, t],
  );

  const handlePickImage = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const file = await pickImage();
      if (file) {
        setPendingAttachment(file);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.errorOccurred'));
    }
  }, [t]);

  const handleTakePhoto = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const file = await takePhoto();
      if (file) {
        setPendingAttachment(file);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.errorOccurred'));
    }
  }, [t]);

  const handlePickDocument = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const file = await pickDocument();
      if (file) {
        setPendingAttachment(file);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.errorOccurred'));
    }
  }, [t]);

  const handleAddAttachment = useCallback(() => {
    setShowAttachMenu((prev) => !prev);
  }, []);

  const handleShareAttachment = useCallback(
    async (attachment: NonNullable<DmMessage['attachments']>[number]) => {
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
      attachment: NonNullable<DmMessage['attachments']>[number],
      attachments?: NonNullable<DmMessage['attachments']>,
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

  const renderAttachments = useCallback(
    (attachments: NonNullable<DmMessage['attachments']>) => {
      const imageAttachments = attachments.filter((attachment) =>
        isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
      );
      const fileAttachments = attachments.filter((attachment) =>
        !isImageAttachmentMimeType(attachment.mimeType, attachment.fileName),
      );

      return (
        <View style={styles.attachments}>
          {imageAttachments.length > 0 ? (
            <View style={styles.attachmentImageGrid}>
              {imageAttachments.slice(0, 4).map((attachment) => (
                <TouchableOpacity
                  key={attachment.id}
                  style={styles.attachmentImageCard}
                  activeOpacity={0.88}
                  onPress={() => void handleOpenAttachment(attachment, attachments)}
                >
                  <Image
                    source={{
                      uri: getAttachmentFileUrl(attachment.id),
                      ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
                    }}
                    style={styles.attachmentImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {fileAttachments.map((attachment) => (
            <TouchableOpacity
              key={attachment.id}
              style={styles.attachmentFile}
              activeOpacity={0.82}
              onPress={() => void handleOpenAttachment(attachment, attachments)}
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
          ))}
        </View>
      );
    },
    [authToken, handleOpenAttachment, openingAttachmentId, t],
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
            conversationId?: string;
            body?: string;
          }
        | undefined
      >('dev-compose.json');
      if (!payload || cancelled) {
        devComposeInFlightRef.current = false;
        return;
      }

      try {
        if (payload?.conversationId !== conversationId) {
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
  }, [conversationId, handleSend]);

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
              api(`/api/dm/messages/${message.id}`, { method: 'DELETE' })
                .then(() => {
                  queryClient.setQueryData(
                    dmMessagesQueryKey,
                    (old: { messages: DmMessage[] } | undefined) => {
                      if (!old) return old;
                      return {
                        messages: old.messages.filter((m) => m.id !== message.id),
                      };
                    },
                  );
                  queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
                })
                .catch((error) => {
                  void handlePromotedReadOnlyError(error);
                });
            },
          },
        ],
      );
    },
    [dmMessagesQueryKey, handlePromotedReadOnlyError, queryClient, t],
  );

  const handleEdit = useCallback(() => {
    if (!actionMessage) return;
    setEditingMessage(actionMessage);
    setActionMessage(null);
  }, [actionMessage]);

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

  const handlePromoteToCommunity = useCallback(() => {
    if (promotedTarget) {
      navigateToPromotedCommunity(promotedTarget);
      return;
    }

    setPromotionCommunityName(
      displayName || conversationDetail?.conversation.name || t('dm.groupConversation'),
    );
    setPromotionChannelName('general');
    setShowPromoteModal(true);
  }, [conversationDetail?.conversation.name, displayName, navigateToPromotedCommunity, promotedTarget, t]);

  const submitPromoteToCommunity = useCallback(() => {
    const communityName = promotionCommunityName.trim();
    const channelName = promotionChannelName.trim();
    if (!communityName || !channelName) {
      return;
    }

    promoteMutation.mutate(
      {
        communityName,
        channelName,
      },
      {
        onError: (error) => {
          setErrorDialog({
            title: t('dm.promoteTitle'),
            message: error instanceof Error ? error.message : t('dm.promoteFailed'),
          });
        },
      },
    );
  }, [promoteMutation, promotionChannelName, promotionCommunityName, t]);

  const handleStartCall = useCallback(
    async (startWithVideo: boolean) => {
      try {
        const result = await callTargetMutation.mutateAsync();
        rootNavigation.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'VoiceCallScreen',
            params: {
              channelId: result.voiceChannel.id,
              channelName: result.voiceChannel.name,
              communityId: result.community.id,
              startWithVideo,
            },
          },
        });
      } catch (error) {
        setErrorDialog({
          title: startWithVideo ? t('voice.videoCall') : t('voice.join'),
          message: error instanceof Error ? error.message : t('voice.joinFailed'),
        });
      }
    },
    [callTargetMutation, rootNavigation, t],
  );

  useLayoutEffect(() => {
    const baseTitle =
      displayName || conversationDetail?.conversation.name || t('dm.groupConversation');

    navigation.setOptions({
      title: promotedTarget ? `${baseTitle} · ${t('dm.historyBadge')}` : baseTitle,
      headerRight: () => (
        <TouchableOpacity
          onPress={handlePromoteToCommunity}
          disabled={promoteMutation.isPending}
          style={styles.promoteButton}
        >
          {promoteMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.promoteButtonText}>
              {promotedTarget ? t('dm.goToCurrentChannelShort') : t('dm.promoteShort')}
            </Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [
    conversationDetail?.conversation.name,
    displayName,
    handlePromoteToCommunity,
    navigation,
    promoteMutation.isPending,
    promotedTarget,
    t,
  ]);

  const messages = React.useMemo(() => {
    const seen = new Set<string>();
    return (data?.messages ?? []).filter((message) => {
      if (seen.has(message.id)) {
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }, [data?.messages]);

  if (isLoading) {
    return <LoadingSpinner text={t('dm.loadingMessages')} />;
  }

  return (
    <KeyboardAvoidingView
      testID="dm-screen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* E2EE status banner */}
      {!promotedTarget && e2eeEnabled && (
        <View style={styles.e2eeBanner}>
          <Text style={styles.e2eeText}>
            {t('dm.encrypted')}
          </Text>
        </View>
      )}

      <View style={styles.dmHeroWrap}>
        <View style={styles.dmHeroCard}>
          <Text style={styles.dmHeroEyebrow}>{t('dm.title')}</Text>
          <Text style={styles.dmHeroTitle} testID="dm-screen-title">
            {displayName || conversationDetail?.conversation.name || t('dm.groupConversation')}
          </Text>
          <Text style={styles.dmHeroBody}>{t('dm.listSubtitle')}</Text>
          <View style={styles.dmHeroMetaRow}>
            <View style={styles.dmHeroMetaBadge}>
              <Text style={styles.dmHeroMetaBadgeText}>
                {conversationDetail?.conversation.type === 'group' ? t('dm.group') : t('dm.oneToOne')}
              </Text>
            </View>
            {conversationDetail?.conversation.type === 'group' ? (
              <View style={styles.dmHeroMetaBadge}>
                <Text style={styles.dmHeroMetaBadgeText}>
                  {t('dm.groupMembers', {
                    count: String(conversationDetail?.participants.length ?? 0),
                  })}
                </Text>
              </View>
            ) : null}
            {!promotedTarget && e2eeEnabled ? (
              <View style={styles.dmHeroMetaBadgeSuccess}>
                <Text style={styles.dmHeroMetaBadgeSuccessText}>{t('e2ee.badge')}</Text>
              </View>
            ) : null}
            {promotedTarget ? (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{t('dm.historyBadge')}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.dmHeroActionRow}>
            <TouchableOpacity
              onPress={() => {
                void handleStartCall(false);
              }}
              activeOpacity={0.85}
              style={styles.dmHeroActionChip}
            >
              {callTargetMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={styles.dmHeroActionChipText}>{t('voice.join')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                void handleStartCall(true);
              }}
              activeOpacity={0.85}
              style={styles.dmHeroActionChip}
            >
              {callTargetMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={styles.dmHeroActionChipText}>{t('voice.videoCall')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePromoteToCommunity}
              activeOpacity={0.85}
              style={[
                styles.dmHeroActionChip,
                promotedTarget && styles.dmHeroActionChipPrimary,
              ]}
            >
              <Text
                style={[
                  styles.dmHeroActionChipText,
                  promotedTarget && styles.dmHeroActionChipPrimaryText,
                ]}
              >
                {promotedTarget ? t('dm.goToCurrentChannelShort') : t('dm.promoteShort')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {promotedTarget && (
        <View style={styles.promotedBannerWrap}>
          <View style={styles.promotedBanner}>
            <View style={styles.promotedBannerIcon}>
              <Text style={styles.promotedBannerIconText}>#</Text>
            </View>
            <View style={styles.promotedBannerContent}>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{t('dm.historyBadge')}</Text>
              </View>
              <Text style={styles.promotedBannerTitle}>
                {t('dm.promotedBannerTitle', { community: promotedTarget.community.name })}
              </Text>
              <Text style={styles.promotedBannerBody}>
                {t('dm.promotedBannerBody', { channel: promotedTarget.channel.name })}
              </Text>
            </View>
            <TouchableOpacity onPress={handlePromoteToCommunity} style={styles.promotedBannerAction}>
              <Text style={styles.promotedBannerActionText}>{t('dm.goToCurrentChannelShort')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        testID="dm-message-list"
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        showsVerticalScrollIndicator={false}
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
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
          const startsGroup = previousMessage?.authorUserId !== item.authorUserId;
          const endsGroup = nextMessage?.authorUserId !== item.authorUserId;
          const itemAttachments = item.attachments ?? [];
          const displayBody = shouldHideAttachmentBody(
            item.bodyPlaintext || item.bodyMarkdown,
            itemAttachments,
          )
            ? ''
            : item.bodyPlaintext;
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                setSelectedMessageId((current) => (current === item.id ? null : item.id))
              }
              onLongPress={promotedTarget ? undefined : () => setActionMessage(item)}
              delayLongPress={400}
            >
              <MessageBubble
                authorName={
                  isOwn
                    ? (currentUser?.displayName ?? t('common.you'))
                    : (item.author?.displayName ?? displayName ?? t('common.unknown'))
                }
                authorAvatarUrl={item.author?.avatarUrl ?? null}
                body={displayBody}
                translatedBody={translatedBodies[item.id]}
                translatedLabel={translatedBodies[item.id] ? t('message.translated') : undefined}
                time={new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                isOwn={isOwn}
                isEncrypted={item.isEncrypted}
                isEdited={item.isEdited}
                editedLabel={t('message.edited')}
                readCount={unreadCounts[item.id]}
                showAvatar={startsGroup}
                showAuthorName={startsGroup}
                startsGroup={startsGroup}
                endsGroup={endsGroup}
                showActionChips={selectedMessageId === item.id}
                onPressMore={promotedTarget ? undefined : () => setActionMessage(item)}
              />
              {itemAttachments.length > 0 ? renderAttachments(itemAttachments) : null}
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          pendingMessages.length > 0 && !promotedTarget ? (
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
              icon="mail"
              title={promotedTarget ? t('dm.promotedNoHistoryTitle') : t('dm.noMessages')}
              subtitle={
                promotedTarget
                  ? t('dm.promotedNoHistoryBody', { channel: promotedTarget.channel.name })
                  : t('dm.startWith', { name: displayName })
              }
            />
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && pendingMessages.length === 0 ? styles.emptyContainer : null,
        ]}
      />

      {editingMessage && !promotedTarget && (
        <View style={styles.pendingSection}>
          <View style={styles.pendingItem}>
            <View style={styles.pendingMeta}>
              <Text style={styles.pendingLabel}>{t('common.edit')}</Text>
              <TouchableOpacity onPress={() => setEditingMessage(null)}>
                <Text style={styles.pendingLabel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.pendingBody} numberOfLines={1}>
              {editingMessage.bodyPlaintext}
            </Text>
          </View>
        </View>
      )}

      {pendingAttachment && !promotedTarget ? (
        <View testID="dm-pending-attachment" style={styles.pendingAttachmentPreview}>
          {isImageAttachmentMimeType(pendingAttachment.mimeType, pendingAttachment.name) ? (
            <Image
              testID="dm-pending-attachment-image"
              source={{ uri: pendingAttachment.uri }}
              style={styles.pendingAttachmentImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.pendingAttachmentFallback}>
              <Text style={styles.pendingAttachmentFallbackText}>
                {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
              </Text>
            </View>
          )}
          <View style={styles.pendingAttachmentInfo}>
            <Text testID="dm-pending-attachment-name" style={styles.pendingAttachmentName} numberOfLines={1}>
              {pendingAttachment.name}
            </Text>
            <Text style={styles.pendingAttachmentMeta}>
              {formatFileSize(pendingAttachment.size)}
            </Text>
          </View>
          <TouchableOpacity
            testID="dm-pending-attachment-remove"
            onPress={() => setPendingAttachment(null)}
            style={styles.pendingAttachmentRemove}
          >
            <Text style={styles.pendingAttachmentRemoveText}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showAttachMenu && !promotedTarget ? (
        <View testID="dm-attach-menu" style={styles.attachMenu}>
          <TouchableOpacity
            testID="dm-attach-menu-photo"
            style={styles.attachMenuItem}
            onPress={handlePickImage}
          >
            <Text style={styles.attachMenuText}>{t('channel.photoVideo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="dm-attach-menu-camera"
            style={styles.attachMenuItem}
            onPress={handleTakePhoto}
          >
            <Text style={styles.attachMenuText}>{t('channel.camera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="dm-attach-menu-document"
            style={styles.attachMenuItem}
            onPress={handlePickDocument}
          >
            <Text style={styles.attachMenuText}>{t('channel.document')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {promotedTarget ? (
        <View style={styles.promotedComposer}>
          <View style={styles.promotedComposerContent}>
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{t('dm.historyBadge')}</Text>
            </View>
            <Text style={styles.promotedComposerTitle}>{t('dm.promotedComposerTitle')}</Text>
            <Text style={styles.promotedComposerBody}>
              {t('dm.promotedComposerBody', { channel: promotedTarget.channel.name })}
            </Text>
          </View>
          <TouchableOpacity onPress={handlePromoteToCommunity} style={styles.promotedComposerButton}>
            <Text style={styles.promotedComposerButtonText}>{t('dm.goToCurrentChannelShort')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <MessageComposer
          placeholder={
            editingMessage
              ? t('message.editPlaceholder')
              : (e2eeEnabled ? t('dm.encryptedInput') : t('dm.messageInput'))
          }
          sendLabel={editingMessage ? t('common.save') : t('channel.send')}
          sendingLabel={t('channel.sending')}
          isSending={sendMutation.isPending}
          onSend={handleSend}
          onPressAdd={promotedTarget ? undefined : handleAddAttachment}
          allowEmptySubmit={!!pendingAttachment}
          draftText={editingMessage?.bodyPlaintext ?? ''}
          draftKey={editingMessage?.id ?? null}
          testIDPrefix="dm-composer"
        />
      )}

      {previewGallery ? (
        <AttachmentLightbox
          attachments={previewGallery.attachments}
          currentIndex={previewGallery.index}
          authToken={authToken}
          isSharing={openingAttachmentId === previewGallery.attachments[previewGallery.index]?.id}
          closeLabel={t('lightbox.close')}
          shareLabel={t('lightbox.share')}
          sharingLabel={t('lightbox.sharing')}
          previousLabel={t('lightbox.previous')}
          nextLabel={t('lightbox.next')}
          onClose={() => setPreviewGallery(null)}
          onShare={() => {
            const attachment = previewGallery.attachments[previewGallery.index];
            if (!attachment) {
              return;
            }
            void handleShareAttachment(attachment);
          }}
          onNavigate={(index) =>
            setPreviewGallery((current) => (current ? { ...current, index } : current))
          }
        />
      ) : null}

      {/* KakaoTalk-style message action sheet */}
      {actionMessage && !promotedTarget && (
        <MessageActionSheet
          message={actionMessage}
          isOwn={actionMessage.authorUserId === currentUser?.id}
          onEdit={actionMessage.authorUserId === currentUser?.id ? handleEdit : undefined}
          onTranslate={handleTranslate}
          onClose={() => setActionMessage(null)}
          onDelete={handleDelete}
        />
      )}

      <Modal
        visible={showPromoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPromoteModal(false)}
      >
        <View style={styles.promoteBackdrop}>
          <View style={styles.promoteSheet}>
            <Text style={styles.promoteTitle}>{t('dm.promoteTitle')}</Text>
            <Text style={styles.promoteDescription}>{t('dm.promoteConfirm')}</Text>

            <Text style={styles.promoteLabel}>{t('dm.promoteCommunityName')}</Text>
            <TextInput
              value={promotionCommunityName}
              onChangeText={setPromotionCommunityName}
              placeholder={t('dm.promoteCommunityPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={styles.promoteInput}
            />

            <Text style={styles.promoteLabel}>{t('dm.promoteChannelName')}</Text>
            <TextInput
              value={promotionChannelName}
              onChangeText={setPromotionChannelName}
              placeholder={t('dm.promoteChannelPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={styles.promoteInput}
              autoCapitalize="none"
            />

            <View style={styles.promoteActions}>
              <TouchableOpacity
                onPress={() => setShowPromoteModal(false)}
                style={styles.promoteSecondaryButton}
              >
                <Text style={styles.promoteSecondaryButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitPromoteToCommunity}
                disabled={
                  promoteMutation.isPending ||
                  !promotionCommunityName.trim() ||
                  !promotionChannelName.trim()
                }
                style={[
                  styles.promotePrimaryButton,
                  (
                    promoteMutation.isPending ||
                    !promotionCommunityName.trim() ||
                    !promotionChannelName.trim()
                  )
                    ? styles.promotePrimaryButtonDisabled
                    : null,
                ]}
              >
                {promoteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#20262d" />
                ) : (
                  <Text style={styles.promotePrimaryButtonText}>{t('dm.promoteSubmit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={promotedConflictTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPromotedConflictTarget(null)}
      >
        <View style={styles.promoteBackdrop}>
          <View style={styles.promoteSheet}>
            <Text style={styles.promoteTitle}>{t('dm.promotedConflictTitle')}</Text>
            <Text style={styles.promoteDescription}>
              {promotedConflictTarget
                ? t('dm.promotedConflictBody', {
                    community: promotedConflictTarget.community.name,
                    channel: promotedConflictTarget.channel.name,
                  })
                : ''}
            </Text>

            <View style={styles.promoteActions}>
              <TouchableOpacity
                onPress={() => setPromotedConflictTarget(null)}
                style={styles.promoteSecondaryButton}
              >
                <Text style={styles.promoteSecondaryButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const target = promotedConflictTarget;
                  setPromotedConflictTarget(null);
                  if (target) {
                    navigateToPromotedCommunity(target);
                  }
                }}
                style={styles.promotePrimaryButton}
              >
                <Text style={styles.promotePrimaryButtonText}>{t('dm.goToCurrentChannelShort')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={errorDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorDialog(null)}
      >
        <View style={styles.promoteBackdrop}>
          <View style={styles.promoteSheet}>
            <Text style={styles.promoteTitle}>{errorDialog?.title ?? t('common.error')}</Text>
            <Text style={styles.promoteDescription}>{errorDialog?.message ?? ''}</Text>

            <View style={styles.promoteActions}>
              <TouchableOpacity
                onPress={() => setErrorDialog(null)}
                style={styles.promotePrimaryButton}
              >
                <Text style={styles.promotePrimaryButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function sanitizeAttachmentName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getAttachmentKindLabel(fileName: string, mimeType: string): string {
  if (isImageAttachmentMimeType(mimeType, fileName)) return 'IMG';
  if (mimeType.startsWith('video/')) return 'VID';
  if (mimeType.startsWith('audio/')) return 'AUD';
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) return 'PDF';
  return 'FILE';
}

const styles = StyleSheet.create({
  promoteButton: {
    minWidth: 52,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoteButtonText: {
    color: colors.primary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  promoteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  promoteSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  promoteTitle: {
    color: colors.text,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  promoteDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  promoteLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
    fontSize: fs.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  promoteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fs.base,
  },
  promoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  promoteSecondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  promoteSecondaryButtonText: {
    color: colors.textSecondary,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  promotePrimaryButton: {
    borderWidth: 1,
    borderColor: colors.talkOwnBubbleBorder,
    borderRadius: 999,
    backgroundColor: colors.talkOwnBubble,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 84,
    alignItems: 'center',
  },
  promotePrimaryButtonDisabled: {
    opacity: 0.6,
  },
  promotePrimaryButtonText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '700',
  },
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
  // E2EE status banner
  e2eeBanner: {
    backgroundColor: colors.talkPanel,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.talkPanelBorder,
  },
  e2eeText: {
    color: colors.success,
    fontSize: fs.sm,
    fontWeight: '600',
  },
  dmHeroWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  dmHeroCard: {
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: colors.talkPanel,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dmHeroEyebrow: {
    color: colors.talkMeta,
    fontSize: fs.xs - 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dmHeroTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: fs.base + 2,
    fontWeight: '700',
  },
  dmHeroBody: {
    marginTop: spacing.xs,
    color: colors.talkMeta,
    fontSize: fs.sm,
    lineHeight: 20,
  },
  dmHeroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dmHeroMetaBadge: {
    borderRadius: 999,
    backgroundColor: '#40444b',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dmHeroMetaBadgeText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  dmHeroMetaBadgeSuccess: {
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dmHeroMetaBadgeSuccessText: {
    color: colors.success,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  dmHeroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dmHeroActionChip: {
    borderRadius: 12,
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  dmHeroActionChipPrimary: {
    backgroundColor: colors.talkOwnBubble,
    borderColor: colors.talkOwnBubbleBorder,
  },
  dmHeroActionChipText: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  dmHeroActionChipPrimaryText: {
    color: colors.white,
  },
  promotedBannerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  promotedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: colors.talkPanel,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  promotedBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotedBannerIconText: {
    color: colors.white,
    fontSize: fs.md,
    fontWeight: '800',
  },
  promotedBannerContent: {
    flex: 1,
  },
  historyBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: '#2b2d31',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },
  historyBadgeText: {
    color: colors.textPrimary,
    fontSize: fs.xs - 2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  promotedBannerTitle: {
    color: colors.text,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  promotedBannerBody: {
    marginTop: 2,
    color: colors.talkMeta,
    fontSize: fs.xs,
  },
  promotedBannerAction: {
    borderRadius: 12,
    backgroundColor: colors.talkOwnBubble,
    borderWidth: 1,
    borderColor: colors.talkOwnBubbleBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  promotedBannerActionText: {
    color: colors.white,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  promotedComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.talkBackground,
    borderTopWidth: 1,
    borderTopColor: colors.talkPanelBorder,
  },
  promotedComposerContent: {
    flex: 1,
    backgroundColor: colors.talkOtherBubble,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  promotedComposerTitle: {
    color: colors.text,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  promotedComposerBody: {
    marginTop: 2,
    color: colors.talkMeta,
    fontSize: fs.xs,
  },
  promotedComposerButton: {
    borderRadius: 24,
    backgroundColor: colors.talkOwnBubble,
    borderWidth: 1,
    borderColor: colors.talkOwnBubbleBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minWidth: 68,
    alignItems: 'center',
  },
  promotedComposerButtonText: {
    color: colors.white,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  attachments: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  attachmentImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  attachmentImageCard: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.talkPanel,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentFile: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: colors.talkPanel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  attachmentFileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  attachmentFileIcon: {
    fontSize: fs.lg,
  },
  attachmentFileContent: {
    flex: 1,
  },
  attachmentFileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentFileTypeBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(240,215,76,0.14)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  attachmentFileTypeBadgeText: {
    color: '#f0d74c',
    fontSize: fs.xs - 2,
    fontWeight: '700',
  },
  attachmentFileName: {
    marginTop: 4,
    color: colors.text,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  attachmentSize: {
    marginTop: 2,
    color: colors.talkMeta,
    fontSize: fs.xs,
  },
  attachmentFileCta: {
    marginLeft: spacing.xs,
  },
  attachmentFileCtaText: {
    color: colors.primary,
    fontSize: fs.xs,
    fontWeight: '700',
  },
  pendingAttachmentPreview: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    backgroundColor: colors.talkPanel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingAttachmentImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  pendingAttachmentFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  pendingAttachmentFallbackText: {
    color: colors.textPrimary,
    fontSize: fs.xs,
    fontWeight: '800',
  },
  pendingAttachmentInfo: {
    flex: 1,
  },
  pendingAttachmentName: {
    color: colors.text,
    fontSize: fs.sm,
    fontWeight: '700',
  },
  pendingAttachmentMeta: {
    marginTop: 2,
    color: colors.talkMeta,
    fontSize: fs.xs,
  },
  pendingAttachmentRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.talkOtherBubble,
  },
  pendingAttachmentRemoveText: {
    color: colors.textPrimary,
    fontSize: fs.sm,
    fontWeight: '700',
  },
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
  pendingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  pendingLabel: {
    color: colors.talkMeta,
    fontSize: fs.xs,
    marginTop: spacing.xs,
  },
});
