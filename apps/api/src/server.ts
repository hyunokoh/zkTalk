import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { AppError } from './lib/errors.js';
import authRoutes from './modules/auth/auth.routes.js';
import communityRoutes from './modules/community/community.routes.js';
import channelRoutes from './modules/channel/channel.routes.js';
import messageRoutes from './modules/message/message.routes.js';
import threadRoutes from './modules/thread/thread.routes.js';
import reactionRoutes from './modules/reaction/reaction.routes.js';
import unreadRoutes from './modules/unread/unread.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import moderationRoutes from './modules/moderation/moderation.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import inboxRoutes from './modules/inbox/inbox.routes.js';
import linkPreviewRoutes from './modules/link-preview/link-preview.routes.js';
import pinRoutes from './modules/pin/pin.routes.js';
import bookmarkRoutes from './modules/bookmark/bookmark.routes.js';
import pollRoutes from './modules/poll/poll.routes.js';
import { realtimeRoutes } from './modules/realtime/index.js';
import voiceRoutes from './modules/voice/voice.routes.js';
import dmRoutes from './modules/dm/dm.routes.js';
import automodRoutes from './modules/automod/automod.routes.js';
import emojiRoutes from './modules/emoji/emoji.routes.js';
import eventRoutes from './modules/event/event.routes.js';
import friendRoutes from './modules/friend/friend.routes.js';
import webhookRoutes from './modules/webhook/webhook.routes.js';
import p2pRoutes from './modules/p2p/p2p.routes.js';
import backupRoutes from './modules/backup/backup.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';
import channelE2eeRoutes from './modules/channel-e2ee/channel-e2ee.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import scheduleRoutes from './modules/schedule/schedule.routes.js';
import discoverRoutes from './modules/discover/discover.routes.js';
import translateRoutes from './modules/translate/translate.routes.js';
import zkVotingRoutes from './modules/zk-voting/zk-voting.routes.js';
import zkIdentityRoutes from './modules/zk-identity/zk-identity.routes.js';
import pushTokenRoutes from './modules/push-token/push-token.routes.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8081',
];
const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = new Set([
  ...defaultCorsOrigins,
  ...configuredCorsOrigins,
]);

function isAllowedLoopbackOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin);
}

const configuredGlobalRateLimitMax = Number.parseInt(
  process.env.GLOBAL_RATE_LIMIT_MAX ?? '',
  10,
);
const globalRateLimitMax = Number.isFinite(configuredGlobalRateLimitMax) && configuredGlobalRateLimitMax > 0
  ? configuredGlobalRateLimitMax
  : process.env.NODE_ENV === 'test'
    ? 10_000
    : process.env.NODE_ENV === 'production'
      ? 100
      : 1_000;

await app.register(cors, {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedCorsOrigins.has(origin) || isAllowedLoopbackOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
  },
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
});

await app.register(websocket);

// ── Security headers ──────────────────────────────────────────────────
app.addHook('onSend', async (_request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '0'); // Modern recommendation: rely on CSP instead
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

// ── Global rate limiting ──────────────────────────────────────────────
await app.register(rateLimit, {
  // Browser E2E and API seed traffic share the same localhost bucket during tests.
  max: globalRateLimitMax,
  timeWindow: '1 minute',
});

app.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
    });
  }

  if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600) {
    const code =
      error.statusCode === 429
        ? 'RATE_LIMITED'
        : (error.code ?? 'REQUEST_ERROR');

    return reply.status(error.statusCode).send({
      error: code,
      message: error.message,
    });
  }

  app.log.error(error);
  return reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
});

app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

await app.register(authRoutes);
await app.register(communityRoutes);
await app.register(channelRoutes);
await app.register(messageRoutes);
await app.register(threadRoutes);
await app.register(reactionRoutes);
await app.register(unreadRoutes);
await app.register(uploadRoutes);
await app.register(moderationRoutes);
await app.register(searchRoutes);
await app.register(inboxRoutes);
await app.register(linkPreviewRoutes);
await app.register(pinRoutes);
await app.register(bookmarkRoutes);
await app.register(pollRoutes);
await app.register(realtimeRoutes);
await app.register(voiceRoutes);
await app.register(dmRoutes);
await app.register(automodRoutes);
await app.register(emojiRoutes);
await app.register(eventRoutes);
await app.register(friendRoutes);
await app.register(webhookRoutes);
await app.register(p2pRoutes);
await app.register(backupRoutes);
await app.register(contactRoutes);
await app.register(channelE2eeRoutes);
await app.register(aiRoutes);
await app.register(scheduleRoutes);
await app.register(discoverRoutes);
await app.register(translateRoutes);
await app.register(zkVotingRoutes);
await app.register(zkIdentityRoutes);
await app.register(pushTokenRoutes);

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server running on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
