CREATE TABLE "audit_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(255) NOT NULL,
	"table_affected" varchar(100) NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiary_sectors" (
	"sector_id" serial PRIMARY KEY NOT NULL,
	"sector_name" varchar(255) NOT NULL,
	CONSTRAINT "beneficiary_sectors_sector_name_unique" UNIQUE("sector_name")
);
--> statement-breakpoint
CREATE TABLE "campuses" (
	"campus_id" serial PRIMARY KEY NOT NULL,
	"campus_name" varchar(255) NOT NULL,
	"is_main_campus" boolean DEFAULT false NOT NULL,
	CONSTRAINT "campuses_campus_name_unique" UNIQUE("campus_name")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"department_id" serial PRIMARY KEY NOT NULL,
	"campus_id" integer NOT NULL,
	"department_name" varchar(255) NOT NULL,
	CONSTRAINT "departments_department_name_unique" UNIQUE("department_name")
);
--> statement-breakpoint
CREATE TABLE "moas" (
	"moa_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_name" varchar(255) NOT NULL,
	"partner_type" varchar(100) NOT NULL,
	"storage_path" varchar(500),
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"is_expired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "progress_reports" (
	"report_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"storage_path" varchar(500),
	"remarks" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"project_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"moa_id" uuid,
	"start_date" timestamp with time zone,
	"target_end" timestamp with time zone,
	"project_status" varchar(50) DEFAULT 'Approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "projects_proposal_id_unique" UNIQUE("proposal_id")
);
--> statement-breakpoint
CREATE TABLE "proposal_beneficiaries" (
	"proposal_id" uuid NOT NULL,
	"sector_id" integer NOT NULL,
	CONSTRAINT "proposal_beneficiaries_proposal_id_sector_id_pk" PRIMARY KEY("proposal_id","sector_id")
);
--> statement-breakpoint
CREATE TABLE "proposal_comments" (
	"comment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"comment_text" text NOT NULL,
	"annotation_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_departments" (
	"proposal_id" uuid NOT NULL,
	"department_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_departments_proposal_id_department_id_pk" PRIMARY KEY("proposal_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "proposal_documents" (
	"document_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"version_num" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_members" (
	"member_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"project_role" varchar(100) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_reviews" (
	"review_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"review_stage" varchar(50) NOT NULL,
	"decision" varchar(50) NOT NULL,
	"comments" text,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_sdgs" (
	"proposal_id" uuid NOT NULL,
	"sdg_id" integer NOT NULL,
	CONSTRAINT "proposal_sdgs_proposal_id_sdg_id_pk" PRIMARY KEY("proposal_id","sdg_id")
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"proposal_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_leader_id" uuid NOT NULL,
	"campus_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"banner_program" varchar(255) NOT NULL,
	"project_locale" varchar(255) NOT NULL,
	"extension_category" varchar(100) NOT NULL,
	"extension_agenda" varchar(255) NOT NULL,
	"budget_partner" numeric(14, 2) DEFAULT '0',
	"budget_neust" numeric(14, 2) DEFAULT '0',
	"current_status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"revision_num" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"role_id" serial PRIMARY KEY NOT NULL,
	"role_name" varchar(50) NOT NULL,
	CONSTRAINT "roles_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
CREATE TABLE "sdgs" (
	"sdg_id" serial PRIMARY KEY NOT NULL,
	"sdg_number" integer NOT NULL,
	"sdg_title" varchar(255) NOT NULL,
	CONSTRAINT "sdgs_sdg_number_unique" UNIQUE("sdg_number")
);
--> statement-breakpoint
CREATE TABLE "special_orders" (
	"special_order_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"so_number" varchar(100) NOT NULL,
	"storage_path" varchar(500),
	"date_issued" timestamp with time zone,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "special_orders_so_number_unique" UNIQUE("so_number")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"setting_key" varchar(100) PRIMARY KEY NOT NULL,
	"setting_value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" integer NOT NULL,
	"campus_id" integer NOT NULL,
	"department_id" integer,
	"employee_id" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"name_suffix" varchar(20),
	"academic_rank" varchar(100),
	"email" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_campus_id_campuses_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("campus_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD CONSTRAINT "progress_reports_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD CONSTRAINT "progress_reports_submitted_by_users_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_moa_id_moas_moa_id_fk" FOREIGN KEY ("moa_id") REFERENCES "public"."moas"("moa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_beneficiaries" ADD CONSTRAINT "proposal_beneficiaries_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_beneficiaries" ADD CONSTRAINT "proposal_beneficiaries_sector_id_beneficiary_sectors_sector_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."beneficiary_sectors"("sector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_document_id_proposal_documents_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."proposal_documents"("document_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_departments" ADD CONSTRAINT "proposal_departments_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_departments" ADD CONSTRAINT "proposal_departments_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_members" ADD CONSTRAINT "proposal_members_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_members" ADD CONSTRAINT "proposal_members_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_reviews" ADD CONSTRAINT "proposal_reviews_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_reviews" ADD CONSTRAINT "proposal_reviews_reviewer_id_users_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_sdgs" ADD CONSTRAINT "proposal_sdgs_proposal_id_proposals_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("proposal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_sdgs" ADD CONSTRAINT "proposal_sdgs_sdg_id_sdgs_sdg_id_fk" FOREIGN KEY ("sdg_id") REFERENCES "public"."sdgs"("sdg_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_leader_id_users_user_id_fk" FOREIGN KEY ("project_leader_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_campus_id_campuses_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("campus_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_orders" ADD CONSTRAINT "special_orders_member_id_proposal_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."proposal_members"("member_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_campus_id_campuses_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("campus_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "al_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "al_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "departments_campus_id_idx" ON "departments" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "pr_project_id_idx" ON "progress_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pr_submitted_by_idx" ON "progress_reports" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "projects_moa_id_idx" ON "projects" USING btree ("moa_id");--> statement-breakpoint
CREATE INDEX "proposal_beneficiaries_proposal_id_idx" ON "proposal_beneficiaries" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "proposal_beneficiaries_sector_id_idx" ON "proposal_beneficiaries" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "pc_proposal_id_idx" ON "proposal_comments" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "pc_document_id_idx" ON "proposal_comments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "pc_user_id_idx" ON "proposal_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "proposal_departments_proposal_id_idx" ON "proposal_departments" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "proposal_departments_department_id_idx" ON "proposal_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "pd_proposal_id_idx" ON "proposal_documents" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "pm_proposal_id_idx" ON "proposal_members" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "pm_user_id_idx" ON "proposal_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pr_proposal_id_idx" ON "proposal_reviews" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "pr_reviewer_id_idx" ON "proposal_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "proposal_sdgs_proposal_id_idx" ON "proposal_sdgs" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "proposal_sdgs_sdg_id_idx" ON "proposal_sdgs" USING btree ("sdg_id");--> statement-breakpoint
CREATE INDEX "proposals_leader_id_idx" ON "proposals" USING btree ("project_leader_id");--> statement-breakpoint
CREATE INDEX "proposals_campus_id_idx" ON "proposals" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "proposals_department_id_idx" ON "proposals" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX "so_member_id_idx" ON "special_orders" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "users_campus_id_idx" ON "users" USING btree ("campus_id");--> statement-breakpoint
CREATE INDEX "users_department_id_idx" ON "users" USING btree ("department_id");