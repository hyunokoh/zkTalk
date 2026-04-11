ALTER TABLE "user_settings"
ADD COLUMN IF NOT EXISTS "translation_display" text DEFAULT '{"uiLocale":"en","mode":"manual_only","targetLanguage":null,"readableLanguages":[]}' NOT NULL;
