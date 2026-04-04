import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import {
  ChannelIdParamsSchema,
  InitE2eeSchema,
  RotateKeySchema,
  AddMemberKeySchema,
} from './channel-e2ee.schema.js';
import * as e2eeService from './channel-e2ee.service.js';

export default async function channelE2eeRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/channels/:channelId/e2ee/init
   * Initialize E2EE for a channel (admin only).
   * The client generates a random group key, encrypts it for each member,
   * and sends all encrypted keys.
   */
  app.post('/api/channels/:channelId/e2ee/init', async (request, reply) => {
    const { channelId } = ChannelIdParamsSchema.parse(request.params);
    const body = InitE2eeSchema.parse(request.body);

    const channel = await e2eeService.initializeE2ee(
      channelId,
      request.user.id,
      body.memberKeys,
      body.keyVersion,
    );

    return reply.status(201).send({ channel });
  });

  /**
   * GET /api/channels/:channelId/e2ee/key
   * Get my encrypted group key for this channel.
   */
  app.get('/api/channels/:channelId/e2ee/key', async (request, reply) => {
    const { channelId } = ChannelIdParamsSchema.parse(request.params);
    const key = await e2eeService.getMyChannelKey(channelId, request.user.id);
    return reply.send(key);
  });

  /**
   * POST /api/channels/:channelId/e2ee/rotate
   * Rotate the group key (e.g., when a member leaves).
   * Admin sends new encrypted keys for all remaining members.
   */
  app.post('/api/channels/:channelId/e2ee/rotate', async (request, reply) => {
    const { channelId } = ChannelIdParamsSchema.parse(request.params);
    const body = RotateKeySchema.parse(request.body);

    const result = await e2eeService.rotateGroupKey(
      channelId,
      request.user.id,
      body.memberKeys,
      body.keyVersion,
    );

    return reply.send(result);
  });

  /**
   * POST /api/channels/:channelId/e2ee/add-member
   * Encrypt the current group key for a new member.
   * An existing member who has the group key re-encrypts it for the new member.
   */
  app.post('/api/channels/:channelId/e2ee/add-member', async (request, reply) => {
    const { channelId } = ChannelIdParamsSchema.parse(request.params);
    const body = AddMemberKeySchema.parse(request.body);

    const key = await e2eeService.addMemberKey(
      channelId,
      request.user.id,
      body.userId,
      body.encryptedGroupKey,
      body.keyVersion,
    );

    return reply.send({ key });
  });
}
