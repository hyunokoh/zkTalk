ALTER TABLE "user_settings"
ADD COLUMN IF NOT EXISTS "collapsed_sections" text DEFAULT '{}' NOT NULL;
