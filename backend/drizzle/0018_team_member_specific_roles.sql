ALTER TABLE "proposal_members" ADD COLUMN "specific_role" varchar(100);
--> statement-breakpoint
UPDATE "proposal_members"
SET "project_role" = 'Project Leader'
WHERE lower(trim("project_role")) = 'project leader';
--> statement-breakpoint
UPDATE "proposal_members"
SET "project_role" = 'Project Member'
WHERE lower(trim("project_role")) <> 'project leader';