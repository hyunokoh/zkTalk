'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
}

interface CategoryGroup {
  category: Category;
  channels: Channel[];
}

interface ChannelsResponse {
  uncategorized: Channel[];
  categories: CategoryGroup[];
}

interface ForwardMessageModalProps {
  messageId: string;
  communityId: string;
  onClose: () => void;
}

export function ForwardMessageModal({ messageId, communityId, onClose }: ForwardMessageModalProps) {
  const { t } = useTranslation();
  const [forwarded, setForwarded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['channels', communityId],
    queryFn: () => api<ChannelsResponse>(`/api/communities/${communityId}/channels`),
  });

  const forwardMutation = useMutation({
    mutationFn: (targetChannelId: string) =>
      api(`/api/messages/${messageId}/forward`, {
        method: 'POST',
        body: { targetChannelId },
      }),
    onSuccess: () => {
      setForwarded(true);
      setTimeout(onClose, 1500);
    },
  });

  const allChannels: Channel[] = [];
  if (data) {
    allChannels.push(...data.uncategorized);
    for (const group of data.categories) {
      allChannels.push(...group.channels);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-line bg-white shadow-xl dark:border-line dark:bg-bg-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-line">
          <h3 className="text-sm font-semibold text-fg dark:text-fg-muted">{t('forward.title')}</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg dark:text-fg-muted dark:hover:text-fg-muted">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-4">
          {forwarded ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <svg className="h-8 w-8 text-success" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-fg dark:text-fg-muted">{t('forward.success')}</p>
            </div>
          ) : isLoading ? (
            <div className="py-8 text-center text-sm text-fg-muted">{t('common.loading')}</div>
          ) : (
            <>
              <p className="mb-3 text-sm text-fg-muted dark:text-fg-muted">{t('forward.selectChannel')}</p>
              <div className="space-y-1">
                {allChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => forwardMutation.mutate(channel.id)}
                    disabled={forwardMutation.isPending}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-fg hover:bg-bg-hover dark:text-fg-muted dark:hover:bg-bg-subtle"
                  >
                    <span className="text-fg-muted">
                      {channel.type === 'forum' ? (
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        '#'
                      )}
                    </span>
                    <span>{channel.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
