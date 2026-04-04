'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { UserAvatar } from '@/components/UserAvatar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { relativeTime } from '@/lib/time';

interface BookmarkedMessage {
  id: string;
  messageId: string;
  createdAt: string;
  communitySlug: string;
  channelId: string;
  threadId: string | null;
  message: {
    id: string;
    bodyMarkdown: string;
    createdAt: string;
    authorUserId: string;
  };
  author?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  channelName?: string;
}

interface BookmarkRow {
  bookmark: {
    id: string;
    messageId: string;
    createdAt: string;
  };
  message: {
    id: string;
    bodyMarkdown: string;
    createdAt: string;
    authorUserId: string;
    threadId: string | null;
  };
  channel: {
    id: string;
    name: string;
  };
  community: {
    slug: string;
  };
  author?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export function BookmarkList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: bookmarks, isLoading } = useQuery<BookmarkedMessage[]>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await api<{ bookmarks: BookmarkRow[] }>('/api/bookmarks');
      return (res.bookmarks ?? []).map((row): BookmarkedMessage => ({
        id: row.bookmark.id,
        messageId: row.bookmark.messageId,
        createdAt: row.bookmark.createdAt,
        communitySlug: row.community.slug,
        channelId: row.channel.id,
        threadId: row.message.threadId,
        message: row.message,
        author: row.author,
        channelName: row.channel.name,
      }));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (messageId: string) =>
      api(`/api/bookmarks/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  return (
    <div data-testid="bookmarks-page" className="flex flex-1 flex-col">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-100">{t('bookmark.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">{t('common.loading')}</div>
        ) : !bookmarks || bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <svg className="mb-3 h-12 w-12 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            <p className="text-sm">{t('bookmark.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {bookmarks.map((bm) => (
              <div
                key={bm.id ?? bm.messageId}
                role="button"
                tabIndex={0}
                data-testid="bookmark-item"
                data-message-id={bm.messageId}
                onClick={() => {
                  const href = bm.threadId
                    ? `/communities/${bm.communitySlug}/channels/${bm.channelId}/threads/${bm.threadId}#${bm.messageId}`
                    : `/communities/${bm.communitySlug}/channels/${bm.channelId}#${bm.messageId}`;
                  router.push(href);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const href = bm.threadId
                      ? `/communities/${bm.communitySlug}/channels/${bm.channelId}/threads/${bm.threadId}#${bm.messageId}`
                      : `/communities/${bm.communitySlug}/channels/${bm.channelId}#${bm.messageId}`;
                    router.push(href);
                  }
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-800/50"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    displayName={bm.author?.displayName ?? t('misc.unknownUser')}
                    avatarUrl={bm.author?.avatarUrl ?? null}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-gray-200">
                        {bm.author?.displayName ?? t('misc.unknownUser')}
                      </span>
                      {bm.channelName && (
                        <span className="text-xs text-gray-500">#{bm.channelName}</span>
                      )}
                      <span className="text-xs text-gray-500">
                        {relativeTime(bm.message.createdAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-gray-300">
                      <MarkdownRenderer content={bm.message.bodyMarkdown} />
                    </div>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      removeMutation.mutate(bm.message.id ?? bm.messageId);
                    }}
                    className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-800 hover:text-red-400"
                    title={t('bookmark.remove')}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
