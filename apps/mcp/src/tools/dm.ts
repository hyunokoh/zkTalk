import { z } from 'zod';
import { get, post, patch, del, formatResponse } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerDmTools(server: McpServer): void {
  server.tool(
    'list_dm_conversations',
    'List all DM conversations',
    {},
    async () => {
      const res = await get('/api/dm/conversations');
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_dm_conversation',
    'Get a specific DM conversation',
    {
      conversationId: z.string().describe('DM conversation ID'),
    },
    async ({ conversationId }) => {
      const res = await get(`/api/dm/conversations/${conversationId}`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'send_dm',
    'Send a direct message to a user or existing conversation',
    {
      targetUserId: z.string().optional().describe('User ID to start a 1:1 DM with (creates conversation if needed)'),
      conversationId: z.string().optional().describe('Existing conversation ID to send to'),
      content: z.string().describe('Message content in Markdown'),
    },
    async ({ targetUserId, conversationId, content }) => {
      let convId = conversationId;

      // If targetUserId is provided, create or get existing conversation first
      if (!convId && targetUserId) {
        const convRes = await post('/api/dm/conversations', { targetUserId });
        if (!convRes.ok) {
          return { content: [{ type: 'text', text: formatResponse(convRes) }] };
        }
        const data = convRes.data as { id: string };
        convId = data.id;
      }

      if (!convId) {
        return { content: [{ type: 'text', text: 'Error: provide either targetUserId or conversationId' }] };
      }

      const res = await post(`/api/dm/conversations/${convId}/messages`, {
        bodyMarkdown: content,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_dm_messages',
    'Get messages in a DM conversation',
    {
      conversationId: z.string().describe('DM conversation ID'),
      limit: z.number().optional().describe('Number of messages (default 50)'),
      cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async ({ conversationId, limit, cursor }) => {
      const res = await get(`/api/dm/conversations/${conversationId}/messages`, {
        limit: limit ?? 50,
        cursor,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'create_group_dm',
    'Create a group DM conversation',
    {
      participantUserIds: z.array(z.string()).describe('Array of user IDs to include'),
      name: z.string().optional().describe('Group name'),
    },
    async ({ participantUserIds, name }) => {
      const res = await post('/api/dm/conversations/group', {
        participantUserIds,
        name,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'edit_dm_message',
    'Edit a DM message (author only)',
    {
      messageId: z.string().describe('DM message ID'),
      content: z.string().describe('New message content'),
    },
    async ({ messageId, content }) => {
      const res = await patch(`/api/dm/messages/${messageId}`, { bodyMarkdown: content });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'delete_dm_message',
    'Delete a DM message (author only)',
    {
      messageId: z.string().describe('DM message ID to delete'),
    },
    async ({ messageId }) => {
      const res = await del(`/api/dm/messages/${messageId}`);
      return { content: [{ type: 'text', text: res.ok ? 'DM message deleted.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'mark_dm_read',
    'Mark a DM conversation as read',
    {
      conversationId: z.string().describe('DM conversation ID'),
      messageId: z.string().describe('ID of the last read message'),
    },
    async ({ conversationId, messageId }) => {
      const res = await post(`/api/dm/conversations/${conversationId}/read`, { messageId });
      return { content: [{ type: 'text', text: res.ok ? 'Marked as read.' : formatResponse(res) }] };
    },
  );
}
