import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import * as backupService from './backup.service.js';
import { RestoreBackupSchema } from '@zktalk/shared';

export default async function backupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // -------------------------------------------------------------------------
  // POST /api/me/backup
  // Export all user messages as a JSON blob (to be encrypted client-side).
  // -------------------------------------------------------------------------
  app.post('/api/me/backup', async (request, reply) => {
    const backup = await backupService.exportBackup(request.user.id);
    return reply.send(backup);
  });

  // -------------------------------------------------------------------------
  // POST /api/me/restore
  // Accept an encrypted backup blob for validation/import.
  // -------------------------------------------------------------------------
  app.post('/api/me/restore', async (request, reply) => {
    const { encryptedData } = RestoreBackupSchema.parse(request.body);
    const result = await backupService.validateRestorePayload(
      request.user.id,
      encryptedData,
    );
    return reply.send(result);
  });
}
