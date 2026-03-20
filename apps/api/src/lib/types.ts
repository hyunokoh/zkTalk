import type { FastifyRequest } from 'fastify';

/**
 * A Fastify request that has been authenticated.
 * The `user` property is guaranteed to be populated by the auth middleware.
 */
export type AuthenticatedRequest = FastifyRequest & {
  user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
  };
};
