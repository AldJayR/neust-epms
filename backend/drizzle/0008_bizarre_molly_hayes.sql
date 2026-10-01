DROP INDEX "project_reports_active_project_submitted_idx";--> statement-breakpoint
ALTER TABLE "project_reports" ALTER COLUMN "submitted_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "project_reports" ALTER COLUMN "submitted_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
UPDATE "project_reports" SET "created_at" = "submitted_at";--> statement-breakpoint
UPDATE "project_reports" AS report SET "submitted_at" = CASE
	WHEN report."storage_path" IS NULL THEN NULL
	ELSE (
		SELECT MIN(log."created_at")
		FROM "audit_logs" AS log
		WHERE log."action" = 'Uploaded document for project report ' || report."report_id"::text
	)
END;--> statement-breakpoint
ALTER TABLE "project_reports" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "project_reports" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "project_reports_active_project_submitted_idx" ON "project_reports" USING btree ("project_id","submitted_at") WHERE "project_reports"."archived_at" IS NULL AND "project_reports"."submitted_at" IS NOT NULL;
