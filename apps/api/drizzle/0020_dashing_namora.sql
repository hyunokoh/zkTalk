CREATE TABLE "agent_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"company" text,
	"job_title" text,
	"phone" text,
	"email" text,
	"address" text,
	"website" text,
	"notes" text,
	"card_image_url" text,
	"person_photo_url" text,
	"linked_user_id" text,
	"extracted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "command_executions" ADD COLUMN "agent_thread_id" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "use_agent_for_translation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "use_agent_for_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_device_id_agent_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."agent_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_threads_user_device_idx" ON "agent_threads" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "agent_threads_device_idx" ON "agent_threads" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_cards_owner_idx" ON "business_cards" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "business_cards_owner_name_idx" ON "business_cards" USING btree ("owner_user_id","display_name");--> statement-breakpoint
CREATE INDEX "business_cards_owner_company_idx" ON "business_cards" USING btree ("owner_user_id","company");--> statement-breakpoint
ALTER TABLE "command_executions" ADD CONSTRAINT "command_executions_agent_thread_id_agent_threads_id_fk" FOREIGN KEY ("agent_thread_id") REFERENCES "public"."agent_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "command_executions_thread_idx" ON "command_executions" USING btree ("agent_thread_id");