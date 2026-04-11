CREATE TYPE "public"."channel_access_policy" AS ENUM('public', 'members_only', 'invite_only', 'private');--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "access_policy" "channel_access_policy" DEFAULT 'members_only' NOT NULL;--> statement-breakpoint
UPDATE "channels"
SET "access_policy" = CASE
  WHEN "visibility" = 'public' THEN 'public'::"public"."channel_access_policy"
  ELSE 'invite_only'::"public"."channel_access_policy"
END;--> statement-breakpoint
