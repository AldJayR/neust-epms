ALTER TABLE "users" DROP CONSTRAINT "users_employee_id_unique";--> statement-breakpoint
ALTER TABLE "departments" DROP CONSTRAINT "departments_campus_id_campuses_campus_id_fk";
--> statement-breakpoint
DROP INDEX "departments_campus_id_idx";--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "department_code" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" DROP COLUMN "campus_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "employee_id";--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_department_code_unique" UNIQUE("department_code");