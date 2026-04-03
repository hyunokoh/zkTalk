import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketEvent } from '@zktalk/shared';

// ── Mock Redis ──────────────────────────────────────────────────────

const { mockRedis, mockRedisSub } = vi.hoisted(() => {
  return {
    mockRedis: {
      publish: vi.fn().mockResolvedValue(1),
      sadd: vi.fn().mockResolvedValue(1),
      srem: vi.fn().mockResolvedValue(1),
      smembers: vi.fn().mockResolvedValue([]),
      expire: vi.fn().mockResolvedValue(1),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    },
    mockRedisSub: {
      on: vi.fn(),
      psubscribe: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('../../../lib/redis.js', () => ({
  redis: mockRedis,
  redisSub: mockRedisSub,
}));

// Mock DB for permission checks in subscribe methods
vi.mock('../../../lib/db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'mock', communityId: 'community-1' }]),
        }),
      }),
    }),
  },
}));

vi.mock('../../../lib/db/schema.js', () => ({
  channels: { id: 'id', communityId: 'community_id' },
  communityMemberships: { id: 'id', userId: 'user_id', communityId: 'community_id', membershipStatus: 'membership_status' },
}));

import { realtimeService } from '../realtime.service.js';

// ── Helpers ─────────────────────────────────────────────────────────

function createMockWebSocket(): WebSocket {
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    OPEN: WebSocket.OPEN,
  } as unknown as WebSocket;
}

