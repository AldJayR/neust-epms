CREATE INDEX "moas_valid_until_idx" ON "moas" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "moas_active_idx" ON "moas" USING btree ("valid_until") WHERE "moas"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "moas_not_expired_idx" ON "moas" USING btree ("is_expired") WHERE "moas"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "project_reports_active_project_idx" ON "project_reports" USING btree ("project_id") WHERE "project_reports"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "projects_active_status_idx" ON "projects" USING btree ("project_status") WHERE "projects"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "proposals_active_status_idx" ON "proposals" USING btree ("current_status") WHERE "proposals"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "so_active_status_idx" ON "special_orders" USING btree ("status") WHERE "special_orders"."archived_at" IS NULL;