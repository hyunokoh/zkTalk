import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as threadService from './thread.service.js';
import {
  MessageIdParamsSchema,
  ChannelIdParamsSchema,
  ThreadIdParamsSchema,
  ThreadListQuerySchema,
  ThreadMessagesQuerySchema,
  ThreadSummaryQuerySchema,
  CreateForumPostSchema,
  PostToThreadSchema,
  MarkThreadReadSchema,
} from './thread.schema.js';

export default async function threadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/messages/:messageId/thread
   * Create a thread from an existing message (chat channels).
   */
  app.post(
    '/api/messages/:messageId/thread',
    async (
      request: FastifyRequest<{ Params: { messageId: string } }>,
      reply: FastifyReply,
    ) => {
      const { messageId } = MessageIdParamsSchema.parse(request.params);
      const thread = await threadService.createThreadFromMessage(
        request.user.id,
        messageId,
      );
      return reply.status(201).send(thread);
    },
  );

  /**
   * POST /api/channels/:channelId/threads
   * Create a new forum post (thread + root message).
   */
  app.post(
    '/api/channels/:channelId/threads',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: { title: string; bodyMarkdown: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const body = CreateForumPostSchema.parse(request.body);
      const result = await threadService.createForumPost(
        request.user.id,
        channelId,
        body,
      );
      return reply.status(201).send(result);
    },
  );

  /**
   * GET /api/channels/:channelId/threads?cursor=&limit=&sort=
   * List threads in a forum channel.
   */
  app.get(
    '/api/threads',
    async (
      request: FastifyRequest<{
        Querystring: { rootMessageIds: string };
      }>,
      reply: FastifyReply,
    ) => {
      const query = ThreadSummaryQuerySchema.parse(request.query);
      const result = await threadService.getThreadSummaries(request.user.id, query.rootMessageIds);
      return reply.send(result);
    },
  );

  app.get(
    '/api/channels/:channelId/threads',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Querystring: { cursor?: string; limit?: string; sort?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const query = ThreadListQuerySchema.parse(request.query);
      const result = await threadService.getThreads(
        request.user.id,
        channelId,
        query.cursor,
        query.limit,
        query.sort,
      );
      return reply.send(result);
    },
  );

  /**
   * GET /api/threads/:threadId/messages?cursor=&limit=
   * Get messages in a thread.
   */
  app.get(
    '/api/channels/:channelId/threads/:threadId',
    async (
      request: FastifyRequest<{
        Params: { channelId: string; threadId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const result = await threadService.getThread(request.user.id, threadId);
      return reply.send(result);
    },
  );

  app.get(
    '/api/threads/:threadId',
    async (
      request: FastifyRequest<{
        Params: { threadId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const result = await threadService.getThread(request.user.id, threadId);
      return reply.send(result);
    },
  );

  /**
   * GET /api/threads/:threadId/messages?cursor=&limit=
   * Get messages in a thread.
   */
  app.get(
    '/api/channels/:channelId/threads/:threadId/messages',
    async (
      request: FastifyRequest<{
        Params: { channelId: string; threadId: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const query = ThreadMessagesQuerySchema.parse(request.query);
      const result = await threadService.getThreadMessages(
        request.user.id,
        threadId,
        query.cursor,
        query.limit,
      );
      return reply.send(result);
    },
  );

  app.get(
    '/api/threads/:threadId/messages',
    async (
      request: FastifyRequest<{
        Params: { threadId: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const query = ThreadMessagesQuerySchema.parse(request.query);
      const result = await threadService.getThreadMessages(
        request.user.id,
        threadId,
        query.cursor,
        query.limit,
      );
      return reply.send(result);
    },
  );

  /**
   * POST /api/threads/:threadId/messages
   * Post a reply to a thread.
   */
  app.post(
    '/api/channels/:channelId/threads/:threadId/messages',
    async (
      request: FastifyRequest<{
        Params: { channelId: string; threadId: string };
        Body: { bodyMarkdown: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const body = PostToThreadSchema.parse(request.body);
      const message = await threadService.postToThread(
        request.user.id,
        threadId,
        body,
      );
      return reply.status(201).send(message);
    },
  );

  app.post(
    '/api/threads/:threadId/messages',
    async (
      request: FastifyRequest<{
        Params: { threadId: string };
        Body: { bodyMarkdown: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const body = PostToThreadSchema.parse(request.body);
      const message = await threadService.postToThread(
        request.user.id,
        threadId,
        body,
      );
      return reply.status(201).send(message);
    },
  );

  /**
   * POST /api/threads/:threadId/follow
   * Follow a thread.
   */
  app.post(
    '/api/threads/:threadId/read',
    async (
      request: FastifyRequest<{
        Params: { threadId: string };
        Body: { messageId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const body = MarkThreadReadSchema.parse(request.body);
      const result = await threadService.markThreadRead(
        request.user.id,
        threadId,
        body.messageId,
      );
      return reply.send(result);
    },
  );

  app.post(
    '/api/threads/:threadId/follow',
    async (
      request: FastifyRequest<{ Params: { threadId: string } }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const result = await threadService.followThread(request.user.id, threadId);
      return reply.send(result);
    },
  );

  /**
   * DELETE /api/threads/:threadId/follow
   * Unfollow a thread.
   */
  app.delete(
    '/api/threads/:threadId/follow',
    async (
      request: FastifyRequest<{ Params: { threadId: string } }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const result = await threadService.unfollowThread(request.user.id, threadId);
      return reply.send(result);
    },
  );

  /**
   * POST /api/threads/:threadId/lock
   * Lock a thread (moderation).
   */
  app.post(
    '/api/threads/:threadId/lock',
    async (
      request: FastifyRequest<{ Params: { threadId: string } }>,
      reply: FastifyReply,
    ) => {
      const { threadId } = ThreadIdParamsSchema.parse(request.params);
      const thread = await threadService.lockThread(request.user.id, threadId);
      return reply.send(thread);
    },
  );
}
