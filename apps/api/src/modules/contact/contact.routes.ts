import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { ContactSyncSchema } from './contact.schema.js';
import * as contactService from './contact.service.js';

export default async function contactRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/contacts/sync
   * Upload SHA-256 hashes of phone contacts and find matching zkTalk users.
   */
  app.post('/api/contacts/sync', async (request, reply) => {
    const body = ContactSyncSchema.parse(request.body);
    const result = await contactService.syncContacts(request.user.id, body.hashes);
    return reply.send(result);
  });

  /**
   * GET /api/contacts/suggestions
   * Get contact-based friend suggestions (mutual discovery).
   */
  app.get('/api/contacts/suggestions', async (request, reply) => {
    const suggestions = await contactService.getContactSuggestions(request.user.id);
    return reply.send({ suggestions });
  });
}
