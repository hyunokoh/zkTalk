import type { FastifyInstance } from 'fastify';
import * as jose from 'jose';
import type { WSIncoming } from '@zktalk/shared';
import { realtimeService } from './realtime.service.js';
import * as dmRepo from '../dm/dm.repository.js';
import { getCookieSecretBytes } from '../../lib/env.js';

const COOKIE_NAME = 'zktalk_session';

interface TokenPayload {
  sub: string;
  email: string;
  displayName: string;
  username: string;
}

/**
 * Authenticate a WebSocket connection via:
 *  1. `token` query parameter, or
 *  2. `zktalk_session` cookie
 */
async function authenticateWs(
  token: string | undefined,
): Promise<TokenPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jose.jwtVerify(token, getCookieSecretBytes(), {
      issuer: 'zktalk',
      audience: 'zktalk-session',
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      displayName: payload.displayName as string,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a cookie header string and return the value for the given name.
 */
function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export default async function realtimeRoutes(app: FastifyInstance): Promise<void> {
  // Initialize Redis pub/sub listener
  realtimeService.initRedisSubscriber();

  app.get('/api/ws', { websocket: true }, async (socket, request) => {
    // ── Authenticate ──────────────────────────────────────────────
    const url = new URL(request.url, `http://${request.headers.host}`);
    const queryToken = url.searchParams.get('token') ?? undefined;
    const cookieToken = parseCookie(
      request.headers.cookie,
      COOKIE_NAME,
    );
    const token = queryToken || cookieToken;

    const user = await authenticateWs(token);
    if (!user) {
      request.log.warn({ req: request }, 'Rejected unauthorized WebSocket connection');
      socket.close(4001, 'Unauthorized');
      return;
    }

    // ── Register client ───────────────────────────────────────────
    const client = realtimeService.addClient(user.sub, socket);

    app.log.debug(
      { userId: user.sub, connections: realtimeService.getConnectionCount() },
      'WebSocket client connected',
    );

    // Send welcome acknowledgement
    socket.send(
      JSON.stringify({
        event: 'connected',
        data: { userId: user.sub },
        timestamp: new Date().toISOString(),
      }),
    );

    // ── Handle incoming messages ──────────────────────────────────
    socket.on('message', (raw: Buffer | string) => {
      try {
        const message: WSIncoming = JSON.parse(
          typeof raw === 'string' ? raw : raw.toString('utf-8'),
        );
        handleMessage(client, message);
      } catch {
        socket.send(
          JSON.stringify({
            event: 'error',
            data: { message: 'Invalid message format' },
            timestamp: new Date().toISOString(),
          }),
        );
      }
    });

    // ── Handle close ──────────────────────────────────────────────
    socket.on('close', () => {
      realtimeService.removeClient(client);
      app.log.debug(
        { userId: user.sub, connections: realtimeService.getConnectionCount() },
        'WebSocket client disconnected',
      );
    });

    socket.on('error', (err: Error) => {
      app.log.error({ userId: user.sub, err: err.message }, 'WebSocket error');
      realtimeService.removeClient(client);
    });
  });
}

function handleMessage(
  client: ReturnType<typeof realtimeService.addClient>,
  message: WSIncoming,
): void {
  switch (message.type) {
    case 'subscribe_channel':
      realtimeService.subscribeToChannel(client, message.channelId).catch(() => {});
      break;

    case 'unsubscribe_channel':
      realtimeService.unsubscribeFromChannel(client, message.channelId);
      break;

    case 'subscribe_community':
      realtimeService.subscribeToCommunity(client, message.communityId).catch(() => {});
      break;

    case 'unsubscribe_community':
      realtimeService.unsubscribeFromCommunity(client, message.communityId);
      break;

    case 'subscribe_dm':
      realtimeService.subscribeToDm(client, message.conversationId).catch(() => {});
      break;

    case 'unsubscribe_dm':
      realtimeService.unsubscribeFromDm(client, message.conversationId);
      break;

    case 'typing_start':
      if (realtimeService.isSubscribedToChannel(client, message.channelId)) {
        realtimeService.startTyping(client.userId, message.channelId);
      }
      break;

    case 'typing_stop':
      if (realtimeService.isSubscribedToChannel(client, message.channelId)) {
        realtimeService.stopTyping(client.userId, message.channelId);
      }
      break;

    case 'heartbeat':
      realtimeService.refreshPresence(client).catch(() => {});
      // Echo heartbeat back as acknowledgement
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(
          JSON.stringify({
            event: 'heartbeat_ack',
            data: null,
            timestamp: new Date().toISOString(),
          }),
        );
      }
      break;

    // ── P2P File Transfer Signaling ──────────────────────────────────
    case 'p2p_signal':
      // Relay WebRTC signal (ICE/SDP) to target user
      realtimeService.sendToUser(message.targetUserId, 'p2p.signal', {
        fromUserId: client.userId,
        fileId: message.fileId,
        signal: message.signal,
      });
      break;

    case 'p2p_file_request':
      // Broadcast file request to channel/DM participants to find seeders
      if (message.channelId) {
        realtimeService.requestChannelPeerFile(
          client,
          message.channelId,
          message.fileId,
        ).catch(() => {});
      } else if (message.conversationId) {
        dmRepo.getParticipantUserIds(message.conversationId)
          .then((participantUserIds) => {
            for (const userId of participantUserIds) {
              if (userId === client.userId) continue;
              realtimeService.sendToUser(
                userId,
                'p2p.file_request',
                { fileId: message.fileId, requesterId: client.userId },
                { conversationId: message.conversationId },
              );
            }
          })
          .catch(() => {});
      }
      break;

    case 'p2p_file_available':
      // Notify the requester that a seeder is ready
      realtimeService.sendToUser(message.targetUserId, 'p2p.file_available', {
        fileId: message.fileId,
        seederId: client.userId,
      });
      break;
  }
}
