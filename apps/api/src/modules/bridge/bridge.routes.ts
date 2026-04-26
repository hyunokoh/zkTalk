import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../lib/errors.js';
import * as bridgeService from './bridge.service.js';
import * as channelService from '../channel/channel.service.js';
import * as channelRepo from '../channel/channel.repository.js';
import * as messageService from '../message/message.service.js';
import { recordInboundOrigin } from './bridge.service.js';

async function assertChannelManager(userId: string, channelId: string) {
  const channel = await channelRepo.findChannelById(channelId);
  if (!channel) throw AppError.notFound('Channel not found');
  await channelService.checkPermission(
    userId,
    channel.communityId,
    channelId,
    'manage_channels',
  );
  return channel;
}

const TelegramCreateBody = z.object({
  botToken: z.string().min(10),
  chatId: z.string().min(1),
});

const DiscordCreateBody = z.object({
  webhookUrl: z.string().url(),
});

const ToggleBody = z.object({
  enabled: z.boolean(),
});

export default async function bridgeRoutes(app: FastifyInstance) {
  // ---- admin (session-cookie auth) --------------------------------------
  app.register(async (admin) => {
    admin.addHook('preHandler', authenticate);

    admin.get<{ Params: { channelId: string } }>(
      '/api/channels/:channelId/bridges',
      async (req, reply) => {
        await assertChannelManager(req.user.id, req.params.channelId);
        const bridges = await bridgeService.listForChannel(req.params.channelId);
        return reply.send({ bridges });
      },
    );

    admin.post<{ Params: { channelId: string } }>(
      '/api/channels/:channelId/bridges/telegram',
      async (req, reply) => {
        await assertChannelManager(req.user.id, req.params.channelId);
        const body = TelegramCreateBody.parse(req.body);
        const bridge = await bridgeService.createTelegramBridge({
          channelId: req.params.channelId,
          userId: req.user.id,
          botToken: body.botToken,
          chatId: body.chatId,
        });
        return reply.status(201).send({ bridge });
      },
    );

    admin.post<{ Params: { channelId: string } }>(
      '/api/channels/:channelId/bridges/discord',
      async (req, reply) => {
        await assertChannelManager(req.user.id, req.params.channelId);
        const body = DiscordCreateBody.parse(req.body);
        const bridge = await bridgeService.createDiscordBridge({
          channelId: req.params.channelId,
          userId: req.user.id,
          webhookUrl: body.webhookUrl,
        });
        return reply.status(201).send({ bridge });
      },
    );

    admin.patch<{ Params: { channelId: string; bridgeId: string } }>(
      '/api/channels/:channelId/bridges/:bridgeId',
      async (req, reply) => {
        await assertChannelManager(req.user.id, req.params.channelId);
        const body = ToggleBody.parse(req.body);
        await bridgeService.setBridgeEnabled({
          channelId: req.params.channelId,
          bridgeId: req.params.bridgeId,
          enabled: body.enabled,
        });
        return reply.status(204).send();
      },
    );

    admin.delete<{ Params: { channelId: string; bridgeId: string } }>(
      '/api/channels/:channelId/bridges/:bridgeId',
      async (req, reply) => {
        await assertChannelManager(req.user.id, req.params.channelId);
        await bridgeService.deleteBridge({
          channelId: req.params.channelId,
          bridgeId: req.params.bridgeId,
        });
        return reply.status(204).send();
      },
    );
  });

  // ---- public webhook (no auth — secret is in the URL) ------------------
  // Telegram POSTs an `Update` JSON here whenever a message arrives in a
  // chat the bot is in. We look up the bridge by the path secret, parse
  // the update, materialise it as a zkTalk message, and tag the message
  // with bridge origin so we don't loop it back to Telegram.
  app.post<{ Params: { secret: string } }>(
    '/api/bridges/telegram/webhook/:secret',
    async (req: FastifyRequest, reply) => {
      const params = req.params as { secret: string };
      const bridge = await bridgeService.findBridgeByInboundSecret(params.secret);
      if (!bridge || bridge.platform !== 'telegram' || !bridge.enabled) {
        // Always 200 OK — Telegram retries forever on non-2xx and we don't
        // want a stale URL to make Telegram hammer us.
        return reply.status(200).send({ ok: true });
      }

      const update = req.body as Parameters<typeof bridgeService.parseTelegramUpdate>[1];
      const parsed = bridgeService.parseTelegramUpdate(bridge, update);
      if (!parsed) return reply.status(200).send({ ok: true });

      try {
        // Materialise as a zkTalk message authored by the bridge creator.
        // The body prefixes the external author name so the channel reads
        // naturally even before we render a "via Telegram" badge.
        const author = parsed.externalAuthorName ?? 'Telegram';
        const created = await messageService.createMessage(
          bridge.createdByUserId,
          parsed.channelId,
          { bodyMarkdown: `**${author}**: ${parsed.bodyText}` },
        );
        if (!created) return reply.status(200).send({ ok: true });
        await recordInboundOrigin({
          messageId: created.message.id,
          bridgeId: parsed.bridgeId,
          platform: 'telegram',
          externalAuthorName: parsed.externalAuthorName,
          externalAuthorId: parsed.externalAuthorId,
          externalMessageId: parsed.externalMessageId,
        });
      } catch {
        // Don't make Telegram retry on internal failures; user can resend
      }
      return reply.status(200).send({ ok: true });
    },
  );
}
