ALTER TYPE "public"."channel_type" ADD VALUE IF NOT EXISTS 'voice';--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD COLUMN "promoted_community_id" text;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD COLUMN "promoted_channel_id" text;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD COLUMN "promoted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_promoted_community_id_communities_id_fk" FOREIGN KEY ("promoted_community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_promoted_channel_id_channels_id_fk" FOREIGN KEY ("promoted_channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;
