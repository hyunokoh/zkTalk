'use client';

import Image from 'next/image';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserAvatar } from '@/components/UserAvatar';
import { UserProfileCard } from '@/components/UserProfileCard';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { P2PFileCard } from '@/components/P2PFileCard';
import { AttachmentPreview } from '@/components/AttachmentPreview/AttachmentPreview';
import { PollCard, type PollCardData } from '@/components/PollCard';
import { ReportButton } from '@/components/ReportButton';
import { api } from '@/lib/api';
import {
  getAiRuntimePresentation,
  isAiRuntimeUsable,
  type AIRuntimeSummary,
} from '@/lib/ai-runtime';
import { useAuthStore } from '@/stores/auth';
import { useThreadStore } from '@/stores/thread';
import { useTranslation } from '@/lib/i18n';
import {
  buildSelectedMessageAiContract,
  createTranslationRenderCacheEntry,
  getTranslationRenderSourceVersion,
  inferMessageLanguage,
  normalizeTranslationDisplayPreference,
  resolveTranslationDisplayDecision,
  resolveTranslationRenderCacheState,
  shouldHideAttachmentBody,
  type Attachment,
  type Message,
  type SelectedMessageAiAction,
  type TranslationRenderCacheEntry,
  type TranslationDisplayPreference,
  type User,
} from '@zktalk/shared';

const EMOJI_OPTIONS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F389}'];
const LONG_MESSAGE_COLLAPSE_LENGTH = 1200;
const LONG_MESSAGE_COLLAPSE_LINES = 12;
const AI_MESSAGE_ACTIONS_VISIBLE = true;
const RECENT_ATTACHMENT_PROBE_WINDOW_MS = 60_000;

function countRenderedLines(body: string): number {
  return body.split('\n').length;
}

function isLongMessage(body: string): boolean {
  return body.length > LONG_MESSAGE_COLLAPSE_LENGTH || countRenderedLines(body) > LONG_MESSAGE_COLLAPSE_LINES;
}

function getCollapsedBody(body: string): string {
  const truncatedByLines = body.split('\n').slice(0, LONG_MESSAGE_COLLAPSE_LINES).join('\n');
  const truncated = truncatedByLines.slice(0, LONG_MESSAGE_COLLAPSE_LENGTH).trimEnd();
  return truncated.length === body.trimEnd().length ? truncated : `${truncated}…`;
}

function getBodyToRender(body: string, expanded: boolean): string {
  if (!isLongMessage(body) || expanded) {
    return body;
  }
  return getCollapsedBody(body);
}

function getBodyClassToRender(isAuthor: boolean, body: string, expanded: boolean): string {
  // Self bubble uses --on-accent (white on blue); other bubbles use --fg.
  const tone = isAuthor ? 'text-[color:var(--on-accent)]' : 'text-fg';
  const clamp = !isLongMessage(body) || expanded ? '' : 'max-h-[20rem] overflow-hidden';
  return `${clamp} text-sm leading-7 ${tone}`.trim();
}

function shouldShowButtonForBody(body: string): boolean {
  return isLongMessage(body);
}

function getMetaTextToRender(body: string): string {
  return `${body.length.toLocaleString()} chars · ${countRenderedLines(body).toLocaleString()} lines`;
}

function getButtonTextToRender(expanded: boolean): string {
  return expanded ? 'Show less' : 'Show more';
}

function getButtonA11yToRender(expanded: boolean): string {
  return expanded ? 'Collapse long message' : 'Expand long message';
}

function getButtonClassToRender(isAuthor: boolean): string {
  return isAuthor
    ? 'mt-2 inline-flex w-fit items-center rounded-pill border border-line bg-bg-hover px-3 py-1 text-[11px] font-semibold text-[color:var(--on-accent)] transition hover:bg-bg-hover'
    : 'mt-2 inline-flex w-fit items-center rounded-pill border border-line bg-bg-hover px-3 py-1 text-[11px] font-semibold text-fg-muted transition hover:border-line-strong hover:text-fg';
}

function getMetaClassToRender(isAuthor: boolean): string {
  return isAuthor
    ? 'mt-2 text-[11px] text-[color:var(--on-accent)]/75'
    : 'mt-2 text-[11px] text-fg-subtle';
}

function getInitialExpandedForBody(body: string): boolean {
  return !isLongMessage(body);
}

function getResetExpandedForBody(body: string): boolean {
  return getInitialExpandedForBody(body);
}

function getComposedBodyClass(isAuthor: boolean, body: string, expanded: boolean): string {
  return getBodyClassToRender(isAuthor, body, expanded);
}

function getComposedMetaClass(isAuthor: boolean): string {
  return getMetaClassToRender(isAuthor);
}

function getComposedButtonClass(isAuthor: boolean): string {
  return getButtonClassToRender(isAuthor);
}

interface CustomEmoji {
  id: string;
  communityId: string;
  name: string;
  imageUrl: string;
}

export interface MessageReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

export type MessageAiActionKind = SelectedMessageAiAction;

interface Thread {
  id: string;
}

