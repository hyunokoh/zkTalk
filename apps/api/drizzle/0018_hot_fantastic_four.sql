CREATE TYPE "public"."upload_session_status" AS ENUM('created', 'single_ready', 'multipart_ready', 'uploading', 'completed', 'aborted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."upload_target_kind" AS ENUM('channel_message', 'thread_reply', 'dm_message', 'user_avatar', 'community_icon');--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"uploader_user_id" text NOT NULL,
	"target_kind" "upload_target_kind" NOT NULL,
	"community_id" text,
	"channel_id" text,
	"thread_id" text,
	"conversation_id" text,
	"file_name" text NOT NULL,
	"sanitized_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"multipart_upload_id" text,
	"part_size" integer,
	"part_count" integer,
	"status" "upload_session_status" DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"aborted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"community_order" text DEFAULT '[]' NOT NULL,
	"collapsed_sections" text DEFAULT '{}' NOT NULL,
	"last_visited" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "file_size" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "dm_message_id" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "upload_session_id" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "bucket" text DEFAULT 'zktalk-uploads' NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "object_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "source_dm_conversation_id" text;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_uploader_user_id_users_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_conversation_id_dm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_sessions_uploader_idx" ON "upload_sessions" USING btree ("uploader_user_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_status_idx" ON "upload_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "upload_sessions_channel_idx" ON "upload_sessions" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_conversation_idx" ON "upload_sessions" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "upload_sessions_object_key_idx" ON "upload_sessions" USING btree ("object_key");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_dm_message_id_dm_messages_id_fk" FOREIGN KEY ("dm_message_id") REFERENCES "public"."dm_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_upload_session_id_upload_sessions_id_fk" FOREIGN KEY ("upload_session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_message_idx" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "attachments_dm_message_idx" ON "attachments" USING btree ("dm_message_id");--> statement-breakpoint
CREATE INDEX "attachments_upload_session_idx" ON "attachments" USING btree ("upload_session_id");