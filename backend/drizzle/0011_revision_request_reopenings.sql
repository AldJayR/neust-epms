CREATE TABLE "proposal_revision_reopenings" (
	"reopening_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"explanation" text NOT NULL,
	"reopened_by" uuid NOT NULL,
	"reopened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_revision_reopenings" ADD CONSTRAINT "proposal_revision_reopenings_request_id_proposal_revision_requests_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."proposal_revision_requests"("request_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_reopenings" ADD CONSTRAINT "proposal_revision_reopenings_submission_id_proposal_submissions_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."proposal_submissions"("submission_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_revision_reopenings" ADD CONSTRAINT "proposal_revision_reopenings_reopened_by_users_user_id_fk" FOREIGN KEY ("reopened_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prreopen_request_idx" ON "proposal_revision_reopenings" USING btree ("request_id");