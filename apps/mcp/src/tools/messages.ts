import { z } from 'zod';
import { get, post, patch, del, formatResponse } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerMessageTools(server: McpServer): void {
  server.tool(
    'send_message',
    'Send a message to a channel',
    {
      channelId: z.string().describe('The channel ID to send the message to'),
      content: z.string().describe('Message content in Markdown format'),
      topic: z.string().optional().describe('Optional topic for Zulip-style threading'),
    },
    async ({ channelId, content, topic }) => {
      const body: Record<string, string> = { bodyMarkdown: content };
      if (topic) body.topic = topic;
      const res = await post(`/api/channels/${channelId}/messages`, body);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_messages',
    'Get recent messages from a channel',
    {
      channelId: z.string().describe('The channel ID'),
      limit: z.number().optional().describe('Number of messages to fetch (default 50, max 100)'),
      cursor: z.string().optional().describe('Cursor for pagination'),
      topic: z.string().optional().describe('Filter by topic'),
    },
    async ({ channelId, limit, cursor, topic }) => {
      const res = await get(`/api/channels/${channelId}/messages`, {
        limit: limit ?? 50,
        cursor,
        topic,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'edit_message',
    'Edit a message (author only)',
    {
      messageId: z.string().describe('The message ID to edit'),
      content: z.string().describe('New message content in Markdown'),
    },
    async ({ messageId, content }) => {
      const res = await patch(`/api/messages/${messageId}`, { bodyMarkdown: content });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'delete_message',
    'Delete a message (author or moderator)',
    {
      messageId: z.string().describe('The message ID to delete'),
    },
    async ({ messageId }) => {
      const res = await del(`/api/messages/${messageId}`);
      return { content: [{ type: 'text', text: res.ok ? 'Message deleted successfully.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'search_messages',
    'Search messages across channels',
    {
      query: z.string().describe('Search query string'),
      communityId: z.string().optional().describe('Filter by community ID'),
      channelId: z.string().optional().describe('Filter by channel ID'),
      authorId: z.string().optional().describe('Filter by author user ID'),
      limit: z.number().optional().describe('Number of results (default 20)'),
    },
    async ({ query, communityId, channelId, authorId, limit }) => {
      const res = await get('/api/search/messages', {
        q: query,
        communityId,
        channelId,
        authorId,
        limit: limit ?? 20,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_channel_topics',
    'List distinct topics in a channel (Zulip-style threading)',
    {
      channelId: z.string().describe('The channel ID'),
    },
    async ({ channelId }) => {
      const res = await get(`/api/channels/${channelId}/topics`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'add_reaction',
    'Add a reaction emoji to a message',
    {
      messageId: z.string().describe('The message ID'),
      emoji: z.string().describe('Emoji character or custom emoji name'),
    },
    async ({ messageId, emoji }) => {
      const res = await post(`/api/messages/${messageId}/reactions`, { emoji });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'remove_reaction',
    'Remove a reaction from a message',
    {
      messageId: z.string().describe('The message ID'),
      emoji: z.string().describe('Emoji to remove'),
    },
    async ({ messageId, emoji }) => {
      const res = await del(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
      return { content: [{ type: 'text', text: res.ok ? 'Reaction removed.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'get_reactions',
    'Get all reactions for a message',
    {
      messageId: z.string().describe('The message ID'),
    },
    async ({ messageId }) => {
      const res = await get(`/api/messages/${messageId}/reactions`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'pin_message',
    'Pin a message in a channel',
    {
      channelId: z.string().describe('The channel ID'),
      messageId: z.string().describe('The message ID to pin'),
    },
    async ({ channelId, messageId }) => {
      const res = await post(`/api/channels/${channelId}/pins/${messageId}`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'unpin_message',
    'Unpin a message from a channel',
    {
      channelId: z.string().describe('The channel ID'),
      messageId: z.string().describe('The message ID to unpin'),
    },
    async ({ channelId, messageId }) => {
      const res = await del(`/api/channels/${channelId}/pins/${messageId}`);
      return { content: [{ type: 'text', text: res.ok ? 'Message unpinned.' : formatResponse(res) }] };
    },
  );

  server.tool(
    'get_pinned_messages',
    'List pinned messages in a channel',
    {
      channelId: z.string().describe('The channel ID'),
    },
    async ({ channelId }) => {
      const res = await get(`/api/channels/${channelId}/pins`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'bookmark_message',
    'Bookmark a message for later',
    {
      messageId: z.string().describe('The message ID to bookmark'),
    },
    async ({ messageId }) => {
      const res = await post(`/api/bookmarks/${messageId}`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_bookmarks',
    'List your bookmarked messages',
    {
      limit: z.number().optional().describe('Number of bookmarks to fetch'),
      cursor: z.string().optional().describe('Cursor for pagination'),
    },
    async ({ limit, cursor }) => {
      const res = await get('/api/bookmarks', { limit, cursor });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'schedule_message',
    'Schedule a message to be sent at a future time',
    {
      channelId: z.string().describe('The channel ID'),
      content: z.string().describe('Message content in Markdown'),
      scheduledAt: z.string().describe('ISO 8601 datetime for when to send'),
    },
    async ({ channelId, content, scheduledAt }) => {
      const res = await post(`/api/channels/${channelId}/messages/schedule`, {
        bodyMarkdown: content,
        scheduledAt,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_scheduled_messages',
    'List your pending scheduled messages',
    {},
    async () => {
      const res = await get('/api/me/scheduled-messages');
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'summarize_channel',
    'Get an AI-generated summary of recent channel messages',
    {
      channelId: z.string().describe('The channel ID to summarize'),
      messageCount: z.number().optional().describe('Number of messages to summarize (3-200)'),
    },
    async ({ channelId, messageCount }) => {
      const res = await post(`/api/channels/${channelId}/ai/summarize`, {
        messageCount: messageCount ?? 50,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'translate_text',
    'Translate text to a target language',
    {
      text: z.string().describe('Text to translate'),
      targetLang: z.string().describe('Target language code (e.g., "en", "ko", "ja")'),
    },
    async ({ text, targetLang }) => {
      const res = await post('/api/translate', { text, targetLang });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );
}
