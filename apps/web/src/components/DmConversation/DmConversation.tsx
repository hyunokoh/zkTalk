/* eslint-disable @next/next/no-img-element */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { api, ApiError, assertOkResponse } from '@/lib/api';
import {
  fetchAiRuntime,
  getAiRuntimePresentation,
  isAiRuntimeUsable,
  type AIRuntimeSummary,
} from '@/lib/ai-runtime';
import { getActionErrorMessage, getAttachmentSendErrorMessage } from '@/lib/error-copy';
import { useTranslation, t } from '@/lib/i18n';
import { fetchUserSettings } from '@/lib/user-settings';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import {
  isDesktopPickedFile,
  pickDesktopFiles,
  readDesktopFileChunk,
  type ComposerPickedFile,
} from '@/lib/desktop-files';
import { resolveFileMimeType } from '@/lib/file-mime';
import { createFilePreviewUrl, revokeFilePreviewUrl } from '@/lib/file-preview';
import { UserAvatar } from '@/components/UserAvatar';
import { DmSecurityPanel } from '@/components/DmSecurityPanel';
import {
  WebSocketEvent,
  buildSelectedMessageAiContract,
  getTranslationRenderSourceVersion,
  getSelectedMessageAiSuccessKey,
  hasOnlyImageAttachments,
  inferMessageLanguage,
  normalizeTranslationDisplayPreference,
  resolveTranslationDisplayDecision,
  resolveTranslationResponse,
  resolveTranslationRenderCacheState,
  shouldHideAttachmentBody,
  type SelectedMessageAiAction,
  type Attachment,
  type TranslationRenderCacheEntry,
  type TranslationRuntimeStatus,
  type WSOutgoing,
} from '@zktalk/shared';
import { send, subscribe } from '@/hooks/useWebSocket';
import { useE2EE } from '@/hooks/useE2EE';
import { AttachmentPreview } from '@/components/AttachmentPreview/AttachmentPreview';
import { createUploadRequestInit, resolveUploadUrl } from '@/lib/upload-request';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🙏', '🔥', '😊', '👏'];
const RECENT_ATTACHMENT_PROBE_WINDOW_MS = 60_000;
const RAW_UPLOAD_CONTENT_TYPE = 'application/octet-stream';
const REALTIME_FOLLOWUP_REFRESH_MS = 150;
const DM_MESSAGES_FALLBACK_REFETCH_MS = 2_000;

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(resolveUploadUrl(uploadUrl), {
      ...createUploadRequestInit(uploadUrl, {
        method: 'PUT',
        body,
        headers,
      }),
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

function getPendingAttachmentKindLabel(file: Pick<ComposerPickedFile, 'name' | 'type'>): string {
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

function getMultipartUploadEtag(response: Response): string {
  const etag = response.headers.get('etag');
  if (!etag) {
    throw new Error('Multipart upload did not return an ETag');
  }
  return etag;
}

async function uploadAttachmentWithMultipartSupport({
  attachment,
  presign,
  onProgress,
}: {
  attachment: PendingAttachment;
  presign: UploadPresignResponse;
  onProgress: (progress: number) => void;
}): Promise<void> {
  const mimeType = resolveFileMimeType(attachment.file);

  if (presign.uploadMode === 'single') {
    const singlePartBody = isDesktopPickedFile(attachment.file)
      ? new Blob(
        [Uint8Array.from(await readDesktopFileChunk(attachment.file, 0, attachment.file.size))],
        {
          type: mimeType,
        },
      )
      : attachment.file;
    const uploadRes = await uploadWithRateLimitRetry(
      presign.uploadUrl!,
      singlePartBody,
      {
        'Content-Type': mimeType,
      },
    );
    await assertOkResponse(uploadRes, `Attachment upload failed with status ${uploadRes.status}`);
    onProgress(0.75);
    await apiWithRateLimitRetry(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
      method: 'POST',
      body: {
        parts: [{ partNumber: 1, etag: 'single-part' }],
      },
    });
    return;
  }

  const partSize = presign.partSize;
  if (!partSize || presign.partCount < 1) {
    throw new Error('Multipart upload is missing part metadata');
  }

  const { parts } = await apiWithRateLimitRetry<MultipartUploadPartUrlsResponse>(
    `/api/upload/sessions/${presign.uploadSessionId}/parts`,
    {
      method: 'POST',
      body: {
        partNumbers: Array.from({ length: presign.partCount }, (_, index) => index + 1),
      },
    },
  );

  const completedParts: Array<{ partNumber: number; etag: string }> = [];
  for (const part of parts) {
    const start = (part.partNumber - 1) * partSize;
    const end = Math.min(start + partSize, attachment.file.size);
    const partBody = isDesktopPickedFile(attachment.file)
      ? new Blob([Uint8Array.from(await readDesktopFileChunk(attachment.file, start, end))], {
        type: mimeType,
      })
      : attachment.file.slice(start, end, mimeType);
    const uploadRes = await uploadWithRateLimitRetry(
      part.uploadUrl,
      partBody,
      {
        'Content-Type': mimeType,
      },
    );
    await assertOkResponse(uploadRes, `Attachment upload failed with status ${uploadRes.status}`);
    completedParts.push({
      partNumber: part.partNumber,
      etag: getMultipartUploadEtag(uploadRes),
    });
    onProgress(0.15 + (part.partNumber / presign.partCount) * 0.6);
  }

  await apiWithRateLimitRetry(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
    method: 'POST',
    body: { parts: completedParts },
  });
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

interface DmConversationSummary {
  conversation: {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
  };
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

type PendingAttachmentStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

interface PendingAttachment {
  id: string;
  file: ComposerPickedFile;
  previewUrl: string | null;
  uploadSessionId?: string;
  status: PendingAttachmentStatus;
  progress: number;
  errorMessage?: string | null;
}

interface MultipartUploadPartUrl {
  partNumber: number;
  uploadUrl: string;
}

interface MultipartUploadPartUrlsResponse {
  sessionId: string;
  parts: MultipartUploadPartUrl[];
}

interface UploadPresignResponse {
  uploadSessionId: string;
  uploadUrl: string | null;
  uploadMode: 'single' | 'multipart';
  partSize?: number | null;
  partCount: number;
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

interface InlineTranslationState {
  entry: TranslationRenderCacheEntry | null;
  runtimeStatus: TranslationRuntimeStatus;
  issue?: string;
  visible: boolean;
}

async function requestAiChat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
  const result = await api<{ reply: string }>('/api/ai/chat', {
    method: 'POST',
    body: { messages },
  });

  return result.reply;
}

export function DmConversation({ conversationId }: DmConversationProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
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
  const [isAiWorkingMessageId, setIsAiWorkingMessageId] = useState<string | null>(null);
  const [inlineTranslations, setInlineTranslations] = useState<Record<string, InlineTranslationState>>({});

  const loadConversationDetail = useCallback(
    () => api<ConversationDetail>(`/api/dm/conversations/${conversationId}`, { authMode: 'bearer' }),
    [conversationId],
  );

  const { data: convData } = useQuery({
    queryKey: ['dm-conversation', conversationId],
    queryFn: loadConversationDetail,
  });
  const { data: conversationSummaries = [] } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const result = await api<
        DmConversationSummary[] | { conversations: DmConversationSummary[] }
      >('/api/dm/conversations', { authMode: 'bearer' });
      return Array.isArray(result) ? result : result.conversations ?? [];
    },
    enabled: !!currentUser,
  });
  const { data: aiRuntime } = useQuery<AIRuntimeSummary | null>({
    queryKey: ['ai-runtime'],
    queryFn: fetchAiRuntime,
    staleTime: 60_000,
  });
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 60_000,
  });
  const aiRuntimePresentation = useMemo(() => getAiRuntimePresentation(t, aiRuntime), [aiRuntime, t]);
  const aiRuntimeUsable = aiRuntime ? isAiRuntimeUsable(aiRuntime) : true;
  const selectedMessageAiStatusDescription = [aiRuntimePresentation?.description, t('ai.selectedMessageScopeHint')]
    .filter(Boolean)
    .join(' ');
  const normalizedTranslationPreference = useMemo(
    () => normalizeTranslationDisplayPreference(userSettings?.translationDisplay),
    [userSettings?.translationDisplay],
  );

  const conv = convData?.conversation;
  const participants = useMemo(() => convData?.participants ?? [], [convData?.participants]);
  const isGroup = conv?.type === 'group';
  const isDirect = conv?.type === 'direct';
  const promotedTarget = useMemo(
    () => {
      if (convData?.promotedCommunity && convData?.promotedChannel) {
        return {
          community: convData.promotedCommunity,
          channel: convData.promotedChannel,
        };
      }

      const summary = conversationSummaries.find(
        (entry) => entry.conversation.id === conversationId,
      );
      if (summary?.promotedCommunity && summary?.promotedChannel) {
        return {
          community: summary.promotedCommunity,
          channel: summary.promotedChannel,
        };
      }

      return null;
    },
    [convData?.promotedChannel, convData?.promotedCommunity, conversationId, conversationSummaries],
  );
  const hasPromotedConversationState = !!(
    promotedTarget
    || conv?.promotedCommunityId
    || conv?.promotedChannelId
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
  const [securityPanelOpen, setSecurityPanelOpen] = useState(false);

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
        { authMode: 'bearer' },
      );
      return res;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      return lastPage.messages[lastPage.messages.length - 1].message.id;
    },
    initialPageParam: undefined as string | undefined,
    refetchInterval: DM_MESSAGES_FALLBACK_REFETCH_MS,
    refetchOnWindowFocus: true,
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
  const hasFailedAttachments = pendingAttachments.some((attachment) => attachment.status === 'failed');

  useEffect(() => {
    if (normalizedTranslationPreference.mode === 'manual_only' || allMessages.length === 0) {
      return;
    }

    let cancelled = false;

    for (const row of allMessages) {
      const message = row.message;
      const messageAttachments = fallbackAttachmentsByMessageId.get(message.id) ?? row.attachments ?? [];
      const body = shouldHideAttachmentBody(message.bodyMarkdown, messageAttachments)
        ? ''
        : (message.isEncrypted ? decryptedCache[message.id] ?? '' : message.bodyMarkdown);
      if (!body.trim()) {
        continue;
      }

      const sourceVersion = getTranslationRenderSourceVersion(message);
      const translationState = inlineTranslations[message.id];
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
        (decision.state !== 'translation-pending' && decision.state !== 'translation-stale') ||
        !decision.targetLanguage
      ) {
        continue;
      }
      const targetLanguage = decision.targetLanguage;

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
          targetLang: targetLanguage,
        },
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          const resolution = resolveTranslationResponse({
            response: result,
            targetLanguage,
            sourceVersion,
          });
          setInlineTranslations((prev) => ({
            ...prev,
            [message.id]: {
              entry: resolution.entry,
              runtimeStatus: resolution.runtime.status,
              issue: resolution.runtime.issue,
              visible: false,
            },
          }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setInlineTranslations((prev) => ({
            ...prev,
            [message.id]: {
              entry: null,
              runtimeStatus: 'unavailable',
              visible: false,
            },
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [
    allMessages,
    decryptedCache,
    fallbackAttachmentsByMessageId,
    inlineTranslations,
    normalizedTranslationPreference,
  ]);

  // ── Decrypt encrypted messages ──────────────────────────────────
  useEffect(() => {
    if (!e2eeReady) return;
    const encrypted = allMessages.filter(
      (r) =>
        r.message.isEncrypted
        && !r.message.isDeleted
        && (!decryptedCache[r.message.id] || decryptedCache[r.message.id] === '[decryption failed]'),
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
        }, REALTIME_FOLLOWUP_REFRESH_MS);
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
        void queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
        setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
          void queryClient.invalidateQueries({ queryKey: ['dm-message-detail', updated.message.id] });
        }, REALTIME_FOLLOWUP_REFRESH_MS);
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
      const uploadedAttachments: Array<PendingAttachment & { uploadSessionId: string }> = [];

      // Encrypt if E2EE is ready and this is a 1:1 DM
      if (e2eeReady && isDirect) {
        finalBody = await encrypt(bodyMarkdown);
        isEncrypted = true;
        encryptedPayload = finalBody;
      }

      for (const attachment of attachments) {
        let presign: UploadPresignResponse | null = null;
        try {
          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? { ...item, status: 'uploading', progress: 0.1, errorMessage: null }
              : item,
          ));

          presign = await apiWithRateLimitRetry<UploadPresignResponse>(
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

          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? { ...item, status: 'uploading', progress: 0.45, errorMessage: null }
              : item,
          ));

          await uploadAttachmentWithMultipartSupport({
            attachment,
            presign,
            onProgress: (progress) => {
              setPendingAttachments((prev) => prev.map((item) =>
                item.id === attachment.id
                  ? { ...item, status: 'uploading', progress, errorMessage: null }
                  : item,
              ));
            },
          });

          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? { ...item, status: 'uploading', progress: 0.75, errorMessage: null }
              : item,
          ));

          if (!presign) {
            throw new Error('Upload session was not created');
          }
          const uploadSessionId = presign.uploadSessionId;

          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? {
                  ...item,
                  status: 'uploaded',
                  progress: 1,
                  uploadSessionId,
                  errorMessage: null,
                }
              : item,
          ));

          uploadedAttachments.push({
            ...attachment,
            uploadSessionId,
          });
        } catch (error) {
          if (presign) {
            try {
              await apiWithRateLimitRetry(`/api/upload/sessions/${presign.uploadSessionId}/abort`, {
                method: 'POST',
              });
            } catch {
              // Best effort cleanup for partially uploaded sessions.
            }
          }
          const uploadErrorMessage = getAttachmentSendErrorMessage(t, error);
          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? { ...item, status: 'failed', progress: 0, errorMessage: uploadErrorMessage }
              : item,
          ));
          throw error;
        }
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

      for (const attachment of uploadedAttachments) {
        await apiWithRateLimitRetry('/api/upload/attachments', {
          method: 'POST',
          body: {
            dmMessageId: message.message.id,
            uploadSessionId: attachment.uploadSessionId,
            fileName: attachment.file.name,
            mimeType: resolveFileMimeType(attachment.file),
            fileSize: attachment.file.size,
          },
        });
      }

      if (attachments.length > 0) {
        const hydratedMessage = await apiWithRateLimitRetry<MessageRow>(`/api/dm/messages/${message.message.id}`, {
          method: 'GET',
        });
        return {
          message: hydratedMessage,
          attachmentsAttached: true,
          plaintextBody: isEncrypted ? bodyMarkdown : null,
        };
      }

      return {
        message,
        attachmentsAttached: false,
        plaintextBody: isEncrypted ? bodyMarkdown : null,
      };
    },
    onSuccess: ({ message, plaintextBody }) => {
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
      if (plaintextBody) {
        setDecryptedCache((prev) => ({
          ...prev,
          [message.message.id]: plaintextBody,
        }));
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
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

  const appendPendingFiles = useCallback((files: ComposerPickedFile[]) => {
    if (files.length === 0) {
      return;
    }

    const nextAttachments = files.map((file) => ({
      id: generateRequestId(),
      file,
      previewUrl: null,
      status: 'queued' as const,
      progress: 0,
      errorMessage: null,
    }));

    setPendingAttachments((prev) => [
      ...prev,
      ...nextAttachments,
    ]);

    void Promise.all(
      nextAttachments.map(async (attachment) => ({
        id: attachment.id,
        previewUrl: isDesktopPickedFile(attachment.file)
          ? null
          : await createFilePreviewUrl(attachment.file),
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
    if (!(trimmed || hasPendingAttachments) || hasFailedAttachments || sendMessage.isPending || submitLockRef.current) return;
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

  const applyAiResult = useCallback((nextBody: string) => {
    bodyRef.current = nextBody;
    setBody(nextBody);
    if (composerRef.current) {
      composerRef.current.value = nextBody;
      composerRef.current.focus();
    }
  }, []);

  const handleSelectedMessageAiAction = useCallback(async (
    row: MessageRow,
    sourceBody: string,
    action: SelectedMessageAiAction,
  ) => {
    const contract = buildSelectedMessageAiContract({
      action,
      surface: 'dm',
      sourceMessage: {
        authorDisplayName: row.author.displayName,
        bodyText: sourceBody,
      },
      currentDraft: bodyRef.current,
    });

    if (action === 'translate-inline') {
      if (contract.errorKey || !contract.sourceText) {
        showToast({
          tone: 'info',
          message: t(contract.errorKey ?? 'ai.selectedMessageUnavailable'),
        });
        return;
      }

      const existing = inlineTranslations[row.message.id];
      if (existing?.entry?.translatedText) {
        setInlineTranslations((prev) => ({
          ...prev,
          [row.message.id]: {
            ...existing,
            visible: !existing.visible,
          },
        }));
        return;
      }

      setIsAiWorkingMessageId(row.message.id);
      try {
        const targetLanguage =
          normalizedTranslationPreference.targetLanguage
          ?? normalizedTranslationPreference.uiLocale
          ?? locale;
        const response = await api<{
          translatedText: string | null;
          runtime: {
            status: TranslationRuntimeStatus;
            issue?: string;
          };
        }>('/api/translate', {
          method: 'POST',
          body: { text: contract.sourceText, targetLang: targetLanguage },
        });
        const resolution = resolveTranslationResponse({
          response,
          targetLanguage,
          sourceVersion: getTranslationRenderSourceVersion(row.message),
        });
        setInlineTranslations((prev) => ({
          ...prev,
          [row.message.id]: {
            entry: resolution.entry,
            runtimeStatus: resolution.runtime.status,
            issue: resolution.runtime.issue,
            visible: true,
          },
        }));
      } catch (error) {
        setErrorDialogTitle(t('common.error'));
        setErrorDialogMessage(getActionErrorMessage(t, error, {
          genericKey: 'ai.requestError',
        }));
      } finally {
        setIsAiWorkingMessageId(null);
      }
      return;
    }

    if (contract.errorKey || !contract.chatMessages) {
      showToast({
        tone: 'info',
        message: t(contract.errorKey ?? 'ai.selectedMessageUnavailable'),
      });
      return;
    }

    if (aiRuntime && !aiRuntimeUsable) {
      showToast({
        tone: 'info',
        message: aiRuntimePresentation?.description ?? t('ai.runtimeUnavailableHint'),
      });
      return;
    }

    setIsAiWorkingMessageId(row.message.id);
    try {
      const reply = await requestAiChat(contract.chatMessages);
      applyAiResult(reply);
      showToast({
        tone: aiRuntimePresentation?.mock ? 'info' : 'success',
        message: t(getSelectedMessageAiSuccessKey(action === 'rewrite-draft' ? 'rewrite-draft' : 'reply-draft', {
          mock: aiRuntimePresentation?.mock,
        })),
      });
    } catch (error) {
      setErrorDialogTitle(t('common.error'));
      setErrorDialogMessage(getActionErrorMessage(t, error, {
        genericKey: 'ai.requestError',
      }));
    } finally {
      setIsAiWorkingMessageId(null);
    }
  }, [
    aiRuntime,
    aiRuntimePresentation,
    aiRuntimeUsable,
    applyAiResult,
    inlineTranslations,
    locale,
    normalizedTranslationPreference,
    showToast,
    t,
  ]);

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
        setErrorDialogMessage(
          hasPendingAttachments
            ? getAttachmentSendErrorMessage(t, error)
            : getActionErrorMessage(t, error, {
                genericKey: 'dm.sendError',
                rateLimitedKey: 'attachment.rateLimited',
              }),
        );
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
        setErrorDialogTitle(t('dm.promotedComposerTitle'));
        setErrorDialogMessage(t('dm.promotedReadOnlyFallback'));
        return;
      }

      setPromotedConflictTarget(nextTarget);
    },
    [conversationId, hasPendingAttachments, loadConversationDetail, queryClient, t],
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
      const result = await promoteConversation.mutateAsync({
        communityName: trimmedCommunityName,
        channelName: trimmedChannelName,
      });
      setShowPromoteDialog(false);
      router.push(`/communities/${result.community.slug}/channels/${result.channel.id}`);
    } catch (error) {
      setErrorDialogTitle(t('dm.promoteTitle'));
      setErrorDialogMessage(getActionErrorMessage(t, error, {
        genericKey: 'dm.promoteFailed',
      }));
    }
  }, [conversationId, promoteConversation, promotionChannelName, promotionCommunityName, queryClient, router, t]);

  const handleStartCall = useCallback(
    async (mode: 'voice' | 'video') => {
      try {
        const result = await callTargetMutation.mutateAsync();
        router.push(
          `/communities/${result.community.slug}/channels/${result.voiceChannel.id}?joinVoice=${mode}`,
        );
      } catch (error) {
        setErrorDialogTitle(mode === 'video' ? t('voice.videoCall') : t('voice.join'));
        setErrorDialogMessage(getActionErrorMessage(t, error, {
          genericKey: 'voice.joinFailed',
        }));
      }
    },
    [callTargetMutation, router, t],
  );

  return (
    <div
      className="flex h-full flex-1 flex-col bg-bg"
      data-testid="dm-conversation"
      data-conversation-id={conversationId}
      data-promoted={hasPromotedConversationState ? 'true' : 'false'}
      data-conversation-type={conv?.type ?? 'unknown'}
    >
      {/* Header */}
      <div className="border-b border-line bg-bg-subtle px-4 py-3">
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-[color:var(--on-accent)]">
                  {(conv?.name || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                  {t('dm.title')}
                </p>
                <h2 className="mt-1.5 truncate text-lg font-semibold text-fg">
                  {headerName}
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  {t('dm.listSubtitle')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-semibold text-fg">
                    {isGroup ? t('dm.group') : t('dm.oneToOne')}
                  </span>
                  {isGroup && (
                    <span className="inline-flex rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-semibold text-fg">
                      {t('dm.groupMembers', { count: String(participants.length) })}
                    </span>
                  )}
                  {hasPromotedConversationState && (
                    <span className="inline-flex rounded-full border border-line-strong bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg">
                      {t('dm.historyBadge')}
                    </span>
                  )}
                  {!hasPromotedConversationState && isDirect && e2eeLoading && (
                    <span className="text-xs text-fg-muted">{t('e2ee.generating')}</span>
                  )}
                  {!hasPromotedConversationState && isDirect && e2eeReady && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                      </svg>
                      {t('e2ee.badge')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-l border-line pl-3">
              {isDirect && otherUserId ? (
                <button
                  type="button"
                  onClick={() => setSecurityPanelOpen(true)}
                  data-testid="dm-header-security-button"
                  title={t('dmSecurity.title')}
                  className="shrink-0 rounded-md border border-line-strong bg-bg-elevated p-1.5 text-fg transition-colors hover:bg-bg-hover"
                >
                  {/* Lock icon — opens the safety-number panel */}
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 1a4 4 0 00-4 4v3H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 7V5a2 2 0 10-4 0v3h4z" clipRule="evenodd" />
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void handleStartCall('voice');
                }}
                data-testid="dm-header-voice-button"
                disabled={callTargetMutation.isPending}
                className="shrink-0 rounded-md border border-line-strong bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
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
                className="shrink-0 rounded-md border border-line-strong bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {callTargetMutation.isPending ? t('common.loading') : t('voice.videoCall')}
              </button>
              <button
                type="button"
                onClick={promotedTarget ? openPromotedCommunity : openPromoteDialog}
                disabled={promoteConversation.isPending || (hasPromotedConversationState && !promotedTarget)}
                data-testid="dm-promote-button"
                className="shrink-0 rounded-md border border-line-strong bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {promoteConversation.isPending
                  ? t('dm.promoting')
                  : promotedTarget
                    ? t('dm.goToCurrentChannel')
                    : hasPromotedConversationState
                      ? t('dm.promotedComposerTitle')
                    : t('dm.promote')}
              </button>
            </div>
        </div>
      </div>

      {hasPromotedConversationState && (
        <div className="border-b border-line bg-bg-subtle px-4 py-3">
          <div
            className="flex items-center gap-3 rounded-2xl border border-line bg-bg-subtle px-4 py-3"
            data-testid="dm-promoted-banner"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-[color:var(--on-accent)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a5 5 0 0 1 5 5v1h1a3 3 0 0 1 3 3v5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-5a3 3 0 0 1 3-3h1V7a5 5 0 0 1 5-5Zm3 9H9a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3Zm-3-6a2 2 0 0 0-2 2v1h4V7a2 2 0 0 0-2-2Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="mb-1 inline-flex rounded-full border border-line-strong bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg">
                {t('dm.historyBadge')}
              </span>
              <p className="text-sm font-semibold text-fg">
                {promotedTarget
                  ? t('dm.promotedBannerTitle', { community: promotedTarget.community.name })
                  : t('dm.promotedComposerTitle')}
              </p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {promotedTarget
                  ? t('dm.promotedBannerBody', { channel: promotedTarget.channel.name })
                  : t('dm.promotedReadOnlyFallback')}
              </p>
            </div>
            {promotedTarget ? (
              <button
                type="button"
                onClick={openPromotedCommunity}
                data-testid="dm-promoted-banner-open-channel-button"
                className="shrink-0 rounded-md border border-line-strong bg-bg-elevated px-3 py-2 text-xs font-semibold text-fg transition-colors hover:bg-bg-hover"
              >
                {t('dm.goToCurrentChannel')}
              </button>
            ) : null}
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
          <div className="py-2 text-center text-xs text-fg-muted">
            {t('common.loading')}
          </div>
        )}

        {allMessages.length === 0 && !isFetchingNextPage && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-fg-muted">
              {promotedTarget
                ? t('dm.promotedNoHistory', { channel: promotedTarget.channel.name })
                : hasPromotedConversationState
                  ? t('dm.promotedReadOnlyFallback')
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
          const translationState = inlineTranslations[msg.id];
          const translationSourceVersion = getTranslationRenderSourceVersion(msg);
          const translationCacheState = resolveTranslationRenderCacheState({
            entry: translationState?.entry,
            sourceVersion: translationSourceVersion,
            targetLanguage:
              translationState?.visible
                ? translationState.entry?.targetLanguage ?? locale
                : normalizedTranslationPreference.targetLanguage,
          });
          const autoTranslationDecision = resolveTranslationDisplayDecision({
            preference: normalizedTranslationPreference,
            messageLanguage: inferMessageLanguage(messageBody),
            hasTranslatedText:
              translationCacheState === 'ready' || translationCacheState === 'stale',
            translationLanguage: translationState?.entry?.targetLanguage ?? null,
            runtime: translationState?.runtimeStatus ?? 'available',
            stale: translationCacheState === 'stale',
          });
          const visibleManualTranslation =
            translationState?.visible &&
            translationState.entry &&
            (translationCacheState === 'ready' || translationCacheState === 'stale')
              ? translationState.entry.translatedText
              : null;
          const visibleAutoTranslation =
            !translationState?.visible &&
            autoTranslationDecision.render === 'translated' &&
            translationState?.entry &&
            (translationCacheState === 'ready' || translationCacheState === 'stale')
              ? translationState.entry.translatedText
              : null;
          const visibleTranslatedText = visibleManualTranslation ?? visibleAutoTranslation;
          const translationVariant = visibleManualTranslation
            ? 'manual'
            : visibleAutoTranslation
              ? 'automatic'
              : null;
          const translatedLabel = visibleManualTranslation
            ? translationState?.runtimeStatus === 'mock'
              ? t('translate.translatedMock')
              : translationCacheState === 'stale'
                ? t('translate.translatedStale')
                : t('translate.translated')
            : visibleAutoTranslation
              ? autoTranslationDecision.state === 'translation-runtime-mock'
                ? t('translate.autoTranslatedMock')
                : autoTranslationDecision.state === 'translation-stale'
                  ? t('translate.autoTranslatedStale')
                  : t('translate.autoTranslated')
              : null;
          const translationStatusLabel = !visibleTranslatedText
            ? autoTranslationDecision.state === 'translation-runtime-disabled'
              ? t('translate.autoTranslationDisabled')
              : autoTranslationDecision.state === 'translation-unavailable'
                ? t('translate.autoTranslationUnavailable')
                : null
            : null;
          const translationStatusIssue = !visibleTranslatedText ? translationState?.issue ?? null : null;
          const hideMessageBody = !msg.isDeleted && shouldHideAttachmentBody(messageBody, messageAttachments);
          const sideMeta = (
            <div className={`shrink-0 self-end pb-0.5 text-[11px] leading-tight text-fg-muted ${isOwnMessage ? 'text-left' : 'text-right'}`}>
              {msgUnreadCount > 0 ? <div>{Math.min(99, msgUnreadCount)}</div> : null}
              <div>{formatTime(msg.createdAt)}</div>
            </div>
          );

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
                    <span className="text-sm font-medium text-fg">
                      {author.displayName}
                    </span>
                  </div>
                )}
                <div className="flex items-end gap-1">
                  {isOwnMessage ? sideMeta : null}
                  <div className="relative">
                    {endsGroup && (
                      <span
                        className={`absolute bottom-2 h-2.5 w-2.5 rotate-45 ${isOwnMessage ? '-right-1 bg-accent' : '-left-1 border-b border-l border-line bg-bg-elevated'}`}
                      />
                    )}
                    <div
                      className={`relative rounded-[1.2rem] px-3.5 py-2.5 shadow-sm ${
                        isOwnMessage
                          ? 'rounded-tr-[0.45rem] rounded-br-[0.45rem] border border-accent-strong bg-accent'
                          : 'rounded-tl-[0.45rem] rounded-bl-[0.45rem] border border-line-strong bg-bg-elevated'
                      }`}
                    >
                      {msg.isDeleted ? (
                        <p className={`whitespace-pre-wrap break-words text-sm ${isOwnMessage ? 'text-[color:var(--on-accent)]' : 'text-fg'}`}>
                          <span className="italic opacity-70">[삭제된 메시지]</span>
                        </p>
                      ) : !hideMessageBody ? (
                        <p className={`whitespace-pre-wrap break-words text-sm ${isOwnMessage ? 'text-[color:var(--on-accent)]' : 'text-fg'}`}>
                          {msg.isEncrypted ? (
                            <span className="inline-flex items-center gap-1">
                              <svg className="inline h-3 w-3 shrink-0 text-success" viewBox="0 0 24 24" fill="currentColor">
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
                      {!msg.isDeleted ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                          <button
                            type="button"
                            data-testid="dm-message-ai-reply-button"
                            onClick={() => void handleSelectedMessageAiAction(row, messageBody, 'reply-draft')}
                            disabled={isAiWorkingMessageId === msg.id || !aiRuntimeUsable}
                            className="rounded-pill border border-line bg-bg-hover px-2.5 py-1 text-[11px] font-semibold text-[color:var(--on-accent)]/90 transition disabled:cursor-not-allowed disabled:opacity-50"
                            title={aiRuntimePresentation?.description ?? t('ai.replyDraftFromMessage')}
                          >
                            {t('ai.replyDraftFromMessage')}
                          </button>
                          <button
                            type="button"
                            data-testid="dm-message-ai-rewrite-button"
                            onClick={() => void handleSelectedMessageAiAction(row, messageBody, 'rewrite-draft')}
                            disabled={isAiWorkingMessageId === msg.id || !aiRuntimeUsable}
                            className="rounded-pill border border-line bg-bg-hover px-2.5 py-1 text-[11px] font-semibold text-[color:var(--on-accent)]/90 transition disabled:cursor-not-allowed disabled:opacity-50"
                            title={aiRuntimePresentation?.description ?? t('ai.rewriteDraftFromMessage')}
                          >
                            {t('ai.rewriteDraftFromMessage')}
                          </button>
                          <button
                            type="button"
                            data-testid="dm-message-ai-translate-button"
                            onClick={() => void handleSelectedMessageAiAction(row, messageBody, 'translate-inline')}
                            disabled={isAiWorkingMessageId === msg.id || !aiRuntimeUsable}
                            className="rounded-pill border border-line bg-bg-hover px-2.5 py-1 text-[11px] font-semibold text-[color:var(--on-accent)]/90 transition disabled:cursor-not-allowed disabled:opacity-50"
                            title={aiRuntimePresentation?.description ?? t('translate.translate')}
                          >
                            {t('translate.translate')}
                          </button>
                          {aiRuntimePresentation ? (
                            <span className="rounded-pill border border-line bg-bg-subtle px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--on-accent)]/80">
                              {aiRuntimePresentation.label}
                            </span>
                          ) : null}
                          <span className="basis-full text-[11px] leading-4 opacity-80">
                            {selectedMessageAiStatusDescription}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {visibleTranslatedText ? (
                      <div
                        data-translation-variant={translationVariant ?? undefined}
                        className={`mt-2 rounded-2xl border px-3 py-2 text-xs ${
                          translationVariant === 'manual'
                            ? 'border-accent/25 bg-accent-soft text-fg'
                            : 'border-success/25 bg-success/10 text-fg'
                        }`}
                      >
                        {translatedLabel ? (
                          <div
                            className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              translationVariant === 'manual'
                                ? 'text-accent'
                                : 'text-success'
                            }`}
                          >
                            {translatedLabel}
                          </div>
                        ) : null}
                        <div className={translatedLabel ? 'mt-1' : undefined}>{visibleTranslatedText}</div>
                      </div>
                    ) : null}
                    {translationStatusLabel ? (
                      <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
                          {translationStatusLabel}
                        </div>
                        {translationStatusIssue ? <div className="mt-1">{translationStatusIssue}</div> : null}
                      </div>
                    ) : null}
                  </div>
                  {!isOwnMessage ? sideMeta : null}
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
      <div className="border-t border-line bg-bg-subtle px-4 py-3">
        {hasPromotedConversationState ? (
          <div
            className="flex items-center gap-3 rounded-[1.55rem] border border-line bg-bg-subtle px-4 py-3"
            data-testid="dm-promoted-composer"
          >
            <div className="min-w-0 flex-1">
              <span className="mb-1 inline-flex rounded-full border border-line-strong bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg">
                {t('dm.historyBadge')}
              </span>
              <p className="text-sm font-semibold text-fg">{t('dm.promotedComposerTitle')}</p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {promotedTarget
                  ? t('dm.promotedComposerBody', { channel: promotedTarget.channel.name })
                  : t('dm.promotedReadOnlyFallback')}
              </p>
            </div>
            {promotedTarget ? (
              <button
                type="button"
                onClick={openPromotedCommunity}
                data-testid="dm-promoted-composer-open-channel-button"
                className="shrink-0 rounded-md border border-line-strong bg-bg-elevated px-3 py-2 text-xs font-semibold text-fg transition-colors hover:bg-bg-hover"
              >
                {t('dm.goToCurrentChannel')}
              </button>
            ) : null}
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
              <div className="rounded-[1.4rem] border border-line bg-bg-subtle px-3 py-2 shadow-sm">
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleInsertEmoji(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-lg transition hover:bg-bg-hover"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-line bg-bg-subtle px-3 py-3 shadow-sm">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    data-testid="dm-pending-attachment"
                    className="flex min-w-[15rem] items-center gap-3 rounded-2xl border border-line-strong bg-bg-elevated px-3 py-2.5"
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
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-bg-subtle text-[11px] font-bold tracking-wide text-fg">
                        {getPendingAttachmentKindLabel(attachment.file)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-pill bg-warning/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-warning">
                          {getPendingAttachmentKindLabel(attachment.file)}
                        </span>
                        <span className="text-[11px] font-medium text-fg-muted">
                          {attachment.status === 'uploading'
                            ? `Uploading ${Math.round(attachment.progress * 100)}%`
                            : attachment.status === 'uploaded'
                              ? 'Uploaded'
                              : attachment.status === 'failed'
                                ? 'Upload failed'
                                : 'Ready to send'}
                        </span>
                      </div>
                      <p className="max-w-[13rem] truncate text-sm font-medium text-fg">
                        {attachment.file.name}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {formatPendingFileSize(attachment.file.size)}
                        {attachment.errorMessage ? ` · ${attachment.errorMessage}` : ''}
                      </p>
                      {attachment.status === 'uploading' ? (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-bg-hover">
                          <div
                            className="h-full rounded-pill bg-accent transition-[width]"
                            style={{ width: `${Math.max(4, Math.round(attachment.progress * 100))}%` }}
                          />
                        </div>
                      ) : null}
                      {attachment.status === 'failed' ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingAttachments((prev) => prev.map((item) =>
                                item.id === attachment.id
                                  ? { ...item, status: 'queued', progress: 0, errorMessage: null }
                                  : item,
                              ));
                            }}
                            className="rounded-pill border border-warning/40 bg-warning/10 px-3 py-1 text-[11px] font-semibold text-warning hover:bg-warning/20"
                          >
                            Retry
                          </button>
                          <button
                            type="button"
                            onClick={() => removePendingAttachment(attachment.id)}
                            className="rounded-pill border border-line bg-bg-subtle px-3 py-1 text-[11px] font-semibold text-fg-muted hover:bg-bg-hover hover:text-fg"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(attachment.id)}
                      className="shrink-0 rounded-pill p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
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
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[1.8rem] border-2 border-dashed border-accent bg-accent/10"
              >
                <div className="rounded-lg border border-line bg-bg-elevated px-4 py-3 text-center shadow-[var(--shadow-2)]">
                  <p className="text-sm font-semibold text-fg">{t('attachment.dropPrompt')}</p>
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
                className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center rounded-full border border-line bg-bg-elevated text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg"
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
                className="max-h-36 min-h-[3.5rem] flex-1 resize-none rounded-[1.6rem] border border-line bg-bg-elevated px-4 py-4 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
              />
              <button
                data-testid="dm-composer-emoji-button"
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center rounded-full border border-line bg-bg-elevated text-xl text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg"
              >
                {showEmojiPicker ? '⌨️' : '😊'}
              </button>
              <button
                data-testid="dm-send-button"
                onClick={handleSend}
                disabled={(!body.trim() && !hasPendingAttachments) || sendMessage.isPending || hasFailedAttachments}
                className="flex h-[3rem] w-[3rem] shrink-0 items-center justify-center rounded-full border border-accent-strong bg-accent text-[color:var(--on-accent)] transition-colors hover:bg-accent-strong disabled:opacity-50"
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
          className="absolute inset-0 z-40 flex items-center justify-center bg-fg/25 px-4"
          data-testid="dm-promote-dialog"
        >
          <div
            className="w-full max-w-md rounded-lg border border-line bg-bg-elevated p-5 shadow-[var(--shadow-3)]"
            data-testid="dm-promote-dialog-panel"
          >
            <h3 className="text-lg font-semibold text-fg">{t('dm.promoteTitle')}</h3>
            <p className="mt-2 text-sm text-fg-muted">{t('dm.promoteConfirm')}</p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-fg-muted">
              {t('dm.promoteCommunityName')}
            </label>
            <input
              value={promotionCommunityName}
              onChange={(event) => setPromotionCommunityName(event.target.value)}
              placeholder={t('dm.promoteCommunityPlaceholder')}
              data-testid="dm-promote-community-name-input"
              className="mt-2 w-full rounded-md border border-line bg-bg-subtle px-4 py-3 text-sm text-fg outline-none transition focus:border-accent"
            />

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-fg-muted">
              {t('dm.promoteChannelName')}
            </label>
            <input
              value={promotionChannelName}
              onChange={(event) => setPromotionChannelName(event.target.value)}
              placeholder={t('dm.promoteChannelPlaceholder')}
              data-testid="dm-promote-channel-name-input"
              className="mt-2 w-full rounded-md border border-line bg-bg-subtle px-4 py-3 text-sm text-fg outline-none transition focus:border-accent"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPromoteDialog(false)}
                data-testid="dm-promote-cancel-button"
                className="rounded-pill border border-line bg-bg-subtle px-4 py-2 text-sm font-medium text-fg-muted hover:bg-bg-hover hover:text-fg"
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
                className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-60"
              >
                {promoteConversation.isPending ? t('dm.promoting') : t('dm.promoteSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {promotedConflictTarget && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-fg/25 px-4"
          data-testid="dm-promoted-conflict-dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-line bg-bg-elevated p-5 shadow-[var(--shadow-3)]">
            <h3 className="text-lg font-semibold text-fg">{t('dm.promotedConflictTitle')}</h3>
            <p className="mt-2 text-sm text-fg-muted">
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
                className="rounded-pill border border-line bg-bg-subtle px-4 py-2 text-sm font-medium text-fg-muted hover:bg-bg-hover hover:text-fg"
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
                className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong"
              >
                {t('dm.goToCurrentChannel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorDialogMessage && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-fg/25 px-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-bg-elevated p-5 shadow-[var(--shadow-3)]">
            <h3 className="text-lg font-semibold text-fg">
              {errorDialogTitle ?? t('common.error')}
            </h3>
            <p className="mt-2 text-sm text-fg-muted">{errorDialogMessage}</p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setErrorDialogTitle(null);
                  setErrorDialogMessage(null);
                }}
                className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDirect && otherUserId ? (
        <DmSecurityPanel
          open={securityPanelOpen}
          onClose={() => setSecurityPanelOpen(false)}
          otherUserId={otherUserId}
          otherDisplayName={
            participants.find((p) => p.userId !== currentUser?.id)?.user.displayName
              ?? headerName
              ?? otherUserId
          }
        />
      ) : null}
    </div>
  );
}
