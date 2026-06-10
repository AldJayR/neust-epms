import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

export const projectReports = pgTable(
	"project_reports",
	{
		reportId: uuid("report_id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.projectId),
		submittedById: uuid("submitted_by_id")
			.notNull()
			.references(() => users.userId),
		reportType: varchar("report_type", { length: 100 }).notNull(),
		storagePath: varchar("storage_path", { length: 500 }),
		remarks: text("remarks"),
		periodStart: timestamp("period_start", { withTimezone: true }),
		periodEnd: timestamp("period_end", { withTimezone: true }),
		submittedAt: timestamp("submitted_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		projectIdx: index("project_reports_project_id_idx").on(table.projectId),
		submittedByIdIdx: index("project_reports_submitted_by_id_idx").on(
			table.submittedById,
		),
		activeProjectIdx: index("project_reports_active_project_idx")
			.on(table.projectId)
			.where(sql`${table.archivedAt} IS NULL`),
	}),
);
