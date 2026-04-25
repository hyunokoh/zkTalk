import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../lib/errors.js';
import { findUserBasicInfo } from '../modules/contact/contact.repository.js';
import { authenticateKey } from '../modules/api-key/api-key.service.js';
import type { ApiKeyScope } from '../modules/api-key/api-key.scopes.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: { keyId: string; scopes: string[] };
  }
}

/**
 * preHandler that authenticates a request via Authorization: Bearer <api-key>
 * (NOT a JWT). Sets request.user and request.apiKey, then route-level
 * `requireScope(...)` checks the scope set.
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing API key. Use Authorization: Bearer <key>.');
  }
  const token = auth.slice(7).trim();
  const { userId, keyId, scopes } = await authenticateKey(token);

  const user = await findUserBasicInfo(userId);
  if (!user) throw AppError.unauthorized('Owner of API key no longer exists');

  request.user = {
    id: user.id,
    email: '', // not exposed to API-key callers
    displayName: user.displayName,
    username: user.username,
  };
  request.apiKey = { keyId, scopes };
}

/**
 * Route-level guard. Apply via `preHandler: requireScope('messages:write')`.
 */
export function requireScope(scope: ApiKeyScope) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.apiKey) {
      throw AppError.unauthorized('API key required');
    }
    if (!request.apiKey.scopes.includes(scope)) {
      throw AppError.forbidden(
        `API key is missing required scope: ${scope}`,
        'INSUFFICIENT_SCOPE',
      );
    }
  };
}
