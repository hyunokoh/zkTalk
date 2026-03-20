'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WebSocketEvent } from '@zktalk/shared';
import type { WSOutgoing, Message } from '@zktalk/shared';
import { send, subscribe } from './useWebSocket';

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
        if (msg.channelId !== channelId) return;
        const newMessage = msg.data as Message;

        // Append new message to the cached message list
        queryClient.setQueriesData<{ pages?: Array<{ messages: Message[] }> }>(
          { queryKey: ['messages', channelId] },
          (old) => {
            if (!old?.pages) return old;
            const firstPage = old.pages[0];
            if (!firstPage) return old;
            return {
              ...old,
              pages: [
                { ...firstPage, messages: [newMessage, ...firstPage.messages] },
                ...old.pages.slice(1),
              ],
            };
          },
        );
      },
    );

    // ── message.updated ───────────────────────────────────────────
    const unsubUpdated = subscribe(
      WebSocketEvent.MESSAGE_UPDATED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        const updated = msg.data as Message;

        queryClient.setQueriesData<{ pages?: Array<{ messages: Message[] }> }>(
          { queryKey: ['messages', channelId] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === updated.id ? updated : m,
                ),
              })),
            };
          },
        );
      },
    );

    // ── message.deleted ───────────────────────────────────────────
    const unsubDeleted = subscribe(
      WebSocketEvent.MESSAGE_DELETED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        const deleted = msg.data as { id: string };

        queryClient.setQueriesData<{ pages?: Array<{ messages: Message[] }> }>(
          { queryKey: ['messages', channelId] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.filter((m) => m.id !== deleted.id),
              })),
            };
          },
        );
      },
    );

    // ── Reactions ─────────────────────────────────────────────────
    const unsubReactionAdded = subscribe(
      WebSocketEvent.MESSAGE_REACTION_ADDED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        // Invalidate to refetch with updated reactions
        queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      },
    );

    const unsubReactionRemoved = subscribe(
      WebSocketEvent.MESSAGE_REACTION_REMOVED,
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
    };
  }, [channelId, queryClient]);
}
