'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { UserAvatar } from '@/components/UserAvatar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { relativeTime } from '@/lib/time';

interface PinRow {
  pin: {
    id: string;
    channelId: string;
    messageId: string;
    pinnedByUserId: string;
    pinnedAt: string;
  };
  message: {
    id: string;
    bodyMarkdown: string;
    createdAt: string;
    authorUserId: string;
  };
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface PinnedMessagesProps {
  channelId: string;
  onClose: () => void;
}

export function PinnedMessages({ channelId, onClose }: PinnedMessagesProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: pinsData, isLoading } = useQuery({
    queryKey: ['pins', channelId],
    queryFn: () => api<{ pins: PinRow[] }>(`/api/channels/${channelId}/pins`),
  });

  const pins = pinsData?.pins;

  const unpinMutation = useMutation({
    mutationFn: (messageId: string) =>
      api(`/api/channels/${channelId}/pins/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pins', channelId] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="mt-12 mr-4 w-full max-w-sm rounded-lg border border-line bg-white shadow-xl dark:border-line dark:bg-bg-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-line">
          <h3 className="text-sm font-semibold text-fg dark:text-fg-muted">{t('pin.pinned')}</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg dark:text-fg-muted dark:hover:text-fg-muted">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-fg-muted">{t('common.loading')}</div>
          ) : !pins || pins.length === 0 ? (
            <div className="py-8 text-center text-sm text-fg-muted">{t('pin.noPins')}</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pins.map((row) => (
                <div key={row.pin.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <UserAvatar
                      displayName={row.author?.displayName ?? t('misc.unknownUser')}
                      avatarUrl={row.author?.avatarUrl ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-fg dark:text-fg-muted">
                          {row.author?.displayName ?? t('misc.unknownUser')}
                        </span>
                        <span className="text-xs text-fg-muted">
                          {relativeTime(row.message.createdAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-fg dark:text-fg-muted">
                        <MarkdownRenderer content={row.message.bodyMarkdown} />
                      </div>
                      <p className="mt-1 text-xs text-fg-muted">
                        📌 {relativeTime(row.pin.pinnedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => unpinMutation.mutate(row.pin.messageId)}
                      className="shrink-0 rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg dark:hover:bg-bg-subtle dark:hover:text-fg-muted"
                      title={t('pin.unpin')}
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
