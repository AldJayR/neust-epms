ALTER TABLE "project_reports" ADD COLUMN "trainee_count" integer;--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "package_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_trainee_count_check" CHECK ("project_reports"."trainee_count" IS NULL OR "project_reports"."trainee_count" >= 0);--> statement-breakpoint
-- Preserve existing complete packages without inventing trainee counts.
UPDATE project_reports r SET package_completed_at = now()
WHERE r.report_type = 'Accomplishment and Terminal Report' AND r.archived_at IS NULL AND r.storage_path IS NOT NULL
AND EXISTS (SELECT 1 FROM report_attachments a WHERE a.report_id = r.report_id AND a.attachment_type = 'Evaluation Forms' AND a.archived_at IS NULL);--> statement-breakpoint
-- Restore resumability for packages previously marked complete before required attachments arrived.
UPDATE project_reporting_milestones m SET completed_at = NULL
WHERE EXISTS (SELECT 1 FROM project_reports r JOIN projects p ON p.project_id = r.project_id
 WHERE r.milestone_id = m.milestone_id AND r.report_type = 'Accomplishment and Terminal Report'
 AND r.archived_at IS NULL AND r.package_completed_at IS NULL AND p.archived_at IS NULL AND p.project_status IN ('Ongoing', 'Overdue', 'Pending Closure'));--> statement-breakpoint
UPDATE projects p SET project_status = CASE WHEN EXISTS (
 SELECT 1 FROM project_reporting_milestones m WHERE m.project_id = p.project_id AND m.completed_at IS NULL AND m.due_at < now()
) THEN 'Overdue' ELSE 'Ongoing' END, updated_at = now()
WHERE p.project_status = 'Pending Closure' AND p.archived_at IS NULL
AND EXISTS (SELECT 1 FROM project_reports r WHERE r.project_id = p.project_id AND r.archived_at IS NULL
 AND r.report_type = 'Accomplishment and Terminal Report' AND r.package_completed_at IS NULL);
