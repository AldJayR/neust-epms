ALTER TABLE "project_reports" DROP CONSTRAINT IF EXISTS "project_reports_milestone_type_unique";--> statement-breakpoint
WITH ranked_leaders AS (
	SELECT "member_id",
		ROW_NUMBER() OVER (
			PARTITION BY "proposal_id"
			ORDER BY "added_at" DESC, "member_id" DESC
		) AS row_num
	FROM "proposal_members"
	WHERE "archived_at" IS NULL
		AND "project_role" = 'Project Leader'
)
UPDATE "proposal_members" AS members
SET "archived_at" = now()
FROM ranked_leaders
WHERE members."member_id" = ranked_leaders."member_id"
	AND ranked_leaders.row_num > 1;--> statement-breakpoint
WITH ranked_special_orders AS (
	SELECT "special_order_id",
		ROW_NUMBER() OVER (
			PARTITION BY "member_id"
			ORDER BY "updated_at" DESC, "created_at" DESC, "special_order_id" DESC
		) AS row_num
	FROM "special_orders"
	WHERE "archived_at" IS NULL
)
UPDATE "special_orders" AS orders
SET "archived_at" = now(), "updated_at" = now()
FROM ranked_special_orders
WHERE orders."special_order_id" = ranked_special_orders."special_order_id"
	AND ranked_special_orders.row_num > 1;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "project_reports" AS reports
		INNER JOIN "project_reporting_milestones" AS milestones
			ON milestones."milestone_id" = reports."milestone_id"
		WHERE milestones."project_id" <> reports."project_id"
	) THEN
		RAISE EXCEPTION 'Cannot add project_reports milestone/project constraint: mismatched existing rows must be repaired first';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "project_reporting_milestones" ADD CONSTRAINT "project_reporting_milestones_id_project_unique" UNIQUE("milestone_id","project_id");--> statement-breakpoint
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_milestone_project_fk" FOREIGN KEY ("milestone_id","project_id") REFERENCES "public"."project_reporting_milestones"("milestone_id","project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_recipient_idx" ON "notifications" USING btree ("recipient_id") WHERE "notifications"."is_read" = false;--> statement-breakpoint
CREATE INDEX "project_reporting_milestones_incomplete_due_idx" ON "project_reporting_milestones" USING btree ("due_at","project_id") WHERE "project_reporting_milestones"."completed_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_reports_active_milestone_type_unique" ON "project_reports" USING btree ("milestone_id","report_type") WHERE "project_reports"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "project_reports_active_project_submitted_idx" ON "project_reports" USING btree ("project_id","submitted_at") WHERE "project_reports"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "projects_active_status_created_idx" ON "projects" USING btree ("project_status","created_at") WHERE "projects"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pm_one_active_project_leader_unique" ON "proposal_members" USING btree ("proposal_id") WHERE "proposal_members"."archived_at" IS NULL AND "proposal_members"."project_role" = 'Project Leader';--> statement-breakpoint
CREATE INDEX "proposals_active_department_created_idx" ON "proposals" USING btree ("department_id","created_at") WHERE "proposals"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "proposals_active_campus_created_idx" ON "proposals" USING btree ("campus_id","created_at") WHERE "proposals"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "special_orders_one_active_per_member" ON "special_orders" USING btree ("member_id") WHERE "special_orders"."archived_at" IS NULL;--> statement-breakpoint
