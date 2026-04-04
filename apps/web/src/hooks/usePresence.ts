'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WebSocketEvent } from '@zktalk/shared';
import type { WSOutgoing } from '@zktalk/shared';
import { send, subscribe } from './useWebSocket';

interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline';
}

/**
 * Subscribe to a community's presence events.
 *
 * Returns the set of user IDs currently online in the community.
 * Automatically subscribes/unsubscribes from the community on the
 * WebSocket server.
 */
export function usePresence(communityId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!communityId) return;

    // Subscribe to community events (which includes presence)
    send({ type: 'subscribe_community', communityId });

    const unsub = subscribe(
      WebSocketEvent.PRESENCE_UPDATED,
      (msg: WSOutgoing) => {
        if (msg.communityId !== communityId) return;
        const update = msg.data as PresenceUpdate;

        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (update.status === 'online') {
            next.add(update.userId);
          } else {
            next.delete(update.userId);
          }
          return next;
        });
      },
    );

    return () => {
      send({ type: 'unsubscribe_community', communityId });
      unsub();
      setOnlineUsers(new Set());
    };
  }, [communityId]);

  const isOnline = useCallback(
    (userId: string): boolean => onlineUsers.has(userId),
    [onlineUsers],
  );

  const onlineCount = useMemo(() => onlineUsers.size, [onlineUsers]);

  return {
    onlineUserIds: Array.from(onlineUsers),
    isOnline,
    onlineCount,
  };
}
