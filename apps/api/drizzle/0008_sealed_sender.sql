-- Sealed Sender compatibility migration.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_sealed" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "encrypted_payload" text;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD COLUMN IF NOT EXISTS "is_sealed" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD COLUMN IF NOT EXISTS "encrypted_payload" text;
