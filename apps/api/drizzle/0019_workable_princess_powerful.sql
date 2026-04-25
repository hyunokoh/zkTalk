CREATE TYPE "public"."channel_access_policy" AS ENUM('public', 'members_only', 'invite_only', 'private');--> statement-breakpoint
CREATE TYPE "public"."command_execution_status" AS ENUM('queued', 'awaiting_approval', 'approved', 'running', 'completed', 'failed', 'rejected', 'timeout', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('macos', 'linux', 'windows', 'mobile', 'other');--> statement-breakpoint
CREATE TYPE "public"."device_state" AS ENUM('online', 'busy', 'degraded', 'offline', 'suspended');--> statement-breakpoint
CREATE TABLE "agent_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"platform" "device_platform" DEFAULT 'other' NOT NULL,
	"state" "device_state" DEFAULT 'offline' NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"last_state_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"device_public_key" text,
	"shared_with_community_id" text,
	"shared_allowed_role_ids" text DEFAULT '[]' NOT NULL,
	"heartbeat_payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"agent_slug" text NOT NULL,
	"verb" text NOT NULL,
	"args" text DEFAULT '' NOT NULL,
	"raw_command" text NOT NULL,
	"channel_id" text,
	"channel_message_id" text,
	"dm_conversation_id" text,
	"status" "command_execution_status" DEFAULT 'queued' NOT NULL,
	"approval_policy" text,
	"approvals" text DEFAULT '[]' NOT NULL,
	"stdout_trunc" text,
	"stderr_trunc" text,
	"exit_code" integer,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"agent_slug" text NOT NULL,
	"display_name" text NOT NULL,
	"version" text,
	"default_verb" text DEFAULT 'exec' NOT NULL,
	"scopes" text DEFAULT '[]' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "access_policy" "channel_access_policy" DEFAULT 'members_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "translation_display" text DEFAULT '{"uiLocale":"en","mode":"manual_only","targetLanguage":null,"readableLanguages":[]}' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_devices" ADD CONSTRAINT "agent_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_devices" ADD CONSTRAINT "agent_devices_shared_with_community_id_communities_id_fk" FOREIGN KEY ("shared_with_community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_executions" ADD CONSTRAINT "command_executions_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_executions" ADD CONSTRAINT "command_executions_device_id_agent_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."agent_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_executions" ADD CONSTRAINT "command_executions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_executions" ADD CONSTRAINT "command_executions_channel_message_id_messages_id_fk" FOREIGN KEY ("channel_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_agents" ADD CONSTRAINT "device_agents_device_id_agent_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."agent_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_devices_user_slug_idx" ON "agent_devices" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "agent_devices_user_idx" ON "agent_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_devices_shared_community_idx" ON "agent_devices" USING btree ("shared_with_community_id");--> statement-breakpoint
CREATE INDEX "command_executions_requester_idx" ON "command_executions" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "command_executions_device_idx" ON "command_executions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "command_executions_channel_idx" ON "command_executions" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "command_executions_status_idx" ON "command_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "command_executions_queued_at_idx" ON "command_executions" USING btree ("queued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "device_agents_device_slug_idx" ON "device_agents" USING btree ("device_id","agent_slug");--> statement-breakpoint
CREATE INDEX "device_agents_device_idx" ON "device_agents" USING btree ("device_id");