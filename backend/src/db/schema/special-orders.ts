import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { proposalMembers } from "./proposal-members.js";
import { users } from "./users.js";

/**
 * EC-03: Special Orders are linked to proposal_members (not projects)
 * to track individual faculty deloading metrics for HR/Accounting.
 */
export const specialOrders = pgTable(
	"special_orders",
	{
		specialOrderId: uuid("special_order_id").primaryKey().defaultRandom(),
		memberId: uuid("member_id")
			.notNull()
			.references(() => proposalMembers.memberId),
		soNumber: varchar("so_number", { length: 100 }).notNull().unique(),
		storagePath: varchar("storage_path", { length: 500 }),
		contentHash: varchar("content_hash", { length: 64 }),
		uploadedBy: uuid("uploaded_by").references(() => users.userId),
		sourceIp: varchar("source_ip", { length: 45 }),
		dateIssued: timestamp("date_issued", { withTimezone: true }),
		status: varchar("status", { length: 50 }).notNull().default("Pending"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		memberIdx: index("so_member_id_idx").on(table.memberId),
	}),
);
