import { sql } from "drizzle-orm";
import { boolean, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { projectReportingSchedules } from "./project-reporting-schedules.js";

export const projectReportingDates = pgTable(
	"project_reporting_dates",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		scheduleId: uuid("schedule_id")
			.notNull()
			.references(() => projectReportingSchedules.scheduleId),
		reportingDate: timestamp("reporting_date", {
			withTimezone: true,
		}).notNull(),
		isCompleted: boolean("is_completed").notNull().default(false),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		scheduleIdx: index("project_reporting_dates_schedule_id_idx").on(
			table.scheduleId,
		),
		pendingDateIdx: index("project_reporting_dates_pending_idx")
			.on(table.scheduleId, table.reportingDate)
			.where(sql`${table.isCompleted} = false`),
	}),
);
