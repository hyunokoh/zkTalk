'use client';

import { useState } from 'react';
import { InboxItem } from '@/components/InboxItem';
import type { InboxItemData } from '@/components/InboxItem';
import { useTranslation } from '@/lib/i18n';

type TabValue = 'all' | 'mentions' | 'threads';

interface InboxViewProps {
  items: InboxItemData[];
  isLoading: boolean;
  onMarkRead: (messageId: string) => Promise<void>;
}

export function InboxView({ items, isLoading, onMarkRead }: InboxViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  const TABS: { label: string; value: TabValue }[] = [
    { label: t('inbox.all'), value: 'all' },
    { label: t('inbox.mentions'), value: 'mentions' },
    { label: t('inbox.threads'), value: 'threads' },
  ];

  const filtered = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mentions') return item.type === 'mention';
    if (activeTab === 'threads') return item.type === 'thread_reply';
    return true;
  });

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {TABS.map((tab) => {
          const count = items.filter((i) => {
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
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-1 py-0.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
              {activeTab === tab.value && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-2">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-lg bg-gray-800/30 p-4">
                <div className="h-3 w-32 rounded bg-gray-700" />
                <div className="mt-2 h-4 w-64 rounded bg-gray-700" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3"
              />
            </svg>
            <p className="mt-3 text-sm text-gray-500">
              {activeTab === 'all'
                ? t('inbox.empty')
                : activeTab === 'mentions'
                  ? t('inbox.noMentions')
                  : t('inbox.noThreadReplies')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map((item) => (
              <InboxItem key={item.id} item={item} onMarkRead={onMarkRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
