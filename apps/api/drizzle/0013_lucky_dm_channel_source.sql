ALTER TABLE "channels"
ADD COLUMN IF NOT EXISTS "source_dm_conversation_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'channels_source_dm_conversation_id_dm_conversations_id_fk'
  ) THEN
    ALTER TABLE "channels"
    ADD CONSTRAINT "channels_source_dm_conversation_id_dm_conversations_id_fk"
    FOREIGN KEY ("source_dm_conversation_id")
    REFERENCES "public"."dm_conversations"("id")
    ON DELETE no action
    ON UPDATE no action;
  END IF;
END $$;
