/* eslint-disable @next/next/no-img-element */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useTranslation, t } from '@/lib/i18n';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { getSessionToken } from '@/lib/session-token';
import { useAuthStore } from '@/stores/auth';
import { pickDesktopFiles } from '@/lib/desktop-files';
import { resolveFileMimeType } from '@/lib/file-mime';
import { createFilePreviewUrl, revokeFilePreviewUrl } from '@/lib/file-preview';
import { UserAvatar } from '@/components/UserAvatar';
import {
  WebSocketEvent,
  hasOnlyImageAttachments,
  shouldHideAttachmentBody,
  type Attachment,
  type WSOutgoing,
} from '@zktalk/shared';
import { send, subscribe } from '@/hooks/useWebSocket';
import { useE2EE } from '@/hooks/useE2EE';
import { AttachmentPreview } from '@/components/AttachmentPreview/AttachmentPreview';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🙏', '🔥', '😊', '👏'];
const RECENT_ATTACHMENT_PROBE_WINDOW_MS = 60_000;
const RAW_UPLOAD_CONTENT_TYPE = 'application/octet-stream';

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function resolveUploadUrl(uploadUrl: string): string {
  return uploadUrl.startsWith('http') ? uploadUrl : `${getApiBaseUrl()}${uploadUrl}`;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiWithRateLimitRetry<T>(
  path: string,
  options: Parameters<typeof api>[1],
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await api<T>(path, options);
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiError) || error.status !== 429 || attempt === attempts - 1) {
        throw error;
      }
      await wait(600 * (attempt + 1));
    }
  }
  throw lastError;
}

async function uploadWithRateLimitRetry(
  uploadUrl: string,
  body: BodyInit,
  headers: Record<string, string>,
  attempts = 3,
): Promise<Response> {
  let lastResponse: Response | null = null;
  const sessionToken = getSessionToken();
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(resolveUploadUrl(uploadUrl), {
      method: 'PUT',
      body,
      headers: {
        ...headers,
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      credentials: 'include',
    });
    lastResponse = response;
    if (response.status !== 429 || attempt === attempts - 1) {
      return response;
    }
    await wait(600 * (attempt + 1));
  }
  return lastResponse as Response;
}

function formatPendingFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPendingAttachmentKindLabel(file: File): string {
  const extension = file.name.split('.').pop()?.trim();
  if (extension) {
    return extension.toUpperCase().slice(0, 6);
  }

  if (file.type.includes('pdf')) return 'PDF';
  if (file.type.includes('sheet') || file.type.includes('excel')) return 'XLS';
  if (file.type.includes('word') || file.type.includes('document')) return 'DOC';
  if (file.type.includes('zip') || file.type.includes('compressed')) return 'ZIP';
  if (file.type.includes('audio')) return 'AUDIO';
  if (file.type.includes('video')) return 'VIDEO';
  return 'FILE';
}

function getAttachmentFallbackBody(attachments: PendingAttachment[]): string {
  if (attachments.length === 0) return ' ';
  if (hasOnlyImageAttachments(
    attachments.map((attachment) => ({
      fileName: attachment.file.name,
      mimeType: resolveFileMimeType(attachment.file),
    })),
  )) {
    return ' ';
  }
  if (attachments.length === 1) return attachments[0].file.name;
  return `${attachments[0].file.name} 외 ${attachments.length - 1}개`;
}

function looksLikeAttachmentBody(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return true;
  if (trimmed === '(첨부파일)' || trimmed === '(attachment)') return true;
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|png|jpe?g|gif|webp|txt|csv|mp3|wav|m4a|mp4|mov|webm)$/i.test(trimmed);
}

function hasDraggedFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  return dataTransfer.files.length > 0 || Array.from(dataTransfer.types ?? []).includes('Files');
}

interface DmParticipant {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
}

