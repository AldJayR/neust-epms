import { index, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";

export const projectReportingMilestones = pgTable(
	"project_reporting_milestones",
	{
		milestoneId: uuid("milestone_id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.projectId),
		reportType: varchar("report_type", { length: 100 }).notNull(),
		dueAt: timestamp("due_at", {
			withTimezone: true,
		}).notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		projectIdx: index("project_reporting_milestones_project_id_idx").on(table.projectId),
		projectTypeDueUnique: unique("project_reporting_milestones_project_type_due_unique").on(
			table.projectId,
			table.reportType,
			table.dueAt,
		),
	}),
);
