import {
	index,
	jsonb,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const auditLogs = pgTable(
	"audit_logs",
	{
		logId: uuid("log_id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.userId),
		action: varchar("action", { length: 255 }).notNull(),
		tableAffected: varchar("table_affected", { length: 100 }).notNull(),
		oldValue: jsonb("old_value"),
		newValue: jsonb("new_value"),
		ipAddress: varchar("ip_address", { length: 45 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		userCreatedIdx: index("al_user_created_idx").on(
			table.userId,
			table.createdAt,
		),
		createdIdx: index("al_created_at_idx").on(table.createdAt),
		tableIdx: index("al_table_affected_idx").on(table.tableAffected),
	}),
);
