-- Preserve completion dates, signed documents, and historical audit entries.
UPDATE "projects"
SET "project_status" = CASE "project_status"
  WHEN 'Pending Closure' THEN 'Pending Completion'
  WHEN 'Closed' THEN 'Completed'
END
WHERE "project_status" IN ('Pending Closure', 'Closed');
