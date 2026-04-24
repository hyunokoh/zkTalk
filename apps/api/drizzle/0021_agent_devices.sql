CREATE TYPE "public"."device_state" AS ENUM('online', 'busy', 'degraded', 'offline', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('macos', 'linux', 'windows', 'mobile', 'other');--> statement-breakpoint
CREATE TYPE "public"."command_execution_status" AS ENUM('queued', 'awaiting_approval', 'approved', 'running', 'completed', 'failed', 'rejected', 'timeout', 'cancelled');--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agent_devices" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "platform" "device_platform" NOT NULL DEFAULT 'other',
  "state" "device_state" NOT NULL DEFAULT 'offline',
  "last_heartbeat_at" timestamp with time zone,
  "last_state_changed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "device_public_key" text,
  "shared_with_community_id" text REFERENCES "communities"("id"),
  "shared_allowed_role_ids" text NOT NULL DEFAULT '[]',
  "heartbeat_payload" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_devices_user_slug_idx" ON "agent_devices" ("user_id", "slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_devices_user_idx" ON "agent_devices" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_devices_shared_community_idx" ON "agent_devices" ("shared_with_community_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "device_agents" (
  "id" text PRIMARY KEY NOT NULL,
  "device_id" text NOT NULL REFERENCES "agent_devices"("id") ON DELETE CASCADE,
  "agent_slug" text NOT NULL,
  "display_name" text NOT NULL,
  "version" text,
  "default_verb" text NOT NULL DEFAULT 'exec',
  "scopes" text NOT NULL DEFAULT '[]',
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "device_agents_device_slug_idx" ON "device_agents" ("device_id", "agent_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_agents_device_idx" ON "device_agents" ("device_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "command_executions" (
  "id" text PRIMARY KEY NOT NULL,
  "requester_user_id" text NOT NULL REFERENCES "users"("id"),
  "device_id" text NOT NULL REFERENCES "agent_devices"("id"),
  "agent_slug" text NOT NULL,
  "verb" text NOT NULL,
  "args" text NOT NULL DEFAULT '',
  "raw_command" text NOT NULL,
  "channel_id" text REFERENCES "channels"("id"),
  "channel_message_id" text REFERENCES "messages"("id"),
  "dm_conversation_id" text,
  "status" "command_execution_status" NOT NULL DEFAULT 'queued',
  "approval_policy" text,
  "approvals" text NOT NULL DEFAULT '[]',
  "stdout_trunc" text,
  "stderr_trunc" text,
  "exit_code" integer,
  "queued_at" timestamp with time zone NOT NULL DEFAULT now(),
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "command_executions_requester_idx" ON "command_executions" ("requester_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "command_executions_device_idx" ON "command_executions" ("device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "command_executions_channel_idx" ON "command_executions" ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "command_executions_status_idx" ON "command_executions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "command_executions_queued_at_idx" ON "command_executions" ("queued_at");--> statement-breakpoint
