CREATE TABLE "report_attachments" (
	"attachment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"attachment_type" varchar(100) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"content_hash" varchar(64),
	"uploaded_by" uuid,
	"source_ip" varchar(45),
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "project_reporting_milestones" ALTER COLUMN "report_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "banner_programs" ADD COLUMN "program_code" varchar(50);--> statement-breakpoint
ALTER TABLE "banner_programs" ADD COLUMN "unit_scope" varchar(50);--> statement-breakpoint
ALTER TABLE "banner_programs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "campuses" ADD COLUMN "campus_code" varchar(50);--> statement-breakpoint
ALTER TABLE "project_reporting_milestones" ADD COLUMN "title" varchar(255);--> statement-breakpoint
ALTER TABLE "project_reporting_milestones" ADD COLUMN "milestone_type" varchar(50);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "endorsement_doc_path" varchar(500);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "endorsement_doc_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "endorsed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_report_id_project_reports_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."project_reports"("report_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_uploaded_by_users_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_attachments_report_id_idx" ON "report_attachments" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_attachments_unique_active_type_idx" ON "report_attachments" USING btree ("report_id","attachment_type") WHERE "report_attachments"."archived_at" IS NULL AND "report_attachments"."attachment_type" IN ('Evaluation Forms', 'Attendance Records');--> statement-breakpoint
CREATE UNIQUE INDEX "banner_programs_unit_scope_name_idx" ON "banner_programs" USING btree ("unit_scope",lower("program_name")) WHERE "banner_programs"."unit_scope" IS NOT NULL;