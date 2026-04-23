import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

export const progressReports = pgTable(
  "progress_reports",
  {
    reportId: uuid("report_id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.userId),
    storagePath: varchar("storage_path", { length: 500 }),
    remarks: text("remarks"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("pr_project_id_idx").on(table.projectId),
    submittedByIdx: index("pr_submitted_by_idx").on(table.submittedBy),
  }),
);
