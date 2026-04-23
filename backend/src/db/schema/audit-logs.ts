import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
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
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("al_user_id_idx").on(table.userId),
    createdIdx: index("al_created_at_idx").on(table.createdAt),
  }),
);
