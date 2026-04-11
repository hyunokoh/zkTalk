import { WS_ORIGIN } from './network-config';
import { getToken } from './storage';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePayload(raw: RawWsEvent): Record<string, unknown> {
  const payload: Record<string, unknown> = isRecord(raw.data)
    ? { ...raw.data }
    : raw.data === null || raw.data === undefined
      ? {}
      : { value: raw.data };

  if (raw.channelId && !payload.channelId) {
    payload.channelId = raw.channelId;
  }
  if (raw.communityId && !payload.communityId) {
    payload.communityId = raw.communityId;
  }
  if (raw.conversationId && !payload.conversationId) {
    payload.conversationId = raw.conversationId;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WsEventType =
  | 'message.created'
  | 'message.updated'
  | 'message.deleted'
  | 'message.reaction_added'
  | 'message.reaction_removed'
  | 'thread.created'
  | 'thread.updated'
  | 'thread.locked'
  | 'typing.started'
  | 'typing.stopped'
  | 'dm.message_created'
  | 'dm.message_updated'
  | 'dm.message_deleted'
  | 'dm.conversation_created'
  | 'dm.conversation_updated'
  | 'presence.updated'
  | 'profile.updated'
  | 'channel.updated'
  | 'connected'
  | 'error'
  | 'heartbeat_ack';

export interface WsEvent {
  type: WsEventType;
  payload: Record<string, unknown>;
  timestamp?: string;
}

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type EventListener = (event: WsEvent) => void;
type StatusListener = (status: WsConnectionStatus) => void;

interface RawWsEvent {
  event: WsEventType | string;
  data: unknown;
  channelId?: string;
  communityId?: string;
  conversationId?: string;
  timestamp?: string;
}

type WsClientMessage =
  | { type: 'subscribe_channel'; channelId: string }
  | { type: 'unsubscribe_channel'; channelId: string }
  | { type: 'subscribe_community'; communityId: string }
  | { type: 'unsubscribe_community'; communityId: string }
  | { type: 'subscribe_dm'; conversationId: string }
  | { type: 'unsubscribe_dm'; conversationId: string }
  | { type: 'typing_start'; channelId: string }
  | { type: 'typing_stop'; channelId: string }
  | { type: 'heartbeat' };

// ---------------------------------------------------------------------------
// WebSocket Manager (singleton)
// ---------------------------------------------------------------------------

class WebSocketManager {
  private ws: WebSocket | null = null;
  private status: WsConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private subscribedChannels = new Set<string>();
  private subscribedCommunities = new Set<string>();
  private subscribedDms = new Set<string>();
  private eventListeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();
  private isManualDisconnect = false;

  // ------ Connection ------

  async connect(): Promise<void> {
    if (
      this.ws?.readyState === WebSocket.OPEN
      || this.ws?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.isManualDisconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (!WS_ORIGIN) {
      console.warn('[WS] API URL is not configured, skipping connect');
      return;
    }
    const token = await getToken();
    if (!token) {
      console.warn('[WS] No auth token, skipping connect');
      return;
    }

    this.setStatus('connecting');

    try {
      const wsUrl = `${WS_ORIGIN}/api/ws?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startHeartbeat();
        // Re-subscribe to all channels/communities after reconnect
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as RawWsEvent;
          if (!data?.event || data.event === 'heartbeat_ack') return;
          this.notifyListeners({
            type: data.event as WsEventType,
            payload: normalizePayload(data),
            timestamp: data.timestamp,
          });
        } catch {
          // Ignore non-JSON messages
        }
      };

      this.ws.onerror = (_error) => {
        console.warn('[WS] Connection error');
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
        if (!this.isManualDisconnect) {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  // ------ Subscribe / Unsubscribe ------

  subscribe(channelId: string): void {
    this.subscribedChannels.add(channelId);
    this.send({ type: 'subscribe_channel', channelId });
  }

  unsubscribe(channelId: string): void {
    this.subscribedChannels.delete(channelId);
    this.send({ type: 'unsubscribe_channel', channelId });
  }

  subscribeCommunity(communityId: string): void {
    this.subscribedCommunities.add(communityId);
    this.send({ type: 'subscribe_community', communityId });
  }

  unsubscribeCommunity(communityId: string): void {
    this.subscribedCommunities.delete(communityId);
    this.send({ type: 'unsubscribe_community', communityId });
  }

  subscribeDm(conversationId: string): void {
    this.subscribedDms.add(conversationId);
    this.send({ type: 'subscribe_dm', conversationId });
  }

  unsubscribeDm(conversationId: string): void {
    this.subscribedDms.delete(conversationId);
    this.send({ type: 'unsubscribe_dm', conversationId });
  }

  // ------ Send ------

  send(msg: WsClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send, not connected');
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  // ------ Typing indicators ------

  sendTypingStarted(channelId: string): void {
    this.send({ type: 'typing_start', channelId });
  }

  sendTypingStopped(channelId: string): void {
    this.send({ type: 'typing_stop', channelId });
  }

  // ------ Event listeners ------

  addEventListener(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  addStatusListener(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): WsConnectionStatus {
    return this.status;
  }

  // ------ Internal helpers ------

  private setStatus(status: WsConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private notifyListeners(event: WsEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[WS] Event listener error:', err);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnect attempts reached');
      this.setStatus('disconnected');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private resubscribeAll(): void {
    for (const channelId of this.subscribedChannels) {
      this.send({ type: 'subscribe_channel', channelId });
    }
    for (const communityId of this.subscribedCommunities) {
      this.send({ type: 'subscribe_community', communityId });
    }
    for (const conversationId of this.subscribedDms) {
      this.send({ type: 'subscribe_dm', conversationId });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Export singleton
export const wsManager = new WebSocketManager();
