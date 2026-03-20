import type { FastifyInstance } from 'fastify';
import { CreateCommunitySchema, UpdateCommunitySchema, CreateInviteSchema } from './community.schema.js';
import * as communityService from './community.service.js';
import { authenticate } from '../../middleware/auth.js';

export default async function communityRoutes(app: FastifyInstance) {
  // All community routes require authentication
  app.addHook('preHandler', authenticate);

  app.get('/api/communities', async (request, reply) => {
    const communities = await communityService.getUserCommunities(request.user.id);
    return reply.send({ communities });
  });

  app.post('/api/communities', async (request, reply) => {
    const body = CreateCommunitySchema.parse(request.body);
    const community = await communityService.createCommunity(request.user.id, body);
    return reply.status(201).send({ community });
  });

  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId',
    async (request, reply) => {
      const community = await communityService.getCommunityById(request.params.communityId);
      return reply.send({ community });
    },
  );

  app.patch<{ Params: { communityId: string } }>(
    '/api/communities/:communityId',
    async (request, reply) => {
      const body = UpdateCommunitySchema.parse(request.body);
      const community = await communityService.updateCommunity(
        request.params.communityId,
        request.user.id,
        body,
      );
      return reply.send({ community });
    },
  );

  app.post<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/invites',
    async (request, reply) => {
      const body = CreateInviteSchema.parse(request.body);
      const invite = await communityService.createInvite(
        request.params.communityId,
        request.user.id,
        body,
      );
      return reply.status(201).send({ invite });
    },
  );

  app.post<{ Params: { code: string } }>(
    '/api/invites/:code/join',
    async (request, reply) => {
      const membership = await communityService.joinViaInvite(
        request.params.code,
        request.user.id,
      );
      return reply.send({ membership });
    },
  );
}
