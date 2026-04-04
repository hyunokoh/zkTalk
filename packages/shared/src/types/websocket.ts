import type { WebSocketEvent } from '../constants/index';

// ── Incoming messages (client → server) ─────────────────────────────

export type WSIncoming =
  | { type: 'subscribe_channel'; channelId: string }
  | { type: 'unsubscribe_channel'; channelId: string }
  | { type: 'subscribe_community'; communityId: string }
  | { type: 'unsubscribe_community'; communityId: string }
  | { type: 'subscribe_dm'; conversationId: string }
  | { type: 'unsubscribe_dm'; conversationId: string }
  | { type: 'typing_start'; channelId: string }
  | { type: 'typing_stop'; channelId: string }
  | { type: 'heartbeat' }
  | { type: 'p2p_signal'; targetUserId: string; fileId: string; signal: unknown }
  | { type: 'p2p_file_request'; fileId: string; channelId?: string; conversationId?: string }
  | { type: 'p2p_file_available'; fileId: string; targetUserId: string };

// ── Outgoing messages (server → client) ─────────────────────────────

export interface WSOutgoing {
  event: WebSocketEvent;
  data: unknown;
  channelId?: string;
  communityId?: string;
  conversationId?: string;
  timestamp: string;
}

// ── Redis pub/sub message envelope ──────────────────────────────────

export interface RedisPubSubMessage {
  event: string;
  data: unknown;
  channelId?: string;
  communityId?: string;
  conversationId?: string;
  excludeUserId?: string;
}
