'use client';

import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { useTranslation } from '@/lib/i18n';
import { relativeTime } from '@/lib/time';
import type { Thread, User } from '@zktalk/shared';

interface ForumPostItemProps {
  thread: Thread;
  author: User | null;
  communitySlug: string;
  channelId: string;
}

export function ForumPostItem({ thread, author, communitySlug, channelId }: ForumPostItemProps) {
  const { t } = useTranslation();
  const displayName = author?.displayName ?? t('misc.unknownUser');

  return (
    <Link
      href={`/communities/${communitySlug}/channels/${channelId}/threads/${thread.id}`}
      data-testid="forum-post-link"
      data-thread-id={thread.id}
      className="block px-4 py-3 transition-colors hover:bg-bg-subtle/70"
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          displayName={displayName}
          avatarUrl={author?.avatarUrl ?? null}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-fg-muted">
              {thread.title ?? t('thread.title')}
            </h3>
            {thread.isPinned && (
              <span className="shrink-0 rounded bg-warning/50 px-1.5 py-0.5 text-xs text-warning">
                {t('forum.pinned')}
              </span>
            )}
            {thread.isLocked && (
              <span className="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-xs text-fg-muted">
                {t('thread.locked')}
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center gap-3 text-xs text-fg-muted">
            <span>{displayName}</span>
            <span>&middot;</span>
            <span>
              {thread.replyCount === 1
                ? t('thread.replyCount', { count: thread.replyCount })
                : t('thread.replyCountPlural', { count: thread.replyCount })}
            </span>
            <span>&middot;</span>
            <span>{t('forum.lastActivity')} {relativeTime(thread.lastActivityAt)}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-fg-muted">{thread.replyCount}</div>
          <div className="text-xs text-fg-muted">
            {thread.replyCount === 1
              ? t('thread.replyCount', { count: thread.replyCount })
              : t('thread.replyCountPlural', { count: thread.replyCount })}
          </div>
        </div>
      </div>
    </Link>
  );
}
