ALTER TABLE "proposal_comments" DROP CONSTRAINT "proposal_comments_proposal_id_proposals_proposal_id_fk";
--> statement-breakpoint
DROP INDEX "al_user_id_idx";--> statement-breakpoint
DROP INDEX "al_created_at_idx";--> statement-breakpoint
DROP INDEX "pc_proposal_id_idx";--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "status" SET DEFAULT 'Pending Review';--> statement-breakpoint
CREATE INDEX "prtk_active_token_idx" ON "password_reset_tokens" USING btree ("token_hash","expires_at") WHERE "password_reset_tokens"."used_at" IS NULL;--> statement-breakpoint
CREATE INDEX "project_reporting_dates_pending_idx" ON "project_reporting_dates" USING btree ("schedule_id","reporting_date") WHERE "project_reporting_dates"."is_completed" = false;--> statement-breakpoint
ALTER TABLE "proposal_comments" DROP COLUMN "proposal_id";--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD CONSTRAINT "pd_proposal_version_unique" UNIQUE("proposal_id","version_num");--> statement-breakpoint
ALTER TABLE "proposal_reviews" ADD CONSTRAINT "pr_proposal_reviewer_stage_unique" UNIQUE("proposal_id","reviewer_id","review_stage");--> statement-breakpoint
ALTER TABLE "moas" ADD CONSTRAINT "moas_valid_period_check" CHECK (("moas"."valid_from" IS NULL OR "moas"."valid_until" IS NULL OR "moas"."valid_from" < "moas"."valid_until"));--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_target_dates_check" CHECK (("proposals"."target_start_date" IS NULL OR "proposals"."target_end_date" IS NULL OR "proposals"."target_start_date" < "proposals"."target_end_date"));