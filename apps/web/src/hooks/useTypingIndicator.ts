'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketEvent } from '@zktalk/shared';
import type { WSOutgoing } from '@zktalk/shared';
import { useAuthStore } from '@/stores/auth';
import { send, subscribe } from './useWebSocket';

interface TypingEvent {
  userId: string;
  channelId: string;
}

const TYPING_DEBOUNCE_MS = 2_000;
const TYPING_EXPIRE_MS = 5_000;

/**
 * Manage typing indicators for a channel.
 *
 * Returns:
 *  - `typingUsers`: array of user IDs currently typing (excluding self)
 *  - `startTyping()`: call when the user starts typing (debounced internally)
 *  - `stopTyping()`: call when the user stops typing (e.g., on blur or send)
 */
export function useTypingIndicator(channelId: string | undefined): {
  typingUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
} {
  const currentUser = useAuthStore((s) => s.user);
  const [typingMap, setTypingMap] = useState<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ── Listen for typing events from others ────────────────────────
  useEffect(() => {
    if (!channelId) return;

    const unsubStarted = subscribe(
      WebSocketEvent.TYPING_STARTED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        const event = msg.data as TypingEvent;
        if (event.userId === currentUser?.id) return;

        setTypingMap((prev) => {
          const next = new Map(prev);
          // Clear existing timer for this user
          const existing = next.get(event.userId);
          if (existing) clearTimeout(existing);
          // Set auto-expire timer
          const timer = setTimeout(() => {
            setTypingMap((current) => {
              const updated = new Map(current);
              updated.delete(event.userId);
              return updated;
            });
          }, TYPING_EXPIRE_MS);
          next.set(event.userId, timer);
          return next;
        });
      },
    );

    const unsubStopped = subscribe(
      WebSocketEvent.TYPING_STOPPED,
      (msg: WSOutgoing) => {
        if (msg.channelId !== channelId) return;
        const event = msg.data as TypingEvent;
        if (event.userId === currentUser?.id) return;

        setTypingMap((prev) => {
          const next = new Map(prev);
          const existing = next.get(event.userId);
          if (existing) clearTimeout(existing);
          next.delete(event.userId);
          return next;
        });
      },
    );

    return () => {
      unsubStarted();
      unsubStopped();
      // Clear all timers
      setTypingMap((prev) => {
        for (const timer of prev.values()) clearTimeout(timer);
        return new Map();
      });
    };
  }, [channelId, currentUser?.id]);

  // ── Send typing_start (debounced) ───────────────────────────────
  const startTyping = useCallback(() => {
    if (!channelId) return;

    // If not already marked as typing, send immediately
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      send({ type: 'typing_start', channelId });
    }

    // Reset the debounce timer - will auto-stop after inactivity
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
      send({ type: 'typing_stop', channelId });
    }, TYPING_DEBOUNCE_MS);
  }, [channelId]);

  // ── Send typing_stop immediately ────────────────────────────────
  const stopTyping = useCallback(() => {
    if (!channelId) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      send({ type: 'typing_stop', channelId });
    }
  }, [channelId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    typingUsers: Array.from(typingMap.keys()),
    startTyping,
    stopTyping,
  };
}
