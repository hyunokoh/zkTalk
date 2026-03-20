import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkPermission } from '../modules/channel/channel.service.js';

/**
 * Creates a Fastify preHandler hook that checks whether the authenticated user
 * has the required permission in the community (and optionally the channel)
 * derived from route params.
 *
 * Expects `request.user` to be set (run the `authenticate` hook first).
 * Extracts `communityId` and `channelId` from `request.params`.
 *
 * Usage:
 *   app.get('/route', { preHandler: [authenticate, requirePermission('manage_channels')] }, handler);
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const params = request.params as Record<string, string>;

    const communityId = params.communityId;
    const channelId = params.channelId ?? null;

    if (!communityId) {
      // If there's no communityId in params, we need to resolve it from the
      // channelId or categoryId. For now, this middleware expects communityId
      // to be present in the route params. If it's not, the service layer
      // permission checks will handle it per-route.
      throw new Error(
        'requirePermission middleware requires communityId in route params. ' +
        'Use the service-layer checkPermission for routes without communityId.',
      );
    }

    await checkPermission(
      request.user.id,
      communityId,
      channelId,
      permission,
    );
  };
}
