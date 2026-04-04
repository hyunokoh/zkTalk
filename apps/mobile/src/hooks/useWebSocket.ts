import { useEffect, useState, useCallback, useRef } from 'react';
import { wsManager, type WsEvent, type WsConnectionStatus } from '../lib/websocket';
import { useAuthStore } from '../stores/auth';

/**
 * Hook that manages WebSocket lifecycle — connects on mount when authenticated,
 * disconnects on unmount or logout.
 */
export function useWebSocketConnection() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    if (!userId) {
      wsManager.disconnect();
      return;
    }

    wsManager.connect();
  }, [userId]);
}

export function useWebSocketStatus() {
  const [status, setStatus] = useState<WsConnectionStatus>(wsManager.getStatus());

  useEffect(() => wsManager.addStatusListener(setStatus), []);

  return status;
}

export function useWebSocket() {
  useWebSocketConnection();

  const status = useWebSocketStatus();
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);

  useEffect(() => {
    const removeEventListener = wsManager.addEventListener(setLastEvent);

    return () => {
      removeEventListener();
    };
  }, []);

  return { status, lastEvent };
}

/**
 * Hook to subscribe to a specific channel and receive its events.
 * Auto-subscribes on mount, unsubscribes on unmount.
 */
export function useChannelSubscription(channelId: string | undefined) {
  const bufferedEventsRef = useRef<WsEvent[]>([]);
  const [queuedEventCount, setQueuedEventCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!channelId) return;

    wsManager.subscribe(channelId);

    const removeListener = wsManager.addEventListener((event) => {
      const payload = event.payload as Record<string, unknown>;
      const nestedMessage = payload.message as Record<string, unknown> | undefined;
      const nestedChannel = payload.channel as Record<string, unknown> | undefined;
      const eventChannelId =
        (nestedMessage?.channelId as string | undefined) ??
        (nestedChannel?.id as string | undefined) ??
        (payload.channelId as string | undefined);

      // Only handle events for this channel
      if (eventChannelId && eventChannelId !== channelId) return;

      switch (event.type) {
        case 'message.created':
        case 'message.updated':
        case 'message.deleted':
        case 'message.reaction_added':
        case 'message.reaction_removed':
        case 'thread.created':
        case 'thread.updated':
        case 'thread.locked':
        case 'channel.updated':
          bufferedEventsRef.current.push(event);
          setQueuedEventCount((prev) => prev + 1);
          break;
        case 'typing.started': {
          const userId = payload.userId as string;
          if (!userId) break;
          setTypingUsers((prev) => {
            const next = new Map(prev);
            // Clear existing timeout for this user
            const existing = next.get(userId);
            if (existing) clearTimeout(existing);
            // Auto-remove after 5 seconds
            const timeout = setTimeout(() => {
              setTypingUsers((p) => {
                const n = new Map(p);
                n.delete(userId);
                return n;
              });
            }, 5000);
            next.set(userId, timeout);
            return next;
          });
          break;
        }
        case 'typing.stopped': {
          const userId = payload.userId as string;
          if (!userId) break;
          setTypingUsers((prev) => {
            const next = new Map(prev);
            const existing = next.get(userId);
            if (existing) clearTimeout(existing);
            next.delete(userId);
            return next;
          });
          break;
        }
      }
    });

    return () => {
      wsManager.unsubscribe(channelId);
      removeListener();
      // Clear typing timeouts on unmount
      setTypingUsers((prev) => {
        prev.forEach((timeout) => clearTimeout(timeout));
        return new Map();
      });
    };
  }, [channelId]);

  // Consume (clear) all buffered events
  const consumeEvents = useCallback(() => {
    const current = bufferedEventsRef.current;
    bufferedEventsRef.current = [];
    setQueuedEventCount(0);
    return current;
  }, []);

  return {
    queuedEventCount,
    consumeEvents,
    typingUserIds: Array.from(typingUsers.keys()),
  };
}

/**
 * Hook to subscribe to DM events for a specific conversation.
 */
export function useDmSubscription(conversationId: string | undefined) {
  const bufferedEventsRef = useRef<WsEvent[]>([]);
  const [queuedEventCount, setQueuedEventCount] = useState(0);

  useEffect(() => {
    if (!conversationId) return;

    const removeListener = wsManager.addEventListener((event) => {
      if (
        event.type !== 'dm.message_created' &&
        event.type !== 'dm.message_updated' &&
        event.type !== 'dm.message_deleted' &&
        event.type !== 'dm.conversation_updated'
      ) {
        return;
      }

      const payload = event.payload as Record<string, unknown>;
      const nestedMessage = payload.message as Record<string, unknown> | undefined;
      const nestedConversation = payload.conversation as Record<string, unknown> | undefined;
      const eventConversationId =
        (nestedMessage?.conversationId as string | undefined) ??
        (nestedConversation?.id as string | undefined) ??
        (payload.conversationId as string | undefined);

      if (eventConversationId === conversationId) {
        bufferedEventsRef.current.push(event);
        setQueuedEventCount((prev) => prev + 1);
      }
    });

    return () => {
      removeListener();
    };
  }, [conversationId]);

  const consumeEvents = useCallback(() => {
    const current = bufferedEventsRef.current;
    bufferedEventsRef.current = [];
    setQueuedEventCount(0);
    return current;
  }, []);

  return { queuedEventCount, consumeEvents };
}

/**
 * Hook for sending typing indicators with debounce.
 */
export function useTypingIndicator(channelId: string | undefined) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (!channelId) return;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      wsManager.sendTypingStopped(channelId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [channelId]);

  const startTyping = useCallback(() => {
    if (!channelId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsManager.sendTypingStarted(channelId);
    }

    // Reset the auto-stop timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [channelId, stopTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
}
