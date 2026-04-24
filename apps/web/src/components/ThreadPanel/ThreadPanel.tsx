'use client';

import React, { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fetchAiRuntime } from '@/lib/ai-runtime';
import { useTranslation } from '@/lib/i18n';
import { fetchUserSettings } from '@/lib/user-settings';
import { buildComposerSelectedMessageAiState } from '@/lib/selected-message-ai';
import { MessageList } from '@/components/MessageList';
import { MessageComposer, type ComposerAiActionRequest } from '@/components/MessageComposer';
import type { MessageAiActionKind } from '@/components/MessageItem';
import { useThreadStore } from '@/stores/thread';
import type { Message, Thread, TranslationDisplayPreference, User } from '@zktalk/shared';

interface ThreadPanelProps {
  channelId: string;
}

interface ThreadDetailsResponse {
  thread: Thread;
  isFollowing: boolean;
  permissions: {
    canPostReply: boolean;
    canModerateThread: boolean;
  };
}

export function ThreadPanel({ channelId }: ThreadPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activeThreadId = useThreadStore((s) => s.activeThreadId);
  const closeThread = useThreadStore((s) => s.closeThread);
  const [replyTo, setReplyTo] = useState<{ message: Message; author?: User | null } | null>(null);
  const [aiActionRequest, setAiActionRequest] = useState<ComposerAiActionRequest | null>(null);

  const { data: threadData } = useQuery({
    queryKey: ['thread', activeThreadId],
    queryFn: async () => {
      return api<ThreadDetailsResponse>(`/api/channels/${channelId}/threads/${activeThreadId}`);
    },
    enabled: !!activeThreadId,
  });

  const { data: aiRuntime } = useQuery({
    queryKey: ['ai-runtime'],
    queryFn: fetchAiRuntime,
    staleTime: 60_000,
    enabled: !!activeThreadId,
  });
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 60_000,
    enabled: !!activeThreadId,
  });

  const followMutation = useMutation({
    mutationFn: async (shouldFollow: boolean) => {
      if (!activeThreadId) {
        throw new Error('No active thread');
      }

      if (shouldFollow) {
        await api(`/api/threads/${activeThreadId}/follow`, { method: 'POST' });
      } else {
        await api(`/api/threads/${activeThreadId}/follow`, { method: 'DELETE' });
      }

      return shouldFollow;
    },
    onSuccess: (isFollowing) => {
      queryClient.setQueryData<ThreadDetailsResponse | undefined>(
        ['thread', activeThreadId],
        (current) => (current ? { ...current, isFollowing } : current),
      );
    },
  });

  const handleReply = useCallback((message: Message, author?: User | null) => {
    setReplyTo({ message, author });
  }, []);

  const handleAiAction = useCallback((message: Message, author: User | null | undefined, action: MessageAiActionKind) => {
    const composerState = buildComposerSelectedMessageAiState({
      action,
      surface: 'thread',
      message,
      author,
    });

    if (!composerState) {
      setReplyTo(null);
      setAiActionRequest(null);
      return;
    }

    setReplyTo(composerState.replyTo);
    setAiActionRequest(composerState.aiActionRequest);
  }, []);

  if (!activeThreadId) return null;

  const isFollowing = threadData?.isFollowing ?? false;
  const canPostReply = threadData?.permissions.canPostReply ?? true;
  const thread = threadData?.thread;

  return (
    <aside
      data-testid="thread-panel"
      className="flex w-[320px] flex-col border-l border-line bg-bg"
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">
            {thread?.title ?? t('thread.title')}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Follow toggle */}
          <button
            onClick={() => followMutation.mutate(!isFollowing)}
            disabled={followMutation.isPending}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              isFollowing
                ? 'bg-accent-soft text-accent'
                : 'text-fg-muted hover:bg-bg-hover hover:text-fg'
            }`}
            title={isFollowing ? t('thread.unfollowThread') : t('thread.followThread')}
          >
            {followMutation.isPending
              ? t('common.loading')
              : isFollowing
                ? t('thread.following')
                : t('thread.follow')}
          </button>

          {/* Close button */}
          <button
            data-testid="thread-panel-close"
            onClick={closeThread}
            className="rounded-md p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thread messages */}
      <MessageList
        channelId={channelId}
        threadId={activeThreadId}
        onReplyToMessage={handleReply}
        onRequestAiAction={handleAiAction}
        aiRuntime={aiRuntime}
        translationDisplayPreference={
          (userSettings?.translationDisplay as TranslationDisplayPreference | undefined) ?? undefined
        }
      />

      {/* Thread composer */}
      {canPostReply ? (
        <MessageComposer
          channelId={channelId}
          threadId={activeThreadId}
          placeholder={t('thread.replyToThread')}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          aiActionRequest={aiActionRequest}
          onAiActionRequestHandled={() => setAiActionRequest(null)}
          aiRuntime={aiRuntime}
        />
      ) : (
        <div className="border-t border-line px-4 py-3 text-sm text-fg-muted">
          {t('thread.readOnlyMessage')}
        </div>
      )}
    </aside>
  );
}
