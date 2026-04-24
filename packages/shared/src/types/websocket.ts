import type { WebSocketEvent } from '../constants/index';

// ── Incoming messages (client → server) ─────────────────────────────

export type WSIncoming =
  | { type: 'subscribe_channel'; channelId: string }
  | { type: 'unsubscribe_channel'; channelId: string }
  | { type: 'subscribe_community'; communityId: string }
  | { type: 'unsubscribe_community'; communityId: string }
  | { type: 'subscribe_dm'; conversationId: string }
  | { type: 'unsubscribe_dm'; conversationId: string }
  | { type: 'subscribe_device'; deviceId: string }
  | { type: 'unsubscribe_device'; deviceId: string }
  | { type: 'subscribe_command'; commandId: string }
  | { type: 'unsubscribe_command'; commandId: string }
  | { type: 'typing_start'; channelId: string }
  | { type: 'typing_stop'; channelId: string }
  | { type: 'heartbeat' }
  | { type: 'device_heartbeat'; deviceId: string; payload: DeviceHeartbeatIncoming }
  | { type: 'command_chunk'; commandId: string; stream: 'stdout' | 'stderr'; data: string }
  | { type: 'command_result'; commandId: string; exitCode: number; stdoutTrunc?: string; stderrTrunc?: string }
  | { type: 'p2p_signal'; targetUserId: string; fileId: string; signal: unknown }
  | { type: 'p2p_file_request'; fileId: string; channelId?: string; conversationId?: string }
  | { type: 'p2p_file_available'; fileId: string; targetUserId: string };

// Heartbeat shape sent by the desktop bridge over the device socket.
export interface DeviceHeartbeatIncoming {
  at: string;
  cpu: number;
  ramUsed: number;
  ramTotal: number;
  runningCount: number;
  agents: string[];
}

// ── Outgoing messages (server → client) ─────────────────────────────

export interface WSOutgoing {
  event: WebSocketEvent;
  data: unknown;
  channelId?: string;
  communityId?: string;
  conversationId?: string;
  machineId?: string;
  commandId?: string;
  deviceId?: string;
  timestamp: string;
}

// ── Redis pub/sub message envelope ──────────────────────────────────

export interface RedisPubSubMessage {
  event: string;
  data: unknown;
  channelId?: string;
  communityId?: string;
  conversationId?: string;
  machineId?: string;
  commandId?: string;
  deviceId?: string;
  excludeUserId?: string;
  sourceInstanceId?: string;
}
