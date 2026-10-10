CREATE TABLE "proposal_revision_requests" (
	"request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"comment_id" uuid,
	"document_id" uuid,
	"submission_id" uuid,
	"return_review_id" uuid,
	"review_stage" text NOT NULL,
	"content" text NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'Response needed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_revision_responses" (
	"response_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"cycle_review_id" uuid NOT NULL,
	"submission_id" uuid,
	"response_type" text NOT NULL,
	"explanation" text NOT NULL,
	"revised_page" integer,
	"responded_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "proposal_revision_verifications" (
	"verification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"explanation" text,
	"verified_by" uuid NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_submissions" (
	"submission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN "classification" text DEFAULT 'Remark' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_reviews" ADD COLUMN "submission_id" uuid;--> statement-breakpoint
ALTER TABLE "proposal_revision_requests" ADD CONSTRAINT "proposal_revision_requests_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_requests" ADD CONSTRAINT "proposal_revision_requests_comment_id_proposal_comments_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."proposal_comments"("comment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_requests" ADD CONSTRAINT "proposal_revision_requests_document_id_proposal_documents_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."proposal_documents"("document_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_requests" ADD CONSTRAINT "proposal_revision_requests_submission_id_proposal_submissions_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."proposal_submissions"("submission_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_requests" ADD CONSTRAINT "proposal_revision_requests_return_review_id_proposal_reviews_review_id_fk" FOREIGN KEY ("return_review_id") REFERENCES "public"."proposal_reviews"("review_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_requests" ADD CONSTRAINT "proposal_revision_requests_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_responses" ADD CONSTRAINT "proposal_revision_responses_request_id_proposal_revision_requests_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."proposal_revision_requests"("request_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_responses" ADD CONSTRAINT "proposal_revision_responses_cycle_review_id_proposal_reviews_review_id_fk" FOREIGN KEY ("cycle_review_id") REFERENCES "public"."proposal_reviews"("review_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_responses" ADD CONSTRAINT "proposal_revision_responses_submission_id_proposal_submissions_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."proposal_submissions"("submission_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_responses" ADD CONSTRAINT "proposal_revision_responses_responded_by_users_user_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_verifications" ADD CONSTRAINT "proposal_revision_verifications_response_id_proposal_revision_responses_response_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."proposal_revision_responses"("response_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_verifications" ADD CONSTRAINT "proposal_revision_verifications_verified_by_users_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_submissions" ADD CONSTRAINT "proposal_submissions_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_submissions" ADD CONSTRAINT "proposal_submissions_document_id_proposal_documents_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."proposal_documents"("document_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_submissions" ADD CONSTRAINT "proposal_submissions_submitted_by_users_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prr_proposal_stage_idx" ON "proposal_revision_requests" USING btree ("proposal_id","review_stage","status");--> statement-breakpoint
CREATE UNIQUE INDEX "prr_comment_idx" ON "proposal_revision_requests" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "prresp_request_idx" ON "proposal_revision_responses" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prresp_draft_idx" ON "proposal_revision_responses" USING btree ("request_id","cycle_review_id") WHERE "proposal_revision_responses"."submission_id" is null;--> statement-breakpoint
CREATE INDEX "prv_response_idx" ON "proposal_revision_verifications" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "ps_proposal_idx" ON "proposal_submissions" USING btree ("proposal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_sequence_idx" ON "proposal_submissions" USING btree ("proposal_id","sequence");--> statement-breakpoint
ALTER TABLE "proposal_reviews" ADD CONSTRAINT "proposal_reviews_submission_id_proposal_submissions_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."proposal_submissions"("submission_id") ON DELETE no action ON UPDATE no action;