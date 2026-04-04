import { z } from 'zod';
import { get, post, formatResponse } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerVoiceTools(server: McpServer): void {
  server.tool(
    'join_voice',
    'Join a voice channel',
    {
      channelId: z.string().describe('Voice channel ID to join'),
    },
    async ({ channelId }) => {
      const res = await post(`/api/channels/${channelId}/voice/join`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'leave_voice',
    'Leave a voice channel',
    {
      channelId: z.string().describe('Voice channel ID to leave'),
    },
    async ({ channelId }) => {
      const res = await post(`/api/channels/${channelId}/voice/leave`);
      return { content: [{ type: 'text', text: res.ok ? 'Left voice channel.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'get_voice_participants',
    'List participants currently in a voice channel',
    {
      channelId: z.string().describe('Voice channel ID'),
    },
    async ({ channelId }) => {
      const res = await get(`/api/channels/${channelId}/voice/participants`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );
}
