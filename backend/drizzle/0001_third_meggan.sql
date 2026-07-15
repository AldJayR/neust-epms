ALTER TABLE "moas" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "moas" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
ALTER TABLE "moas" ADD COLUMN "source_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
ALTER TABLE "project_reports" ADD COLUMN "source_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "on_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal_beneficiaries" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD COLUMN "source_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "proposal_members" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "special_orders" ADD COLUMN "content_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "special_orders" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
ALTER TABLE "special_orders" ADD COLUMN "source_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "moas" ADD CONSTRAINT "moas_uploaded_by_users_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_uploaded_by_users_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_uploaded_by_users_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_orders" ADD CONSTRAINT "special_orders_uploaded_by_users_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "al_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "al_table_affected_idx" ON "audit_logs" USING btree ("table_affected");--> statement-breakpoint
CREATE INDEX "proposal_beneficiaries_active_proposal_id_idx" ON "proposal_beneficiaries" USING btree ("proposal_id") WHERE "proposal_beneficiaries"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "pm_active_proposal_id_idx" ON "proposal_members" USING btree ("proposal_id") WHERE "proposal_members"."archived_at" IS NULL;