describe('RealtimeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Client lifecycle ────────────────────────────────────────────

  describe('addClient / removeClient', () => {
    it('should add a client and track it by userId', () => {
      const ws = createMockWebSocket();
      const client = realtimeService.addClient('user-1', ws);

      expect(client.userId).toBe('user-1');
      expect(client.ws).toBe(ws);
      expect(client.subscribedChannels.size).toBe(0);
      expect(client.subscribedCommunities.size).toBe(0);
      expect(realtimeService.getConnectionCount()).toBeGreaterThanOrEqual(1);

      // Cleanup
      realtimeService.removeClient(client);
    });

    it('should support multiple connections for the same user', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const client1 = realtimeService.addClient('user-2', ws1);
      const client2 = realtimeService.addClient('user-2', ws2);

      const countBefore = realtimeService.getConnectionCount();

      realtimeService.removeClient(client1);
      expect(realtimeService.getConnectionCount()).toBe(countBefore - 1);

      realtimeService.removeClient(client2);
    });

    it('should remove client cleanly', () => {
      const ws = createMockWebSocket();
      const client = realtimeService.addClient('user-3', ws);
      const countBefore = realtimeService.getConnectionCount();

      realtimeService.removeClient(client);
      expect(realtimeService.getConnectionCount()).toBe(countBefore - 1);
    });
  });

  // ── Channel subscriptions ───────────────────────────────────────

  describe('channel subscriptions', () => {
    it('should subscribe and unsubscribe from channels', async () => {
      const ws = createMockWebSocket();
      const client = realtimeService.addClient('user-4', ws);

      await realtimeService.subscribeToChannel(client, 'channel-1');
      expect(client.subscribedChannels.has('channel-1')).toBe(true);

      realtimeService.unsubscribeFromChannel(client, 'channel-1');
      expect(client.subscribedChannels.has('channel-1')).toBe(false);

      realtimeService.removeClient(client);
    });

    it('should support subscribing to multiple channels', async () => {
      const ws = createMockWebSocket();
      const client = realtimeService.addClient('user-5', ws);

      await realtimeService.subscribeToChannel(client, 'channel-a');
      await realtimeService.subscribeToChannel(client, 'channel-b');
      await realtimeService.subscribeToChannel(client, 'channel-c');

      expect(client.subscribedChannels.size).toBe(3);

      realtimeService.removeClient(client);
      // After removal, subscriptions should be cleaned up
      expect(client.subscribedChannels.size).toBe(0);
    });
  });

  // ── Broadcasting ────────────────────────────────────────────────

  describe('broadcastToChannel', () => {
    it('should publish message to Redis', () => {
      realtimeService.broadcastToChannel(
        'channel-1',
        WebSocketEvent.MESSAGE_CREATED,
        { text: 'hello' },
      );

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'ws:channel:channel-1',
        expect.stringContaining('"event":"message.created"'),
      );
    });

    it('should include excludeUserId in published message', () => {
      realtimeService.broadcastToChannel(
        'channel-1',
        WebSocketEvent.TYPING_STARTED,
        { userId: 'user-1' },
        'user-1',
      );

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'ws:channel:channel-1',
        expect.stringContaining('"excludeUserId":"user-1"'),
      );
    });
  });

  describe('broadcastToCommunity', () => {
    it('should publish message to Redis community channel', () => {
      realtimeService.broadcastToCommunity(
        'community-1',
        WebSocketEvent.PRESENCE_UPDATED,
        { userId: 'user-1', status: 'online' },
      );

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'ws:community:community-1',
        expect.stringContaining('"event":"presence.updated"'),
      );
    });
  });

  describe('sendToUser', () => {
    it('should send message to all connections of a user', () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const client1 = realtimeService.addClient('user-send-1', ws1);
      const client2 = realtimeService.addClient('user-send-1', ws2);

      realtimeService.sendToUser('user-send-1', 'test.event', { foo: 'bar' });

      expect(ws1.send).toHaveBeenCalledTimes(1);
      expect(ws2.send).toHaveBeenCalledTimes(1);

      const sent1 = JSON.parse((ws1.send as ReturnType<typeof vi.fn>).mock.calls[0][0]);
      expect(sent1.event).toBe('test.event');
      expect(sent1.data).toEqual({ foo: 'bar' });
      expect(sent1.timestamp).toBeDefined();

      realtimeService.removeClient(client1);
      realtimeService.removeClient(client2);
    });

    it('should not throw when user has no connections', () => {
      expect(() => {
        realtimeService.sendToUser('nonexistent-user', 'test.event', {});
      }).not.toThrow();
    });

    it('should not send to closed WebSocket', () => {
      const ws = createMockWebSocket();
      (ws as unknown as { readyState: number }).readyState = WebSocket.CLOSED;
      const client = realtimeService.addClient('user-closed', ws);

      realtimeService.sendToUser('user-closed', 'test.event', {});

      expect(ws.send).not.toHaveBeenCalled();

      realtimeService.removeClient(client);
    });
  });

  // ── Presence ────────────────────────────────────────────────────

  describe('presence', () => {
    it('setOnline should add user to Redis SET and publish', async () => {
      await realtimeService.setOnline('user-p1', 'community-1');

      expect(mockRedis.sadd).toHaveBeenCalledWith('presence:community-1', 'user-p1');
      expect(mockRedis.expire).toHaveBeenCalledWith('presence:community-1', 60);
      expect(mockRedis.publish).toHaveBeenCalled();
    });

    it('setOffline should remove user from Redis SET and publish', async () => {
      await realtimeService.setOffline('user-p1', 'community-1');

      expect(mockRedis.srem).toHaveBeenCalledWith('presence:community-1', 'user-p1');
      expect(mockRedis.publish).toHaveBeenCalled();
    });

    it('getOnlineUsers should return members of the Redis SET', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['user-a', 'user-b']);
      const users = await realtimeService.getOnlineUsers('community-1');

      expect(users).toEqual(['user-a', 'user-b']);
      expect(mockRedis.smembers).toHaveBeenCalledWith('presence:community-1');
    });

    it('getOnlineUsers should return empty array on Redis error', async () => {
      mockRedis.smembers.mockRejectedValueOnce(new Error('Connection refused'));
      const users = await realtimeService.getOnlineUsers('community-1');

      expect(users).toEqual([]);
    });
  });

  // ── Typing indicators ───────────────────────────────────────────

  describe('typing indicators', () => {
    it('startTyping should set Redis key with TTL and broadcast', () => {
      realtimeService.startTyping('user-t1', 'channel-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'typing:channel-1:user-t1',
        '1',
        'EX',
        5,
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'ws:channel:channel-1',
        expect.stringContaining('"event":"typing.started"'),
      );
    });

    it('stopTyping should delete Redis key and broadcast', () => {
      realtimeService.stopTyping('user-t1', 'channel-1');

      expect(mockRedis.del).toHaveBeenCalledWith('typing:channel-1:user-t1');
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'ws:channel:channel-1',
        expect.stringContaining('"event":"typing.stopped"'),
      );
    });
  });

  // ── Redis subscriber ────────────────────────────────────────────

  describe('initRedisSubscriber', () => {
    it('should subscribe to Redis pattern channels', () => {
      realtimeService.initRedisSubscriber();

      expect(mockRedisSub.psubscribe).toHaveBeenCalledWith(
        'ws:channel:*',
        'ws:community:*',
      );
    });

    it('should register pmessage handler', () => {
      // Reset the initialization flag so initRedisSubscriber actually runs
      (realtimeService as any).redisSubInitialized = false;
      realtimeService.initRedisSubscriber();

      expect(mockRedisSub.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
    });
  });

  // ── Community subscriptions ─────────────────────────────────────

  describe('community subscriptions', () => {
    it('should subscribe to community and set presence', async () => {
      const ws = createMockWebSocket();
      const client = realtimeService.addClient('user-c1', ws);

      await realtimeService.subscribeToCommunity(client, 'community-1');
      expect(client.subscribedCommunities.has('community-1')).toBe(true);

      // setOnline is called (async, via Redis)
      expect(mockRedis.sadd).toHaveBeenCalled();

      realtimeService.removeClient(client);
    });

    it('should not set offline if user has other connections in community', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const client1 = realtimeService.addClient('user-multi', ws1);
      const client2 = realtimeService.addClient('user-multi', ws2);

      await realtimeService.subscribeToCommunity(client1, 'community-2');
      await realtimeService.subscribeToCommunity(client2, 'community-2');

      vi.clearAllMocks();

      // Remove only one connection - should NOT set offline
      realtimeService.removeClient(client1);
      expect(mockRedis.srem).not.toHaveBeenCalled();

      // Remove last connection - should set offline
      realtimeService.removeClient(client2);
      expect(mockRedis.srem).toHaveBeenCalledWith('presence:community-2', 'user-multi');
    });
  });
});
