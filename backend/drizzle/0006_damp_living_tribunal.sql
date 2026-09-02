ALTER TABLE "proposals" ADD COLUMN "institutional_approval_doc_path" varchar(500);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "institutional_approval_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "institutional_approved_at" timestamp with time zone;