ALTER TABLE "progress_reports" RENAME TO "project_reports";--> statement-breakpoint
ALTER TABLE "project_reports" RENAME COLUMN "submitted_by" TO "submitted_by_id";--> statement-breakpoint
ALTER TABLE "project_reports" DROP CONSTRAINT "progress_reports_project_id_projects_project_id_fk";
--> statement-breakpoint
ALTER TABLE "project_reports" DROP CONSTRAINT "progress_reports_submitted_by_users_user_id_fk";
--> statement-breakpoint
DROP INDEX "pr_project_id_idx";--> statement-breakpoint
DROP INDEX "pr_submitted_by_idx";--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "report_type" varchar(100) NOT NULL DEFAULT 'General';--> statement-breakpoint
ALTER TABLE "project_reports" ALTER COLUMN "report_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_submitted_by_id_users_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_reports_project_id_idx" ON "project_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_reports_submitted_by_id_idx" ON "project_reports" USING btree ("submitted_by_id");