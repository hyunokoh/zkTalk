'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InboxView } from '@/components/InboxView';
import type { InboxItemData } from '@/components/InboxItem';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface InboxResponse {
  items: InboxItemData[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface InboxSummaryResponse {
  all: number;
  mentions: number;
  threads: number;
}

export default function InboxPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ['inbox'],
    queryFn: () => api<InboxResponse>('/api/inbox'),
  });

  const inboxSummaryQuery = useQuery({
    queryKey: ['inbox-summary'],
    queryFn: () => api<InboxSummaryResponse>('/api/inbox/summary'),
  });

  const invalidateInboxQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inbox'] }),
      queryClient.invalidateQueries({ queryKey: ['inbox-summary'] }),
    ]);
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (messageId: string) => api(`/api/inbox/${messageId}/read`, { method: 'POST' }),
    onSuccess: invalidateInboxQueries,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api('/api/inbox/read-all', { method: 'POST', body: {} }),
    onSuccess: invalidateInboxQueries,
  });

  const items = inboxQuery.data?.items ?? [];
  const unreadCount = inboxSummaryQuery.data?.all ?? items.filter((item) => !item.isRead).length;

  const handleMarkRead = useCallback(
    async (messageId: string) => {
      await markReadMutation.mutateAsync(messageId);
    },
    [markReadMutation],
  );

  return (
    <div className="flex-1 overflow-y-auto" data-testid="inbox-page">
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {t('inbox.title')}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {t('inbox.listSubtitle')}
            </p>
          </div>
          <button
            type="button"
            data-testid="inbox-mark-all-read-button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="rounded-lg border border-line bg-bg-subtle px-3 py-2 text-sm font-medium text-fg transition hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markAllReadMutation.isPending
              ? t('inbox.markingAllRead')
              : t('inbox.markAllRead')}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-bg-subtle shadow-sm">
          <InboxView
            items={items}
            isLoading={inboxQuery.isLoading}
            onMarkRead={handleMarkRead}
          />
        </div>
      </div>
    </div>
  );
}