interface ConversationDetail {
  conversation: {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    promotedCommunityId?: string | null;
    promotedChannelId?: string | null;
  };
  participants: DmParticipant[];
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

interface DmCallTarget {
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

interface MessageRow {
  message: {
    id: string;
    conversationId: string;
    authorUserId: string;
    bodyMarkdown: string;
    createdAt: string;
    isEdited: boolean;
    isDeleted: boolean;
    isEncrypted: boolean;
  };
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  attachments?: Attachment[];
}

interface MessagesPage {
  messages: MessageRow[];
  hasMore: boolean;
  /** KakaoTalk-style unread counts: messageId -> number of participants who haven't read */
  unreadCounts?: Record<string, number>;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string | null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  if (isYesterday) return `${t('time.yesterday')} ${time}`;
  return `${date.toLocaleDateString()} ${time}`;
}

interface DmConversationProps {
  conversationId: string;
}

export function DmConversation({ conversationId }: DmConversationProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const bodyRef = useRef('');
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState<string | null>(null);
  const [errorDialogMessage, setErrorDialogMessage] = useState<string | null>(null);
  const [promotedConflictTarget, setPromotedConflictTarget] = useState<{
    community: {
      id: string;
      slug: string;
      name: string;
    };
    channel: {
      id: string;
      name: string;
    };
  } | null>(null);
  const [promotionCommunityName, setPromotionCommunityName] = useState('');
  const [promotionChannelName, setPromotionChannelName] = useState('general');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachmentDragDepthRef = useRef(0);
  const isComposingRef = useRef(false);
  const submitLockRef = useRef(false);
  const lastMarkedMessageIdRef = useRef<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const loadConversationDetail = useCallback(
    () => api<ConversationDetail>(`/api/dm/conversations/${conversationId}`),
    [conversationId],
  );

  const { data: convData } = useQuery({
    queryKey: ['dm-conversation', conversationId],
    queryFn: loadConversationDetail,
  });

  const conv = convData?.conversation;
  const participants = useMemo(() => convData?.participants ?? [], [convData?.participants]);
  const isGroup = conv?.type === 'group';
  const isDirect = conv?.type === 'direct';
  const promotedTarget = useMemo(
    () =>
      convData?.promotedCommunity && convData?.promotedChannel
        ? {
            community: convData.promotedCommunity,
            channel: convData.promotedChannel,
          }
        : null,
    [convData?.promotedChannel, convData?.promotedCommunity],
  );

  useEffect(() => {
    if (!promotedTarget) {
      return;
    }

    setShowPromoteDialog(false);
    setPromotedConflictTarget(null);
    setErrorDialogTitle(null);
    setErrorDialogMessage(null);
  }, [promotedTarget]);

  // Find the other user's ID for E2EE (1:1 DMs only)
  const otherUserId = isDirect
    ? participants.find((p) => p.userId !== currentUser?.id)?.userId ?? null
    : null;

  const { isReady: e2eeReady, isLoading: e2eeLoading, encrypt, decrypt } = useE2EE({
    otherUserId,
  });

  // Decrypted message cache: messageId -> decrypted plaintext
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('cursor', pageParam);
      const res = await api<MessagesPage>(
        `/api/dm/conversations/${conversationId}/messages?${params.toString()}`,
      );
      return res;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      return lastPage.messages[lastPage.messages.length - 1].message.id;
    },
    initialPageParam: undefined as string | undefined,
  });

  const allMessages = useMemo(() => {
    const seen = new Set<string>();
    const rows = messagesData?.pages.flatMap((page) => page.messages).reverse() ?? [];
    return rows.filter((row) => {
      if (seen.has(row.message.id)) {
        return false;
      }
      seen.add(row.message.id);
      return true;
    });
  }, [messagesData?.pages]);

  // Merge unread counts from all pages
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const page of messagesData?.pages ?? []) {
      if (page.unreadCounts) {
        Object.assign(counts, page.unreadCounts);
      }
    }
    return counts;
  }, [messagesData?.pages]);

  const fallbackDmMessages = useQueries({
    queries: allMessages.map((row) => ({
      queryKey: ['dm-message-detail', row.message.id],
      queryFn: () => api<MessageRow>(`/api/dm/messages/${row.message.id}`),
      enabled:
        (row.attachments?.length ?? 0) === 0
        && (
          looksLikeAttachmentBody(row.message.bodyMarkdown)
          || Date.now() - new Date(row.message.createdAt).getTime() < RECENT_ATTACHMENT_PROBE_WINDOW_MS
        ),
    })),
  });

  const fallbackAttachmentsByMessageId = useMemo(() => {
    const next = new Map<string, Attachment[]>();
    fallbackDmMessages.forEach((query, index) => {
      const row = allMessages[index];
      const attachments = query.data?.attachments;
      if (row?.message.id && attachments && attachments.length > 0) {
        next.set(row.message.id, attachments);
      }
    });
    return next;
  }, [allMessages, fallbackDmMessages]);

  const latestMessageId = allMessages[allMessages.length - 1]?.message.id ?? null;
  const hasPendingAttachments = pendingAttachments.length > 0;

  // ── Decrypt encrypted messages ──────────────────────────────────
  useEffect(() => {
    if (!e2eeReady) return;
    const encrypted = allMessages.filter(
      (r) => r.message.isEncrypted && !r.message.isDeleted && !decryptedCache[r.message.id],
    );
    if (encrypted.length === 0) return;

    let cancelled = false;
    (async () => {
      const newEntries: Record<string, string> = {};
      for (const row of encrypted) {
        try {
          const plaintext = await decrypt(row.message.bodyMarkdown);
          newEntries[row.message.id] = plaintext;
        } catch {
          newEntries[row.message.id] = '[decryption failed]';
        }
      }
      if (!cancelled) {
        setDecryptedCache((prev) => ({ ...prev, ...newEntries }));
      }
    })();
    return () => { cancelled = true; };
  }, [allMessages, e2eeReady, decrypt, decryptedCache]);

  // ── Subscribe to real-time DM events via WebSocket ──────────────
  useEffect(() => {
    if (!conversationId) return;

    // Tell server we're watching this DM conversation
    send({ type: 'subscribe_dm', conversationId });

    const unsubCreated = subscribe(
      WebSocketEvent.DM_MESSAGE_CREATED,
      (msg: WSOutgoing) => {
        if (msg.conversationId !== conversationId) return;
        const newRow = msg.data as MessageRow;

        queryClient.setQueriesData<{ pages?: Array<MessagesPage> }>(
          { queryKey: ['dm-messages', conversationId] },
          (old) => {
            if (!old?.pages) return old;
            const firstPage = old.pages[0];
            if (!firstPage) return old;
            // Deduplicate: skip if message already exists
            if (firstPage.messages.some((r) => r.message.id === newRow.message.id)) return old;
            return {
              ...old,
              pages: [
                { ...firstPage, messages: [newRow, ...firstPage.messages] },
                ...old.pages.slice(1),
              ],
            };
          },
        );
        // Also refresh the conversation list sidebar
        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
        void queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
          void queryClient.invalidateQueries({ queryKey: ['dm-message-detail', newRow.message.id] });
        }, 1_200);
        setShouldAutoScroll(true);
      },
    );

    const unsubUpdated = subscribe(
      WebSocketEvent.DM_MESSAGE_UPDATED,
      (msg: WSOutgoing) => {
        if (msg.conversationId !== conversationId) return;
        const updated = msg.data as MessageRow;

        queryClient.setQueriesData<{ pages?: Array<MessagesPage> }>(
          { queryKey: ['dm-messages', conversationId] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((r) =>
                  r.message.id === updated.message.id ? updated : r,
                ),
              })),
            };
          },
        );
      },
    );

    const unsubDeleted = subscribe(
      WebSocketEvent.DM_MESSAGE_DELETED,
      (msg: WSOutgoing) => {
        if (msg.conversationId !== conversationId) return;
        const deleted = msg.data as { id?: string; messageId?: string };
        const deletedId = deleted.id ?? deleted.messageId;
        if (!deletedId) return;

        queryClient.setQueriesData<{ pages?: Array<MessagesPage> }>(
          { queryKey: ['dm-messages', conversationId] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((r) =>
                  r.message.id === deletedId
                    ? { ...r, message: { ...r.message, isDeleted: true } }
                    : r,
                ),
              })),
            };
          },
        );
      },
    );

    const unsubConversationUpdated = subscribe(
      WebSocketEvent.DM_CONVERSATION_UPDATED,
      (msg: WSOutgoing) => {
        if (msg.conversationId !== conversationId) return;
        queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
      },
    );

    return () => {
      send({ type: 'unsubscribe_dm', conversationId });
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubConversationUpdated();
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages.length, shouldAutoScroll]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShouldAutoScroll(isAtBottom);
    if (container.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sendMessage = useMutation({
    mutationFn: async ({
      bodyMarkdown,
      attachments,
    }: {
      bodyMarkdown: string;
      attachments: PendingAttachment[];
    }) => {
      let finalBody = bodyMarkdown;
      let isEncrypted = false;
      let encryptedPayload: string | undefined;

      // Encrypt if E2EE is ready and this is a 1:1 DM
      if (e2eeReady && isDirect) {
        finalBody = await encrypt(bodyMarkdown);
        isEncrypted = true;
        encryptedPayload = finalBody;
      }

      const message = await apiWithRateLimitRetry<MessageRow>(
        `/api/dm/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: {
            bodyMarkdown: finalBody,
            isEncrypted,
            ...(encryptedPayload ? { encryptedPayload } : {}),
          },
          headers: { 'X-Request-Id': generateRequestId() },
        },
      );

      const messageId = message.message.id;

      for (const attachment of attachments) {
        const presign = await apiWithRateLimitRetry<{ uploadUrl: string; storageKey: string }>(
          '/api/upload/presign',
          {
            method: 'POST',
            body: {
              conversationId,
              fileName: attachment.file.name,
              mimeType: resolveFileMimeType(attachment.file),
              fileSize: attachment.file.size,
            },
          },
        );

        const sessionToken = getSessionToken();
        const uploadRes = await uploadWithRateLimitRetry(
          presign.uploadUrl,
          attachment.file,
          {
            'Content-Type': RAW_UPLOAD_CONTENT_TYPE,
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
        );

        if (!uploadRes.ok) {
          throw new Error(`Attachment upload failed with status ${uploadRes.status}`);
        }

        await apiWithRateLimitRetry('/api/upload/attachments', {
          method: 'POST',
          body: {
            dmMessageId: messageId,
            storageKey: presign.storageKey,
            fileName: attachment.file.name,
            mimeType: resolveFileMimeType(attachment.file),
            fileSize: attachment.file.size,
          },
        });
      }

      return { message, attachmentsAttached: attachments.length > 0 };
    },
    onSuccess: ({ message }) => {
      queryClient.setQueriesData<{ pages?: Array<MessagesPage> }>(
        { queryKey: ['dm-messages', conversationId] },
        (old) => {
          if (!old?.pages?.length) return old;
          let changed = false;
          const pages = old.pages.map((page, pageIndex) => {
            const hasExisting = page.messages.some((row) => row.message.id === message.message.id);
            if (hasExisting) {
              changed = true;
              return {
                ...page,
                messages: page.messages.map((row) =>
                  row.message.id === message.message.id ? message : row,
                ),
              };
            }
            if (pageIndex === 0) {
              changed = true;
              return {
                ...page,
                messages: [message, ...page.messages],
              };
            }
            return page;
          });
          if (!changed) {
            return old;
          }
          return { ...old, pages };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      pendingAttachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          revokeFilePreviewUrl(attachment.previewUrl);
        }
      });
      setPendingAttachments([]);
      setShouldAutoScroll(true);
    },
    onSettled: () => {
      submitLockRef.current = false;
    },
  });

  const markRead = useMutation({
    mutationFn: async (messageId: string) =>
      api<void>(`/api/dm/conversations/${conversationId}/read`, {
        method: 'POST',
        body: { messageId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });

  const promoteConversation = useMutation({
    mutationFn: async ({
      communityName,
      channelName,
    }: {
      communityName: string;
      channelName: string;
    }) =>
      api<{
        community: { id: string; slug: string; name: string };
        channel: { id: string; name: string };
      }>(`/api/dm/conversations/${conversationId}/promote`, {
        method: 'POST',
        body: {
          communityName,
          channelName,
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      setShowPromoteDialog(false);
      router.push(`/communities/${result.community.slug}/channels/${result.channel.id}`);
    },
  });

  const callTargetMutation = useMutation({
    mutationFn: () =>
      api<DmCallTarget>(`/api/dm/conversations/${conversationId}/call-target`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
    },
  });

  useEffect(() => {
    lastMarkedMessageIdRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!latestMessageId || !currentUser) return;
    if (lastMarkedMessageIdRef.current === latestMessageId) return;

    lastMarkedMessageIdRef.current = latestMessageId;
    markRead.mutate(latestMessageId, {
      onError: () => {
        if (lastMarkedMessageIdRef.current === latestMessageId) {
          lastMarkedMessageIdRef.current = null;
        }
      },
    });
  }, [currentUser, latestMessageId, markRead]);

  const appendPendingFiles = useCallback((files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const nextAttachments = files.map((file) => ({
      id: generateRequestId(),
      file,
      previewUrl: null,
    }));

    setPendingAttachments((prev) => [
      ...prev,
      ...nextAttachments,
    ]);

    void Promise.all(
      nextAttachments.map(async (attachment) => ({
        id: attachment.id,
        previewUrl: await createFilePreviewUrl(attachment.file),
      })),
    ).then((resolvedAttachments) => {
      const resolvedPreviewMap = new Map(
        resolvedAttachments
          .filter((attachment) => attachment.previewUrl)
          .map((attachment) => [attachment.id, attachment.previewUrl] as const),
      );

      if (resolvedPreviewMap.size === 0) {
        return;
      }

      setPendingAttachments((prev) => prev.map((attachment) => {
        const previewUrl = resolvedPreviewMap.get(attachment.id);
        if (!previewUrl || attachment.previewUrl === previewUrl) {
          return attachment;
        }

        return {
          ...attachment,
          previewUrl,
        };
      }));
    });
  }, []);

  const handleAttachmentSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;

      appendPendingFiles(files);
      event.target.value = '';
    },
    [appendPendingFiles],
  );

  const handleAttachmentButtonClick = useCallback(() => {
    void (async () => {
      const desktopFiles = await pickDesktopFiles({ multiple: true });
      if (desktopFiles === null) {
        attachmentInputRef.current?.click();
        return;
      }

      if (desktopFiles.length > 0) {
        appendPendingFiles(desktopFiles);
      }
    })();
  }, [appendPendingFiles]);

  const removePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((attachment) => attachment.id === attachmentId);
      if (target?.previewUrl) {
        revokeFilePreviewUrl(target.previewUrl);
      }
      return prev.filter((attachment) => attachment.id !== attachmentId);
    });
  }, []);

  useEffect(() => {
    return () => {
      pendingAttachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          revokeFilePreviewUrl(attachment.previewUrl);
        }
      });
    };
  }, [pendingAttachments]);

  const handleAttachmentDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current += 1;
    if (attachmentDragDepthRef.current === 1) {
      setIsDraggingAttachments(true);
    }
  }, []);

  const handleAttachmentDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current = Math.max(attachmentDragDepthRef.current - 1, 0);
    if (attachmentDragDepthRef.current === 0) {
      setIsDraggingAttachments(false);
    }
  }, []);

  const handleAttachmentDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleAttachmentDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current = 0;
    setIsDraggingAttachments(false);

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      appendPendingFiles(files);
    }
  }, [appendPendingFiles]);

  const handleSend = () => {
    const trimmed = bodyRef.current.trim();
    if (!(trimmed || hasPendingAttachments) || sendMessage.isPending || submitLockRef.current) return;
    submitLockRef.current = true;
    sendMessage.mutate({ bodyMarkdown: trimmed || getAttachmentFallbackBody(pendingAttachments), attachments: pendingAttachments }, {
      onSuccess: () => {
        bodyRef.current = '';
        setBody('');
        if (composerRef.current) {
          composerRef.current.value = '';
        }
      },
      onError: (error) => {
        submitLockRef.current = false;
        void handlePromotedReadOnlyError(error);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertEmoji = useCallback((emoji: string) => {
    const nextValue = `${bodyRef.current}${emoji}`;
    bodyRef.current = nextValue;
    setBody(nextValue);
    if (composerRef.current) {
      composerRef.current.value = nextValue;
    }
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }, []);

  const headerName = useMemo(() => {
    if (!conv) return '';
    if (isGroup && conv.name) return conv.name;
    if (isGroup) {
      return participants
        .filter((p) => p.userId !== currentUser?.id)
        .map((p) => p.user.displayName)
        .join(', ');
    }
    const other = participants.find((p) => p.userId !== currentUser?.id);
    return other?.user.displayName ?? '?';
  }, [conv, currentUser?.id, isGroup, participants]);

  const openPromoteDialog = useCallback(() => {
    setPromotionCommunityName(headerName);
    setPromotionChannelName('general');
    setShowPromoteDialog(true);
  }, [headerName]);

  const openPromotedCommunity = useCallback(() => {
    if (!promotedTarget) {
      return;
    }

    router.push(`/communities/${promotedTarget.community.slug}/channels/${promotedTarget.channel.id}`);
  }, [promotedTarget, router]);

  const navigateToPromotedCommunity = useCallback(
    (target: NonNullable<typeof promotedTarget>) => {
      router.push(`/communities/${target.community.slug}/channels/${target.channel.id}`);
    },
    [router],
  );

  const handlePromotedReadOnlyError = useCallback(
    async (error: unknown) => {
      if (!(error instanceof ApiError) || error.code !== 'DM_PROMOTED_READ_ONLY') {
        setErrorDialogTitle(t('common.error'));
        setErrorDialogMessage(error instanceof Error ? error.message : t('common.errorOccurred'));
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
        setErrorDialogTitle(t('common.error'));
        setErrorDialogMessage(error.message);
        return;
      }

      setPromotedConflictTarget(nextTarget);
    },
    [conversationId, loadConversationDetail, queryClient, t],
  );

  const handlePromoteToCommunity = useCallback(async () => {
    if (promoteConversation.isPending) {
      return;
    }

    const trimmedCommunityName = promotionCommunityName.trim();
    const trimmedChannelName = promotionChannelName.trim();
    if (!trimmedCommunityName || !trimmedChannelName) {
      return;
    }

    try {
      await promoteConversation.mutateAsync({
        communityName: trimmedCommunityName,
        channelName: trimmedChannelName,
      });
    } catch (error) {
      setErrorDialogTitle(t('dm.promoteTitle'));
      setErrorDialogMessage(error instanceof Error ? error.message : t('dm.promoteFailed'));
    }
  }, [promoteConversation, promotionChannelName, promotionCommunityName, t]);

  const handleStartCall = useCallback(
    async (mode: 'voice' | 'video') => {
      try {
        const result = await callTargetMutation.mutateAsync();
        router.push(
          `/communities/${result.community.slug}/channels/${result.voiceChannel.id}?joinVoice=${mode}`,
        );
      } catch (error) {
        setErrorDialogTitle(mode === 'video' ? t('voice.videoCall') : t('voice.join'));
        setErrorDialogMessage(error instanceof Error ? error.message : t('voice.joinFailed'));
      }
    },
    [callTargetMutation, router, t],
  );

  return (
    <div
      className="flex h-full flex-1 flex-col bg-[#36393f]"
      data-testid="dm-conversation"
      data-conversation-id={conversationId}
      data-promoted={promotedTarget ? 'true' : 'false'}
      data-conversation-type={conv?.type ?? 'unknown'}
    >
      {/* Header */}
      <div className="border-b border-[#202225] bg-[#313338] px-4 py-3">
        <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-1 gap-3">
              {conv && !isGroup && (
                <UserAvatar
                  displayName={headerName}
                  avatarUrl={participants.find((p) => p.userId !== currentUser?.id)?.user.avatarUrl}
                  size="sm"
                />
              )}
              {isGroup && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-medium text-white">
                  {(conv?.name || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e9297]">
                  {t('dm.title')}
                </p>
                <h2 className="mt-1.5 truncate text-lg font-semibold text-white">
                  {headerName}
                </h2>
                <p className="mt-1 text-sm text-[#b5bac1]">
                  {t('dm.listSubtitle')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-[#40444b] px-2 py-0.5 text-xs font-semibold text-[#dbdee1]">
                    {isGroup ? t('dm.group') : t('dm.oneToOne')}
                  </span>
                  {isGroup && (
                    <span className="inline-flex rounded-full bg-[#40444b] px-2 py-0.5 text-xs font-semibold text-[#dbdee1]">
                      {t('dm.groupMembers', { count: String(participants.length) })}
                    </span>
                  )}
                  {promotedTarget && (
                    <span className="inline-flex rounded-full border border-[#4f545c] bg-[#2b2d31] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#dbdee1]">
                      {t('dm.historyBadge')}
                    </span>
                  )}
                  {!promotedTarget && isDirect && e2eeLoading && (
                    <span className="text-xs text-[#b5bac1]">{t('e2ee.generating')}</span>
                  )}
                  {!promotedTarget && isDirect && e2eeReady && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-300">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                      </svg>
                      {t('e2ee.badge')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-l border-[#202225] pl-3">
              <button
                type="button"
                onClick={() => {
                  void handleStartCall('voice');
                }}
                data-testid="dm-header-voice-button"
                disabled={callTargetMutation.isPending}
                className="shrink-0 rounded-md border border-[#4f545c] bg-[#40444b] px-3 py-1.5 text-xs font-semibold text-[#dbdee1] transition-colors hover:bg-[#4f545c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {callTargetMutation.isPending ? t('common.loading') : t('voice.join')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleStartCall('video');
                }}
                data-testid="dm-header-video-button"
                disabled={callTargetMutation.isPending}
                className="shrink-0 rounded-md border border-[#4f545c] bg-[#40444b] px-3 py-1.5 text-xs font-semibold text-[#dbdee1] transition-colors hover:bg-[#4f545c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {callTargetMutation.isPending ? t('common.loading') : t('voice.videoCall')}
              </button>
              <button
                type="button"
                onClick={promotedTarget ? openPromotedCommunity : openPromoteDialog}
                disabled={promoteConversation.isPending}
                data-testid="dm-promote-button"
                className="shrink-0 rounded-md border border-[#4f545c] bg-[#40444b] px-3 py-1.5 text-xs font-semibold text-[#dbdee1] transition-colors hover:bg-[#4f545c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {promoteConversation.isPending
                  ? t('dm.promoting')
                  : promotedTarget
                    ? t('dm.goToCurrentChannel')
                    : t('dm.promote')}
              </button>
            </div>
        </div>
      </div>

      {promotedTarget && (
        <div className="border-b border-[#202225] bg-[#2f3136] px-4 py-3">
          <div
            className="flex items-center gap-3 rounded-2xl border border-[#40444b] bg-[#313338] px-4 py-3"
            data-testid="dm-promoted-banner"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a5 5 0 0 1 5 5v1h1a3 3 0 0 1 3 3v5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-5a3 3 0 0 1 3-3h1V7a5 5 0 0 1 5-5Zm3 9H9a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3Zm-3-6a2 2 0 0 0-2 2v1h4V7a2 2 0 0 0-2-2Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="mb-1 inline-flex rounded-full border border-[#4f545c] bg-[#2b2d31] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#dbdee1]">
                {t('dm.historyBadge')}
              </span>
              <p className="text-sm font-semibold text-white">
                {t('dm.promotedBannerTitle', { community: promotedTarget.community.name })}
              </p>
              <p className="mt-0.5 text-xs text-[#b5bac1]">
                {t('dm.promotedBannerBody', { channel: promotedTarget.channel.name })}
              </p>
            </div>
            <button
              type="button"
              onClick={openPromotedCommunity}
              data-testid="dm-promoted-banner-open-channel-button"
              className="shrink-0 rounded-md border border-[#4f545c] bg-[#40444b] px-3 py-2 text-xs font-semibold text-[#dbdee1] transition-colors hover:bg-[#4f545c]"
            >
              {t('dm.goToCurrentChannel')}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 md:px-4"
      >
        {isFetchingNextPage && (
          <div className="py-2 text-center text-xs text-[#b5bac1]">
            {t('common.loading')}
          </div>
        )}

        {allMessages.length === 0 && !isFetchingNextPage && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[#b5bac1]">
              {promotedTarget
                ? t('dm.promotedNoHistory', { channel: promotedTarget.channel.name })
                : t('dm.noMessages')}
            </p>
          </div>
        )}

        {allMessages.map((row, idx) => {
          const msg = row.message;
          const author = row.author;
          const prevRow = idx > 0 ? allMessages[idx - 1] : null;
          const nextRow = idx < allMessages.length - 1 ? allMessages[idx + 1] : null;
          const showAvatar = !prevRow || prevRow.message.authorUserId !== msg.authorUserId;
          const endsGroup = !nextRow || nextRow.message.authorUserId !== msg.authorUserId;
          const isOwnMessage = msg.authorUserId === currentUser?.id;
          const msgUnreadCount = unreadCounts[msg.id] ?? 0;
          const messageAttachments = fallbackAttachmentsByMessageId.get(msg.id) ?? row.attachments ?? [];
          const messageBody = msg.isEncrypted
            ? (decryptedCache[msg.id] ?? t('e2ee.encrypted'))
            : msg.bodyMarkdown;
          const hideMessageBody = !msg.isDeleted && shouldHideAttachmentBody(messageBody, messageAttachments);

          return (
            <div
              key={msg.id}
              data-testid="dm-message-row"
              data-message-id={msg.id}
              className={`flex px-2 py-1 ${showAvatar ? 'mt-3' : 'mt-0.5'} ${
                isOwnMessage ? 'justify-end gap-2' : 'justify-start gap-2'
              }`}
            >
              {!isOwnMessage && (
                <div className="w-8 shrink-0">
                  {showAvatar && (
                    <div data-testid="dm-peer-avatar" data-author-user-id={author.id}>
                      <UserAvatar
                        displayName={author.displayName}
                        avatarUrl={author.avatarUrl}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className={`flex min-w-0 max-w-[min(32rem,calc(100%-4rem))] flex-col ${isOwnMessage ? 'items-end' : ''}`}>
                {showAvatar && (
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span className="text-sm font-medium text-[#f2f3f5]">
                      {author.displayName}
                    </span>
                  </div>
                )}
                <div className="relative">
                  {endsGroup && (
                    <span
                      className={`absolute bottom-2 h-2.5 w-2.5 rotate-45 ${isOwnMessage ? '-right-1 border-b border-r border-[#ebd451] bg-[#fee500]' : '-left-1 border-b border-l border-[#d9e3ea] bg-white'}`}
                    />
                  )}
                  <div
                    className={`relative rounded-[1.2rem] px-3.5 py-2.5 shadow-sm ${
                      isOwnMessage
                        ? 'rounded-tr-[0.45rem] rounded-br-[0.45rem] border border-[#4752c4] bg-[#5865f2]'
                        : 'rounded-tl-[0.45rem] rounded-bl-[0.45rem] border border-[#4f545c] bg-[#40444b]'
                    }`}
                  >
                    {msg.isDeleted ? (
                      <p className={`whitespace-pre-wrap break-words text-sm ${isOwnMessage ? 'text-white' : 'text-[#f2f3f5]'}`}>
                        <span className="italic text-[#b5bac1]">[삭제된 메시지]</span>
                      </p>
                    ) : !hideMessageBody ? (
                      <p className={`whitespace-pre-wrap break-words text-sm ${isOwnMessage ? 'text-white' : 'text-[#f2f3f5]'}`}>
                        {msg.isEncrypted ? (
                          <span className="inline-flex items-center gap-1">
                            <svg className="inline h-3 w-3 shrink-0 text-green-300" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                            </svg>
                            <span>{messageBody}</span>
                          </span>
                        ) : (
                          messageBody
                        )}
                      </p>
                    ) : null}
                    {messageAttachments.length > 0 ? (
                      <AttachmentPreview attachments={messageAttachments} />
                    ) : null}
                  </div>
                </div>

                <div className={`mt-1 flex items-center gap-1.5 text-[11px] text-[#b5bac1] ${isOwnMessage ? 'justify-end' : 'pl-1'}`}>
                  <span>{formatTime(msg.createdAt)}</span>
                  {!promotedTarget && isOwnMessage && msgUnreadCount > 0 && (
                    <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[#111827]">
                      {msgUnreadCount}
                    </span>
                  )}
                </div>
              </div>
              {isOwnMessage && (
                <div className="w-8 shrink-0">
                  {showAvatar ? (
                    <div data-testid="dm-own-avatar" data-author-user-id={currentUser?.id ?? ''}>
                      <UserAvatar
                        displayName={currentUser?.displayName ?? author.displayName}
                        avatarUrl={currentUser?.avatarUrl ?? author.avatarUrl ?? null}
                        size="sm"
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[#202225] bg-[#313338] px-4 py-3">
        {promotedTarget ? (
          <div
            className="flex items-center gap-3 rounded-[1.55rem] border border-[#40444b] bg-[#2f3136] px-4 py-3"
            data-testid="dm-promoted-composer"
          >
            <div className="min-w-0 flex-1">
              <span className="mb-1 inline-flex rounded-full border border-[#4f545c] bg-[#2b2d31] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#dbdee1]">
                {t('dm.historyBadge')}
              </span>
              <p className="text-sm font-semibold text-white">{t('dm.promotedComposerTitle')}</p>
              <p className="mt-0.5 text-xs text-[#b5bac1]">
                {t('dm.promotedComposerBody', { channel: promotedTarget.channel.name })}
              </p>
            </div>
            <button
              type="button"
              onClick={openPromotedCommunity}
              data-testid="dm-promoted-composer-open-channel-button"
              className="shrink-0 rounded-md border border-[#4f545c] bg-[#40444b] px-3 py-2 text-xs font-semibold text-[#dbdee1] transition-colors hover:bg-[#4f545c]"
            >
              {t('dm.goToCurrentChannel')}
            </button>
          </div>
        ) : (
          <div
            data-testid="dm-composer-drop-zone"
            className="relative space-y-2"
            onDragEnter={handleAttachmentDragEnter}
            onDragLeave={handleAttachmentDragLeave}
            onDragOver={handleAttachmentDragOver}
            onDrop={handleAttachmentDrop}
          >
            {showEmojiPicker && (
              <div className="rounded-[1.4rem] border border-[#40444b] bg-[#2f3136] px-3 py-2 shadow-sm">
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleInsertEmoji(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#40444b] text-lg transition hover:bg-[#4f545c]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-[#40444b] bg-[#2f3136] px-3 py-3 shadow-sm">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    data-testid="dm-pending-attachment"
                    className="flex min-w-[15rem] items-center gap-3 rounded-2xl border border-[#4f545c] bg-[#40444b] px-3 py-2.5"
                  >
                    {attachment.previewUrl ? (
                      <img
                        data-testid="dm-pending-attachment-image"
                        src={attachment.previewUrl}
                        alt={attachment.file.name}
                        loading="lazy"
                        draggable={false}
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#4f545c] bg-[#2f3136] text-[11px] font-bold tracking-wide text-[#f2f3f5]">
                        {getPendingAttachmentKindLabel(attachment.file)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full bg-[rgba(240,215,76,0.14)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f0d74c]">
                          {getPendingAttachmentKindLabel(attachment.file)}
                        </span>
                        <span className="text-[11px] font-medium text-[#b5bac1]">
                          Ready to send
                        </span>
                      </div>
                      <p className="max-w-[13rem] truncate text-sm font-medium text-[#f2f3f5]">
                        {attachment.file.name}
                      </p>
                      <p className="text-xs text-[#b5bac1]">
                        {formatPendingFileSize(attachment.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(attachment.id)}
                      className="shrink-0 rounded-full p-1 text-[#b5bac1] hover:bg-white/10 hover:text-white"
                      title={t('attachment.remove')}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {isDraggingAttachments ? (
              <div
                data-testid="dm-composer-drop-overlay"
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[1.8rem] border-2 border-dashed border-[#5865f2] bg-[#5865f2]/10"
              >
                <div className="rounded-2xl border border-white/10 bg-[#202225]/80 px-4 py-3 text-center shadow-xl backdrop-blur">
                  <p className="text-sm font-semibold text-white">{t('attachment.dropPrompt')}</p>
                </div>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <input
                ref={attachmentInputRef}
                data-testid="dm-composer-attachment-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentSelect}
              />
              <button
                data-testid="dm-composer-attachment-button"
                type="button"
                onClick={handleAttachmentButtonClick}
                className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center rounded-full border border-[#40444b] bg-[#40444b] text-[#b5bac1] transition-colors hover:bg-[#4f545c] hover:text-white"
                title={t('attachment.add')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739L10.682 20.43a4.5 4.5 0 11-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.548 18.32a1.5 1.5 0 01-2.12-2.122l7.81-7.81" />
                </svg>
              </button>
              <textarea
                ref={composerRef}
                data-testid="dm-composer-input"
                onChange={(e) => {
                  bodyRef.current = e.target.value;
                  setBody(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  isComposingRef.current = false;
                  bodyRef.current = e.currentTarget.value;
                  setBody(e.currentTarget.value);
                }}
                placeholder={t('dm.placeholder')}
                rows={1}
                className="max-h-36 min-h-[3.5rem] flex-1 resize-none rounded-[1.6rem] border border-[#40444b] bg-[#40444b] px-4 py-4 text-sm text-[#f2f3f5] placeholder:text-[#8e9297] focus:border-[#5865f2] focus:outline-none"
              />
              <button
                data-testid="dm-composer-emoji-button"
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center rounded-full border border-[#40444b] bg-[#40444b] text-xl text-[#b5bac1] transition-colors hover:bg-[#4f545c] hover:text-white"
              >
                {showEmojiPicker ? '⌨️' : '😊'}
              </button>
              <button
                data-testid="dm-send-button"
                onClick={handleSend}
                disabled={(!body.trim() && !hasPendingAttachments) || sendMessage.isPending}
                className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center rounded-full border border-[#4752c4] bg-[#5865f2] text-white transition-colors hover:bg-[#4752c4] disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showPromoteDialog && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-[#203040]/45 px-4"
          data-testid="dm-promote-dialog"
        >
          <div
            className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-2xl"
            data-testid="dm-promote-dialog-panel"
          >
            <h3 className="text-lg font-semibold text-[#203040]">{t('dm.promoteTitle')}</h3>
            <p className="mt-2 text-sm text-[#607384]">{t('dm.promoteConfirm')}</p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-[#607384]">
              {t('dm.promoteCommunityName')}
            </label>
            <input
              value={promotionCommunityName}
              onChange={(event) => setPromotionCommunityName(event.target.value)}
              placeholder={t('dm.promoteCommunityPlaceholder')}
              data-testid="dm-promote-community-name-input"
              className="mt-2 w-full rounded-2xl border border-[#d9e3ea] px-4 py-3 text-sm text-[#203040] outline-none transition focus:border-[#5c7996]"
            />

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-[#607384]">
              {t('dm.promoteChannelName')}
            </label>
            <input
              value={promotionChannelName}
              onChange={(event) => setPromotionChannelName(event.target.value)}
              placeholder={t('dm.promoteChannelPlaceholder')}
              data-testid="dm-promote-channel-name-input"
              className="mt-2 w-full rounded-2xl border border-[#d9e3ea] px-4 py-3 text-sm text-[#203040] outline-none transition focus:border-[#5c7996]"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPromoteDialog(false)}
                data-testid="dm-promote-cancel-button"
                className="rounded-full border border-[#d9e3ea] px-4 py-2 text-sm font-medium text-[#4b6278]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handlePromoteToCommunity}
                disabled={
                  promoteConversation.isPending ||
                  !promotionCommunityName.trim() ||
                  !promotionChannelName.trim()
                }
                data-testid="dm-promote-submit-button"
                className="rounded-full border border-[#ebd451] bg-[#fee500] px-4 py-2 text-sm font-semibold text-[#20262d] disabled:opacity-60"
              >
                {promoteConversation.isPending ? t('dm.promoting') : t('dm.promoteSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {promotedConflictTarget && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-[#203040]/45 px-4"
          data-testid="dm-promoted-conflict-dialog"
        >
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#203040]">{t('dm.promotedConflictTitle')}</h3>
            <p className="mt-2 text-sm text-[#607384]">
              {t('dm.promotedConflictBody', {
                community: promotedConflictTarget.community.name,
                channel: promotedConflictTarget.channel.name,
              })}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPromotedConflictTarget(null)}
                data-testid="dm-promoted-conflict-cancel-button"
                className="rounded-full border border-[#d9e3ea] px-4 py-2 text-sm font-medium text-[#4b6278]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = promotedConflictTarget;
                  setPromotedConflictTarget(null);
                  if (target) {
                    navigateToPromotedCommunity(target);
                  }
                }}
                data-testid="dm-promoted-conflict-open-channel-button"
                className="rounded-full border border-[#ebd451] bg-[#fee500] px-4 py-2 text-sm font-semibold text-[#20262d]"
              >
                {t('dm.goToCurrentChannel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorDialogMessage && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#203040]/45 px-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#203040]">
              {errorDialogTitle ?? t('common.error')}
            </h3>
            <p className="mt-2 text-sm text-[#607384]">{errorDialogMessage}</p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setErrorDialogTitle(null);
                  setErrorDialogMessage(null);
                }}
                className="rounded-full border border-[#ebd451] bg-[#fee500] px-4 py-2 text-sm font-semibold text-[#20262d]"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
