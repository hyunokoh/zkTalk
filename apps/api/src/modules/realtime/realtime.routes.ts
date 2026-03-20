import type { FastifyInstance } from 'fastify';
import * as jose from 'jose';
import type { WSIncoming } from '@zktalk/shared';
import { realtimeService } from './realtime.service.js';

const COOKIE_NAME = 'zktalk_session';

function getCookieSecret(): Uint8Array {
  const secret =
    process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

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
    const { payload } = await jose.jwtVerify(token, getCookieSecret(), {
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
      socket.close(4001, 'Unauthorized');
      return;
    }

    // ── Register client ───────────────────────────────────────────
    const client = realtimeService.addClient(user.sub, socket);

    app.log.info(
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
      app.log.info(
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
      realtimeService.subscribeToChannel(client, message.channelId);
      break;

    case 'unsubscribe_channel':
      realtimeService.unsubscribeFromChannel(client, message.channelId);
      break;

    case 'subscribe_community':
      realtimeService.subscribeToCommunity(client, message.communityId);
      break;

    case 'unsubscribe_community':
      realtimeService.unsubscribeFromCommunity(client, message.communityId);
      break;

    case 'typing_start':
      realtimeService.startTyping(client.userId, message.channelId);
      break;

    case 'typing_stop':
      realtimeService.stopTyping(client.userId, message.channelId);
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
  }
}
