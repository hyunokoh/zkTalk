'use client';

import Image from 'next/image';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserAvatar } from '@/components/UserAvatar';
import { UserProfileCard } from '@/components/UserProfileCard';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { P2PFileCard } from '@/components/P2PFileCard';
import { AttachmentPreview } from '@/components/AttachmentPreview/AttachmentPreview';
import { PollCard, type PollCardData } from '@/components/PollCard';
import { ReportButton } from '@/components/ReportButton';
import { relativeTime } from '@/lib/time';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useThreadStore } from '@/stores/thread';
import { useTranslation } from '@/lib/i18n';
import {
  shouldHideAttachmentBody,
  type Attachment,
  type Message,
  type User,
} from '@zktalk/shared';

const EMOJI_OPTIONS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F389}'];
const LONG_MESSAGE_COLLAPSE_LENGTH = 1200;
const LONG_MESSAGE_COLLAPSE_LINES = 12;

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
  const tone = isAuthor ? 'text-white' : 'text-[#e4edf9]';
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
    ? 'mt-2 inline-flex w-fit items-center rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/16'
    : 'mt-2 inline-flex w-fit items-center rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-[#dbe6f6] transition hover:bg-white/[0.08]';
}

function getMetaClassToRender(isAuthor: boolean): string {
  return isAuthor ? 'mt-2 text-[11px] text-white/72' : 'mt-2 text-[11px] text-white/46';
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

  const isAuthor = currentUser?.id === message.authorUserId;

  // Translation state
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // E2EE decrypted content state
  const [decryptedBody, setDecryptedBody] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState(false);

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
    enabled: attachments.length === 0 && !poll && !p2pFile && looksLikeAttachmentBody(message.bodyMarkdown),
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
    if (translatedText) {
      setShowTranslation(!showTranslation);
      setPinActionMenu(false);
      return;
    }
    setIsTranslating(true);
    try {
      const res = await api<{ translatedText: string }>('/api/translate', {
        method: 'POST',
        body: { text: displayBody, targetLang: 'ko' },
      });
      setTranslatedText(res.translatedText);
      setShowTranslation(true);
    } catch {
      // silently fail
    } finally {
      setIsTranslating(false);
      setPinActionMenu(false);
    }
  }, [displayBody, translatedText, showTranslation]);

  const handleInlineReply = useCallback(() => {
    onReply?.(message, author);
    setPinActionMenu(false);
  }, [message, author, onReply]);

  const handleCopyMessage = useCallback(() => {
    void navigator.clipboard.writeText(message.bodyMarkdown);
    setPinActionMenu(false);
  }, [message.bodyMarkdown]);

  if (message.messageType === 'system') {
    return (
      <div className="my-3 flex items-center gap-4 px-4 py-1">
        <div className="flex-1 border-t border-white/10" />
        <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/40">
          {message.bodyMarkdown}
        </span>
        <div className="flex-1 border-t border-white/10" />
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div className="group relative flex px-4 py-1 hover:bg-white/[0.02]">
        <div className="mr-3 w-10 shrink-0" />
        <p className="text-sm italic text-white/30">{t('message.deleted')}</p>
      </div>
    );
  }

  const displayName = author?.displayName ?? t('misc.unknownUser');
  const avatarUrl = author?.avatarUrl ?? null;
  const isActionBarVisible = showActions && !isEditing;
  const bubbleTone = isAuthor
    ? 'border-[#6b84ff]/28 bg-[linear-gradient(180deg,rgba(88,101,242,0.94),rgba(62,82,212,0.94))] text-white shadow-[0_18px_40px_rgba(45,63,180,0.32)]'
    : 'border-white/10 bg-[linear-gradient(180deg,rgba(20,29,44,0.96),rgba(11,18,29,0.98))] text-[#e4edf9] shadow-[0_16px_34px_rgba(2,8,23,0.24)]';
  const replyTone = isAuthor
    ? 'border-white/14 bg-white/10 text-white/78'
    : 'border-white/8 bg-white/[0.03] text-white/52';

  return (
    <div
      data-testid="message-row"
      data-message-id={message.id}
      className={`group relative flex rounded-[1.6rem] px-4 py-1 ${startsGroup ? 'mt-4' : 'mt-1'} transition hover:bg-white/[0.025]`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar or hover-time column */}
      <div className="mr-3 mt-0.5 w-10 shrink-0">
        {isAuthor ? null : startsGroup ? (
          <UserAvatar displayName={displayName} avatarUrl={avatarUrl} size="sm" isOnline={isAuthorOnline} />
        ) : (
          <span className="invisible block pt-[3px] text-right text-[10px] leading-snug text-white/26 group-hover:visible">
            {relativeTime(message.createdAt)}
          </span>
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
              className="text-sm font-semibold text-white hover:underline"
            >
              {displayName}
            </button>
            <span className="text-[11px] text-white/34">{relativeTime(message.createdAt)}</span>
            {isEncrypted && (
              <span className="inline-flex items-center text-green-500" title={t('e2ee.channelEnabled')}>
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
          <div className={`mb-2 flex items-center gap-2 rounded-[1rem] border px-3 py-2 text-xs ${replyTone}`}>
            <span className={`font-semibold ${isAuthor ? 'text-white' : 'text-[#dcddde]'}`}>
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
              className="w-full resize-none rounded border border-[#040405] bg-[#40444b] px-3 py-2 text-sm text-[#dcddde] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={2}
              autoFocus
            />
            <div className="mt-1 flex items-center gap-2 text-xs text-[#72767d]">
              <span>
                {t('message.escToCancel')}{' '}
                <button onClick={() => { setIsEditing(false); setEditBody(message.bodyMarkdown); }} className="text-indigo-400 hover:underline">
                  {t('common.cancel')}
                </button>
              </span>
              <span>&middot;</span>
              <span>
                {t('message.enterToSave')}{' '}
                <button data-testid="message-edit-save-button" onClick={handleEditSubmit} className="text-indigo-400 hover:underline">
                  {t('common.save')}
                </button>
              </span>
            </div>
          </div>
        ) : (
          <>
            {hasBubbleContent ? (
              <div className="relative inline-flex max-w-[min(44rem,100%)]">
                {startsGroup ? (
                  <span
                    className={`absolute bottom-2 h-2.5 w-2.5 rotate-45 ${isAuthor ? '-right-1 border-b border-r border-[#6b84ff]/28 bg-[#4b61dc]' : '-left-1 border-b border-l border-white/10 bg-[#101a2a]'}`}
                  />
                ) : null}
                <div className={`inline-flex max-w-[min(44rem,100%)] flex-col rounded-[1.35rem] border px-4 py-3 shadow-sm backdrop-blur-sm ${bubbleTone}`}>
                {p2pFile ? (
                  <div>
                    <p className={`mb-1 text-xs ${isAuthor ? 'text-white/70' : 'text-white/40'}`}>{t('p2p.fileShared')}</p>
                    <P2PFileCard
                      fileId={p2pFile.fileId}
                      fileName={p2pFile.fileName}
                      fileSize={p2pFile.fileSize}
                      mimeType={p2pFile.mimeType}
                      channelId={channelId}
                    />
                  </div>
                ) : isEncrypted && decryptError ? (
                  <div className="text-sm italic text-red-400">
                    {t('e2ee.decryptFailed')}
                  </div>
                ) : isEncrypted && !decryptedBody ? (
                  <div className={`text-sm italic ${isAuthor ? 'text-white/75' : 'text-white/42'}`}>
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
            ) : null}
            {poll ? <PollCard poll={poll} /> : null}
          </>
        )}

        {/* Translation */}
        {showTranslation && translatedText && (
          <div className="mt-2 rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/38">
              <span>{t('translate.translated')}</span>
              <button
                onClick={() => setShowTranslation(false)}
                className="ml-1 text-sky-300 hover:underline"
              >
                {t('translate.showOriginal')}
              </button>
            </div>
            <div className="mt-1 text-sm text-[#dcddde]">{translatedText}</div>
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {reactions.map((r) => {
              const isOwnReaction = currentUser ? r.userIds.includes(currentUser.id) : false;
              return (
                <button
                  key={r.emoji}
                  onClick={() => toggleReaction(r.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    isOwnReaction
                      ? 'border-sky-300/30 bg-sky-300/14 text-sky-100'
                      : 'border-white/10 bg-white/[0.03] text-[#dcddde] hover:border-white/18'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className={`mt-2 flex items-center gap-1.5 text-[11px] text-white/34 ${isAuthor ? 'justify-end pr-1' : 'pl-1'}`}>
          {!startsGroup || isAuthor ? <span>{relativeTime(message.createdAt)}</span> : null}
          {offlineStatus ? (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              offlineStatus === 'failed'
                ? 'bg-red-500/20 text-red-200'
                : 'bg-amber-400/20 text-amber-100'
            }`}>
              {offlineStatus === 'failed' ? t('offline.failed') : t('offline.queued')}
            </span>
          ) : null}
          {message.isEdited ? <span>{t('message.edited')}</span> : null}
          {isAuthor && unreadCount != null && unreadCount > 0 && (
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[#111827]">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Hover action bar */}
      {isActionBarVisible && (
        <div
          ref={actionMenuRef}
          className="absolute right-4 -top-4 z-10 flex items-center gap-0.5 rounded-2xl border border-white/10 bg-[#0d1827]/94 p-1 shadow-[0_22px_50px_rgba(2,8,23,0.42)] backdrop-blur-xl"
        >
          {/* Emoji reaction picker */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              data-testid="message-reaction-button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="rounded-xl p-1.5 text-white/52 hover:bg-white/10 hover:text-white"
              title={t('reaction.add')}
            >
              <span className="text-sm leading-none">{'\u{1F60A}'}</span>
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 z-50 mt-1 rounded-2xl border border-white/10 bg-[#0f1a2b]/96 p-2 shadow-[0_24px_50px_rgba(2,8,23,0.44)] backdrop-blur-xl">
                {customEmojis && customEmojis.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 text-xs font-medium text-[#72767d]">{t('emoji.custom')}</p>
                    <div className="flex flex-wrap gap-1">
                      {customEmojis.map((ce) => (
                        <button
                          key={ce.id}
                          onClick={() => toggleReaction(`:${ce.name}:`)}
                          className="rounded p-1 hover:bg-white/10"
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
                      className="rounded p-1 text-lg hover:bg-white/10"
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
              className="rounded-xl p-1.5 text-white/52 hover:bg-white/10 hover:text-white"
              title={t('message.reply')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Reply in thread */}
          <button
            data-testid="message-thread-button"
            onClick={handleReplyInThread}
            disabled={createThreadMutation.isPending}
            className="rounded-xl p-1.5 text-white/52 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title={t('message.replyInThread')}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5zm12 0v4a4 4 0 01-4 4h-.5l-.718.737A2 2 0 0012 15h2l3 3v-3h1a2 2 0 002-2V7a2 2 0 00-2-2h-4z" />
            </svg>
          </button>

          {/* Translate */}
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="rounded p-1.5 text-[#96989d] hover:bg-white/10 hover:text-[#dcddde] disabled:opacity-50"
            title={t('translate.translate')}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a18.965 18.965 0 01-3.386 3.014 1 1 0 11-1.176-1.618 17.01 17.01 0 003.06-2.72A17.007 17.007 0 013.2 7.16a1 1 0 011.74-.98 15.063 15.063 0 001.87 2.71A16.905 16.905 0 008.578 6H2a1 1 0 110-2h4V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" />
            </svg>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyMessage}
            className="rounded-xl p-1.5 text-white/52 hover:bg-white/10 hover:text-white"
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
            className="rounded-xl p-1.5 text-white/52 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-xl p-1.5 text-white/52 hover:bg-white/10 hover:text-white"
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
              className="rounded-xl p-1.5 text-amber-200 hover:bg-amber-400/18 hover:text-amber-100"
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
              className="rounded-xl p-1.5 text-red-300 hover:bg-red-500/18 hover:text-red-200"
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
              className="rounded-xl p-1.5 text-red-300 hover:bg-red-500/18 hover:text-red-200"
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
