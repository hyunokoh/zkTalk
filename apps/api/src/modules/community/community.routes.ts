import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateCommunitySchema, UpdateCommunitySchema, CreateInviteSchema } from './community.schema.js';
import * as communityService from './community.service.js';
import { authenticate } from '../../middleware/auth.js';

const UpdateOnboardingSchema = z.object({
  welcomeMessage: z.string().optional(),
  rules: z.array(z.string()).optional(),
  defaultChannelIds: z.array(z.string()).optional(),
  isEnabled: z.boolean().optional(),
});

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
      const param = request.params.communityId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
      const community = isUuid
        ? await communityService.getCommunityById(param)
        : await communityService.getCommunity(param);
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

  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/members',
    async (request, reply) => {
      const members = await communityService.getCommunityMembers(
        request.params.communityId,
        request.user.id,
      );
      return reply.send({ members });
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
      const result = await communityService.joinViaInvite(
        request.params.code,
        request.user.id,
      );
      return reply.send(result);
    },
  );

  // Join a public community directly
  app.post<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/join',
    async (request, reply) => {
      const result = await communityService.joinPublicCommunity(
        request.params.communityId,
        request.user.id,
      );
      return reply.send(result);
    },
  );

  app.post<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/leave',
    async (request, reply) => {
      await communityService.leaveCommunity(
        request.params.communityId,
        request.user.id,
      );
      return reply.send({ success: true });
    },
  );

  app.delete<{ Params: { communityId: string } }>(
    '/api/communities/:communityId',
    async (request, reply) => {
      await communityService.deleteCommunity(
        request.params.communityId,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // ── Roles ────────────────────────────────────────────────────

  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/roles',
    async (request, reply) => {
      const roles = await communityService.listCommunityRoles(
        request.params.communityId,
      );
      return reply.send({ roles });
    },
  );

  app.patch<{ Params: { communityId: string; userId: string } }>(
    '/api/communities/:communityId/members/:userId/role',
    async (request, reply) => {
      const { role } = z.object({ role: z.string() }).parse(request.body);
      const result = await communityService.assignMemberRole(
        request.params.communityId,
        request.user.id,
        request.params.userId,
        role,
      );
      return reply.send(result);
    },
  );

  app.get<{ Params: { communityId: string; userId: string } }>(
    '/api/communities/:communityId/members/:userId/role',
    async (request, reply) => {
      const result = await communityService.getMemberRole(
        request.params.communityId,
        request.user.id,
        request.params.userId,
      );
      return reply.send(result);
    },
  );

  // ── Onboarding ────────────────────────────────────────────────────

  app.get<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/onboarding',
    async (request, reply) => {
      const onboarding = await communityService.getOnboarding(
        request.params.communityId,
        request.user.id,
      );
      return reply.send({ onboarding });
    },
  );

  app.put<{ Params: { communityId: string } }>(
    '/api/communities/:communityId/onboarding',
    async (request, reply) => {
      const body = UpdateOnboardingSchema.parse(request.body);
      const onboarding = await communityService.updateOnboarding(
        request.params.communityId,
        request.user.id,
        body,
      );
      return reply.send({ onboarding });
    },
  );
}
