'use client';

import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { relativeTime } from '@/lib/time';
import type { Thread, User } from '@zktalk/shared';

interface ForumPostItemProps {
  thread: Thread;
  author: User | null;
  communitySlug: string;
  channelId: string;
}

export function ForumPostItem({ thread, author, communitySlug, channelId }: ForumPostItemProps) {
  const displayName = author?.displayName ?? 'Unknown User';

  return (
    <Link
      href={`/communities/${communitySlug}/channels/${channelId}/threads/${thread.id}`}
      className="block px-4 py-3 transition-colors hover:bg-gray-800/70"
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          displayName={displayName}
          avatarUrl={author?.avatarUrl ?? null}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-100">
              {thread.title ?? 'Untitled'}
            </h3>
            {thread.isPinned && (
              <span className="shrink-0 rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-400">
                Pinned
              </span>
            )}
            {thread.isLocked && (
              <span className="shrink-0 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
                Locked
              </span>
            )}
          </div>

          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
            <span>{displayName}</span>
            <span>&middot;</span>
            <span>
              {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            <span>&middot;</span>
            <span>Last activity {relativeTime(thread.lastActivityAt)}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-gray-400">{thread.replyCount}</div>
          <div className="text-xs text-gray-500">replies</div>
        </div>
      </div>
    </Link>
  );
}
