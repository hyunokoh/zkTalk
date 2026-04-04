import type { FastifyInstance } from 'fastify';
import {
  MagicLinkRequestSchema,
  MagicLinkVerifySchema,
  PhoneRequestSchema,
  PhoneVerifySchema,
  OAuthGoogleSchema,
  OAuthAppleSchema,
  QrConfirmSchema,
  LinkAuthMethodSchema,
  SetPublicKeySchema,
  UserIdParamsSchema,
  QrTokenParamsSchema,
  AuthMethodIdParamsSchema,
  EmailLinkRequestSchema,
  EmailLinkVerifySchema,
  UpdateProfileSchema,
  UpdateUserSettingsSchema,
} from './auth.schema.js';
import * as authService from './auth.service.js';
import { authenticate, COOKIE_NAME } from '../../middleware/auth.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { WebSocketEvent } from '@zktalk/shared';

// Stricter rate limit config for auth endpoints
const authRateLimitMax =
  process.env.NODE_ENV === 'production'
    ? 5
    : Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '50', 10);

const authRateLimit = {
  config: {
    rateLimit: {
      max: Number.isFinite(authRateLimitMax) ? authRateLimitMax : 50,
      timeWindow: '1 minute',
    },
  },
};

function setSessionCookie(reply: import('fastify').FastifyReply, sessionToken: string) {
  reply.setCookie(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export default async function authRoutes(app: FastifyInstance) {
  // ── Magic Link (existing) ────────────────────────────────────────

  app.post('/api/auth/magic-link/request', authRateLimit, async (request, reply) => {
    const body = MagicLinkRequestSchema.parse(request.body);
    const token = await authService.requestMagicLink(body.email);
    return reply.send({ token });
  });

  app.post('/api/auth/magic-link/verify', authRateLimit, async (request, reply) => {
    const body = MagicLinkVerifySchema.parse(request.body);
    const sessionToken = await authService.verifyMagicLink(body.token);
    setSessionCookie(reply, sessionToken);
    return reply.send({ success: true, sessionToken });
  });

  // ── SMS OTP ──────────────────────────────────────────────────────

  app.post('/api/auth/phone/request', authRateLimit, async (request, reply) => {
    const body = PhoneRequestSchema.parse(request.body);
    const result = await authService.requestPhoneOtp(body.phoneNumber);
    return reply.send(result);
  });

  app.post('/api/auth/phone/verify', authRateLimit, async (request, reply) => {
    const body = PhoneVerifySchema.parse(request.body);
    const sessionToken = await authService.verifyPhoneOtp(body.phoneNumber, body.code);
    setSessionCookie(reply, sessionToken);
    // Return sessionToken in body for mobile clients that use Bearer auth
    return reply.send({ success: true, sessionToken });
  });

  // ── OAuth ────────────────────────────────────────────────────────

  app.post('/api/auth/oauth/google', authRateLimit, async (request, reply) => {
    const body = OAuthGoogleSchema.parse(request.body);
    const sessionToken = await authService.verifyGoogleOAuth(body.idToken);
    setSessionCookie(reply, sessionToken);
    return reply.send({ success: true, sessionToken });
  });

  app.post('/api/auth/oauth/apple', authRateLimit, async (request, reply) => {
    const body = OAuthAppleSchema.parse(request.body);
    const sessionToken = await authService.verifyAppleOAuth(body.idToken, body.name);
    setSessionCookie(reply, sessionToken);
    return reply.send({ success: true, sessionToken });
  });

  // ── QR Code Login ────────────────────────────────────────────────

  app.post('/api/auth/qr/generate', async (_request, reply) => {
    const result = await authService.generateQrToken();
    return reply.send(result);
  });

  app.post('/api/auth/qr/confirm', { preHandler: [authenticate] }, async (request, reply) => {
    const body = QrConfirmSchema.parse(request.body);
    await authService.confirmQrToken(body.qrToken, request.user.id);
    return reply.send({ success: true });
  });

  app.get('/api/auth/qr/status/:token', async (request, reply) => {
    const { token } = QrTokenParamsSchema.parse(request.params);
    const result = await authService.checkQrTokenStatus(token);

    if (result.status === 'confirmed' && result.sessionToken) {
      setSessionCookie(reply, result.sessionToken);
      return reply.send({ status: 'confirmed', sessionToken: result.sessionToken });
    }

    return reply.send({ status: 'pending' });
  });

  // ── Account Linking ──────────────────────────────────────────────

  app.post('/api/me/link', { preHandler: [authenticate] }, async (request, reply) => {
    const body = LinkAuthMethodSchema.parse(request.body);
    const method = await authService.linkAuthMethod(
      request.user.id,
      body.type,
      body.identifier,
    );
    return reply.send({ method });
  });

  app.post('/api/me/link/google', { preHandler: [authenticate] }, async (request, reply) => {
    const body = OAuthGoogleSchema.parse(request.body);
    const method = await authService.linkGoogleAuthMethod(request.user.id, body.idToken);
    return reply.send({ method });
  });

  app.post('/api/me/link/apple', { preHandler: [authenticate] }, async (request, reply) => {
    const body = OAuthAppleSchema.parse(request.body);
    const method = await authService.linkAppleAuthMethod(request.user.id, body.idToken, body.name);
    return reply.send({ method });
  });

  app.post('/api/me/link/phone/request', { preHandler: [authenticate] }, async (request, reply) => {
    const body = PhoneRequestSchema.parse(request.body);
    const result = await authService.requestPhoneLink(request.user.id, body.phoneNumber);
    return reply.send(result);
  });

  app.post('/api/me/link/phone/verify', { preHandler: [authenticate] }, async (request, reply) => {
    const body = PhoneVerifySchema.parse(request.body);
    const method = await authService.verifyPhoneLink(request.user.id, body.phoneNumber, body.code);
    return reply.send({ method });
  });

  app.post('/api/me/link/email/request', { preHandler: [authenticate] }, async (request, reply) => {
    const body = EmailLinkRequestSchema.parse(request.body);
    const result = await authService.requestEmailLink(request.user.id, body.email);
    return reply.send(result);
  });

  app.post('/api/me/link/email/verify', { preHandler: [authenticate] }, async (request, reply) => {
    const body = EmailLinkVerifySchema.parse(request.body);
    const method = await authService.verifyEmailLink(request.user.id, body.token);
    return reply.send({ method });
  });

  app.get('/api/me/auth-methods', { preHandler: [authenticate] }, async (request, reply) => {
    const methods = await authService.getAuthMethods(request.user.id);
    return reply.send({ methods });
  });

  app.delete('/api/me/auth-methods/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = AuthMethodIdParamsSchema.parse(request.params);
    await authService.unlinkAuthMethod(request.user.id, id);
    return reply.send({ success: true });
  });

  // ── Logout ───────────────────────────────────────────────────────

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return reply.send({ success: true });
  });

  // ── User Profile ─────────────────────────────────────────────────

  app.get('/api/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await authService.getCurrentUser(request.user.id);
    return reply.send({ user });
  });

  app.patch('/api/me', { preHandler: [authenticate] }, async (request, reply) => {
    const body = UpdateProfileSchema.parse(request.body);
    const user = await authService.updateProfile(request.user.id, body);
    realtimeService.sendToUser(request.user.id, WebSocketEvent.PROFILE_UPDATED, { user });
    return reply.send({ user });
  });

  app.get('/api/me/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const settings = await authService.getSettings(request.user.id);
    return reply.send({ settings });
  });

  app.patch('/api/me/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const body = UpdateUserSettingsSchema.parse(request.body);
    const settings = await authService.updateSettings(request.user.id, body);
    return reply.send({ settings });
  });

  // ── E2EE Key Management ─────────────────────────────────────────

  app.put('/api/me/keys', { preHandler: [authenticate] }, async (request, reply) => {
    const { publicKey } = SetPublicKeySchema.parse(request.body);
    const key = await authService.setPublicKey(request.user.id, publicKey);
    return reply.send({ publicKey: key.publicKey });
  });

  app.get('/api/users/:userId/keys', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = UserIdParamsSchema.parse(request.params);
    const publicKey = await authService.getPublicKey(userId);
    return reply.send({ publicKey });
  });
}
