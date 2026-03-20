import type { WebSocketEvent } from '../constants/index.js';

// ── Incoming messages (client → server) ─────────────────────────────

export type WSIncoming =
  | { type: 'subscribe_channel'; channelId: string }
  | { type: 'unsubscribe_channel'; channelId: string }
  | { type: 'subscribe_community'; communityId: string }
  | { type: 'unsubscribe_community'; communityId: string }
  | { type: 'typing_start'; channelId: string }
  | { type: 'typing_stop'; channelId: string }
  | { type: 'heartbeat' };

// ── Outgoing messages (server → client) ─────────────────────────────

export interface WSOutgoing {
  event: WebSocketEvent;
  data: unknown;
  channelId?: string;
  communityId?: string;
  timestamp: string;
}

// ── Redis pub/sub message envelope ──────────────────────────────────

export interface RedisPubSubMessage {
  event: string;
  data: unknown;
  channelId?: string;
  communityId?: string;
  excludeUserId?: string;
}
