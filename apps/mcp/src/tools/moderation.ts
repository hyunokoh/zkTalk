import { z } from 'zod';
import { get, post, patch, del, formatResponse } from '../api-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerModerationTools(server: McpServer): void {
  server.tool(
    'create_report',
    'Report content for moderation',
    {
      targetType: z.enum(['message', 'user']).describe('Type of content to report'),
      targetId: z.string().describe('ID of the message or user'),
      communityId: z.string().describe('Community ID'),
      reason: z.string().describe('Reason for the report'),
    },
    async ({ targetType, targetId, communityId, reason }) => {
      const res = await post('/api/reports', {
        targetType,
        targetId,
        communityId,
        reason,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'list_reports',
    'List moderation reports for a community (moderator+)',
    {
      communityId: z.string().describe('Community ID'),
      status: z.enum(['pending', 'resolved', 'dismissed']).optional().describe('Filter by status'),
      limit: z.number().optional().describe('Number of reports'),
    },
    async ({ communityId, status, limit }) => {
      const res = await get(`/api/communities/${communityId}/reports`, { status, limit });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'resolve_report',
    'Resolve or dismiss a report (moderator+)',
    {
      reportId: z.string().describe('Report ID'),
      status: z.enum(['resolved', 'dismissed']).describe('New status'),
    },
    async ({ reportId, status }) => {
      const res = await patch(`/api/reports/${reportId}`, { status });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'mute_member',
    'Mute a community member (moderator+)',
    {
      membershipId: z.string().describe('Membership ID'),
      reason: z.string().optional().describe('Reason for muting'),
    },
    async ({ membershipId, reason }) => {
      const res = await post(`/api/members/${membershipId}/mute`, { reason });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'kick_member',
    'Kick a community member (moderator+)',
    {
      membershipId: z.string().describe('Membership ID'),
      reason: z.string().optional().describe('Reason for kicking'),
    },
    async ({ membershipId, reason }) => {
      const res = await post(`/api/members/${membershipId}/kick`, { reason });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'ban_member',
    'Ban a community member (moderator+)',
    {
      membershipId: z.string().describe('Membership ID'),
      reason: z.string().optional().describe('Reason for banning'),
    },
    async ({ membershipId, reason }) => {
      const res = await post(`/api/members/${membershipId}/ban`, { reason });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_audit_log',
    'Get the moderation audit log for a community (admin+)',
    {
      communityId: z.string().describe('Community ID'),
      limit: z.number().optional().describe('Number of entries'),
      cursor: z.string().optional().describe('Pagination cursor'),
    },
    async ({ communityId, limit, cursor }) => {
      const res = await get(`/api/communities/${communityId}/audit-log`, { limit, cursor });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  // Polls
  server.tool(
    'create_poll',
    'Create a poll in a channel',
    {
      channelId: z.string().describe('Channel ID'),
      question: z.string().describe('Poll question'),
      options: z.array(z.string()).describe('Poll options (2-10)'),
      isAnonymous: z.boolean().optional().describe('Anonymous voting'),
      allowMultiple: z.boolean().optional().describe('Allow multiple votes'),
      expiresInHours: z.number().optional().describe('Hours until poll expires'),
    },
    async ({ channelId, question, options, isAnonymous, allowMultiple, expiresInHours }) => {
      const res = await post(`/api/channels/${channelId}/polls`, {
        question,
        options,
        isAnonymous,
        allowMultiple,
        expiresInHours,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_poll',
    'Get a poll with results',
    {
      pollId: z.string().describe('Poll ID'),
    },
    async ({ pollId }) => {
      const res = await get(`/api/polls/${pollId}`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'vote_poll',
    'Vote on a poll',
    {
      pollId: z.string().describe('Poll ID'),
      optionId: z.string().describe('Option ID to vote for'),
    },
    async ({ pollId, optionId }) => {
      const res = await post(`/api/polls/${pollId}/vote`, { optionId });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  // Events
  server.tool(
    'create_event',
    'Create an event in a community',
    {
      communityId: z.string().describe('Community ID'),
      title: z.string().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      startAt: z.string().describe('ISO 8601 start datetime'),
      endAt: z.string().optional().describe('ISO 8601 end datetime'),
      location: z.string().optional().describe('Event location'),
    },
    async ({ communityId, title, description, startAt, endAt, location }) => {
      const res = await post(`/api/communities/${communityId}/events`, {
        title,
        description,
        startAt,
        endAt,
        location,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'list_events',
    'List upcoming events in a community',
    {
      communityId: z.string().describe('Community ID'),
    },
    async ({ communityId }) => {
      const res = await get(`/api/communities/${communityId}/events`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'rsvp_event',
    'RSVP to an event',
    {
      eventId: z.string().describe('Event ID'),
      status: z.enum(['going', 'interested', 'not_going']).describe('RSVP status'),
    },
    async ({ eventId, status }) => {
      const res = await post(`/api/events/${eventId}/rsvp`, { status });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  // Threads
  server.tool(
    'create_thread',
    'Create a thread from an existing message',
    {
      messageId: z.string().describe('Message ID to start a thread from'),
    },
    async ({ messageId }) => {
      const res = await post(`/api/messages/${messageId}/thread`);
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'create_forum_post',
    'Create a new forum post (thread + root message)',
    {
      channelId: z.string().describe('Forum channel ID'),
      title: z.string().describe('Post title'),
      content: z.string().describe('Post body in Markdown'),
    },
    async ({ channelId, title, content }) => {
      const res = await post(`/api/channels/${channelId}/threads`, {
        title,
        bodyMarkdown: content,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'list_threads',
    'List threads in a forum channel',
    {
      channelId: z.string().describe('Forum channel ID'),
      sort: z.enum(['latest', 'newest', 'oldest']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Number of threads'),
    },
    async ({ channelId, sort, limit }) => {
      const res = await get(`/api/channels/${channelId}/threads`, { sort, limit });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'get_thread_messages',
    'Get messages in a thread',
    {
      threadId: z.string().describe('Thread ID'),
      limit: z.number().optional().describe('Number of messages'),
      cursor: z.string().optional().describe('Pagination cursor'),
    },
    async ({ threadId, limit, cursor }) => {
      const res = await get(`/api/threads/${threadId}/messages`, { limit, cursor });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );

  server.tool(
    'reply_to_thread',
    'Post a reply to a thread',
    {
      threadId: z.string().describe('Thread ID'),
      content: z.string().describe('Reply content in Markdown'),
    },
    async ({ threadId, content }) => {
      const res = await post(`/api/threads/${threadId}/messages`, {
        bodyMarkdown: content,
      });
      return { content: [{ type: 'text', text: formatResponse(res) }] };
    },
  );
}
