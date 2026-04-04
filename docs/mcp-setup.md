# zkTalk MCP Server Setup

The zkTalk MCP (Model Context Protocol) server allows AI agents like Claude Desktop to interact with your zkTalk instance -- reading messages, sending messages, managing communities, and more.

## Prerequisites

- Node.js 18+
- A running zkTalk API instance
- A valid session token (JWT) from logging in

## Installation

From the project root:

```bash
cd apps/mcp
pnpm install
```

## Getting a Session Token

1. Log in to zkTalk through the web app
2. Open browser DevTools > Application > Cookies
3. Copy the value of the `zktalk_session` cookie

Or use the API directly:

```bash
# Request magic link
curl -X POST http://localhost:4000/api/auth/magic-link/request \
  -H 'Content-Type: application/json' \
  -d '{"email": "you@example.com"}'

# Verify (use the token from email/logs)
curl -X POST http://localhost:4000/api/auth/magic-link/verify \
  -H 'Content-Type: application/json' \
  -d '{"token": "TOKEN_FROM_EMAIL"}'
# Response includes sessionToken
```

## Configuration for Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zktalk": {
      "command": "node",
      "args": ["--loader", "tsx", "/absolute/path/to/zkTalk/apps/mcp/src/server.ts"],
      "env": {
        "ZKTALK_API_URL": "http://localhost:4000",
        "ZKTALK_SESSION_TOKEN": "your-session-token-here"
      }
    }
  }
}
```

> Replace `/absolute/path/to/zkTalk` with the actual path to your zkTalk project and `your-session-token-here` with your JWT.

## Configuration for Claude Code

Add to your project's `.claude/settings.json` or use `claude mcp add`:

```bash
claude mcp add zktalk -- node --loader tsx /path/to/zkTalk/apps/mcp/src/server.ts
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ZKTALK_API_URL` | No | `http://localhost:4000` | zkTalk API base URL |
| `ZKTALK_SESSION_TOKEN` | Yes | - | JWT session token |

## Running Standalone (for testing)

```bash
cd apps/mcp
ZKTALK_API_URL=http://localhost:4000 ZKTALK_SESSION_TOKEN=your-token pnpm start
```

The server communicates over stdio, so you will not see output in the terminal (it is designed to be launched by an MCP client).

## Available Tools

### Message Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `send_message` | Send a message to a channel | "Send 'Hello everyone!' to the general channel" |
| `get_messages` | Get recent messages | "Show me the last 10 messages in #announcements" |
| `edit_message` | Edit a message | "Edit my last message to fix the typo" |
| `delete_message` | Delete a message | "Delete that message I just sent" |
| `search_messages` | Search messages | "Search for messages about the deployment" |
| `get_channel_topics` | List topics in a channel | "What topics are being discussed?" |
| `add_reaction` | React to a message | "Add a thumbs up to that message" |
| `remove_reaction` | Remove a reaction | "Remove my reaction" |
| `get_reactions` | See reactions | "Who reacted to that message?" |
| `pin_message` | Pin a message | "Pin the deployment instructions" |
| `unpin_message` | Unpin a message | "Unpin that old announcement" |
| `get_pinned_messages` | List pinned messages | "Show me pinned messages" |
| `bookmark_message` | Bookmark a message | "Bookmark that for later" |
| `get_bookmarks` | List bookmarks | "Show my bookmarks" |
| `schedule_message` | Schedule a message | "Schedule 'Good morning!' for 9am tomorrow" |
| `get_scheduled_messages` | List scheduled messages | "What messages do I have scheduled?" |
| `summarize_channel` | AI channel summary | "Summarize what happened in #general today" |
| `translate_text` | Translate text | "Translate this message to Korean" |

