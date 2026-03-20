import { WebSocket } from 'ws';
import { redis, redisSub } from '../../lib/redis.js';
import { WebSocketEvent } from '@zktalk/shared';
import type { RedisPubSubMessage, WSOutgoing } from '@zktalk/shared';

// ── Types ───────────────────────────────────────────────────────────

export interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  subscribedChannels: Set<string>;
  subscribedCommunities: Set<string>;
}

// ── Redis key helpers ───────────────────────────────────────────────

const redisKey = {
  channel: (channelId: string) => `ws:channel:${channelId}`,
  community: (communityId: string) => `ws:community:${communityId}`,
  presence: (communityId: string) => `presence:${communityId}`,
  typing: (channelId: string, userId: string) => `typing:${channelId}:${userId}`,
} as const;

// ── Constants ───────────────────────────────────────────────────────

const PRESENCE_TTL_SECONDS = 60;
const TYPING_TTL_SECONDS = 5;

// ── Service ─────────────────────────────────────────────────────────

class RealtimeService {
  /** userId -> Set of active connections (a user can have multiple tabs) */
  private clients: Map<string, Set<ConnectedClient>> = new Map();

  private redisSubInitialized = false;

  // ── Client lifecycle ────────────────────────────────────────────

  addClient(userId: string, ws: WebSocket): ConnectedClient {
    const client: ConnectedClient = {
      ws,
      userId,
      subscribedChannels: new Set(),
      subscribedCommunities: new Set(),
    };

    let userClients = this.clients.get(userId);
    if (!userClients) {
      userClients = new Set();
      this.clients.set(userId, userClients);
    }
    userClients.add(client);

    return client;
  }

  removeClient(client: ConnectedClient): void {
    // Clean up channel subscriptions
    for (const channelId of client.subscribedChannels) {
      this.unsubscribeFromChannel(client, channelId);
    }

    // Clean up community subscriptions & presence
    for (const communityId of client.subscribedCommunities) {
      this.unsubscribeFromCommunity(client, communityId);
    }

    const userClients = this.clients.get(client.userId);
    if (userClients) {
      userClients.delete(client);
      if (userClients.size === 0) {
        this.clients.delete(client.userId);
      }
    }
  }

  // ── Channel subscriptions ───────────────────────────────────────

  subscribeToChannel(client: ConnectedClient, channelId: string): void {
    client.subscribedChannels.add(channelId);
  }

  unsubscribeFromChannel(client: ConnectedClient, channelId: string): void {
    client.subscribedChannels.delete(channelId);
  }

  // ── Community subscriptions ─────────────────────────────────────

  subscribeToCommunity(client: ConnectedClient, communityId: string): void {
    client.subscribedCommunities.add(communityId);
    // Mark user online when they join a community
    this.setOnline(client.userId, communityId).catch(() => {});
  }

  unsubscribeFromCommunity(client: ConnectedClient, communityId: string): void {
    client.subscribedCommunities.delete(communityId);

    // Only set offline if user has no other connections subscribed to this community
    const userClients = this.clients.get(client.userId);
    const stillSubscribed = userClients
      ? [...userClients].some(
          (c) => c !== client && c.subscribedCommunities.has(communityId),
        )
      : false;

    if (!stillSubscribed) {
      this.setOffline(client.userId, communityId).catch(() => {});
    }
  }

  // ── Broadcasting ────────────────────────────────────────────────

  /**
   * Broadcast an event to all clients subscribed to a channel.
   * Publishes via Redis pub/sub so other server processes also receive it.
   */
  broadcastToChannel(
    channelId: string,
    event: string,
    payload: unknown,
    excludeUserId?: string,
  ): void {
    const message: RedisPubSubMessage = {
      event,
      data: payload,
      channelId,
      excludeUserId,
    };

    redis
      .publish(redisKey.channel(channelId), JSON.stringify(message))
      .catch((err) => {
        console.error('[Realtime] Failed to publish to channel:', err.message);
      });
  }

  /**
   * Broadcast an event to all clients subscribed to a community.
   */
  broadcastToCommunity(
    communityId: string,
    event: string,
    payload: unknown,
  ): void {
    const message: RedisPubSubMessage = {
      event,
      data: payload,
      communityId,
    };

    redis
      .publish(redisKey.community(communityId), JSON.stringify(message))
      .catch((err) => {
        console.error('[Realtime] Failed to publish to community:', err.message);
      });
  }

  /**
   * Send an event to a specific user (all their connections).
   * Direct delivery, no Redis pub/sub (single-process only).
   */
  sendToUser(userId: string, event: string, payload: unknown): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const outgoing: WSOutgoing = {
      event: event as WSOutgoing['event'],
      data: payload,
      timestamp: new Date().toISOString(),
    };
    const raw = JSON.stringify(outgoing);

