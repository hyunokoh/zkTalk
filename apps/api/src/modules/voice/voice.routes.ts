import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { VoiceTokenParamsSchema } from './voice.schema.js';
import * as voiceService from './voice.service.js';
import { db } from '../../lib/db/index.js';
import { channels } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export default async function voiceRoutes(app: FastifyInstance) {
  // Join a voice channel — generates token + broadcasts join event
  app.post(
    '/api/channels/:channelId/voice/join',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { channelId } = VoiceTokenParamsSchema.parse(request.params);
      const result = await voiceService.joinVoiceChannel(
        channelId,
        request.user.id,
        request.user.displayName,
      );
      return reply.send(result);
    },
  );

  // Leave a voice channel — broadcasts leave event + saves call history if last
  app.post(
    '/api/channels/:channelId/voice/leave',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { channelId } = VoiceTokenParamsSchema.parse(request.params);

      // Look up communityId for call history system message
      const [channel] = await db
        .select({ communityId: channels.communityId })
        .from(channels)
        .where(eq(channels.id, channelId))
        .limit(1);

      await voiceService.leaveVoiceChannel(
        channelId,
        request.user.id,
        channel?.communityId,
      );
      return reply.send({ success: true });
    },
  );

  // Get current participants in a voice channel
  app.get(
    '/api/channels/:channelId/voice/participants',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { channelId } = VoiceTokenParamsSchema.parse(request.params);
      const participants = await voiceService.getVoiceParticipants(channelId);
      return reply.send({ participants });
    },
  );

  // Keep the old token endpoint for backward compatibility
  app.post(
    '/api/channels/:channelId/voice/token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { channelId } = VoiceTokenParamsSchema.parse(request.params);
      const token = await voiceService.generateVoiceToken(
        channelId,
        request.user.id,
        request.user.displayName,
      );
      return reply.send({ token, roomName: `channel-${channelId}` });
    },
  );
}
