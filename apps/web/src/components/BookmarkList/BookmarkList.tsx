'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
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
      <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_100%)] px-5 py-5 md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-xl font-bold text-white">{t('bookmark.title')}</h2>
          <p className="mt-1 text-sm text-white/56">{t('bookmark.empty')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {isLoading ? (
            <LoadingState message={t('common.loading')} compact />
          ) : !bookmarks || bookmarks.length === 0 ? (
            <EmptyState title={t('bookmark.empty')} />
          ) : (
            <div className="space-y-3">
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
                  className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,28,42,0.98),rgba(11,18,29,0.98))] px-4 py-4 text-left shadow-[0_18px_42px_rgba(2,8,23,0.18)] transition hover:border-white/12 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      displayName={bm.author?.displayName ?? t('misc.unknownUser')}
                      avatarUrl={bm.author?.avatarUrl ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold text-fg-muted">
                          {bm.author?.displayName ?? t('misc.unknownUser')}
                        </span>
                        {bm.channelName && (
                          <span className="text-xs text-fg-muted">#{bm.channelName}</span>
                        )}
                        <span className="text-xs text-fg-muted">
                          {relativeTime(bm.message.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-fg-muted">
                        <MarkdownRenderer content={bm.message.bodyMarkdown} />
                      </div>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        removeMutation.mutate(bm.message.id ?? bm.messageId);
                      }}
                      className="shrink-0 rounded-xl p-2 text-fg-muted transition hover:bg-white/10 hover:text-danger"
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
    </div>
  );
}
