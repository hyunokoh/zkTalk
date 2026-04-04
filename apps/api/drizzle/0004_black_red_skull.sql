CREATE TABLE "bot_users" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"token" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"permissions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slash_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"community_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"avatar_url" text,
	"created_by_user_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_users" ADD CONSTRAINT "bot_users_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_users" ADD CONSTRAINT "bot_users_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slash_commands" ADD CONSTRAINT "slash_commands_bot_user_id_bot_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."bot_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bot_users_token_idx" ON "bot_users" USING btree ("token");--> statement-breakpoint
CREATE INDEX "bot_users_community_idx" ON "bot_users" USING btree ("community_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slash_commands_bot_name_idx" ON "slash_commands" USING btree ("bot_user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "webhooks_token_idx" ON "webhooks" USING btree ("token");--> statement-breakpoint
CREATE INDEX "webhooks_community_idx" ON "webhooks" USING btree ("community_id");