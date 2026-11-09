CREATE TABLE "project_milestones" (
	"milestone_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"kind" varchar(50) NOT NULL,
	"actor_id" uuid,
	"source_key" varchar(128) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_milestones_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "project_milestones_kind_check" CHECK ("project_milestones"."kind" IN ('proposal_endorsed', 'proposal_approved', 'proposal_returned', 'proposal_rejected', 'signed_documents_completed', 'project_activated', 'terminal_package_completed', 'project_completed'))
);
--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_actor_id_users_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_milestones_occurred_idx" ON "project_milestones" USING btree ("occurred_at","milestone_id");--> statement-breakpoint
CREATE INDEX "project_milestones_proposal_idx" ON "project_milestones" USING btree ("proposal_id");
--> statement-breakpoint
-- Review decisions retain their original actor and occurrence time.
INSERT INTO "project_milestones" ("proposal_id", "kind", "actor_id", "source_key", "occurred_at")
SELECT "proposal_id",
	CASE WHEN "review_stage" = 'Endorsement' THEN 'proposal_endorsed'
		WHEN "decision" = 'Approved' THEN 'proposal_approved'
		WHEN "decision" = 'Returned' THEN 'proposal_returned'
		ELSE 'proposal_rejected' END,
	"reviewer_id", 'review:' || "review_id"::text, "reviewed_at"
FROM "proposal_reviews"
WHERE ("review_stage" = 'Endorsement' AND "decision" = 'Endorsed')
	OR ("review_stage" = 'Approval' AND "decision" IN ('Approved', 'Returned', 'Rejected'))
ON CONFLICT ("source_key") DO NOTHING;
--> statement-breakpoint
-- The finalizing actor was not previously stored; do not substitute the original submitter.
INSERT INTO "project_milestones" ("proposal_id", "kind", "source_key", "occurred_at")
SELECT DISTINCT ON (r."milestone_id") p."proposal_id", 'terminal_package_completed',
	'terminal-package:' || r."milestone_id"::text, r."package_completed_at"
FROM "project_reports" r JOIN "projects" p ON p."project_id" = r."project_id"
WHERE r."report_type" = 'Accomplishment and Terminal Report' AND r."package_completed_at" IS NOT NULL
ORDER BY r."milestone_id", r."package_completed_at", r."report_id"
ON CONFLICT ("source_key") DO NOTHING;
--> statement-breakpoint
-- Preserve supported legacy terminal-package milestones as well.
INSERT INTO "project_milestones" ("proposal_id", "kind", "source_key", "occurred_at")
SELECT p."proposal_id", 'terminal_package_completed', 'terminal-package:' || m."milestone_id"::text, m."completed_at"
FROM "project_reporting_milestones" m JOIN "projects" p ON p."project_id" = m."project_id"
WHERE m."completed_at" IS NOT NULL AND p."project_status" IN ('Pending Completion', 'Completed')
	AND (m."report_type" IN ('Terminal Report', 'Project Closure', 'Closure') OR m."milestone_type" = 'Closure')
	AND EXISTS (SELECT 1 FROM "project_reports" r WHERE r."milestone_id" = m."milestone_id" AND r."report_type" = 'Terminal' AND r."storage_path" IS NOT NULL AND r."archived_at" IS NULL)
	AND EXISTS (SELECT 1 FROM "project_reports" r WHERE r."milestone_id" = m."milestone_id" AND r."report_type" = 'Final Accomplishment' AND r."storage_path" IS NOT NULL AND r."archived_at" IS NULL)
ON CONFLICT ("source_key") DO NOTHING;
--> statement-breakpoint
-- Signed completion records have a dedicated completion date, but no historical actor.
INSERT INTO "project_milestones" ("proposal_id", "kind", "source_key", "occurred_at")
SELECT "proposal_id", 'project_completed', 'completion:' || "project_id"::text, "actual_end_date"
FROM "projects"
WHERE "project_status" = 'Completed' AND "actual_end_date" IS NOT NULL AND "signed_terminal_report_doc_path" IS NOT NULL
ON CONFLICT ("source_key") DO NOTHING;
-- Historical activation and signed-document completion times cannot be inferred from updated_at.
