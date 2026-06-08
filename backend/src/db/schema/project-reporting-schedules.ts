import {
  pgTable,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";

export const projectReportingSchedules = pgTable(
  "project_reporting_schedules",
  {
    scheduleId: uuid("schedule_id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_reporting_schedules_project_id_idx").on(
      table.projectId,
    ),
  }),
);
