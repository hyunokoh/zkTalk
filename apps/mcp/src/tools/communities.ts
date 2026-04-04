import { z } from 'zod';
import { get, post, patch, del, formatResponse } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCommunityTools(server: McpServer): void {
  server.tool(
    'list_communities',
    'List communities the current user belongs to',
    {},
    async () => {
      const res = await get('/api/communities');
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_community',
    'Get community details by ID or slug',
    {
      communityId: z.string().describe('Community ID (UUID) or slug'),
    },
    async ({ communityId }) => {
      const res = await get(`/api/communities/${communityId}`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'create_community',
    'Create a new community',
    {
      name: z.string().describe('Community name'),
      slug: z.string().describe('URL-friendly slug'),
      description: z.string().optional().describe('Community description'),
      visibility: z.enum(['public', 'private']).optional().describe('Visibility (default: public)'),
    },
    async ({ name, slug, description, visibility }) => {
      const res = await post('/api/communities', { name, slug, description, visibility });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'update_community',
    'Update community settings',
    {
      communityId: z.string().describe('Community ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
    },
    async ({ communityId, ...updates }) => {
      const res = await patch(`/api/communities/${communityId}`, updates);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'list_channels',
    'List channels in a community (grouped by category)',
    {
      communityId: z.string().describe('Community ID'),
    },
    async ({ communityId }) => {
      const res = await get(`/api/communities/${communityId}/channels`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_channel',
    'Get channel details',
    {
      channelId: z.string().describe('Channel ID'),
    },
    async ({ channelId }) => {
      const res = await get(`/api/channels/${channelId}`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'create_channel',
    'Create a new channel in a community',
    {
      communityId: z.string().describe('Community ID'),
      name: z.string().describe('Channel name'),
      description: z.string().optional().describe('Channel description'),
      type: z.enum(['chat', 'announcement', 'forum']).optional().describe('Channel type (default: chat)'),
      categoryId: z.string().optional().describe('Category to place channel in'),
    },
    async ({ communityId, name, description, type, categoryId }) => {
      const res = await post(`/api/communities/${communityId}/channels`, {
        name,
        description,
        type,
        categoryId,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_community_members',
    'List members of a community',
    {
      communityId: z.string().describe('Community ID'),
    },
    async ({ communityId }) => {
      const res = await get(`/api/communities/${communityId}/members`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'create_invite',
    'Create an invite link for a community',
    {
      communityId: z.string().describe('Community ID'),
      maxUses: z.number().optional().describe('Maximum number of uses'),
      expiresInHours: z.number().optional().describe('Hours until expiration'),
    },
    async ({ communityId, maxUses, expiresInHours }) => {
      const res = await post(`/api/communities/${communityId}/invites`, {
        maxUses,
        expiresInHours,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'join_community',
    'Join a public community or via invite code',
    {
      communityId: z.string().optional().describe('Community ID for public join'),
      inviteCode: z.string().optional().describe('Invite code'),
    },
    async ({ communityId, inviteCode }) => {
      if (inviteCode) {
        const res = await post(`/api/invites/${inviteCode}/join`);
        return { content: [{ type: 'text', text: formatResponse(res) }] };
      }
      if (communityId) {
        const res = await post(`/api/communities/${communityId}/join`);
        return { content: [{ type: 'text', text: formatResponse(res) }] };
      }
      return { content: [{ type: 'text', text: 'Error: provide either communityId or inviteCode' }] };
    },
  );

  server.tool(
    'leave_community',
    'Leave a community',
    {
      communityId: z.string().describe('Community ID'),
    },
    async ({ communityId }) => {
      const res = await post(`/api/communities/${communityId}/leave`);
      return { content: [{ type: 'text', text: res.ok ? 'Left community.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'list_community_roles',
    'List roles in a community',
    {
      communityId: z.string().describe('Community ID'),
    },
    async ({ communityId }) => {
      const res = await get(`/api/communities/${communityId}/roles`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_unread_summary',
    'Get unread message counts for all channels in a community',
    {
      communityId: z.string().describe('Community ID'),
    },
    async ({ communityId }) => {
      const res = await get(`/api/communities/${communityId}/unread`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'mark_channel_read',
    'Mark a channel as read up to a given message',
    {
      channelId: z.string().describe('Channel ID'),
      lastMessageId: z.string().describe('ID of the last read message'),
    },
    async ({ channelId, lastMessageId }) => {
      const res = await post(`/api/channels/${channelId}/read`, { lastMessageId });
      return { content: [{ type: 'text', text: res.ok ? 'Channel marked as read.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'discover_communities',
    'Discover public communities',
    {
      query: z.string().optional().describe('Search query'),
      sort: z.enum(['members', 'newest']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Number of results'),
    },
    async ({ query, sort, limit }) => {
      const res = await get('/api/discover', { q: query, sort, limit });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_inbox',
    'Get inbox notifications (mentions, replies)',
    {
      communityId: z.string().optional().describe('Filter by community'),
      limit: z.number().optional().describe('Number of items'),
    },
    async ({ communityId, limit }) => {
      const res = await get('/api/inbox', { communityId, limit });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );
}
