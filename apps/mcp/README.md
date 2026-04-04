# @zktalk/mcp

MCP (Model Context Protocol) server for zkTalk. Enables AI agents (Claude Desktop, Claude Code, etc.) to interact with zkTalk communities, channels, messages, DMs, voice, polls, events, and moderation features.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the MCP server
ZKTALK_API_URL=http://localhost:4000 \
ZKTALK_SESSION_TOKEN=your-jwt-token \
pnpm start
```

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zktalk": {
      "command": "node",
      "args": ["--loader", "tsx", "/path/to/zkTalk/apps/mcp/src/server.ts"],
      "env": {
        "ZKTALK_API_URL": "http://localhost:4000",
        "ZKTALK_SESSION_TOKEN": "your-session-token"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ZKTALK_API_URL` | `http://localhost:4000` | zkTalk API base URL |
| `ZKTALK_SESSION_TOKEN` | (required) | JWT session token from login |

## Tools

The server exposes 50+ tools organized into categories:

### Messages (17 tools)
`send_message`, `get_messages`, `edit_message`, `delete_message`, `search_messages`, `get_channel_topics`, `add_reaction`, `remove_reaction`, `get_reactions`, `pin_message`, `unpin_message`, `get_pinned_messages`, `bookmark_message`, `get_bookmarks`, `schedule_message`, `get_scheduled_messages`, `summarize_channel`, `translate_text`

### Communities (17 tools)
`list_communities`, `get_community`, `create_community`, `update_community`, `list_channels`, `get_channel`, `create_channel`, `get_community_members`, `create_invite`, `join_community`, `leave_community`, `list_community_roles`, `get_unread_summary`, `mark_channel_read`, `discover_communities`, `get_inbox`

### DMs (8 tools)
`list_dm_conversations`, `get_dm_conversation`, `send_dm`, `get_dm_messages`, `create_group_dm`, `edit_dm_message`, `delete_dm_message`, `mark_dm_read`

### Voice (3 tools)
`join_voice`, `leave_voice`, `get_voice_participants`

### Users & Friends (8 tools)
`get_profile`, `update_profile`, `get_user_keys`, `list_friends`, `send_friend_request`, `accept_friend_request`, `remove_friend`, `check_friendship`

### Moderation, Polls, Events, Threads (16 tools)
`create_report`, `list_reports`, `resolve_report`, `mute_member`, `kick_member`, `ban_member`, `get_audit_log`, `create_poll`, `get_poll`, `vote_poll`, `create_event`, `list_events`, `rsvp_event`, `create_thread`, `create_forum_post`, `list_threads`, `get_thread_messages`, `reply_to_thread`

## Resources

| URI | Description |
|-----|-------------|
| `community://{id}` | Community details as JSON |
| `channel://{id}/messages` | Recent messages in a channel |
| `dm://{id}/messages` | Messages in a DM conversation |

## Architecture

```
apps/mcp/
  src/
    server.ts          # MCP server entry point
    api-client.ts      # HTTP client for zkTalk API
    tools/
      messages.ts      # Message, reaction, pin, bookmark, AI tools
      communities.ts   # Community, channel, invite, unread tools
      dm.ts            # DM conversation and message tools
      voice.ts         # Voice channel tools
      users.ts         # Profile, friends tools
      moderation.ts    # Reports, bans, polls, events, threads
```

The MCP server is a standalone Node.js process that communicates with AI clients over stdio and proxies requests to the zkTalk REST API using `fetch`.

## Documentation

- Full API reference: [docs/api-reference.md](../../docs/api-reference.md)
- Setup guide: [docs/mcp-setup.md](../../docs/mcp-setup.md)
