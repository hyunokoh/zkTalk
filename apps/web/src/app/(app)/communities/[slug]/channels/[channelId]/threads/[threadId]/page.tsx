'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { saveLastVisited } from '@/lib/user-settings';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { MessageList } from '@/components/MessageList';
import { MessageComposer } from '@/components/MessageComposer';
import { UserAvatar } from '@/components/UserAvatar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AttachmentPreview } from '@/components/AttachmentPreview/AttachmentPreview';
import { relativeTime } from '@/lib/time';
import {
  shouldHideAttachmentBody,
  type Attachment,
  type Message,
  type Thread,
  type User,
} from '@zktalk/shared';

interface ThreadDetailsResponse {
  thread: Thread;
  creator: User;
  rootMessage:
    | {
        message: Message;
        author: User;
        attachments?: Attachment[];
      }
    | null;
  permissions: {
    canPostReply: boolean;
    canModerateThread: boolean;
  };
}

export default function ThreadPage() {
  const { t } = useTranslation();
  const params = useParams();
  const channelId = params.channelId as string;
  const threadId = params.threadId as string;

  const { data: threadData } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      return api<ThreadDetailsResponse>(`/api/channels/${channelId}/threads/${threadId}`);
    },
  });

  const thread = threadData?.thread;
  const canPostReply = threadData?.permissions.canPostReply ?? true;

  useEffect(() => {
    if (threadId) {
      void saveLastVisited({
        kind: 'thread',
        channelId,
        threadId,
      });
    }
  }, [channelId, threadId]);
  const rootMessage = threadData?.rootMessage;
  const rootAttachments = rootMessage?.attachments ?? [];
  const showRootBody =
    rootMessage != null
    && !shouldHideAttachmentBody(rootMessage.message.bodyMarkdown, rootAttachments);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread header */}
      {thread && (
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-100">{thread.title ?? t('thread.title')}</h2>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
            <span>
              {thread.replyCount === 1
                ? t('thread.replyCount', { count: thread.replyCount })
                : t('thread.replyCountPlural', { count: thread.replyCount })}
            </span>
            {thread.isLocked && <span className="text-amber-400">{t('thread.locked')}</span>}
          </div>
        </div>
      )}

      {rootMessage ? (
        <div
          data-testid="thread-root-message"
          className="border-b border-gray-800 bg-[#2f3136] px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <UserAvatar
              displayName={rootMessage.author.displayName}
              avatarUrl={rootMessage.author.avatarUrl ?? null}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-gray-100">
                  {rootMessage.author.displayName}
                </span>
                <span className="text-xs text-gray-500">
                  {relativeTime(rootMessage.message.createdAt)}
                </span>
              </div>
              {showRootBody ? (
                <div
                  data-testid="thread-root-message-body"
                  className="mt-2 text-sm text-gray-200"
                >
                  <MarkdownRenderer content={rootMessage.message.bodyMarkdown} />
                </div>
              ) : null}
              {rootAttachments.length > 0 ? (
                <div className="mt-3">
                  <AttachmentPreview attachments={rootAttachments} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <MessageList channelId={channelId} threadId={threadId} />

      {thread?.isLocked || !canPostReply ? (
        <div className="border-t border-gray-800 px-4 py-3 text-center text-sm text-gray-500">
          {thread?.isLocked ? t('thread.lockedMessage') : t('thread.readOnlyMessage')}
        </div>
      ) : (
        <MessageComposer
          channelId={channelId}
          threadId={threadId}
          placeholder={t('thread.replyToThread')}
        />
      )}
    </div>
  );
}
