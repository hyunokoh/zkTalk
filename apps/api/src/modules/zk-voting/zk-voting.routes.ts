import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as zkVotingService from './zk-voting.service.js';
import {
  ChannelIdParamsSchema,
  PollIdParamsSchema,
  CreateZkPollSchema,
  ZkVoteSchema,
  ZkVerifySchema,
} from './zk-voting.schema.js';

export default async function zkVotingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // POST /api/channels/:channelId/zk-polls
  // Create a ZK poll in a channel.
  // -------------------------------------------------------------------------
  app.post(
    '/api/channels/:channelId/zk-polls',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: { question: string; options: string[] };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const body = CreateZkPollSchema.parse(request.body);

      const poll = await zkVotingService.createZkPoll(
        request.user.id,
        channelId,
        body,
      );

      return reply.status(201).send(poll);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/zk-polls/:pollId/vote
  // Submit an anonymous ZK vote.
  // -------------------------------------------------------------------------
  app.post(
    '/api/zk-polls/:pollId/vote',
    async (
      request: FastifyRequest<{
        Params: { pollId: string };
        Body: { voteHash: string; nullifier: string; optionId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { pollId } = PollIdParamsSchema.parse(request.params);
      const body = ZkVoteSchema.parse(request.body);

      const vote = await zkVotingService.submitZkVote(pollId, body);

      return reply.status(201).send(vote);
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/zk-polls/:pollId/results
  // Get vote counts per option for a ZK poll.
  // -------------------------------------------------------------------------
  app.get(
    '/api/zk-polls/:pollId/results',
    async (
      request: FastifyRequest<{
        Params: { pollId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { pollId } = PollIdParamsSchema.parse(request.params);

      const results = await zkVotingService.getZkPollResults(pollId);

      return reply.send(results);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/zk-polls/:pollId/verify
  // Verify a ZK vote by recomputing the hash.
  // -------------------------------------------------------------------------
  app.post(
    '/api/zk-polls/:pollId/verify',
    async (
      request: FastifyRequest<{
        Params: { pollId: string };
        Body: { nullifier: string; secret: string; optionId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { pollId } = PollIdParamsSchema.parse(request.params);
      const body = ZkVerifySchema.parse(request.body);

      const result = await zkVotingService.verifyZkVote(pollId, body);

      return reply.send(result);
    },
  );
}
