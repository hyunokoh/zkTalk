import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import {
  ApproveCommandSchema,
  DeviceHeartbeatSchema,
  QueueCommandSchema,
  RegisterAgentDeviceSchema,
  RegisterDeviceAgentSchema,
  SubmitCommandResultSchema,
  UpdateAgentDeviceSchema,
} from '@zktalk/shared';
import * as agentsService from './agents.service.js';

export default async function agentsRoutes(app: FastifyInstance) {
  // ── Devices ────────────────────────────────────────────────────────

  app.get(
    '/api/devices',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const result = await agentsService.listDevices(request.user.id);
      return reply.send(result);
    },
  );

  app.post(
    '/api/devices',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = RegisterAgentDeviceSchema.parse(request.body);
      const device = await agentsService.registerDevice(request.user.id, body);
      return reply.status(201).send({ device });
    },
  );

  app.patch<{ Params: { deviceId: string } }>(
    '/api/devices/:deviceId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = UpdateAgentDeviceSchema.parse(request.body);
      const device = await agentsService.updateDevice(
        request.user.id,
        request.params.deviceId,
        body,
      );
      return reply.send({ device });
    },
  );

  app.delete<{ Params: { deviceId: string } }>(
    '/api/devices/:deviceId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await agentsService.removeDevice(request.user.id, request.params.deviceId);
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { deviceId: string } }>(
    '/api/devices/:deviceId/heartbeat',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = DeviceHeartbeatSchema.parse(request.body);
      const device = await agentsService.recordHeartbeat(
        request.user.id,
        request.params.deviceId,
        body,
      );
      return reply.send({ device });
    },
  );

  // ── Device agents ──────────────────────────────────────────────────

  app.get<{ Params: { deviceId: string } }>(
    '/api/devices/:deviceId/agents',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const agents = await agentsService.listDeviceAgents(
        request.user.id,
        request.params.deviceId,
      );
      return reply.send({ agents });
    },
  );

  app.post<{ Params: { deviceId: string } }>(
    '/api/devices/:deviceId/agents',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = RegisterDeviceAgentSchema.parse(request.body);
      const agent = await agentsService.registerDeviceAgent(
        request.user.id,
        request.params.deviceId,
        body,
      );
      return reply.status(201).send({ agent });
    },
  );

  // ── Commands ───────────────────────────────────────────────────────

  app.get(
    '/api/commands',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const q = request.query as { deviceId?: string; threadId?: string; limit?: string };
      const limit = q.limit ? Number(q.limit) : undefined;
      const threadId =
        q.threadId === '__default__' ? null : (q.threadId || undefined);
      const commands = await agentsService.listRecentCommands(request.user.id, {
        deviceId: q.deviceId,
        threadId,
        limit: Number.isFinite(limit) ? limit : undefined,
      });
      return reply.send({ commands });
    },
  );

  // ── Threads ────────────────────────────────────────────────────────

  app.get<{ Params: { deviceId: string } }>(
    '/api/devices/:deviceId/threads',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const threads = await agentsService.listThreads(
        request.user.id,
        request.params.deviceId,
      );
      return reply.send({ threads });
    },
  );

  app.post<{ Params: { deviceId: string } }>(
    '/api/devices/:deviceId/threads',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = (request.body ?? {}) as { title?: string };
      const thread = await agentsService.createThread(
        request.user.id,
        request.params.deviceId,
        body.title,
      );
      return reply.status(201).send({ thread });
    },
  );

  app.patch<{ Params: { threadId: string } }>(
    '/api/agent-threads/:threadId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = (request.body ?? {}) as { title?: string };
      const thread = await agentsService.renameThread(
        request.user.id,
        request.params.threadId,
        body.title,
      );
      return reply.send({ thread });
    },
  );

  app.delete<{ Params: { threadId: string } }>(
    '/api/agent-threads/:threadId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await agentsService.deleteThread(request.user.id, request.params.threadId);
      return reply.status(204).send();
    },
  );

  app.post(
    '/api/commands',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = QueueCommandSchema.parse(request.body);
      const command = await agentsService.queueCommand(request.user.id, body);
      return reply.status(201).send({ command });
    },
  );

  app.get<{ Params: { commandId: string } }>(
    '/api/commands/:commandId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const command = await agentsService.getCommand(
        request.user.id,
        request.params.commandId,
      );
      return reply.send({ command });
    },
  );

  app.post<{ Params: { commandId: string } }>(
    '/api/commands/:commandId/decision',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = ApproveCommandSchema.parse(request.body);
      const command = await agentsService.recordCommandApproval(
        request.user.id,
        request.params.commandId,
        body.decision,
      );
      return reply.send({ command });
    },
  );

  // ── Bridge-facing command lifecycle ────────────────────────────────

  app.post<{ Params: { commandId: string } }>(
    '/api/commands/:commandId/claim',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const command = await agentsService.claimCommand(
        request.user.id,
        request.params.commandId,
      );
      return reply.send({ command });
    },
  );

  app.post<{ Params: { commandId: string } }>(
    '/api/commands/:commandId/result',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = SubmitCommandResultSchema.parse(request.body);
      const command = await agentsService.submitCommandResult(
        request.user.id,
        request.params.commandId,
        body,
      );
      return reply.send({ command });
    },
  );
}
