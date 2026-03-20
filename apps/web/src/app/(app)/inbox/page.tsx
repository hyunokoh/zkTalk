'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { InboxView } from '@/components/InboxView';
import type { InboxItemData } from '@/components/InboxItem';

interface InboxApiItem {
  type: 'mention' | 'thread_reply';
  id: string;
  channelId: string;
  channelName: string;
  communitySlug: string;
  authorDisplayName: string;
  bodyPreview: string;
  messageId: string;
  threadId?: string;
  createdAt: string;
  isRead: boolean;
}

export default function InboxPage() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const res = await api<{ items: InboxApiItem[] }>('/api/inbox');
      return res.items.map(
        (item): InboxItemData => ({
          id: item.id,
          type: item.type,
          channelName: item.channelName,
          communitySlug: item.communitySlug,
          channelId: item.channelId,
          messageId: item.messageId,
          threadId: item.threadId,
          authorDisplayName: item.authorDisplayName,
          bodyPreview: item.bodyPreview,
          createdAt: item.createdAt,
          isRead: item.isRead,
        }),
      );
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api(`/api/inbox/${id}/read`, { method: 'POST' }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['inbox'] });
      queryClient.setQueryData<InboxItemData[]>(['inbox'], (old) =>
        old?.map((item) =>
          item.id === id ? { ...item, isRead: true } : item,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  const handleMarkRead = useCallback(
    (id: string) => {
      markRead.mutate(id);
    },
    [markRead],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold">Inbox</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <InboxView
          items={items}
          isLoading={isLoading}
          onMarkRead={handleMarkRead}
        />
      </div>
    </div>
  );
}
