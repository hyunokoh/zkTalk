import type { FastifyInstance } from 'fastify';
import { SendFriendRequestSchema, FriendListQuerySchema, FriendUserSearchSchema } from './friend.schema.js';
import * as friendService from './friend.service.js';
import { authenticate } from '../../middleware/auth.js';

export default async function friendRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/friends/search', async (request, reply) => {
    const query = FriendUserSearchSchema.parse(request.query);
    const users = await friendService.searchUsers(request.user.id, query.q, query.limit);
    return reply.send({ users });
  });

  app.post('/api/friends/request', async (request, reply) => {
    const body = SendFriendRequestSchema.parse(request.body);
    const friendship = await friendService.sendFriendRequest(request.user.id, body.userId);
    return reply.status(201).send({ friendship });
  });

  app.post<{ Params: { friendshipId: string } }>(
    '/api/friends/:friendshipId/accept',
    async (request, reply) => {
      const friendship = await friendService.acceptFriendRequest(
        request.params.friendshipId,
        request.user.id,
      );
      return reply.send({ friendship });
    },
  );

  app.delete<{ Params: { friendshipId: string } }>(
    '/api/friends/:friendshipId',
    async (request, reply) => {
      await friendService.removeFriend(request.params.friendshipId, request.user.id);
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { friendshipId: string } }>(
    '/api/friends/:friendshipId/block',
    async (request, reply) => {
      const friendship = await friendService.blockUser(
        request.params.friendshipId,
        request.user.id,
      );
      return reply.send({ friendship });
    },
  );

  app.get('/api/friends', async (request, reply) => {
    const query = FriendListQuerySchema.parse(request.query);
    const friends = await friendService.listFriends(request.user.id, query.status);
    return reply.send({ friends });
  });

  app.get<{ Params: { userId: string } }>(
    '/api/friends/check/:userId',
    async (request, reply) => {
      const result = await friendService.checkFriendship(
        request.user.id,
        request.params.userId,
      );
      return reply.send(result);
    },
  );
}
