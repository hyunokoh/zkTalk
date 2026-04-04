'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WebSocketEvent } from '@zktalk/shared';
import type { WSOutgoing, Attachment, Message, User } from '@zktalk/shared';
import { send, subscribe } from './useWebSocket';
import { useUnreadStore } from '@/stores/unread';

interface MessageRow {
  message: Message;
  author: User;
  attachments?: Attachment[];
}

interface MessagesPage {
  messages: MessageRow[];
  hasMore: boolean;
  nextCursor?: string | null;
  unreadCounts?: Record<string, number>;
}

type MessagesQueryData = {
  pages?: MessagesPage[];
  pageParams?: unknown[];
};

type MessageQueryKey = [string, string, string, string];

function isMessageRow(value: unknown): value is MessageRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return !!row.message && typeof row.message === 'object' && !!row.author && typeof row.author === 'object';
}

function getMessageQueryKeys(channelId: string, message: Message): MessageQueryKey[] {
  if (message.threadId) {
    return [['messages', channelId, message.threadId, '']];
  }

  const keys: MessageQueryKey[] = [['messages', channelId, 'main', '']];
  if (message.topic) {
    keys.push(['messages', channelId, 'main', message.topic]);
  }
  return keys;
}

function upsertMessageRow(old: MessagesQueryData | undefined, row: MessageRow): MessagesQueryData | undefined {
  if (!old?.pages?.length) {
    return old;
  }

  let changed = false;
  const pages = old.pages.map((page, pageIndex) => {
    const existingIndex = page.messages.findIndex((item) => item.message.id === row.message.id);
    if (existingIndex >= 0) {
      changed = true;
      return {
        ...page,
        messages: page.messages.map((item) =>
          item.message.id === row.message.id ? row : item,
        ),
      };
    }

    if (pageIndex === 0) {
      changed = true;
      return {
        ...page,
        messages: [row, ...page.messages],
      };
    }

    return page;
  });

  return changed ? { ...old, pages } : old;
}

function replaceMessageRow(old: MessagesQueryData | undefined, row: MessageRow): MessagesQueryData | undefined {
  if (!old?.pages?.length) {
    return old;
  }

  let changed = false;
  const pages = old.pages.map((page) => ({
    ...page,
    messages: page.messages.map((item) => {
      if (item.message.id !== row.message.id) {
        return item;
      }
      changed = true;
      return row;
    }),
  }));

  return changed ? { ...old, pages } : old;
}

function softDeleteCachedMessage(
  old: MessagesQueryData | undefined,
  messageId: string,
): MessagesQueryData | undefined {
  if (!old?.pages?.length) {
    return old;
  }

  let changed = false;
  const pages = old.pages.map((page) => ({
    ...page,
    messages: page.messages.map((item) => {
      if (item.message.id !== messageId) {
        return item;
      }
      changed = true;
      return {
        ...item,
        message: {
          ...item.message,
          bodyMarkdown: '',
          bodyPlaintext: '',
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        },
      };
    }),
  }));

  return changed ? { ...old, pages } : old;
}

/**
 * Subscribe to a channel's real-time events.
 *
 * On mount: sends `subscribe_channel` to the WebSocket server.
 * On unmount: sends `unsubscribe_channel`.
 *
 * Automatically updates TanStack Query caches for messages when
 * message.created / message.updated / message.deleted events arrive.
 */
export function useChannel(channelId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId) return;

    // Subscribe to this channel on the server
    send({ type: 'subscribe_channel', channelId });

    // ── message.created ───────────────────────────────────────────
    const unsubCreated = subscribe(
      WebSocketEvent.MESSAGE_CREATED,
      (msg: WSOutgoing) => {
        const row = isMessageRow(msg.data) ? msg.data : null;
        const newMessage = row?.message ?? (msg.data as Message);
        const eventChannelId = msg.channelId ?? newMessage.channelId;
        if (eventChannelId !== channelId) return;
        const unreadStore = useUnreadStore.getState();
        const isActiveChannel =
          typeof window !== 'undefined'
          && window.location.pathname.includes(`/channels/${channelId}`);

        if (row) {
          for (const key of getMessageQueryKeys(channelId, row.message)) {
            queryClient.setQueryData<MessagesQueryData>(key, (old) => upsertMessageRow(old, row));
          }
        }
        if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isActiveChannel) {
          void unreadStore.markRead(channelId, newMessage.id);
        } else {
          unreadStore.incrementUnread(channelId);
        }
      },
    );

    // ── message.updated ───────────────────────────────────────────
    const unsubUpdated = subscribe(
      WebSocketEvent.MESSAGE_UPDATED,
      (msg: WSOutgoing) => {
        const row = isMessageRow(msg.data) ? msg.data : null;
        const updated = row?.message ?? (msg.data as Message);
        const eventChannelId = msg.channelId ?? updated.channelId;
        if (eventChannelId !== channelId) return;
        const unreadStore = useUnreadStore.getState();
        const isActiveChannel =
          typeof window !== 'undefined'
          && window.location.pathname.includes(`/channels/${channelId}`);

        if (row) {
          for (const key of getMessageQueryKeys(channelId, row.message)) {
            queryClient.setQueryData<MessagesQueryData>(key, (old) => replaceMessageRow(old, row));
          }
        }
        if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isActiveChannel) {
          void unreadStore.markRead(channelId, updated.id);
        }
      },
    );

    // ── message.deleted ───────────────────────────────────────────
    const unsubDeleted = subscribe(
      WebSocketEvent.MESSAGE_DELETED,
      (msg: WSOutgoing) => {
        const deleted = msg.data as { id?: string; messageId?: string };
        const eventChannelId = msg.channelId ?? (deleted as { channelId?: string }).channelId;
        if (eventChannelId !== channelId) return;
        const deletedId = deleted.id ?? deleted.messageId;
        if (!deletedId) return;
        queryClient.setQueriesData<MessagesQueryData>(
          { queryKey: ['messages', channelId] },
          (old) => softDeleteCachedMessage(old, deletedId),
        );
      },
    );

    // ── Reactions ─────────────────────────────────────────────────
    const unsubReactionAdded = subscribe(
      WebSocketEvent.MESSAGE_REACTION_ADDED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        queryClient.invalidateQueries({ queryKey: ['channel-reactions', channelId] });
      },
    );

    const unsubReactionRemoved = subscribe(
      WebSocketEvent.MESSAGE_REACTION_REMOVED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        queryClient.invalidateQueries({ queryKey: ['channel-reactions', channelId] });
      },
    );

    const unsubChannelUpdated = subscribe(
      WebSocketEvent.CHANNEL_UPDATED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      },
    );

    return () => {
      send({ type: 'unsubscribe_channel', channelId });
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubReactionAdded();
      unsubReactionRemoved();
      unsubChannelUpdated();
    };
  }, [channelId, queryClient]);
}
