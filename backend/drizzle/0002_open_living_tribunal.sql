CREATE TABLE "partners" (
	"partner_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_name" varchar(255) NOT NULL,
	"partner_type" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_reporting_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"reporting_date" timestamp with time zone NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_reporting_schedules" (
	"schedule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_comments" RENAME COLUMN "comment_text" TO "content";--> statement-breakpoint
ALTER TABLE "proposals" RENAME COLUMN "current_status" TO "status";--> statement-breakpoint
ALTER TABLE "proposals" DROP CONSTRAINT "proposals_project_leader_id_users_user_id_fk";
--> statement-breakpoint
DROP INDEX "proposals_leader_id_idx";--> statement-breakpoint
DROP INDEX "proposals_status_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "old_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "new_value" jsonb;--> statement-breakpoint
ALTER TABLE "moas" ADD COLUMN "partner_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "actual_end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "bypassed_ret_chair" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reporting_dates" ADD CONSTRAINT "project_reporting_dates_schedule_id_project_reporting_schedules_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."project_reporting_schedules"("schedule_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reporting_schedules" ADD CONSTRAINT "project_reporting_schedules_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prtk_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prtk_token_hash_idx" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "prtk_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "project_reporting_dates_schedule_id_idx" ON "project_reporting_dates" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "project_reporting_schedules_project_id_idx" ON "project_reporting_schedules" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "moas" ADD CONSTRAINT "moas_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moas_partner_id_idx" ON "moas" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");--> statement-breakpoint
ALTER TABLE "moas" DROP COLUMN "partner_name";--> statement-breakpoint
ALTER TABLE "moas" DROP COLUMN "partner_type";--> statement-breakpoint
ALTER TABLE "moas" DROP COLUMN "is_expired";--> statement-breakpoint
ALTER TABLE "proposals" DROP COLUMN "project_leader_id";--> statement-breakpoint
ALTER TABLE "proposals" DROP COLUMN "extension_agenda";