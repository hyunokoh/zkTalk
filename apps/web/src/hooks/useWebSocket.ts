'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import type { WSIncoming, WSOutgoing } from '@zktalk/shared';

// ── Constants ───────────────────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/api/ws';
const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

// ── Singleton state (shared across all hook consumers) ──────────────

type EventHandler = (message: WSOutgoing) => void;

let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let intentionallyClosed = false;
const listeners = new Map<string, Set<EventHandler>>();
let refCount = 0;

function getReconnectDelay(): number {
  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt),
    RECONNECT_MAX_MS,
  );
  // Add jitter: +/- 20%
  return delay * (0.8 + Math.random() * 0.4);
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    sendRaw({ type: 'heartbeat' });
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function emit(event: string, message: WSOutgoing): void {
  const handlers = listeners.get(event);
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(message);
      } catch (err) {
        console.error('[WS] Handler error:', err);
      }
    }
  }
  // Also emit to wildcard listeners
  const wildcardHandlers = listeners.get('*');
  if (wildcardHandlers) {
    for (const handler of wildcardHandlers) {
      try {
        handler(message);
      } catch (err) {
        console.error('[WS] Wildcard handler error:', err);
      }
    }
  }
}

function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  intentionallyClosed = false;

  // Build URL - the cookie will be sent automatically
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[WS] Connected');
    reconnectAttempt = 0;
    startHeartbeat();
  };

  ws.onmessage = (event) => {
    try {
      const message: WSOutgoing = JSON.parse(event.data as string);
      emit(message.event, message);
    } catch {
      console.warn('[WS] Failed to parse message');
    }
  };

  ws.onclose = (event) => {
    console.log('[WS] Disconnected', event.code, event.reason);
    ws = null;
    stopHeartbeat();

    if (!intentionallyClosed && refCount > 0) {
      const delay = getReconnectDelay();
      reconnectAttempt++;
      console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempt})`);
      reconnectTimer = setTimeout(connect, delay);
    }
  };

  ws.onerror = (event) => {
    console.error('[WS] Error:', event);
  };
}

function disconnect(): void {
  intentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopHeartbeat();
  if (ws) {
    ws.close(1000, 'Client disconnect');
    ws = null;
  }
}

function sendRaw(message: WSIncoming): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// ── Public API ──────────────────────────────────────────────────────

export function subscribe(event: string, handler: EventHandler): () => void {
  let handlers = listeners.get(event);
  if (!handlers) {
    handlers = new Set();
    listeners.set(event, handlers);
  }
  handlers.add(handler);

  return () => {
    handlers!.delete(handler);
    if (handlers!.size === 0) {
      listeners.delete(event);
    }
  };
}

export function send(message: WSIncoming): void {
  sendRaw(message);
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

// ── Hook ────────────────────────────────────────────────────────────

/**
 * Manages the singleton WebSocket connection lifecycle.
 * Mount this hook once at a high level (e.g. layout) to keep the
 * connection alive while the user is authenticated.
 */
export function useWebSocket(): {
  send: typeof send;
  subscribe: typeof subscribe;
  isConnected: typeof isConnected;
} {
  const user = useAuthStore((s) => s.user);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!user) {
      disconnect();
      return;
    }

    refCount++;
    connect();

    return () => {
      refCount--;
      if (refCount <= 0) {
        refCount = 0;
        disconnect();
      }
    };
  }, [user]);

  return {
    send: useCallback((msg: WSIncoming) => send(msg), []),
    subscribe,
    isConnected,
  };
}
