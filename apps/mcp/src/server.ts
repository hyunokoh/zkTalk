#!/usr/bin/env node

/**
 * zkTalk MCP Server
 *
 * Exposes zkTalk operations as MCP tools so that external AI agents
 * (Claude Desktop, etc.) can interact with zkTalk communities, channels,
 * messages, DMs, voice, and moderation features.
 *
 * Environment variables:
 *   ZKTALK_API_URL       - Base URL of the zkTalk API (default: http://localhost:4000)
 *   ZKTALK_SESSION_TOKEN - Session JWT for authentication
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { get, formatResponse } from './api-client.js';
import { registerMessageTools } from './tools/messages.js';
import { registerCommunityTools } from './tools/communities.js';
import { registerDmTools } from './tools/dm.js';
import { registerVoiceTools } from './tools/voice.js';
import { registerUserTools } from './tools/users.js';
import { registerModerationTools } from './tools/moderation.js';

const server = new McpServer({
  name: 'zkTalk',
  version: '0.0.1',
});

// ── Register all tools ──────────────────────────────────────────────────────

registerMessageTools(server);
registerCommunityTools(server);
registerDmTools(server);
registerVoiceTools(server);
registerUserTools(server);
registerModerationTools(server);

// ── Resource providers ──────────────────────────────────────────────────────

server.resource(
  'community',
  new ResourceTemplate('community://{id}', { list: undefined }),
  async (uri, { id }) => {
    const res = await get(`/api/communities/${id}`);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: formatResponse(res),
        },
      ],
    };
  },
);

server.resource(
  'channel-messages',
  new ResourceTemplate('channel://{id}/messages', { list: undefined }),
  async (uri, { id }) => {
    const res = await get(`/api/channels/${id}/messages`, { limit: 50 });
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: formatResponse(res),
        },
      ],
    };
  },
);

server.resource(
  'dm-messages',
  new ResourceTemplate('dm://{id}/messages', { list: undefined }),
  async (uri, { id }) => {
    const res = await get(`/api/dm/conversations/${id}/messages`, { limit: 50 });
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: formatResponse(res),
        },
      ],
    };
  },
);

// ── Start server ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('zkTalk MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
