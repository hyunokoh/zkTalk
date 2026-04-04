CREATE TABLE "p2p_files" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text,
	"channel_id" text,
	"conversation_id" text,
	"uploader_user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"file_hash" text NOT NULL,
	"chunk_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "p2p_files" ADD CONSTRAINT "p2p_files_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_files" ADD CONSTRAINT "p2p_files_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_files" ADD CONSTRAINT "p2p_files_uploader_user_id_users_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "p2p_files_channel_idx" ON "p2p_files" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "p2p_files_message_idx" ON "p2p_files" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "p2p_files_hash_idx" ON "p2p_files" USING btree ("file_hash");