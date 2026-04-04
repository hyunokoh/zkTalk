import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../lib/errors.js';
import * as webhookService from './webhook.service.js';
import {
  CreateWebhookSchema,
  ExecuteWebhookSchema,
  CreateBotSchema,
  BotSendMessageSchema,
  RegisterSlashCommandSchema,
} from './webhook.schema.js';

export default async function webhookRoutes(app: FastifyInstance) {
  // ── Protected routes (require session auth) ────────────────────────

  // Create webhook
  app.post<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/webhooks',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = CreateWebhookSchema.parse(request.body);
      const webhook = await webhookService.createWebhook(
        request.params.communityId,
        body.channelId,
        body.name,
        request.user.id,
        body.avatarUrl,
      );
      return reply.status(201).send({ webhook });
    },
  );

  // List webhooks
  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/webhooks',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const webhooks = await webhookService.listWebhooks(request.params.communityId, request.user.id);
      return reply.send({ webhooks });
    },
  );

  // Delete webhook
  app.delete<{ Params: { webhookId: string } }>(
    '/api/webhooks/:webhookId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await webhookService.deleteWebhook(request.params.webhookId, request.user.id);
      return reply.status(204).send();
    },
  );

  // Create bot
  app.post<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/bots',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = CreateBotSchema.parse(request.body);
      const bot = await webhookService.createBot(
        request.params.communityId,
        body.name,
        request.user.id,
        body.permissions,
        body.avatarUrl,
      );
      return reply.status(201).send({ bot });
    },
  );

  // List bots
  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/bots',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const bots = await webhookService.listBots(request.params.communityId, request.user.id);
      return reply.send({ bots });
    },
  );

  // Delete bot
  app.delete<{ Params: { botId: string } }>(
    '/api/bots/:botId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await webhookService.deleteBot(request.params.botId, request.user.id);
      return reply.status(204).send();
    },
  );

  // Register slash command
  app.post<{ Params: { botId: string } }>(
    '/api/bots/:botId/commands',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = RegisterSlashCommandSchema.parse(request.body);
      const command = await webhookService.registerSlashCommand(
        request.params.botId,
        request.user.id,
        body.name,
        body.description,
      );
      return reply.status(201).send({ command });
    },
  );

  // List slash commands for a bot
  app.get<{ Params: { botId: string } }>(
    '/api/bots/:botId/commands',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const commands = await webhookService.listSlashCommands(request.params.botId, request.user.id);
      return reply.send({ commands });
    },
  );

  // ── Public routes (token-based auth) ───────────────────────────────

  // Execute webhook (external services POST here)
  app.post<{ Params: { token: string } }>(
    '/api/webhooks/:token/execute',
    async (request, reply) => {
      const body = ExecuteWebhookSchema.parse(request.body);
      const result = await webhookService.executeWebhook(
        request.params.token,
        body,
      );
      return reply.send(result);
    },
  );

  // Bot sends message (Authorization: Bot TOKEN)
  app.post(
    '/api/bots/message',
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bot ')) {
        throw AppError.unauthorized('Missing or invalid Authorization header. Expected: Bot <token>');
      }
      const botToken = authHeader.slice(4);

      const body = BotSendMessageSchema.parse(request.body);
      const result = await webhookService.sendBotMessage(
        botToken,
        body.channelId,
        body.content,
      );
      return reply.send(result);
    },
  );
}
