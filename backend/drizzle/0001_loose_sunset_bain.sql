ALTER TABLE "proposal_reviews" DROP CONSTRAINT "pr_proposal_reviewer_stage_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "has_completed_onboarding" boolean DEFAULT false NOT NULL;