interface MessageItemProps {
  message: Message;
  attachments?: Attachment[];
  reactions?: MessageReactionGroup[];
  poll?: PollCardData | null;
  author?: User | null;
  channelId: string;
  communityId?: string;
  isAuthorOnline?: boolean;
  offlineStatus?: 'pending' | 'sending' | 'failed';
  onRetryOfflineMessage?: () => void;
  onRemoveOfflineMessage?: () => void;
  onReply?: (message: Message, author?: User | null) => void;
  onRequestAiAction?: (message: Message, author: User | null | undefined, action: MessageAiActionKind) => void;
  aiRuntime?: AIRuntimeSummary | null;
  translationDisplayPreference?: TranslationDisplayPreference;
  /** Map of all messages in the list for resolving parent message previews */
  allMessages?: Message[];
  /** User map for resolving author names of parent messages */
  userMap?: Record<string, User>;
  /** Number of channel members who haven't read this message yet (KakaoTalk-style) */
  unreadCount?: number;
  /** Channel E2EE decrypt function */
  e2eeDecrypt?: (ciphertext: string) => Promise<string>;
  /** Whether this message is encrypted */
  isEncrypted?: boolean;
  startsGroup?: boolean;
}

function looksLikeAttachmentBody(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return true;
  if (trimmed === '(첨부파일)' || trimmed === '(attachment)') return true;
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|png|jpe?g|gif|webp|txt|csv|mp3|wav|m4a|mp4|mov|webm)$/i.test(trimmed);
}

