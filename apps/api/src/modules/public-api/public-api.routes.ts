import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  authenticateApiKey,
  requireScope,
} from '../../middleware/api-key-auth.js';
import * as communityService from '../community/community.service.js';
import * as channelService from '../channel/channel.service.js';
import * as messageService from '../message/message.service.js';
import * as dmService from '../dm/dm.service.js';

/**
 * Public, stable API surface mounted under /v1. Authenticated by API
 * keys (Authorization: Bearer zk_live_...). Scopes are enforced per
 * route. Anything mounted here is a public commitment — adding fields
 * is fine, removing or renaming is a breaking change.
 */
export default async function publicApiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticateApiKey);

  // ---- /v1/me ------------------------------------------------------------
  app.get(
    '/v1/me',
    { preHandler: requireScope('me:read') },
    async (request, reply) => {
      return reply.send({
        id: request.user.id,
        username: request.user.username,
        displayName: request.user.displayName,
      });
    },
  );

  // ---- /v1/communities ---------------------------------------------------
  app.get(
    '/v1/communities',
    { preHandler: requireScope('communities:read') },
    async (request, reply) => {
      const communities = await communityService.getUserCommunities(request.user.id);
      return reply.send({ communities });
    },
  );

  // ---- /v1/communities/:id/channels --------------------------------------
  app.get<{ Params: { communityId: string } }>(
    '/v1/communities/:communityId/channels',
    { preHandler: requireScope('channels:read') },
    async (request, reply) => {
      const channels = await channelService.listChannels(
        request.params.communityId,
        request.user.id,
      );
      return reply.send({ channels });
    },
  );

  // ---- /v1/channels/:id/messages (read) ----------------------------------
  const ListMessagesQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    topic: z.string().optional(),
  });

  app.get<{ Params: { channelId: string } }>(
    '/v1/channels/:channelId/messages',
    { preHandler: requireScope('messages:read') },
    async (request, reply) => {
      const q = ListMessagesQuerySchema.parse(request.query);
      const result = await messageService.getMessages(
        request.user.id,
        request.params.channelId,
        q.cursor,
        q.limit,
        q.topic,
      );
      return reply.send(result);
    },
  );

  // ---- /v1/channels/:id/messages (post) ----------------------------------
  const PostMessageBodySchema = z.object({
    body: z.string().min(1).max(10000),
    parentMessageId: z.string().optional(),
    topic: z.string().max(120).optional(),
  });

  app.post<{ Params: { channelId: string } }>(
    '/v1/channels/:channelId/messages',
    { preHandler: requireScope('messages:write') },
    async (request, reply) => {
      const body = PostMessageBodySchema.parse(request.body);
      const created = await messageService.createMessage(
        request.user.id,
        request.params.channelId,
        {
          bodyMarkdown: body.body,
          parentMessageId: body.parentMessageId,
          topic: body.topic,
        },
      );
      return reply.status(201).send({ message: created });
    },
  );

  // ---- /v1/dms (list conversations) --------------------------------------
  app.get(
    '/v1/dms',
    { preHandler: requireScope('dm:read') },
    async (request, reply) => {
      const conversations = await dmService.getConversations(request.user.id);
      return reply.send({ conversations });
    },
  );

  // ---- /v1/dms/:conversationId/messages (read) ---------------------------
  app.get<{ Params: { conversationId: string } }>(
    '/v1/dms/:conversationId/messages',
    { preHandler: requireScope('dm:read') },
    async (request, reply) => {
      const result = await dmService.getMessages(
        request.user.id,
        request.params.conversationId,
      );
      return reply.send(result);
    },
  );

  // ---- /v1/dms/:conversationId/messages (post) ---------------------------
  const PostDmBodySchema = z.object({
    body: z.string().min(1).max(10000),
  });

  app.post<{ Params: { conversationId: string } }>(
    '/v1/dms/:conversationId/messages',
    { preHandler: requireScope('dm:write') },
    async (request, reply) => {
      const body = PostDmBodySchema.parse(request.body);
      const created = await dmService.sendMessage(
        request.user.id,
        request.params.conversationId,
        body.body,
      );
      return reply.status(201).send({ message: created });
    },
  );

  // ---- /v1/dms (start a new direct conversation) -------------------------
  const StartDmBodySchema = z.object({
    userId: z.string().min(1),
  });

  app.post(
    '/v1/dms',
    { preHandler: requireScope('dm:write') },
    async (request, reply) => {
      const body = StartDmBodySchema.parse(request.body);
      const conv = await dmService.createDirectConversation(
        request.user.id,
        body.userId,
      );
      return reply.status(201).send({ conversation: conv });
    },
  );
}
