import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as dmService from './dm.service.js';
import {
  DmConversationIdParamsSchema,
  DmMessageIdParamsSchema,
  CreateDirectDmSchema,
  CreateGroupDmSchema,
  SendDmMessageSchema,
  UpdateDmMessageSchema,
  DmPaginationSchema,
  DmUserSearchSchema,
  AddDmMemberSchema,
  MarkReadSchema,
  PromoteDmToCommunitySchema,
} from './dm.schema.js';

/**
 * DM routes plugin.
 *
 * Register in server.ts:
 *   await app.register(dmRoutes);
 */
export default async function dmRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // GET /api/dm/users/search
  // Search users by username or display name for new DM creation.
  // -------------------------------------------------------------------------
  app.get(
    '/api/dm/users/search',
    async (
      request: FastifyRequest<{
        Querystring: { q: string; limit?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { q, limit } = DmUserSearchSchema.parse(request.query);
      const users = await dmService.searchUsers(request.user.id, q, limit);
      return reply.send({ users });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/dm/conversations
  // Create a direct (1:1) DM conversation.
  // -------------------------------------------------------------------------
  app.post(
    '/api/dm/conversations',
    async (
      request: FastifyRequest<{
        Body: { targetUserId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { targetUserId } = CreateDirectDmSchema.parse(request.body);

      const conversation = await dmService.createDirectConversation(
        request.user.id,
        targetUserId,
      );

      return reply.status(201).send(conversation);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/dm/conversations/group
  // Create a group DM conversation.
  // -------------------------------------------------------------------------
  app.post(
    '/api/dm/conversations/group',
    async (
      request: FastifyRequest<{
        Body: { participantUserIds: string[]; name?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { participantUserIds, name } = CreateGroupDmSchema.parse(request.body);

      const conversation = await dmService.createGroupConversation(
        request.user.id,
        participantUserIds,
        name,
      );

      return reply.status(201).send(conversation);
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/dm/conversations
  // List all DM conversations for the authenticated user.
  // -------------------------------------------------------------------------
  app.get(
    '/api/dm/conversations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const conversations = await dmService.getConversations(request.user.id);
      return reply.send({ conversations });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/dm/conversations/:conversationId
  // Get a specific DM conversation.
  // -------------------------------------------------------------------------
  app.get(
    '/api/dm/conversations/:conversationId',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);

      const conversation = await dmService.getConversation(
        request.user.id,
        conversationId,
      );

      return reply.send(conversation);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/dm/conversations/:conversationId/promote
  // Promote a DM conversation into a private community and copy its history
  // into the initial channel.
  // -------------------------------------------------------------------------
  app.post(
    '/api/dm/conversations/:conversationId/promote',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: {
          communityName?: string;
          channelName?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);
      const body = PromoteDmToCommunitySchema.parse(request.body ?? {});

      const result = await dmService.promoteConversationToCommunity(
        request.user.id,
        conversationId,
        body,
      );

      return reply.status(result.alreadyPromoted ? 200 : 201).send(result);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/dm/conversations/:conversationId/call-target
  // Ensure this DM has a private voice room target and return it.
  // -------------------------------------------------------------------------
  app.post(
    '/api/dm/conversations/:conversationId/call-target',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);

      const result = await dmService.getConversationCallTarget(
        request.user.id,
        conversationId,
      );

      return reply.send(result);
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/dm/conversations/:conversationId/messages
  // List messages in a DM conversation with cursor-based pagination.
  // -------------------------------------------------------------------------
  app.get(
    '/api/dm/conversations/:conversationId/messages',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Querystring: { cursor?: string; limit?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);
      const { cursor, limit } = DmPaginationSchema.parse(request.query);

      const result = await dmService.getMessages(
        request.user.id,
        conversationId,
        cursor,
        limit,
      );

      return reply.send(result);
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/dm/messages/:messageId
  // Get a specific DM message with attachments.
  // -------------------------------------------------------------------------
  app.get(
    '/api/dm/messages/:messageId',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = DmMessageIdParamsSchema.parse(request.params);
      const result = await dmService.getMessage(request.user.id, messageId);
      return reply.send(result);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/dm/conversations/:conversationId/messages
  // Send a message in a DM conversation.
  // -------------------------------------------------------------------------
  app.post(
    '/api/dm/conversations/:conversationId/messages',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: {
          bodyMarkdown: string;
          isEncrypted?: boolean;
          encryptedPayload?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);
      const { bodyMarkdown, isEncrypted, encryptedPayload } =
        SendDmMessageSchema.parse(request.body);
      const requestId = request.headers['x-request-id'] as string | undefined;

      const message = await dmService.sendMessage(
        request.user.id,
        conversationId,
        bodyMarkdown,
        isEncrypted,
        encryptedPayload,
        requestId,
      );

      return reply.status(201).send(message);
    },
  );

  // -------------------------------------------------------------------------
  // PATCH /api/dm/messages/:messageId
  // Edit a DM message (author only).
  // -------------------------------------------------------------------------
  app.patch(
    '/api/dm/messages/:messageId',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
        Body: {
          bodyMarkdown: string;
          isEncrypted?: boolean;
          encryptedPayload?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = DmMessageIdParamsSchema.parse(request.params);
      const { bodyMarkdown, isEncrypted, encryptedPayload } =
        UpdateDmMessageSchema.parse(request.body);

      const message = await dmService.editMessage(
        request.user.id,
        messageId,
        bodyMarkdown,
        isEncrypted,
        encryptedPayload,
      );

      return reply.send(message);
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /api/dm/messages/:messageId
  // Soft-delete a DM message (author only).
  // -------------------------------------------------------------------------
  app.delete(
    '/api/dm/messages/:messageId',
    async (
      request: FastifyRequest<{
        Params: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = DmMessageIdParamsSchema.parse(request.params);

      await dmService.deleteMessage(request.user.id, messageId);

      return reply.status(204).send();
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/dm/conversations/:conversationId/read-status
  // Get read status (lastReadMessageId per participant) for a DM conversation.
  // -------------------------------------------------------------------------
  app.get(
    '/api/dm/conversations/:conversationId/read-status',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);

      const readStatus = await dmService.getReadStatus(
        request.user.id,
        conversationId,
      );

      return reply.send({ readStatus });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/dm/conversations/:conversationId/read
  // Mark a DM conversation as read up to a given message.
  // -------------------------------------------------------------------------
  app.post(
    '/api/dm/conversations/:conversationId/read',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);
      const { messageId } = MarkReadSchema.parse(request.body);

      await dmService.markAsRead(request.user.id, conversationId, messageId);

      return reply.status(204).send();
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/dm/conversations/:conversationId/members
  // Add a member to a group DM conversation.
  // -------------------------------------------------------------------------
  app.post(
    '/api/dm/conversations/:conversationId/members',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: { userId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);
      const { userId } = AddDmMemberSchema.parse(request.body);

      const conversation = await dmService.addGroupMember(
        request.user.id,
        conversationId,
        userId,
      );

      return reply.status(201).send(conversation);
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /api/dm/conversations/:conversationId/members/me
  // Leave a group DM conversation.
  // -------------------------------------------------------------------------
  app.delete(
    '/api/dm/conversations/:conversationId/members/me',
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { conversationId } = DmConversationIdParamsSchema.parse(request.params);

      await dmService.leaveGroup(request.user.id, conversationId);

      return reply.status(204).send();
    },
  );
}
