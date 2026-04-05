/* eslint-disable @next/next/no-img-element */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { getSessionToken } from '@/lib/session-token';
import { PollCreator } from '@/components/PollCreator';
import { pickDesktopFiles } from '@/lib/desktop-files';
import { resolveFileMimeType } from '@/lib/file-mime';
import { createFilePreviewUrl, revokeFilePreviewUrl } from '@/lib/file-preview';
import { enqueueMessage } from '@/lib/offline-queue';
import { ensureOfflineQueueAutoRetry, flushOfflineQueueForChannel, refreshOfflineChannelCounts } from '@/lib/offline-message-sync';
import { useToastStore } from '@/stores/toast';
import {
  hasOnlyImageAttachments,
  type Attachment,
  type Message,
  type User,
} from '@zktalk/shared';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🙏', '🔥', '😊', '👏'];
const RAW_UPLOAD_CONTENT_TYPE = 'application/octet-stream';
const MAX_MESSAGE_LENGTH = 32000;
const LONG_MESSAGE_SOFT_WARNING = 8000;

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function resolveUploadUrl(uploadUrl: string): string {
  return uploadUrl.startsWith('http')
    ? uploadUrl
    : `${getApiBaseUrl()}${uploadUrl}`;
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
  const isAbsoluteStorageUrl = /^https?:\/\//i.test(uploadUrl);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(resolveUploadUrl(uploadUrl), {
      method: 'PUT',
      body,
      headers,
      credentials: isAbsoluteStorageUrl ? 'omit' : 'include',
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

function hasDraggedFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  return dataTransfer.files.length > 0 || Array.from(dataTransfer.types ?? []).includes('Files');
}

interface MemberInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ReplyTarget {
  message: { id: string; bodyMarkdown: string; authorUserId: string };
  author?: { displayName: string } | null;
}

interface TopicInfo {
  topic: string | null;
  latestMessageAt: string;
  messageCount: number;
}

type PendingAttachmentStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string | null;
  uploadSessionId?: string;
  storageKey?: string;
  status: PendingAttachmentStatus;
  progress: number;
  errorMessage?: string | null;
}

interface MessageRow {
  message: Message;
  author: User;
  attachments?: Attachment[];
}

interface MessagesPage {
  messages: MessageRow[];
  hasMore: boolean;
  unreadCounts?: Record<string, number>;
}

interface MessageComposerProps {
  channelId: string;
  threadId?: string | null;
  placeholder?: string;
  disabled?: boolean;
  communityId?: string;
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  /** Channel E2EE encrypt function (if E2EE is enabled) */
  e2eeEncrypt?: (plaintext: string) => Promise<string>;
  /** Whether channel E2EE is enabled */
  isE2eeEnabled?: boolean;
  /** Whether the channel requires a topic for every message */
  requireTopic?: boolean;
  /** Currently selected topic filter (Zulip-style) */
  currentTopic?: string;
}

