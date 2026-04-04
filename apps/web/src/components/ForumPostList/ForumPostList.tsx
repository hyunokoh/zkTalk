'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ForumPostItem } from '@/components/ForumPostItem';
import { CreateForumPost } from '@/components/CreateForumPost';
import type { Thread, User } from '@zktalk/shared';

interface ThreadRow {
  thread: Thread;
  creator: User;
  rootMessage: {
    id: string;
    bodyMarkdown: string;
    bodyPlaintext: string;
    createdAt: string;
  };
  unreadReplyCount: number;
  lastReadMessageId: string | null;
  isFollowing: boolean;
}

interface ThreadsResponse {
  items: ThreadRow[];
  nextCursor: string | null;
}

interface ForumPostListProps {
  channelId: string;
  communitySlug: string;
}

export function ForumPostList({ channelId, communitySlug }: ForumPostListProps) {
  const [sort, setSort] = useState<'latest' | 'top'>('latest');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['threads', channelId, sort],
    queryFn: () =>
      api<ThreadsResponse>(`/api/channels/${channelId}/threads?sort=${sort}`),
  });

  const rows = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-gray-400">{t('forum.loadingPosts')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSort('latest')}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              sort === 'latest'
                ? 'bg-gray-700 text-gray-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setSort('top')}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              sort === 'top'
                ? 'bg-gray-700 text-gray-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Top
          </button>
        </div>

        <button
          data-testid="forum-new-post-button"
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          New Post
        </button>
      </div>

      {/* Create post form */}
      {showCreate && (
        <CreateForumPost
          channelId={channelId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <svg className="mb-3 h-12 w-12 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm">{t('forum.noPosts')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {rows.map((row) => (
              <ForumPostItem
                key={row.thread.id}
                thread={row.thread}
                author={row.creator ?? null}
                communitySlug={communitySlug}
                channelId={channelId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
