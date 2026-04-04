'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/stores/auth';
import type { WSIncoming, WSOutgoing } from '@zktalk/shared';
import { getWebSocketUrl } from '@/lib/runtime-config';
import { getSessionToken } from '@/lib/session-token';

// ── Constants ───────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

// ── Singleton state (shared across all hook consumers) ──────────────

type EventHandler = (message: WSOutgoing) => void;

export type WebSocketStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let intentionallyClosed = false;
const listeners = new Map<string, Set<EventHandler>>();
const statusListeners = new Set<() => void>();
let connectionStatus: WebSocketStatus = 'idle';
let refCount = 0;
const subscribedChannels = new Set<string>();
const subscribedCommunities = new Set<string>();
const subscribedDms = new Set<string>();

function emitStatusChange(): void {
  for (const listener of statusListeners) {
    listener();
  }
}

function setConnectionStatus(status: WebSocketStatus): void {
  if (connectionStatus === status) {
    return;
  }
  connectionStatus = status;
  emitStatusChange();
}

function getConnectionSnapshot(): WebSocketStatus {
  return connectionStatus;
}

function subscribeToConnectionStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function clearSubscriptions(): void {
  subscribedChannels.clear();
  subscribedCommunities.clear();
  subscribedDms.clear();
}

function replaySubscriptions(): void {
  for (const channelId of subscribedChannels) {
    sendRaw({ type: 'subscribe_channel', channelId });
  }
  for (const communityId of subscribedCommunities) {
    sendRaw({ type: 'subscribe_community', communityId });
  }
  for (const conversationId of subscribedDms) {
    sendRaw({ type: 'subscribe_dm', conversationId });
  }
}

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
  setConnectionStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

  // Build URL. Desktop/web can authenticate via query token even when
  // there is no cookie-based session available.
  const wsUrl = new URL(getWebSocketUrl());
  const sessionToken = getSessionToken();
  if (sessionToken) {
    wsUrl.searchParams.set('token', sessionToken);
  }

  ws = new WebSocket(wsUrl.toString());

  ws.onopen = () => {
    console.log('[WS] Connected');
    reconnectAttempt = 0;
    setConnectionStatus('connected');
    startHeartbeat();
    replaySubscriptions();
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
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setConnectionStatus('offline');
      } else {
        setConnectionStatus('reconnecting');
      }
      const delay = getReconnectDelay();
      reconnectAttempt++;
      console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempt})`);
      reconnectTimer = setTimeout(connect, delay);
      return;
    }

    setConnectionStatus('idle');
  };

  ws.onerror = (event) => {
    console.error('[WS] Error:', event);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setConnectionStatus('offline');
    }
  };
}

function handleBrowserOnline(): void {
  if (refCount <= 0) {
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  reconnectAttempt = 0;
  connect();
}

function handleBrowserOffline(): void {
  setConnectionStatus('offline');
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleBrowserOnline);
  window.addEventListener('offline', handleBrowserOffline);
}

function disconnect(): void {
  intentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopHeartbeat();
  clearSubscriptions();
  if (ws) {
    ws.close(1000, 'Client disconnect');
    ws = null;
  }
  setConnectionStatus('idle');
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
  switch (message.type) {
    case 'subscribe_channel':
      subscribedChannels.add(message.channelId);
      break;
    case 'unsubscribe_channel':
      subscribedChannels.delete(message.channelId);
      break;
    case 'subscribe_community':
      subscribedCommunities.add(message.communityId);
      break;
    case 'unsubscribe_community':
      subscribedCommunities.delete(message.communityId);
      break;
    case 'subscribe_dm':
      subscribedDms.add(message.conversationId);
      break;
    case 'unsubscribe_dm':
      subscribedDms.delete(message.conversationId);
      break;
    default:
      break;
  }
  sendRaw(message);
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export function useWebSocketStatus(): WebSocketStatus {
  return useSyncExternalStore(
    subscribeToConnectionStatus,
    getConnectionSnapshot,
    getConnectionSnapshot,
  );
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
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      disconnect();
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setConnectionStatus('offline');
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
  }, [userId]);

  return {
    send: useCallback((msg: WSIncoming) => send(msg), []),
    subscribe,
    isConnected,
  };
}