export function MessageComposer({
  channelId,
  threadId,
  placeholder = 'Type a message...',
  disabled = false,
  communityId,
  replyTo,
  onCancelReply,
  e2eeEncrypt,
  isE2eeEnabled = false,
  requireTopic = false,
  currentTopic,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  const [body, setBody] = useState('');
  const bodyRef = useRef('');
  const [topic, setTopic] = useState(currentTopic ?? '');
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const secondaryActionsMenuRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSecondaryActionsMenu, setShowSecondaryActionsMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState<string | null>(null);
  const [errorDialogMessage, setErrorDialogMessage] = useState<string | null>(null);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachmentDragDepthRef = useRef(0);

  // Schedule state
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isComposingRef = useRef(false);
  const submitLockRef = useRef(false);

  // Typing indicator: send typing_start/typing_stop via WS
  const { startTyping, stopTyping } = useTypingIndicator(channelId);

  const basePath = threadId
    ? `/api/channels/${channelId}/threads/${threadId}/messages`
    : `/api/channels/${channelId}/messages`;
  const canScheduleMessage = !threadId && !replyTo && !requireTopic;
  const canCreatePoll = !threadId && !replyTo;
  const canRecordAudio = !disabled && (!requireTopic || !!topic.trim());
  const hasPendingAttachments = pendingAttachments.length > 0;
  const composerTestIdPrefix = threadId ? 'thread-composer' : 'channel-composer';

  const buildMessagePayload = useCallback(
    (bodyMarkdown: string) => ({
      bodyMarkdown,
      ...(replyTo ? { parentMessageId: replyTo.message.id } : {}),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
    }),
    [replyTo, topic],
  );

  const runAiAction = useCallback(async (instruction: string) => {
    const source = body.trim();
    if (!source) {
      showToast({
        tone: 'info',
        message: '먼저 메시지 내용을 입력하세요.',
      });
      return;
    }

    setIsAiWorking(true);
    try {
      const res = await api<{ reply: string }>('/api/ai/chat', {
        method: 'POST',
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a writing assistant inside zkTalk. Follow the user instruction exactly. Return only the requested output text with no extra framing.',
            },
            {
              role: 'user',
              content: `${instruction}\n\nText:\n${source}`,
            },
          ],
        },
      });
      setBody(res.reply);
      bodyRef.current = res.reply;
      if (textareaRef.current) {
        textareaRef.current.value = res.reply;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
      setShowSecondaryActionsMenu(false);
      showToast({ tone: 'success', message: 'AI 결과를 입력창에 적용했습니다.' });
    } catch (error) {
      showToast({
        tone: 'error',
        message: error instanceof Error ? error.message : 'AI 요청에 실패했습니다.',
      });
    } finally {
      setIsAiWorking(false);
    }
  }, [body, showToast]);

  const handleAiReplySuggestion = useCallback(() => {
    void runAiAction('Write a concise helpful reply suggestion in the same language as the text.');
  }, [runAiAction]);

  const handleAiTranslate = useCallback(() => {
    void runAiAction('Translate this text into natural English. Preserve meaning and tone.');
  }, [runAiAction]);

  const handleAiRewrite = useCallback(() => {
    void runAiAction('Rewrite this text to be clearer and more polished in the same language. Keep it concise.');
  }, [runAiAction]);

  // Fetch community members for @mention autocomplete
  const { data: membersData } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async () => {
      const res = await api<{ members: MemberInfo[] }>(
        `/api/communities/${communityId}/members`,
      );
      return res.members ?? (res as unknown as MemberInfo[]);
    },
    enabled: !!communityId,
    staleTime: 60_000,
  });

  // Fetch existing topics for autocomplete
  const { data: topicsData } = useQuery({
    queryKey: ['channel-topics', channelId],
    queryFn: async () => {
      const res = await api<{ topics: TopicInfo[] }>(
        `/api/channels/${channelId}/topics`,
      );
      return res.topics ?? [];
    },
    enabled: requireTopic,
    staleTime: 30_000,
  });

  const filteredTopics = useMemo(() => {
    if (!showTopicSuggestions || !topicsData) return [];
    const query = topic.toLowerCase();
    return topicsData
      .filter((t) => t.topic && t.topic.toLowerCase().includes(query))
      .slice(0, 6);
  }, [showTopicSuggestions, topicsData, topic]);

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();

    // Special @everyone and @here entries
    const specialEntries: MemberInfo[] = [
      { userId: '__everyone__', displayName: 'everyone', avatarUrl: null },
      { userId: '__here__', displayName: 'here', avatarUrl: null },
    ].filter((s) => s.displayName.includes(query));

    const memberResults = (membersData ?? [])
      .filter((m: MemberInfo) => m.displayName.toLowerCase().includes(query))
      .slice(0, 6);

    return [...specialEntries, ...memberResults].slice(0, 8);
  }, [mentionQuery, membersData]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [filteredMembers.length]);

  const insertMention = useCallback(
    (displayName: string) => {
      const el = textareaRef.current;
      if (!el) return;

      const cursorPos = el.selectionStart;
      const textBeforeCursor = body.slice(0, cursorPos);
      const textAfterCursor = body.slice(cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
        const newBody = `${beforeMention}@${displayName} ${textAfterCursor}`;
        setBody(newBody);
        setMentionQuery(null);

        requestAnimationFrame(() => {
          const newPos = (beforeMention + `@${displayName} `).length;
          el.setSelectionRange(newPos, newPos);
          el.focus();
        });
      }
    },
    [body],
  );

  const insertEmoji = useCallback((emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => `${prev}${emoji}`);
      return;
    }

    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const nextValue = `${body.slice(0, start)}${emoji}${body.slice(end)}`;
    setBody(nextValue);
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      const nextPos = start + emoji.length;
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  }, [body]);

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

      // Encrypt if channel E2EE is enabled
      if (isE2eeEnabled && e2eeEncrypt) {
        finalBody = await e2eeEncrypt(bodyMarkdown);
        isEncrypted = true;
      }

      const uploadedAttachments: Array<PendingAttachment & { uploadSessionId: string; storageKey: string }> = [];
      for (const attachment of attachments) {
        setPendingAttachments((prev) => prev.map((item) =>
          item.id === attachment.id
            ? { ...item, status: 'uploading', progress: 0.1, errorMessage: null }
            : item,
        ));

        const presign = await apiWithRateLimitRetry<{
          uploadSessionId: string;
          uploadUrl: string;
          storageKey: string;
          uploadMode: 'single' | 'multipart';
          partSize: number | null;
          partCount: number;
        }>(
          '/api/upload/presign',
          {
            method: 'POST',
            body: {
              channelId,
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
          setPendingAttachments((prev) => prev.map((item) =>
            item.id === attachment.id
              ? { ...item, status: 'failed', progress: 0, errorMessage: `Upload failed with status ${uploadRes.status}` }
              : item,
          ));
          throw new Error(`Attachment upload failed with status ${uploadRes.status}`);
        }

        setPendingAttachments((prev) => prev.map((item) =>
          item.id === attachment.id
            ? { ...item, status: 'uploading', progress: 0.75, errorMessage: null }
            : item,
        ));

        if (presign.uploadMode === 'multipart') {
          await apiWithRateLimitRetry(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
            method: 'POST',
            body: {
              parts: Array.from({ length: presign.partCount }, (_, index) => ({
                partNumber: index + 1,
                etag: `etag-${index + 1}`,
              })),
            },
          });
        } else {
          await apiWithRateLimitRetry(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
            method: 'POST',
            body: {
              parts: [{ partNumber: 1, etag: 'single-part' }],
            },
          });
        }

        setPendingAttachments((prev) => prev.map((item) =>
          item.id === attachment.id
            ? {
                ...item,
                status: 'uploaded',
                progress: 1,
                uploadSessionId: presign.uploadSessionId,
                storageKey: presign.storageKey,
                errorMessage: null,
              }
            : item,
        ));

        uploadedAttachments.push({
          ...attachment,
          uploadSessionId: presign.uploadSessionId,
          storageKey: presign.storageKey,
        });
      }

      const message = await apiWithRateLimitRetry<MessageRow>(basePath, {
        method: 'POST',
        body: {
          ...buildMessagePayload(finalBody),
          isEncrypted,
          uploadSessionIds: uploadedAttachments.map((attachment) => attachment.uploadSessionId),
        },
        headers: {
          'X-Request-Id': generateRequestId(),
        },
      });

      for (const attachment of uploadedAttachments) {
        await apiWithRateLimitRetry('/api/upload/attachments', {
          method: 'POST',
          body: {
            messageId: message.message.id,
            uploadSessionId: attachment.uploadSessionId,
            fileName: attachment.file.name,
            mimeType: resolveFileMimeType(attachment.file),
            fileSize: attachment.file.size,
          },
        });
      }

      if (attachments.length > 0) {
        const hydratedMessage = await apiWithRateLimitRetry<MessageRow>(`/api/messages/${message.message.id}`, {
          method: 'GET',
        });
        return { message: hydratedMessage, attachmentsAttached: true };
      }

      return { message, attachmentsAttached: false };
    },
    onSuccess: ({ message }) => {
      void flushOfflineQueueForChannel(channelId);
      queryClient.setQueriesData<{ pages?: MessagesPage[] }>(
        { queryKey: ['messages', channelId] },
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
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      pendingAttachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          revokeFilePreviewUrl(attachment.previewUrl);
        }
      });
      setPendingAttachments([]);
      bodyRef.current = '';
      setBody('');
      stopTyping();
      onCancelReply?.();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.value = '';
        textareaRef.current.style.height = 'auto';
      }
    },
    onSettled: () => {
      submitLockRef.current = false;
    },
    onError: (error) => {
      setErrorDialogTitle(t('common.error'));
      if (error instanceof ApiError && error.status === 429) {
        setErrorDialogMessage(t('attachment.rateLimited'));
        return;
      }
      setErrorDialogMessage(
        error instanceof Error ? error.message : t('attachment.sendError'),
      );
    },
  });

  // Schedule message mutation
  const scheduleMutation = useMutation({
    mutationFn: async ({ bodyMarkdown, scheduledAt }: { bodyMarkdown: string; scheduledAt: string }) => {
      return api(`/api/channels/${channelId}/messages/schedule`, {
        method: 'POST',
        body: { bodyMarkdown, scheduledAt },
      });
    },
    onSuccess: () => {
      setBody('');
      setShowSchedule(false);
      setScheduleDate('');
    },
  });

  // Audio recording
  const startRecording = useCallback(async () => {
    if (!canRecordAudio) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const presign = await apiWithRateLimitRetry<{
            uploadSessionId: string;
            uploadUrl: string;
            storageKey: string;
          }>(
            '/api/upload/presign',
            {
              method: 'POST',
              body: {
                channelId,
                fileName: 'audio-clip.webm',
                mimeType: 'audio/webm',
                fileSize: blob.size,
              },
            },
          );

          const sessionToken = getSessionToken();
          const uploadRes = await uploadWithRateLimitRetry(
            presign.uploadUrl,
            blob,
            {
              'Content-Type': 'audio/webm',
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
            },
          );

          if (!uploadRes.ok) {
            throw new Error(`Audio upload failed with status ${uploadRes.status}`);
          }

          await apiWithRateLimitRetry(`/api/upload/sessions/${presign.uploadSessionId}/complete`, {
            method: 'POST',
            body: {
              parts: [{ partNumber: 1, etag: 'single-part' }],
            },
          });

          const message = await apiWithRateLimitRetry<{ id: string }>(basePath, {
            method: 'POST',
            body: {
              ...buildMessagePayload('Audio clip'),
              uploadSessionIds: [presign.uploadSessionId],
            },
            headers: { 'X-Request-Id': generateRequestId() },
          });

          await apiWithRateLimitRetry('/api/upload/attachments', {
            method: 'POST',
            body: {
              messageId: message.id,
              uploadSessionId: presign.uploadSessionId,
              fileName: 'audio-clip.webm',
              mimeType: 'audio/webm',
              fileSize: blob.size,
            },
          });

          queryClient.invalidateQueries({ queryKey: ['messages', channelId, threadId ?? 'main'] });
        } catch (err) {
          console.error('Audio upload failed:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [basePath, buildMessagePayload, canRecordAudio, channelId, queryClient, threadId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const appendPendingFiles = useCallback((files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const nextAttachments: PendingAttachment[] = files.map((file) => ({
      id: generateRequestId(),
      file,
      previewUrl: null,
      status: 'queued',
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
    if (disabled) {
      return;
    }

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
  }, [appendPendingFiles, disabled]);

  const removePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((attachment) => attachment.id === attachmentId);
      if (target?.previewUrl) {
        revokeFilePreviewUrl(target.previewUrl);
      }
      return prev.filter((attachment) => attachment.id !== attachmentId);
    });
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [body]);

  useEffect(() => {
    return () => {
      pendingAttachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          revokeFilePreviewUrl(attachment.previewUrl);
        }
      });
    };
  }, [pendingAttachments]);

  useEffect(() => {
    if (!showSecondaryActionsMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!secondaryActionsMenuRef.current?.contains(event.target as Node)) {
        setShowSecondaryActionsMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSecondaryActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSecondaryActionsMenu]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      bodyRef.current = value;
      setBody(value);

      // Emit typing indicator on each keystroke (debounced internally)
      if (value.trim().length > 0) {
        startTyping();
      }

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch && communityId) {
        setMentionQuery(mentionMatch[1]);
      } else {
        setMentionQuery(null);
      }
    },
    [communityId, startTyping],
  );

  const submitCurrentMessage = useCallback(() => {
    const trimmed = bodyRef.current.trim();
    if (!(trimmed || hasPendingAttachments)) return;
    if (sendMessage.isPending || submitLockRef.current) return;

    const bodyMarkdown = trimmed || getAttachmentFallbackBody(pendingAttachments);

    if (typeof navigator !== 'undefined' && navigator.onLine === false && !hasPendingAttachments) {
      const queuedMessageId = generateRequestId();
      void enqueueMessage({
        id: queuedMessageId,
        channelId,
        threadId: threadId ?? null,
        bodyMarkdown,
        parentMessageId: replyTo?.message.id,
        topic: topic.trim() || null,
        createdAt: Date.now(),
      }).then(async () => {
        await refreshOfflineChannelCounts(channelId);
        showToast({ tone: 'info', message: t('offline.queued') });
        bodyRef.current = '';
        setBody('');
        stopTyping();
        onCancelReply?.();
        if (textareaRef.current) {
          textareaRef.current.value = '';
          textareaRef.current.style.height = 'auto';
        }
      });
      return;
    }

    ensureOfflineQueueAutoRetry();
    submitLockRef.current = true;
    sendMessage.mutate({
      bodyMarkdown,
      attachments: pendingAttachments,
    });
  }, [channelId, hasPendingAttachments, onCancelReply, pendingAttachments, replyTo?.message.id, sendMessage, showToast, stopTyping, t, threadId, topic]);

  const handleToggleSecondaryActionsMenu = useCallback(() => {
    setShowSecondaryActionsMenu((prev) => !prev);
  }, []);

  const handleOpenAttachmentPicker = useCallback(() => {
    setShowSecondaryActionsMenu(false);
    handleAttachmentButtonClick();
  }, [handleAttachmentButtonClick]);

  const handleAttachmentDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current += 1;
    if (attachmentDragDepthRef.current === 1) {
      setIsDraggingAttachments(true);
    }
  }, [disabled]);

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
    if (disabled || !hasDraggedFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  const handleAttachmentDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasDraggedFiles(event.dataTransfer)) {
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
  }, [appendPendingFiles, disabled]);

  const handleTogglePollCreator = useCallback(() => {
    setShowSecondaryActionsMenu(false);
    setShowPollCreator((prev) => !prev);
  }, []);

  const handleToggleSchedulePicker = useCallback(() => {
    setShowSecondaryActionsMenu(false);
    setShowSchedule((prev) => !prev);
  }, []);

  const handleToggleRecording = useCallback(() => {
    setShowSecondaryActionsMenu(false);
    if (isRecording) {
      stopRecording();
      return;
    }
    void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle mention dropdown navigation
      if (mentionQuery !== null && filteredMembers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMentionIndex((prev) =>
            prev < filteredMembers.length - 1 ? prev + 1 : 0,
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMentionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredMembers.length - 1,
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          insertMention(filteredMembers[selectedMentionIndex].displayName);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionQuery(null);
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        if (isComposingRef.current) {
          return;
        }
        e.preventDefault();
        submitCurrentMessage();
      }
    },
    [
      mentionQuery,
      filteredMembers,
      selectedMentionIndex,
      insertMention,
      submitCurrentMessage,
    ],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submitCurrentMessage();
    },
    [submitCurrentMessage],
  );

  const handleSchedule = useCallback(() => {
    const trimmed = bodyRef.current.trim();
    if (trimmed && scheduleDate) {
      scheduleMutation.mutate({
        bodyMarkdown: trimmed,
        scheduledAt: new Date(scheduleDate).toISOString(),
      });
    }
  }, [scheduleDate, scheduleMutation]);

  return (
    <div
      data-testid={`${composerTestIdPrefix}-drop-zone`}
      className="relative border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(8,17,29,0.94)_55%)] px-5 pb-6 pt-4 md:px-8"
      onDragEnter={handleAttachmentDragEnter}
      onDragLeave={handleAttachmentDragLeave}
      onDragOver={handleAttachmentDragOver}
      onDrop={handleAttachmentDrop}
    >
      <div className="mx-auto w-full max-w-5xl">
      {/* Reply preview bar */}
      {replyTo && (
        <div className="mb-3 flex items-center gap-2 rounded-[1.4rem] border border-sky-300/18 bg-sky-300/10 px-4 py-3 text-xs shadow-[0_18px_40px_rgba(2,8,23,0.18)]">
          <div className="min-w-0 flex-1">
            <span className="font-medium text-sky-200">
              {t('message.quoteReply', { name: replyTo.author?.displayName ?? t('misc.unknownUser') })}
            </span>
            <p className="truncate text-white/58">
              {replyTo.message.bodyMarkdown.slice(0, 120)}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 rounded-full p-1 text-white/44 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Context indicator */}
      {threadId && (
        <div className="mb-3 inline-flex w-fit items-center rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/52">
          {t('thread.replyingInThread')}
        </div>
      )}

      {/* E2EE indicator */}
      {isE2eeEnabled && (
        <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          {t('e2ee.badge')}
        </div>
      )}

      {/* Schedule picker */}
      {showSchedule && canScheduleMessage && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-xs shadow-[0_18px_40px_rgba(2,8,23,0.18)]">
          <span className="font-semibold text-white/46">{t('schedule.title')}:</span>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0f1a2b] px-3 py-2 text-xs text-[#dcddde]"
          />
          <button
            onClick={handleSchedule}
            disabled={!scheduleDate || !body.trim() || scheduleMutation.isPending}
            className="rounded-full bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {t('schedule.schedule')}
          </button>
          <button
            onClick={() => setShowSchedule(false)}
            className="rounded-full px-3 py-1.5 text-white/44 hover:bg-white/10 hover:text-white"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Topic input (Zulip-style) */}
      {requireTopic && (
        <div className="relative mb-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-white/46">{t('topic.title')}:</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setShowTopicSuggestions(true);
              }}
              onFocus={() => setShowTopicSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTopicSuggestions(false), 150)}
              placeholder={t('topic.placeholder')}
              className="flex-1 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-xs text-[#dcddde] placeholder:text-white/28 focus:border-sky-300/40 focus:outline-none"
            />
            {requireTopic && !topic.trim() && (
              <span className="text-[10px] text-amber-300">{t('topic.required')}</span>
            )}
          </div>
          {/* Topic autocomplete suggestions */}
          {showTopicSuggestions && filteredTopics.length > 0 && (
            <div className="absolute left-0 top-full z-10 mt-2 w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0f1a2b]/96 shadow-[0_24px_50px_rgba(2,8,23,0.44)] backdrop-blur-xl">
              {filteredTopics.map((topicItem) => (
                <button
                  key={topicItem.topic}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-[#dcddde] hover:bg-white/10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setTopic(topicItem.topic ?? '');
                    setShowTopicSuggestions(false);
                  }}
                >
                  <span>{topicItem.topic}</span>
                  <span className="text-[#72767d]">{topicItem.messageCount} msgs</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showEmojiPicker && (
        <div className="mb-3 rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-4 py-4 shadow-[0_18px_40px_rgba(2,8,23,0.18)]">
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-lg transition hover:bg-white/[0.08]"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPollCreator ? (
        <PollCreator
          channelId={channelId}
          onClose={() => setShowPollCreator(false)}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
            void queryClient.invalidateQueries({ queryKey: ['channel-polls-by-message', channelId] });
          }}
        />
      ) : null}

      {body.length >= LONG_MESSAGE_SOFT_WARNING ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-[1.4rem] border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-xs shadow-[0_18px_40px_rgba(2,8,23,0.18)]">
          <span className="font-medium text-amber-100">
            Long-form mode · {body.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} chars
          </span>
          <span className="text-amber-200/80">
            The channel feed will collapse long messages by default.
          </span>
        </div>
      ) : null}

      {pendingAttachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-[1.8rem] border border-white/8 bg-white/[0.04] px-4 py-4 shadow-[0_18px_40px_rgba(2,8,23,0.18)]">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.id}
              data-testid={`${composerTestIdPrefix}-pending-attachment`}
              className="flex min-w-[15rem] items-center gap-3 rounded-[1.25rem] border border-white/10 bg-[#111d2d] px-3 py-3"
            >
              {attachment.previewUrl ? (
                <img
                  data-testid={`${composerTestIdPrefix}-pending-attachment-image`}
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  loading="lazy"
                  draggable={false}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#09111d] text-[11px] font-bold tracking-wide text-[#f2f3f5]">
                  {getPendingAttachmentKindLabel(attachment.file)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-[rgba(240,215,76,0.14)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f0d74c]">
                    {getPendingAttachmentKindLabel(attachment.file)}
                  </span>
                  <span className="text-[11px] font-medium text-white/52">
                    {attachment.status === 'uploading'
                      ? `Uploading ${Math.round(attachment.progress * 100)}%`
                      : attachment.status === 'uploaded'
                        ? 'Uploaded'
                        : attachment.status === 'failed'
                          ? 'Upload failed'
                          : 'Ready to send'}
                  </span>
                </div>
                <p className="max-w-[13rem] truncate text-sm font-medium text-[#f2f3f5]">
                  {attachment.file.name}
                </p>
                <p className="text-xs text-[#b5bac1]">
                  {formatPendingFileSize(attachment.file.size)}
                  {attachment.errorMessage ? ` · ${attachment.errorMessage}` : ''}
                </p>
                {attachment.status === 'uploading' ? (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sky-300 transition-[width]"
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
                      className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-300/20"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(attachment.id)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/72 hover:bg-white/[0.08]"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
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
          data-testid={`${composerTestIdPrefix}-drop-overlay`}
          className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-[2rem] border-2 border-dashed border-sky-300/55 bg-sky-300/10"
        >
          <div className="rounded-[1.4rem] border border-white/10 bg-[#08111d]/88 px-5 py-4 text-center shadow-xl backdrop-blur-xl">
            <p className="text-sm font-semibold text-white">{t('attachment.dropPrompt')}</p>
          </div>
        </div>
      ) : null}

      <form data-testid={`${composerTestIdPrefix}-form`} onSubmit={handleSubmit} className="flex items-end gap-2 rounded-[2rem] border border-white/8 bg-[#0d1827]/92 p-3 shadow-[0_24px_60px_rgba(2,8,23,0.34)] backdrop-blur-xl">
        <input
          ref={attachmentInputRef}
          data-testid={`${composerTestIdPrefix}-attachment-input`}
          type="file"
          multiple
          className="hidden"
          onChange={handleAttachmentSelect}
        />

        <div className="relative shrink-0" ref={secondaryActionsMenuRef}>
          <button
            data-testid={`${composerTestIdPrefix}-more-button`}
            type="button"
            onClick={handleToggleSecondaryActionsMenu}
            disabled={disabled}
            aria-expanded={showSecondaryActionsMenu}
            aria-haspopup="menu"
            className={`flex h-11 w-11 items-center justify-center rounded-[1rem] border ${
              showSecondaryActionsMenu || showSchedule || showPollCreator || isRecording
                ? 'border-sky-300/30 bg-sky-300/14 text-white'
                : 'border-white/10 bg-white/[0.04] text-white/44 hover:bg-white/[0.08] hover:text-white'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title={t('composer.moreActions')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {showSecondaryActionsMenu ? (
            <div
              data-testid={`${composerTestIdPrefix}-more-menu`}
              role="menu"
              className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0d1827]/96 p-2 shadow-[0_28px_60px_rgba(2,8,23,0.46)] backdrop-blur-xl"
            >
              <button
                data-testid={`${composerTestIdPrefix}-attachment-button`}
                type="button"
                onClick={handleOpenAttachmentPicker}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#dcddde] transition hover:bg-white/10"
              >
                <svg className="h-4 w-4 shrink-0 text-[#b5bac1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739L10.682 20.43a4.5 4.5 0 11-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.548 18.32a1.5 1.5 0 01-2.12-2.122l7.81-7.81" />
                </svg>
                <span>{t('attachment.add')}</span>
              </button>

              {canCreatePoll ? (
                <button
                  data-testid={`${composerTestIdPrefix}-poll-button`}
                  type="button"
                  onClick={handleTogglePollCreator}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#dcddde] transition hover:bg-white/10"
                >
                  <svg className="h-4 w-4 shrink-0 text-[#b5bac1]" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 4.75A1.75 1.75 0 014.75 3h10.5A1.75 1.75 0 0117 4.75v1.5A1.75 1.75 0 0115.25 8H4.75A1.75 1.75 0 013 6.25v-1.5zm0 4.5A1.75 1.75 0 014.75 7.5h6.5A1.75 1.75 0 0113 9.25v6A1.75 1.75 0 0111.25 17h-6.5A1.75 1.75 0 013 15.25v-6zm11 0a1 1 0 112 0v6a1 1 0 11-2 0v-6zm2-3a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  <span>{t('poll.create')}</span>
                </button>
              ) : null}

              <button
                data-testid={`${composerTestIdPrefix}-ai-reply-button`}
                type="button"
                onClick={handleAiReplySuggestion}
                disabled={isAiWorking}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#dcddde] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span>{isAiWorking ? 'AI 작업 중…' : 'AI 답장 추천'}</span>
              </button>

              <button
                data-testid={`${composerTestIdPrefix}-ai-translate-button`}
                type="button"
                onClick={handleAiTranslate}
                disabled={isAiWorking}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#dcddde] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25h12M9 3v2.25m-2.25 0c0 4.107 1.684 7.82 4.4 10.5m0 0A17.925 17.925 0 0015.75 9m-4.6 6.75L21 21" />
                </svg>
                <span>{isAiWorking ? 'AI 작업 중…' : 'AI 번역(영문)'}</span>
              </button>

              <button
                data-testid={`${composerTestIdPrefix}-ai-rewrite-button`}
                type="button"
                onClick={handleAiRewrite}
                disabled={isAiWorking}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#dcddde] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                <span>{isAiWorking ? 'AI 작업 중…' : 'AI 문장 다듬기'}</span>
              </button>

              <button
                data-testid={`${composerTestIdPrefix}-audio-button`}
                type="button"
                onClick={handleToggleRecording}
                disabled={!isRecording && !canRecordAudio}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#dcddde] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className={`h-4 w-4 shrink-0 ${isRecording ? 'text-red-400' : 'text-[#b5bac1]'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>{isRecording ? t('audio.stop') : t('audio.record')}</span>
              </button>

              {canScheduleMessage ? (
                <button
                  data-testid={`${composerTestIdPrefix}-schedule-button`}
                  type="button"
                  onClick={handleToggleSchedulePicker}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#dcddde] transition hover:bg-white/10"
                >
                  <svg className={`h-4 w-4 shrink-0 ${showSchedule ? 'text-indigo-300' : 'text-[#b5bac1]'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{t('schedule.title')}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

          <div className="relative flex-1 rounded-[1.4rem] border border-white/8 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {/* @Mention autocomplete dropdown */}
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div
              ref={mentionDropdownRef}
              className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#0f1a2b]/96 shadow-[0_24px_52px_rgba(2,8,23,0.44)] backdrop-blur-xl"
            >
              {filteredMembers.map((member, idx) => (
                <button
                  key={member.userId}
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    idx === selectedMentionIndex
                      ? 'bg-indigo-600 text-white'
                      : 'text-[#dcddde] hover:bg-white/10'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(member.displayName);
                  }}
                  onMouseEnter={() => setSelectedMentionIndex(idx)}
                >
                  <span className="font-medium">@{member.displayName}</span>
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            data-testid={`${composerTestIdPrefix}-input`}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              const value = e.currentTarget.value;
              bodyRef.current = value;
              setBody(value);
            }}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            className="block min-h-[2.9rem] max-h-[16rem] w-full resize-none overflow-y-auto bg-transparent px-4 py-[0.85rem] text-[0.95rem] leading-6 text-[#e5edf8] placeholder:text-white/28 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          data-testid={`${composerTestIdPrefix}-emoji-button`}
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-xl text-white/44 hover:bg-white/[0.08] hover:text-white"
        >
          {showEmojiPicker ? '⌨️' : '😊'}
        </button>

        <button
          data-testid={`${composerTestIdPrefix}-send-button`}
          type="submit"
          disabled={(!body.trim() && !hasPendingAttachments) || sendMessage.isPending || disabled || (requireTopic && !topic.trim()) || pendingAttachments.some((attachment) => attachment.status === 'failed')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-sky-300/30 bg-[linear-gradient(180deg,rgba(76,107,255,0.96),rgba(57,84,206,0.96))] text-white shadow-[0_18px_38px_rgba(41,56,161,0.32)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-[1.15rem] w-[1.15rem]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>

      {/* Recording indicator */}
      {isRecording && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-300">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {t('audio.recording')}
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
    </div>
  );
}
