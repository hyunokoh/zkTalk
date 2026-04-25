'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { InboxItem } from '@/components/InboxItem';
import { LoadingState } from '@/components/LoadingState';
import type { InboxItemData } from '@/components/InboxItem';
import { useTranslation } from '@/lib/i18n';

type TabValue = 'unread' | 'all' | 'mentions' | 'threads';

interface InboxViewProps {
  items: InboxItemData[];
  isLoading: boolean;
  onMarkRead: (messageId: string) => Promise<void>;
}

export function InboxView({ items, isLoading, onMarkRead }: InboxViewProps) {
  const { t } = useTranslation();
  // Default to "Unread" so the page opens on the thing the user actually
  // came here for — every channel, thread, and DM message they haven't
  // seen yet, in one place.
  const [activeTab, setActiveTab] = useState<TabValue>('unread');

  const TABS: { label: string; value: TabValue }[] = [
    { label: t('inbox.unread'), value: 'unread' },
    { label: t('inbox.all'), value: 'all' },
    { label: t('inbox.mentions'), value: 'mentions' },
    { label: t('inbox.threads'), value: 'threads' },
  ];

  const filtered = items.filter((item) => {
    if (activeTab === 'unread') return !item.isRead;
    if (activeTab === 'all') return true;
    if (activeTab === 'mentions') return item.type === 'mention';
    if (activeTab === 'threads') return item.type === 'thread_reply';
    return true;
  });

  return (
    <div>
      <div className="flex border-b border-line">
        {TABS.map((tab) => {
          const count = items.filter((i) => {
            if (tab.value === 'unread') return !i.isRead;
            if (tab.value === 'all') return !i.isRead;
            if (tab.value === 'mentions') return i.type === 'mention' && !i.isRead;
            return i.type === 'thread_reply' && !i.isRead;
          }).length;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'text-fg'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[10px] font-bold text-[color:var(--on-accent)]">
                  {count}
                </span>
              )}
              {activeTab === tab.value && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2">
        {isLoading ? (
          <LoadingState message={t('common.loading')} compact />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              activeTab === 'unread'
                ? t('inbox.noUnread')
                : activeTab === 'all'
                  ? t('inbox.empty')
                  : activeTab === 'mentions'
                    ? t('inbox.noMentions')
                    : t('inbox.noThreadReplies')
            }
            className="m-4"
          />
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((item) => (
              <InboxItem key={item.id} item={item} onMarkRead={onMarkRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