### Community Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `list_communities` | List your communities | "What communities am I in?" |
| `get_community` | Get community details | "Tell me about the Engineering community" |
| `create_community` | Create a community | "Create a new community called 'Book Club'" |
| `update_community` | Update settings | "Change the community description" |
| `list_channels` | List channels | "What channels are in this community?" |
| `get_channel` | Get channel details | "Tell me about #general" |
| `create_channel` | Create a channel | "Create a #design channel" |
| `get_community_members` | List members | "Who is in this community?" |
| `create_invite` | Create invite link | "Create an invite link that expires in 24 hours" |
| `join_community` | Join a community | "Join the community with invite code ABC123" |
| `leave_community` | Leave a community | "Leave the test community" |
| `list_community_roles` | List roles | "What roles exist?" |
| `get_unread_summary` | Get unread counts | "How many unread messages do I have?" |
| `mark_channel_read` | Mark as read | "Mark #general as read" |
| `discover_communities` | Discover communities | "Find public communities about gaming" |
| `get_inbox` | Get notifications | "Check my inbox" |

### DM Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `list_dm_conversations` | List DMs | "Show my DM conversations" |
| `get_dm_conversation` | Get a DM | "Open my conversation with Alice" |
| `send_dm` | Send a DM | "Send Alice a message saying 'Meeting at 3?'" |
| `get_dm_messages` | Get DM messages | "Show recent messages with Bob" |
| `create_group_dm` | Create group DM | "Start a group DM with Alice and Bob" |
| `edit_dm_message` | Edit a DM | "Edit my last DM" |
| `delete_dm_message` | Delete a DM | "Delete that DM" |
| `mark_dm_read` | Mark DM as read | "Mark this conversation as read" |

### Voice Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `join_voice` | Join voice channel | "Join the voice channel" |
| `leave_voice` | Leave voice channel | "Leave the voice channel" |
| `get_voice_participants` | List participants | "Who is in the voice channel?" |

### User Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `get_profile` | Get your profile | "Show my profile" |
| `update_profile` | Update profile | "Change my display name to 'Alex'" |
| `get_user_keys` | Get E2EE keys | "Get Bob's public key" |
| `list_friends` | List friends | "Show my friends" |
| `send_friend_request` | Add friend | "Send a friend request to that user" |
| `accept_friend_request` | Accept request | "Accept the friend request" |
| `remove_friend` | Remove friend | "Remove from friends" |
| `check_friendship` | Check status | "Am I friends with this user?" |

### Moderation & Community Tools

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `create_report` | Report content | "Report that message as spam" |
| `list_reports` | List reports | "Show pending reports" |
| `resolve_report` | Resolve report | "Dismiss that report" |
| `mute_member` | Mute member | "Mute that user for spam" |
| `kick_member` | Kick member | "Kick that user" |
| `ban_member` | Ban member | "Ban that user for harassment" |
| `get_audit_log` | View audit log | "Show the audit log" |
| `create_poll` | Create a poll | "Create a poll: 'Lunch spot?' with options Pizza, Sushi, Tacos" |
| `get_poll` | View poll results | "Show poll results" |
| `vote_poll` | Vote on a poll | "Vote for Pizza" |
| `create_event` | Create an event | "Create a team lunch event for Friday at noon" |
| `list_events` | List events | "What events are coming up?" |
| `rsvp_event` | RSVP to event | "Mark me as going" |
| `create_thread` | Start a thread | "Create a thread from that message" |
| `create_forum_post` | Create forum post | "Create a post titled 'Feature Request'" |
| `list_threads` | List threads | "Show forum threads" |
| `get_thread_messages` | Read thread | "Show messages in this thread" |
| `reply_to_thread` | Reply to thread | "Reply to the thread saying 'I agree'" |

### Resource Providers

Resources can be read by AI agents for context:

| URI Pattern | Description |
|-------------|-------------|
| `community://{id}` | Community details |
| `channel://{id}/messages` | Recent channel messages |
| `dm://{id}/messages` | DM conversation messages |

## Troubleshooting

**"Unauthorized" errors:**
- Your session token may have expired (tokens last 7 days)
- Generate a new token by logging in again

**"Connection refused" errors:**
- Make sure the zkTalk API is running at the configured URL
- Check that Docker services are up: `docker compose -f docker/docker-compose.yml up -d`

**Tools not appearing in Claude:**
- Restart Claude Desktop after updating the config
- Check the config file path is correct for your OS
- Verify the absolute path to `server.ts` is correct
