import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as automodService from './automod.service.js';
import {
  CommunityIdParamsSchema,
  RuleIdParamsSchema,
  CreateAutoModRuleSchema,
  UpdateAutoModRuleSchema,
} from './automod.schema.js';

export default async function automodRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /api/communities/:communityId/automod/rules
  app.get(
    '/api/communities/:communityId/automod/rules',
    async (
      request: FastifyRequest<{ Params: { communityId: string } }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const rules = await automodService.getRules(communityId);
      return reply.send({ rules });
    },
  );

  // POST /api/communities/:communityId/automod/rules
  app.post(
    '/api/communities/:communityId/automod/rules',
    async (
      request: FastifyRequest<{
        Params: { communityId: string };
        Body: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      const { communityId } = CommunityIdParamsSchema.parse(request.params);
      const body = CreateAutoModRuleSchema.parse(request.body);
      const rule = await automodService.createRule(communityId, request.user.id, body);
      return reply.status(201).send({ rule });
    },
  );

  // PATCH /api/automod/rules/:ruleId
  app.patch(
    '/api/automod/rules/:ruleId',
    async (
      request: FastifyRequest<{
        Params: { ruleId: string };
        Body: unknown;
      }>,
      reply: FastifyReply,
    ) => {
      const { ruleId } = RuleIdParamsSchema.parse(request.params);
      const body = UpdateAutoModRuleSchema.parse(request.body);
      const rule = await automodService.updateRule(ruleId, request.user.id, body);
      return reply.send({ rule });
    },
  );

  // DELETE /api/automod/rules/:ruleId
  app.delete(
    '/api/automod/rules/:ruleId',
    async (
      request: FastifyRequest<{ Params: { ruleId: string } }>,
      reply: FastifyReply,
    ) => {
      const { ruleId } = RuleIdParamsSchema.parse(request.params);
      await automodService.deleteRule(ruleId, request.user.id);
      return reply.status(204).send();
    },
  );
}
