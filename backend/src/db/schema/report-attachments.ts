import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { projectReports } from "./project-reports.js";
import { users } from "./users.js";

/**
 * Report attachments entity (BR-15).
 * Accompanies project reports (e.g., Evaluation Forms, Attendance Records, Means of Verification).
 */
export const reportAttachments = pgTable(
	"report_attachments",
	{
		attachmentId: uuid("attachment_id").primaryKey().defaultRandom(),
		reportId: uuid("report_id")
			.notNull()
			.references(() => projectReports.reportId),
		attachmentType: varchar("attachment_type", { length: 100 }).notNull(),
		storagePath: varchar("storage_path", { length: 500 }).notNull(),
		contentHash: varchar("content_hash", { length: 64 }),
		uploadedBy: uuid("uploaded_by").references(() => users.userId),
		sourceIp: varchar("source_ip", { length: 45 }),
		uploadedAt: timestamp("uploaded_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		reportIdx: index("report_attachments_report_id_idx").on(table.reportId),
		uniqueActiveClosureAttachment: uniqueIndex(
			"report_attachments_unique_active_type_idx",
		)
			.on(table.reportId, table.attachmentType)
			.where(
				sql`${table.archivedAt} IS NULL AND ${table.attachmentType} IN ('Evaluation Forms', 'Attendance Records')`,
			),
	}),
);
