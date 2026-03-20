import type { FastifyInstance } from 'fastify';
import { MagicLinkRequestSchema, MagicLinkVerifySchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { authenticate, COOKIE_NAME } from '../../middleware/auth.js';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/magic-link/request', async (request, reply) => {
    const body = MagicLinkRequestSchema.parse(request.body);
    const token = await authService.requestMagicLink(body.email);
    return reply.send({ token });
  });

  app.post('/api/auth/magic-link/verify', async (request, reply) => {
    const body = MagicLinkVerifySchema.parse(request.body);
    const sessionToken = await authService.verifyMagicLink(body.token);

    reply.setCookie(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.send({ success: true });
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return reply.send({ success: true });
  });

  app.get('/api/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await authService.getCurrentUser(request.user.id);
    return reply.send({ user });
  });
}
