import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
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
import { realtimeRoutes } from './modules/realtime/index.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
});

await app.register(websocket);

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
await app.register(realtimeRoutes);

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server running on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
