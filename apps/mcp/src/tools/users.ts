import { z } from 'zod';
import { get, patch, post, del, formatResponse } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerUserTools(server: McpServer): void {
  server.tool(
    'get_profile',
    'Get the current authenticated user profile',
    {},
    async () => {
      const res = await get('/api/me');
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'update_profile',
    'Update the current user profile',
    {
      displayName: z.string().optional().describe('Display name'),
      bio: z.string().optional().describe('Bio text'),
      username: z.string().optional().describe('Username'),
    },
    async (updates) => {
      const res = await patch('/api/me', updates);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_user_keys',
    'Get a user\'s public E2EE key',
    {
      userId: z.string().describe('User ID'),
    },
    async ({ userId }) => {
      const res = await get(`/api/users/${userId}/keys`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  // Friends
  server.tool(
    'list_friends',
    'List friends (optionally filtered by status)',
    {
      status: z.enum(['pending', 'accepted', 'blocked']).optional().describe('Filter by friendship status'),
    },
    async ({ status }) => {
      const res = await get('/api/friends', { status });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'send_friend_request',
    'Send a friend request to a user',
    {
      userId: z.string().describe('Target user ID'),
    },
    async ({ userId }) => {
      const res = await post('/api/friends/request', { userId });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'accept_friend_request',
    'Accept a pending friend request',
    {
      friendshipId: z.string().describe('Friendship ID'),
    },
    async ({ friendshipId }) => {
      const res = await post(`/api/friends/${friendshipId}/accept`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'remove_friend',
    'Remove a friend or decline a request',
    {
      friendshipId: z.string().describe('Friendship ID'),
    },
    async ({ friendshipId }) => {
      const res = await del(`/api/friends/${friendshipId}`);
      return { content: [{ type: 'text', text: res.ok ? 'Friend removed.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'check_friendship',
    'Check friendship status with a user',
    {
      userId: z.string().describe('User ID to check'),
    },
    async ({ userId }) => {
      const res = await get(`/api/friends/check/${userId}`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );
}
