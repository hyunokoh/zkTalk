ALTER TABLE "attachments" ALTER COLUMN "message_id" DROP NOT NULL;
ALTER TABLE "attachments" ADD COLUMN "dm_message_id" text;
ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_dm_message_id_dm_messages_id_fk"
  FOREIGN KEY ("dm_message_id") REFERENCES "public"."dm_messages"("id") ON DELETE no action ON UPDATE no action;
