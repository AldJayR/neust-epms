CREATE TABLE "cron_locks" (
	"job_name" text PRIMARY KEY NOT NULL,
	"lock_token" uuid NOT NULL,
	"locked_until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key_unique" ON "notifications" USING btree ("dedupe_key");