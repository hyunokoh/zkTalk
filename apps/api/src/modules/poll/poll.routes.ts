import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as pollService from './poll.service.js';
import {
  ChannelIdParamsSchema,
  PollIdParamsSchema,
  VoteParamsSchema,
  CreatePollSchema,
  VotePollSchema,
  PollMessageQuerySchema,
} from './poll.schema.js';

export default async function pollRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // POST /api/channels/:channelId/polls
  // Create a poll in a channel.
  // -------------------------------------------------------------------------
  app.post(
    '/api/channels/:channelId/polls',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
        Body: {
          question: string;
          options: string[];
          isAnonymous?: boolean;
          allowMultiple?: boolean;
          expiresInHours?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);
      const body = CreatePollSchema.parse(request.body);

      const poll = await pollService.createPoll(
        request.user.id,
        channelId,
        body,
      );

      return reply.status(201).send(poll);
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/channels/:channelId/polls
  // List polls in a channel.
  // -------------------------------------------------------------------------
  app.get(
    '/api/channels/:channelId/polls',
    async (
      request: FastifyRequest<{
        Params: { channelId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { channelId } = ChannelIdParamsSchema.parse(request.params);

      const polls = await pollService.getChannelPolls(
        request.user.id,
        channelId,
      );

      return reply.send({ polls });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/polls/:pollId
  // Get a poll with results.
  // -------------------------------------------------------------------------
  app.get(
    '/api/polls',
    async (
      request: FastifyRequest<{
        Querystring: { messageIds: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { messageIds } = PollMessageQuerySchema.parse(request.query);
      const result = await pollService.getPollsByMessageIds(request.user.id, messageIds);
      return reply.send(result);
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/polls/:pollId
  // Get a poll with results.
  // -------------------------------------------------------------------------
  app.get(
    '/api/polls/:pollId',
    async (
      request: FastifyRequest<{
        Params: { pollId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { pollId } = PollIdParamsSchema.parse(request.params);

      const poll = await pollService.getPoll(request.user.id, pollId);

      return reply.send(poll);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/polls/:pollId/vote
  // Vote on a poll.
  // -------------------------------------------------------------------------
  app.post(
    '/api/polls/:pollId/vote',
    async (
      request: FastifyRequest<{
        Params: { pollId: string };
        Body: { optionId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { pollId } = PollIdParamsSchema.parse(request.params);
      const { optionId } = VotePollSchema.parse(request.body);

      const vote = await pollService.votePoll(
        request.user.id,
        pollId,
        optionId,
      );

      return reply.status(201).send(vote);
    },
  );

  // -------------------------------------------------------------------------
  // DELETE /api/polls/:pollId/vote/:optionId
  // Remove a vote from a poll.
  // -------------------------------------------------------------------------
  app.delete(
    '/api/polls/:pollId/vote/:optionId',
    async (
      request: FastifyRequest<{
        Params: { pollId: string; optionId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { pollId, optionId } = VoteParamsSchema.parse(request.params);

      await pollService.unvotePoll(request.user.id, pollId, optionId);

      return reply.status(204).send();
    },
  );
}