    for (const client of userClients) {
      this.safeSend(client.ws, raw);
    }
  }

  // ── Presence ────────────────────────────────────────────────────

  async setOnline(userId: string, communityId: string): Promise<void> {
    try {
      const key = redisKey.presence(communityId);
      await redis.sadd(key, userId);
      await redis.expire(key, PRESENCE_TTL_SECONDS);

      this.broadcastToCommunity(communityId, WebSocketEvent.PRESENCE_UPDATED, {
        userId,
        status: 'online',
      });
    } catch (err) {
      console.error('[Realtime] setOnline failed:', (err as Error).message);
    }
  }

  async setOffline(userId: string, communityId: string): Promise<void> {
    try {
      const key = redisKey.presence(communityId);
      await redis.srem(key, userId);

      this.broadcastToCommunity(communityId, WebSocketEvent.PRESENCE_UPDATED, {
        userId,
        status: 'offline',
      });
    } catch (err) {
      console.error('[Realtime] setOffline failed:', (err as Error).message);
    }
  }

  async getOnlineUsers(communityId: string): Promise<string[]> {
    try {
      return await redis.smembers(redisKey.presence(communityId));
    } catch (err) {
      console.error('[Realtime] getOnlineUsers failed:', (err as Error).message);
      return [];
    }
  }

  /**
   * Refresh presence TTL for all communities a user is subscribed to.
   * Called on heartbeat.
   */
  async refreshPresence(client: ConnectedClient): Promise<void> {
    for (const communityId of client.subscribedCommunities) {
      try {
        const key = redisKey.presence(communityId);
        await redis.sadd(key, client.userId);
        await redis.expire(key, PRESENCE_TTL_SECONDS);
      } catch {
        // Swallow errors on heartbeat
      }
    }
  }

  // ── Typing indicators ───────────────────────────────────────────

  startTyping(userId: string, channelId: string): void {
    const key = redisKey.typing(channelId, userId);
    redis.set(key, '1', 'EX', TYPING_TTL_SECONDS).catch(() => {});

    this.broadcastToChannel(
      channelId,
      WebSocketEvent.TYPING_STARTED,
      { userId, channelId },
      userId, // exclude the typing user
    );
  }

  stopTyping(userId: string, channelId: string): void {
    const key = redisKey.typing(channelId, userId);
    redis.del(key).catch(() => {});

    this.broadcastToChannel(
      channelId,
      WebSocketEvent.TYPING_STOPPED,
      { userId, channelId },
      userId,
    );
  }

  // ── Redis pub/sub listener (cross-process) ─────────────────────

  /**
   * Initialize Redis subscriber to forward messages to local WebSocket clients.
   * Should be called once on server startup.
   */
  initRedisSubscriber(): void {
    if (this.redisSubInitialized) return;
    this.redisSubInitialized = true;

    redisSub.on('pmessage', (_pattern: string, redisChannel: string, raw: string) => {
      try {
        const message: RedisPubSubMessage = JSON.parse(raw);
        this.handleRedisMessage(redisChannel, message);
      } catch (err) {
        console.error('[Realtime] Failed to parse Redis message:', (err as Error).message);
      }
    });

    // Subscribe to all channel and community patterns
    redisSub.psubscribe('ws:channel:*', 'ws:community:*').catch((err) => {
      console.error('[Realtime] Failed to psubscribe:', err.message);
    });
  }

  private handleRedisMessage(
    redisChannel: string,
    message: RedisPubSubMessage,
  ): void {
    const outgoing: WSOutgoing = {
      event: message.event as WSOutgoing['event'],
      data: message.data,
      channelId: message.channelId,
      communityId: message.communityId,
      timestamp: new Date().toISOString(),
    };
    const raw = JSON.stringify(outgoing);

    if (redisChannel.startsWith('ws:channel:')) {
      const channelId = redisChannel.slice('ws:channel:'.length);
      this.deliverToChannelSubscribers(channelId, raw, message.excludeUserId);
    } else if (redisChannel.startsWith('ws:community:')) {
      const communityId = redisChannel.slice('ws:community:'.length);
      this.deliverToCommunitySubscribers(communityId, raw);
    }
  }

  private deliverToChannelSubscribers(
    channelId: string,
    raw: string,
    excludeUserId?: string,
  ): void {
    for (const [_userId, userClients] of this.clients) {
      for (const client of userClients) {
        if (excludeUserId && client.userId === excludeUserId) continue;
        if (client.subscribedChannels.has(channelId)) {
          this.safeSend(client.ws, raw);
        }
      }
    }
  }

  private deliverToCommunitySubscribers(
    communityId: string,
    raw: string,
  ): void {
    for (const [_userId, userClients] of this.clients) {
      for (const client of userClients) {
        if (client.subscribedCommunities.has(communityId)) {
          this.safeSend(client.ws, raw);
        }
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private safeSend(ws: WebSocket, data: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }

  /** Get total number of connected clients (for monitoring). */
  getConnectionCount(): number {
    let count = 0;
    for (const userClients of this.clients.values()) {
      count += userClients.size;
    }
    return count;
  }
}

export const realtimeService = new RealtimeService();
