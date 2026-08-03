CREATE TABLE "banner_programs" (
	"banner_program_id" serial PRIMARY KEY NOT NULL,
	"campus_id" integer NOT NULL,
	"department_id" integer,
	"program_name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "banner_program" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "banner_program_id" integer;--> statement-breakpoint
UPDATE "proposals" SET "banner_program" = NULL, "banner_program_id" = NULL;--> statement-breakpoint
ALTER TABLE "banner_programs" ADD CONSTRAINT "banner_programs_campus_id_campuses_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("campus_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_programs" ADD CONSTRAINT "banner_programs_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "banner_programs_scope_name_idx" ON "banner_programs" USING btree ("campus_id",coalesce("department_id", 0),lower("program_name"));--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_banner_program_id_banner_programs_banner_program_id_fk" FOREIGN KEY ("banner_program_id") REFERENCES "public"."banner_programs"("banner_program_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposals_banner_program_id_idx" ON "proposals" USING btree ("banner_program_id");
