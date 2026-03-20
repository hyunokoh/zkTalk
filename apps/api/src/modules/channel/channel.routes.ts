import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as channelService from './channel.service.js';
import {
  CommunityIdParamsSchema,
  CategoryIdParamsSchema,
  ChannelIdParamsSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateChannelSchema,
  UpdateChannelSchema,
} from './channel.schema.js';

/**
 * Channel & Category routes plugin.
 *
 * Register in server.ts:
 *   await app.register(channelRoutes);
 */
export default async function channelRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // Category routes
  // -------------------------------------------------------------------------

  /**
   * POST /api/communities/:communityId/categories
   * Create a new category in a community.
   */
  app.post(
    '/api/communities/:communityId/categories',
    async (
      request: FastifyRequest<{
        Params: { communityId: string };
        Body: { name: string; position?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const body = CreateCategorySchema.parse(request.body);

      const category = await channelService.createCategory(
        communityId,
        request.user.id,
        body,
      );

      return reply.status(201).send(category);
    },
  );

  /**
   * PATCH /api/categories/:categoryId
   * Update a category.
   */
  app.patch(
    '/api/categories/:categoryId',
    async (
      request: FastifyRequest<{
        Params: { categoryId: string };
        Body: { name?: string; position?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { categoryId } = CategoryIdParamsSchema.parse(request.params);
      const body = UpdateCategorySchema.parse(request.body);

      const category = await channelService.updateCategory(
        categoryId,
        request.user.id,
        body,
      );

      return reply.send(category);
    },
  );

  /**
   * DELETE /api/categories/:categoryId
   * Delete a category (must have no channels).
   */
  app.delete(
    '/api/categories/:categoryId',
    async (
      request: FastifyRequest<{
        Params: { categoryId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { categoryId } = CategoryIdParamsSchema.parse(request.params);

      await channelService.deleteCategory(categoryId, request.user.id);

      return reply.status(204).send();
    },
  );

  // -------------------------------------------------------------------------
  // Channel routes
  // -------------------------------------------------------------------------

  /**
   * POST /api/communities/:communityId/channels
   * Create a new channel in a community.
   */
  app.post(
    '/api/communities/:communityId/channels',
    async (
      request: FastifyRequest<{
        Params: { communityId: string };
        Body: {
          name: string;
          description?: string;
          type?: 'chat' | 'announcement' | 'forum';
          categoryId?: string;
          visibility?: 'public' | 'role_restricted';
          slowModeSeconds?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const body = CreateChannelSchema.parse(request.body);

      const channel = await channelService.createChannel(
        communityId,
        request.user.id,
        body,
      );

      return reply.status(201).send(channel);
    },
  );

  /**
   * PATCH /api/channels/:channelId
   * Update a channel.
   */
  app.patch(
    '/api/channels/:channelId',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: {
          name?: string;
          description?: string | null;
          visibility?: 'public' | 'role_restricted';
          slowModeSeconds?: number;
          categoryId?: string | null;
          position?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const body = UpdateChannelSchema.parse(request.body);

      const channel = await channelService.updateChannel(
        channelId,
        request.user.id,
        body,
      );

      return reply.send(channel);
    },
  );

  /**
   * POST /api/channels/:channelId/archive
   * Archive a channel.
   */
  app.post(
    '/api/channels/:channelId/archive',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);

      const channel = await channelService.archiveChannel(
        channelId,
        request.user.id,
      );

      return reply.send(channel);
    },
  );

  /**
   * GET /api/communities/:communityId/channels
   * List channels grouped by category (filtered by user's view_channel permission).
   */
  app.get(
    '/api/communities/:communityId/channels',
    async (
      request: FastifyRequest<{
        Params: { communityId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);

      const result = await channelService.listChannels(
        communityId,
        request.user.id,
      );

      return reply.send(result);
    },
  );
}