export function MessageItem({
  message,
  attachments = [],
  reactions = [],
  poll = null,
  author,
  channelId,
  communityId,
  isAuthorOnline,
  offlineStatus,
  onRetryOfflineMessage,
  onRemoveOfflineMessage,
  onReply,
  onRequestAiAction,
  aiRuntime,
  translationDisplayPreference,
  allMessages,
  userMap,
  unreadCount,
  e2eeDecrypt,
  isEncrypted,
  startsGroup = true,
}: MessageItemProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const openThread = useThreadStore((s) => s.openThread);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.bodyMarkdown);
  const [showActions, setShowActions] = useState(false);
  const [pinActionMenu, setPinActionMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [profileAnchorRect, setProfileAnchorRect] = useState<DOMRect | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUser?.id === message.authorUserId;

  // Translation state
  const [manualTranslationEntry, setManualTranslationEntry] = useState<TranslationRenderCacheEntry | null>(null);
  const [manualTranslationRuntime, setManualTranslationRuntime] = useState<{
    status: 'available' | 'mock' | 'disabled' | 'unavailable';
    issue?: string;
  } | null>(null);
  const [isManualTranslating, setIsManualTranslating] = useState(false);
  const [showManualTranslation, setShowManualTranslation] = useState(false);
  const [autoTranslationEntry, setAutoTranslationEntry] = useState<TranslationRenderCacheEntry | null>(null);
  const [autoTranslationError, setAutoTranslationError] = useState(false);
  const [autoTranslationRuntime, setAutoTranslationRuntime] = useState<{
    status: 'available' | 'mock' | 'disabled' | 'unavailable';
    issue?: string;
  } | null>(null);
  const [isAutoTranslating, setIsAutoTranslating] = useState(false);

  // E2EE decrypted content state
  const [decryptedBody, setDecryptedBody] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState(false);
  const aiRuntimePresentation = useMemo(() => getAiRuntimePresentation(t, aiRuntime), [aiRuntime, t]);
  const aiActionsEnabled = aiRuntime ? isAiRuntimeUsable(aiRuntime) : true;
  const aiActionTitleSuffix = aiRuntimePresentation
    ? `${aiRuntimePresentation.label}. ${aiRuntimePresentation.description}`
    : '';
  const selectedMessageAiScopeHint = t('ai.selectedMessageScopeHint');

  useEffect(() => {
    if (!isEncrypted || !e2eeDecrypt) {
      setDecryptedBody(null);
      return;
    }

    let cancelled = false;
    e2eeDecrypt(message.bodyMarkdown)
      .then((decrypted) => {
        if (!cancelled) setDecryptedBody(decrypted);
      })
      .catch(() => {
        if (!cancelled) setDecryptError(true);
      });

    return () => { cancelled = true; };
  }, [isEncrypted, e2eeDecrypt, message.bodyMarkdown]);

  // Use decrypted body if available, otherwise original
  const displayBody = isEncrypted && decryptedBody ? decryptedBody : message.bodyMarkdown;
  const translationSourceVersion = useMemo(
    () => getTranslationRenderSourceVersion(message),
    [message.createdAt, message.updatedAt],
  );
  const normalizedTranslationPreference = useMemo(
    () => normalizeTranslationDisplayPreference(translationDisplayPreference),
    [translationDisplayPreference],
  );
  const inferredMessageLanguage = useMemo(() => inferMessageLanguage(displayBody), [displayBody]);
  const autoTranslationCacheState = useMemo(
    () =>
      resolveTranslationRenderCacheState({
        entry: autoTranslationEntry,
        sourceVersion: translationSourceVersion,
        targetLanguage: normalizedTranslationPreference.targetLanguage,
      }),
    [autoTranslationEntry, normalizedTranslationPreference.targetLanguage, translationSourceVersion],
  );
  const manualTranslationCacheState = useMemo(
    () =>
      resolveTranslationRenderCacheState({
        entry: manualTranslationEntry,
        sourceVersion: translationSourceVersion,
        targetLanguage: 'ko',
      }),
    [manualTranslationEntry, translationSourceVersion],
  );
  const autoTranslationDecision = useMemo(
    () =>
      resolveTranslationDisplayDecision({
        preference: normalizedTranslationPreference,
        messageLanguage: inferredMessageLanguage,
        hasTranslatedText:
          autoTranslationCacheState === 'ready' || autoTranslationCacheState === 'stale',
        translationLanguage: autoTranslationEntry?.targetLanguage ?? null,
        runtime: autoTranslationError
          ? 'unavailable'
          : (autoTranslationRuntime?.status ?? 'available'),
        stale: autoTranslationCacheState === 'stale',
      }),
    [
      autoTranslationCacheState,
      autoTranslationEntry,
      autoTranslationError,
      autoTranslationRuntime,
      inferredMessageLanguage,
      normalizedTranslationPreference,
    ],
  );
  const [isLongMessageExpanded, setIsLongMessageExpanded] = useState(getInitialExpandedForBody(displayBody));
  const renderedBody = useMemo(
    () => getBodyToRender(displayBody, isLongMessageExpanded),
    [displayBody, isLongMessageExpanded],
  );
  const renderedBodyClass = useMemo(
    () => getComposedBodyClass(isAuthor, displayBody, isLongMessageExpanded),
    [displayBody, isAuthor, isLongMessageExpanded],
  );

  useEffect(() => {
    setIsLongMessageExpanded(getResetExpandedForBody(displayBody));
  }, [displayBody]);

  useEffect(() => {
    if (
      !autoTranslationDecision.shouldAutoTranslate ||
      (autoTranslationDecision.state !== 'translation-pending' &&
        autoTranslationDecision.state !== 'translation-stale') ||
      !autoTranslationDecision.targetLanguage ||
      isAutoTranslating
    ) {
      return;
    }

    let cancelled = false;
    const targetLanguage = autoTranslationDecision.targetLanguage;
    setIsAutoTranslating(true);
    setAutoTranslationError(false);
    setAutoTranslationRuntime(null);

    void api<{
      translatedText: string | null;
      runtime: {
        status: 'available' | 'mock' | 'disabled' | 'unavailable';
        issue?: string;
      };
    }>('/api/translate', {
      method: 'POST',
      body: {
        text: displayBody,
        targetLang: targetLanguage,
      },
    })
      .then((res) => {
        if (cancelled) return;
        setAutoTranslationRuntime(res.runtime);
        if (res.translatedText) {
          setAutoTranslationEntry(
            createTranslationRenderCacheEntry({
              translatedText: res.translatedText,
              targetLanguage,
              sourceVersion: translationSourceVersion,
            }),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAutoTranslationError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAutoTranslating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    autoTranslationDecision.shouldAutoTranslate,
    autoTranslationDecision.state,
    autoTranslationDecision.targetLanguage,
    displayBody,
    translationSourceVersion,
  ]);

  // Detect P2P file messages: [p2p-file:ID|name|size|mimeType]
  const p2pMatch = displayBody.match(
    /^\[p2p-file:([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]$/,
  );
  const p2pFile = p2pMatch
    ? { fileId: p2pMatch[1], fileName: p2pMatch[2], fileSize: p2pMatch[3], mimeType: p2pMatch[4] }
    : null;

  const { data: fallbackMessageRow } = useQuery({
    queryKey: ['message-detail', message.id],
    queryFn: () =>
      api<{
        message: Message;
        author: User;
        attachments?: Attachment[];
      }>(`/api/messages/${message.id}`),
    enabled:
      attachments.length === 0
      && !poll
      && !p2pFile
      && (
        looksLikeAttachmentBody(message.bodyMarkdown)
        || Date.now() - new Date(message.createdAt).getTime() < RECENT_ATTACHMENT_PROBE_WINDOW_MS
      ),
    staleTime: 30_000,
  });

  const resolvedAttachments =
    fallbackMessageRow?.attachments && fallbackMessageRow.attachments.length > 0
      ? fallbackMessageRow.attachments
      : attachments;
  const shouldHideBody = shouldHideAttachmentBody(displayBody, resolvedAttachments);
  const hasBubbleContent =
    !!p2pFile
    || (isEncrypted && decryptError)
    || (isEncrypted && !decryptedBody)
    || !shouldHideBody
    || resolvedAttachments.length > 0;

  // Resolve parent message for inline reply display
  const parentMessage = message.parentMessageId && allMessages
    ? allMessages.find((m) => m.id === message.parentMessageId)
    : null;
  const parentAuthor = parentMessage && userMap
    ? userMap[parentMessage.authorUserId]
    : null;

  // Fetch custom emojis for the community
  const { data: customEmojis } = useQuery({
    queryKey: ['custom-emojis', communityId],
    queryFn: async () => {
      const res = await api<{ emojis: CustomEmoji[] }>(`/api/communities/${communityId}/emojis`);
      return res.emojis;
    },
    enabled: !!communityId,
    staleTime: 60_000,
  });

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!pinActionMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setPinActionMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pinActionMenu]);

  const reactionMutation = useMutation({
    mutationFn: ({ emoji, remove }: { emoji: string; remove: boolean }) =>
      remove
        ? api(`/api/messages/${message.id}/reactions/${encodeURIComponent(emoji)}`, {
            method: 'DELETE',
          })
        : api(`/api/messages/${message.id}/reactions`, {
            method: 'POST',
            body: { emoji },
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-reactions', channelId] });
    },
  });

  const toggleReaction = useCallback(
    (emoji: string) => {
      const hasReacted = reactions.some(
        (reaction) =>
          reaction.emoji === emoji
          && (!!currentUser && reaction.userIds.includes(currentUser.id)),
      );
      reactionMutation.mutate({ emoji, remove: hasReacted });
      setShowEmojiPicker(false);
    },
    [currentUser, reactionMutation, reactions],
  );

  const editMutation = useMutation({
    mutationFn: () =>
      api(`/api/messages/${message.id}`, {
        method: 'PATCH',
        body: { bodyMarkdown: editBody },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api(`/api/messages/${message.id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () =>
      api(`/api/bookmarks/${message.id}`, {
        method: 'POST',
        keepalive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: () =>
      api<Thread>(`/api/messages/${message.id}/thread`, {
        method: 'POST',
      }),
    onSuccess: (thread) => {
      openThread(thread.id);
    },
  });

  const handleEditSubmit = useCallback(() => {
    if (!editBody.trim()) return;
    editMutation.mutate();
  }, [editBody, editMutation]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleEditSubmit();
      }
      if (e.key === 'Escape') {
        setIsEditing(false);
        setEditBody(message.bodyMarkdown);
      }
    },
    [handleEditSubmit, message.bodyMarkdown],
  );

  const handleReplyInThread = useCallback(() => {
    if (message.threadId) {
      openThread(message.threadId);
      setPinActionMenu(false);
      return;
    }

    if (!createThreadMutation.isPending) {
      createThreadMutation.mutate();
      setPinActionMenu(false);
    }
  }, [createThreadMutation, message.threadId, openThread]);

  const handleNameClick = useCallback(() => {
    if (nameRef.current) {
      setProfileAnchorRect(nameRef.current.getBoundingClientRect());
    }
    setShowProfileCard((prev) => !prev);
  }, []);

  const handleTranslate = useCallback(async () => {
    if (manualTranslationCacheState === 'ready' && manualTranslationEntry?.translatedText) {
      setShowManualTranslation(!showManualTranslation);
      setPinActionMenu(false);
      return;
    }
    setIsManualTranslating(true);
    try {
      const res = await api<{
        translatedText: string | null;
        runtime: {
          status: 'available' | 'mock' | 'disabled' | 'unavailable';
          issue?: string;
        };
      }>('/api/translate', {
        method: 'POST',
        body: { text: displayBody, targetLang: 'ko' },
      });
      setManualTranslationRuntime(res.runtime);
      if (res.translatedText) {
        setManualTranslationEntry(
          createTranslationRenderCacheEntry({
            translatedText: res.translatedText,
            targetLanguage: 'ko',
            sourceVersion: translationSourceVersion,
          }),
        );
        setShowManualTranslation(true);
      } else {
        setShowManualTranslation(false);
      }
    } catch {
      setManualTranslationRuntime({
        status: 'unavailable',
        issue: t('translate.error'),
      });
    } finally {
      setIsManualTranslating(false);
      setPinActionMenu(false);
    }
  }, [
    displayBody,
    manualTranslationCacheState,
    manualTranslationEntry,
    showManualTranslation,
    translationSourceVersion,
  ]);

  const handleRequestAiInlineTranslation = useCallback(async () => {
    if (aiRuntime && !aiActionsEnabled) {
      setPinActionMenu(false);
      return;
    }

    const contract = buildSelectedMessageAiContract({
      action: 'translate-inline',
      surface: message.threadId ? 'thread' : 'channel',
      sourceMessage: {
        authorDisplayName: author?.displayName ?? null,
        bodyText: displayBody,
      },
    });

    if (contract.errorKey || !contract.sourceText) {
      setPinActionMenu(false);
      return;
    }

    setIsManualTranslating(true);
    try {
      const res = await api<{
        translatedText: string | null;
        runtime: {
          status: 'available' | 'mock' | 'disabled' | 'unavailable';
          issue?: string;
        };
      }>('/api/translate', {
        method: 'POST',
        body: { text: contract.sourceText, targetLang: 'ko' },
      });
      setManualTranslationRuntime(res.runtime);
      if (res.translatedText) {
        setManualTranslationEntry(
          createTranslationRenderCacheEntry({
            translatedText: res.translatedText,
            targetLanguage: 'ko',
            sourceVersion: translationSourceVersion,
          }),
        );
        setShowManualTranslation(true);
      } else {
        setShowManualTranslation(false);
      }
    } catch {
      setManualTranslationRuntime({
        status: 'unavailable',
        issue: t('translate.error'),
      });
    } finally {
      setIsManualTranslating(false);
      setPinActionMenu(false);
    }
  }, [aiActionsEnabled, aiRuntime, author?.displayName, displayBody, message.threadId, translationSourceVersion]);

  const handleInlineReply = useCallback(() => {
    onReply?.(message, author);
    setPinActionMenu(false);
  }, [message, author, onReply]);

  const handleCopyMessage = useCallback(() => {
    void navigator.clipboard.writeText(message.bodyMarkdown);
    setPinActionMenu(false);
  }, [message.bodyMarkdown]);

  const handleRequestAiReplyDraft = useCallback(() => {
    onRequestAiAction?.(message, author, 'reply-draft');
    setPinActionMenu(false);
  }, [author, message, onRequestAiAction]);

  const handleRequestAiRewriteDraft = useCallback(() => {
    onRequestAiAction?.(message, author, 'rewrite-draft');
    setPinActionMenu(false);
  }, [author, message, onRequestAiAction]);

  const handleRowFocusCapture = useCallback(() => {
    setShowActions(true);
  }, []);

  const handleRowBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocusedNode = event.relatedTarget;
    if (nextFocusedNode instanceof Node && rowRef.current?.contains(nextFocusedNode)) {
      return;
    }

    setShowActions(false);
    setShowEmojiPicker(false);
    setPinActionMenu(false);
  }, []);

  const visibleAutoTranslatedText =
    autoTranslationDecision.render === 'translated' &&
    (autoTranslationCacheState === 'ready' || autoTranslationCacheState === 'stale')
      ? autoTranslationEntry?.translatedText ?? null
      : null;
  const visibleManualTranslatedText =
    showManualTranslation &&
    (manualTranslationCacheState === 'ready' || manualTranslationCacheState === 'stale')
      ? manualTranslationEntry?.translatedText ?? null
      : null;
  const visibleTranslatedText = visibleManualTranslatedText ?? visibleAutoTranslatedText;
  const translationVariant = showManualTranslation
    ? 'manual'
    : visibleAutoTranslatedText
      ? 'automatic'
      : null;
  const translatedLabel = showManualTranslation
    ? manualTranslationRuntime?.status === 'mock'
      ? t('translate.translatedMock')
      : manualTranslationCacheState === 'stale'
      ? t('translate.translatedStale')
      : t('translate.translated')
    : visibleAutoTranslatedText
      ? autoTranslationDecision.state === 'translation-runtime-mock'
        ? t('translate.autoTranslatedMock')
        : autoTranslationDecision.state === 'translation-stale'
        ? t('translate.autoTranslatedStale')
        : t('translate.autoTranslated')
      : null;
  const translationStatusLabel = !visibleTranslatedText
    ? manualTranslationRuntime?.status === 'disabled'
      ? t('translate.translationDisabled')
      : manualTranslationRuntime?.status === 'unavailable'
        ? t('translate.translationUnavailable')
        : autoTranslationDecision.state === 'translation-runtime-disabled'
          ? t('translate.autoTranslationDisabled')
          : autoTranslationDecision.state === 'translation-unavailable'
            ? t('translate.autoTranslationUnavailable')
            : null
    : null;
  const translationStatusIssue = !visibleTranslatedText
    ? manualTranslationRuntime?.issue ?? autoTranslationRuntime?.issue ?? null
    : null;

  if (message.messageType === 'system') {
    return (
      <div className="my-3 flex items-center gap-4 px-4 py-1">
        <div className="flex-1 border-t border-line" />
        <span className="shrink-0 rounded-pill border border-line bg-bg-subtle px-3 py-1 text-[11px] font-medium text-fg-muted">
          {message.bodyMarkdown}
        </span>
        <div className="flex-1 border-t border-line" />
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div className="group relative flex px-4 py-1 hover:bg-bg-hover">
        <div className="mr-3 w-10 shrink-0" />
        <p className="text-sm italic text-fg-subtle">{t('message.deleted')}</p>
      </div>
    );
  }

  const displayName = author?.displayName ?? t('misc.unknownUser');
  const avatarUrl = author?.avatarUrl ?? null;
  const isActionBarVisible = showActions && !isEditing;
  // Telegram-minimal bubble tones (design-system.md §7.1):
  //   self  → accent background, on-accent text
  //   other → bg-subtle, fg text
  const bubbleTone = isAuthor
    ? 'border-transparent bg-accent text-[color:var(--on-accent)] shadow-[var(--shadow-1)]'
    : 'border-line bg-bg-subtle text-fg shadow-[var(--shadow-1)]';
  const replyTone = isAuthor
    ? 'border-line bg-bg-hover text-[color:var(--on-accent)]/85'
    : 'border-line bg-bg-hover text-fg-muted';
  const sideMeta = (
    <div className={`shrink-0 self-end pb-0.5 text-[11px] leading-tight text-fg-subtle ${isAuthor ? 'text-right' : 'text-left'}`}>
      {reactions.length === 0 && unreadCount != null && unreadCount > 0 ? <div>{Math.min(99, unreadCount)}</div> : null}
      <div>{new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
      {offlineStatus ? (
        <div className={`${offlineStatus === 'failed' ? 'text-danger' : 'text-warning'}`}>
          {offlineStatus === 'failed' ? t('offline.failed') : t('offline.queued')}
        </div>
      ) : null}
      {message.isEdited ? <div>{t('message.edited')}</div> : null}
    </div>
  );

  return (
    <div
      ref={rowRef}
      data-testid="message-row"
      data-message-id={message.id}
      tabIndex={0}
      className={`group relative flex rounded-lg px-4 py-1 ${startsGroup ? 'mt-4' : 'mt-1'} transition hover:bg-bg-hover`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onFocusCapture={handleRowFocusCapture}
      onBlurCapture={handleRowBlurCapture}
    >
      {/* Avatar or hover-time column */}
      <div className="mr-3 mt-0.5 w-10 shrink-0">
        {isAuthor ? null : startsGroup ? (
          <UserAvatar displayName={displayName} avatarUrl={avatarUrl} size="sm" isOnline={isAuthorOnline} />
        ) : (
          <span className="block h-5" />
        )}
      </div>

      {/* Content column */}
      <div className={`min-w-0 flex flex-1 flex-col ${isAuthor ? 'items-end' : ''}`}>
        {/* Header: name + timestamp */}
        {startsGroup && !isAuthor && (
          <div className="mb-1 flex items-center gap-2">
            <button
              ref={nameRef}
              onClick={handleNameClick}
              className="text-sm font-semibold text-fg hover:underline"
            >
              {displayName}
            </button>
            {isEncrypted && (
              <span className="inline-flex items-center text-success" title={t('e2ee.channelEnabled')}>
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
        )}

        {/* User profile card popup */}
        {showProfileCard && (
          <UserProfileCard
            userId={message.authorUserId}
            communityId={communityId}
            onClose={() => setShowProfileCard(false)}
            anchorRect={profileAnchorRect}
          />
        )}

        {/* Inline reply preview */}
        {parentMessage && (
          <div className={`mb-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${replyTone}`}>
            <span className={`font-semibold ${isAuthor ? 'text-[color:var(--on-accent)]' : 'text-fg'}`}>
              {parentAuthor?.displayName ?? 'Unknown'}
            </span>
            <span className="truncate">
              {parentMessage.bodyMarkdown.slice(0, 100)}
            </span>
          </div>
        )}

        {/* Message body */}
        {isEditing ? (
          <div>
            <textarea
              data-testid="message-edit-input"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full resize-none rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              rows={2}
              autoFocus
            />
            <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
              <span>
                {t('message.escToCancel')}{' '}
                <button onClick={() => { setIsEditing(false); setEditBody(message.bodyMarkdown); }} className="text-accent hover:underline">
                  {t('common.cancel')}
                </button>
              </span>
              <span>&middot;</span>
              <span>
                {t('message.enterToSave')}{' '}
                <button data-testid="message-edit-save-button" onClick={handleEditSubmit} className="text-accent hover:underline">
                  {t('common.save')}
                </button>
              </span>
            </div>
          </div>
        ) : (
          <>
            {hasBubbleContent ? (
              <div className="inline-flex max-w-[min(44rem,100%)] items-end gap-1">
                {isAuthor ? sideMeta : null}
                <div className="relative inline-flex max-w-[min(44rem,100%)]">
                  {startsGroup ? (
                    <span
                      className={`absolute bottom-2 h-2.5 w-2.5 rotate-45 ${isAuthor ? '-right-1 bg-accent' : '-left-1 border-b border-l border-line bg-bg-subtle'}`}
                    />
                  ) : null}
                  <div className={`inline-flex max-w-[min(44rem,100%)] flex-col rounded-bubble border px-4 py-3 ${bubbleTone}`}>
                  {p2pFile ? (
                    <div>
                      <p className={`mb-1 text-xs ${isAuthor ? 'text-[color:var(--on-accent)]/80' : 'text-fg-muted'}`}>{t('p2p.fileShared')}</p>
                      <P2PFileCard
                        fileId={p2pFile.fileId}
                        fileName={p2pFile.fileName}
                        fileSize={p2pFile.fileSize}
                        mimeType={p2pFile.mimeType}
                        channelId={channelId}
                      />
                    </div>
                  ) : isEncrypted && decryptError ? (
                    <div className="text-sm italic text-danger">
                      {t('e2ee.decryptFailed')}
                    </div>
                  ) : isEncrypted && !decryptedBody ? (
                    <div className={`text-sm italic ${isAuthor ? 'text-[color:var(--on-accent)]/80' : 'text-fg-subtle'}`}>
                      {t('e2ee.decrypting')}
                    </div>
                  ) : (
                    !shouldHideBody ? (
                      <div className={renderedBodyClass}>
                        <MarkdownRenderer content={renderedBody} />
                        {shouldShowButtonForBody(displayBody) ? (
                          <>
                            <p className={getComposedMetaClass(isAuthor)}>{getMetaTextToRender(displayBody)}</p>
                            <button
                              type="button"
                              aria-label={getButtonA11yToRender(isLongMessageExpanded)}
                              className={getComposedButtonClass(isAuthor)}
                              onClick={() => setIsLongMessageExpanded((prev) => !prev)}
                            >
                              {getButtonTextToRender(isLongMessageExpanded)}
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null
                  )}
                  {resolvedAttachments.length > 0 ? <AttachmentPreview attachments={resolvedAttachments} /> : null}
                  </div>
                </div>
                {!isAuthor ? sideMeta : null}
              </div>
            ) : null}
            {poll ? <PollCard poll={poll} /> : null}
          </>
        )}

        {/* Translation */}
        {visibleTranslatedText && translatedLabel && (
          <div
            data-testid="message-translation-panel"
            data-translation-variant={translationVariant ?? undefined}
            className={`mt-2 rounded-md border px-3 py-3 ${
              translationVariant === 'manual'
                ? 'border-accent/30 bg-accent-soft'
                : 'border-success/25 bg-success/10'
            }`}
          >
            <div
              className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                translationVariant === 'manual' ? 'text-accent' : 'text-success'
              }`}
            >
              <span>{translatedLabel}</span>
              {showManualTranslation ? (
                <button
                  onClick={() => setShowManualTranslation(false)}
                  className="ml-1 text-accent hover:underline"
                >
                  {t('translate.showOriginal')}
                </button>
              ) : null}
            </div>
            <div className="mt-1 text-sm text-fg">{visibleTranslatedText}</div>
          </div>
        )}
        {translationStatusLabel ? (
          <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-fg">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
              {translationStatusLabel}
            </div>
            {translationStatusIssue ? <div className="mt-1">{translationStatusIssue}</div> : null}
          </div>
        ) : null}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {reactions.map((r) => {
              const isOwnReaction = currentUser ? r.userIds.includes(currentUser.id) : false;
              return (
                <button
                  key={r.emoji}
                  onClick={() => toggleReaction(r.emoji)}
                  className={`flex items-center gap-1 rounded-pill border px-2.5 py-1 text-xs transition-colors ${
                    isOwnReaction
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-bg-subtle text-fg-muted hover:border-line-strong hover:text-fg'
                  }`}
                >
                  <span>{r.emoji}</span>
                  {r.count >= 2 ? <span>{r.count}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover action bar */}
      {isActionBarVisible && (
        <div
          ref={actionMenuRef}
          className="absolute right-4 -top-4 z-10 flex items-center gap-0.5 rounded-lg border border-line bg-bg-elevated p-1 shadow-[var(--shadow-2)]"
        >
          {/* Emoji reaction picker */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              data-testid="message-reaction-button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg"
              title={t('reaction.add')}
            >
              <span className="text-sm leading-none">{'\u{1F60A}'}</span>
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 z-50 mt-1 rounded-lg border border-line bg-bg-elevated p-2 shadow-[var(--shadow-3)]">
                {customEmojis && customEmojis.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 text-xs font-medium text-fg-muted">{t('emoji.custom')}</p>
                    <div className="flex flex-wrap gap-1">
                      {customEmojis.map((ce) => (
                        <button
                          key={ce.id}
                          onClick={() => toggleReaction(`:${ce.name}:`)}
                          className="rounded p-1 hover:bg-bg-hover"
                          title={`:${ce.name}:`}
                        >
                          <Image
                            src={ce.imageUrl}
                            alt={ce.name}
                            width={24}
                            height={24}
                            unoptimized
                            className="h-6 w-6 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(emoji)}
                      className="rounded p-1 text-lg hover:bg-bg-hover"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline reply */}
          {onReply && (
            <button
              data-testid="message-reply-button"
              onClick={handleInlineReply}
              className="rounded-md p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg"
              title={t('message.reply')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {AI_MESSAGE_ACTIONS_VISIBLE && onRequestAiAction ? (
            <div className="flex items-center gap-1">
              <button
                data-testid="message-ai-reply-draft-button"
                onClick={handleRequestAiReplyDraft}
                disabled={!aiActionsEnabled}
                className="rounded-md p-1.5 text-agent hover:bg-agent-soft hover:text-agent-strong disabled:cursor-not-allowed disabled:opacity-45"
                title={[t('ai.replyDraftFromMessage'), aiActionTitleSuffix].filter(Boolean).join(' · ')}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 6.172a4 4 0 015.656 0L10 7.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                data-testid="message-ai-rewrite-draft-button"
                onClick={handleRequestAiRewriteDraft}
                disabled={!aiActionsEnabled}
                className="rounded-md p-1.5 text-agent hover:bg-agent-soft hover:text-agent-strong disabled:cursor-not-allowed disabled:opacity-45"
                title={[t('ai.rewriteDraftFromMessage'), aiActionTitleSuffix].filter(Boolean).join(' · ')}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              {aiRuntimePresentation ? (
                <span
                  className={
                    aiRuntimePresentation.tone === 'live'
                      ? 'rounded-pill border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-success'
                      : aiRuntimePresentation.tone === 'mock'
                        ? 'rounded-pill border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-warning'
                        : 'rounded-pill border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-danger'
                  }
                  title={aiRuntimePresentation.description}
                >
                  {aiRuntimePresentation.label}
                </span>
              ) : null}
            </div>
          ) : null}
          {AI_MESSAGE_ACTIONS_VISIBLE && onRequestAiAction ? (
            <p className="mt-2 max-w-[20rem] text-[11px] leading-4 text-fg-subtle">
              {[aiRuntimePresentation?.description, selectedMessageAiScopeHint]
                .filter(Boolean)
                .join(' ')}
            </p>
          ) : null}

          {/* Reply in thread */}
          <button
            data-testid="message-thread-button"
            onClick={handleReplyInThread}
            disabled={createThreadMutation.isPending}
            className="rounded-md p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
            title={t('message.replyInThread')}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5zm12 0v4a4 4 0 01-4 4h-.5l-.718.737A2 2 0 0012 15h2l3 3v-3h1a2 2 0 002-2V7a2 2 0 00-2-2h-4z" />
            </svg>
          </button>

          {AI_MESSAGE_ACTIONS_VISIBLE ? (
            <button
              data-testid="message-ai-translate-inline-button"
              onClick={() => void handleRequestAiInlineTranslation()}
              disabled={!aiActionsEnabled || isManualTranslating || isAutoTranslating}
              className="rounded-md p-1.5 text-agent hover:bg-agent-soft hover:text-agent-strong disabled:cursor-not-allowed disabled:opacity-45"
              title={[t('translate.translate'), aiActionTitleSuffix].filter(Boolean).join(' · ')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a18.965 18.965 0 01-3.386 3.014 1 1 0 11-1.176-1.618 17.01 17.01 0 003.06-2.72A17.007 17.007 0 013.2 7.16a1 1 0 011.74-.98 15.063 15.063 0 001.87 2.71A16.905 16.905 0 008.578 6H2a1 1 0 110-2h4V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleTranslate}
              disabled={isManualTranslating || isAutoTranslating}
              className="rounded-md p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg disabled:opacity-50"
              title={t('translate.translate')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a18.965 18.965 0 01-3.386 3.014 1 1 0 11-1.176-1.618 17.01 17.01 0 003.06-2.72A17.007 17.007 0 013.2 7.16a1 1 0 011.74-.98 15.063 15.063 0 001.87 2.71A16.905 16.905 0 008.578 6H2a1 1 0 110-2h4V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" />
              </svg>
            </button>
          )}

          {/* Copy */}
          <button
            onClick={handleCopyMessage}
            className="rounded-md p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg"
            title={t('message.copyMessage')}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          </button>

          <button
            data-testid="message-bookmark-button"
            onClick={() => bookmarkMutation.mutate()}
            disabled={bookmarkMutation.isPending}
            className="rounded-md p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
            title={t('bookmark.add')}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 3A1.5 1.5 0 004 4.5v12l6-3.333L16 16.5v-12A1.5 1.5 0 0014.5 3h-9z" />
            </svg>
          </button>

          {/* Report (non-author community messages) */}
          {communityId && !isAuthor && (
            <div data-testid="message-report-action">
              <ReportButton
                communityId={communityId}
                messageId={message.id}
                reportedUserId={message.authorUserId}
              />
            </div>
          )}

          {/* Edit (author only) */}
          {isAuthor && (
            <button
              data-testid="message-edit-button"
              onClick={() => setIsEditing(true)}
              className="rounded-md p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg"
              title={t('message.editMessage')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}

          {offlineStatus && onRetryOfflineMessage ? (
            <button
              type="button"
              onClick={onRetryOfflineMessage}
              className="rounded-md p-1.5 text-warning hover:bg-warning/10"
              title={t('offline.retry')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 10-9.65 2.179 1 1 0 11-1.624 1.168A7.5 7.5 0 1117.5 10h-2.5a1 1 0 110-2H19a1 1 0 011 1v4a1 1 0 11-2 0v-1.576h-2.688z" clipRule="evenodd" />
              </svg>
            </button>
          ) : null}

          {offlineStatus && onRemoveOfflineMessage ? (
            <button
              type="button"
              onClick={onRemoveOfflineMessage}
              className="rounded-md p-1.5 text-danger hover:bg-danger/10"
              title={t('attachment.remove')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          ) : null}

          {/* Delete (author only) */}
          {isAuthor && !offlineStatus && (
            <button
              data-testid="message-delete-button"
              onClick={() => deleteMutation.mutate()}
              className="rounded-md p-1.5 text-danger hover:bg-danger/10"
              title={t('message.deleteMessage')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
